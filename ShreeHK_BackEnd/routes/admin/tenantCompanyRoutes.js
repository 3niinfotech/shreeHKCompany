const express = require("express");
const { verifyAndMigratePassword } = require("../../services/passwordService.js");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken, isSuperAdmin } = require("../../authMiddleware.js");
const { clearPermissionCache } = require("../../permissionHelper.js");
const { metaQuery, parseCompanyJson, buildUserContext, getBranchCompanyIds } = require("../../tenantHelper.js");
const {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  getRateLimitResetMs,
  getCompanyDeleteImpact,
  executePermanentDeleteCompany,
} = require("../../services/permanentDeleteService.js");

const tenantCompanyRouter = express.Router();
tenantCompanyRouter.use(express.json());

const { ensureBranchSchema } = require("../../services/ensureBranchSchemaService.js");
const { ensureCurrentFiscalYear } = require("../../services/ensureCurrentFiscalYearService.js");

const COMPANY_COLUMNS = [
  "name", "address", "number", "date", "type", "partner", "city", "state",
  "pincode", "country", "email", "website", "panno", "tinno", "iecno",
  "vatno", "vwef", "cstno", "cwef", "period", "startdate", "enddate",
  "rapnet_id", "rapnet_password", "shortcutName", "logo", "branch_id",
  "invoice_prefix", "memo_prefix", "purchase_prefix", "lab_prefix",
  "color_code", "bank_details",
];
const COMPANY_SAFE_SELECT = ["id", ...COMPANY_COLUMNS.filter((column) => column !== "rapnet_password")]
  .map((column) => `c.\`${column}\``)
  .join(", ");

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = "uploads/company-logos/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `company-${unique}${path.extname(file.originalname || ".png")}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for company logo"));
    }
    cb(null, true);
  },
});

let bankDetailsColumnReady = false;
const ensureCompanyBankDetailsColumn = async () => {
  if (bankDetailsColumnReady) return;
  try {
    await metaQuery("ALTER TABLE company ADD COLUMN bank_details LONGTEXT NULL");
  } catch (err) {
    // already exists
  }
  bankDetailsColumnReady = true;
};

let logoColumnReady = false;
const ensureLogoColumn = async () => {
  if (logoColumnReady) return;
  try {
    await metaQuery("ALTER TABLE company ADD COLUMN logo VARCHAR(500) NULL");
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (!/duplicate column|ER_DUP_FIELDNAME/i.test(msg)) {
      // column may already exist — continue
    }
  }
  logoColumnReady = true;
};

let prefixColumnsReady = false;
const ensureCompanyPrefixColumns = async () => {
  if (prefixColumnsReady) return;
  const cols = [
    { name: "invoice_prefix", def: "VARCHAR(50) NULL DEFAULT 'INV-'" },
    { name: "memo_prefix", def: "VARCHAR(50) NULL DEFAULT 'MEMO-'" },
    { name: "purchase_prefix", def: "VARCHAR(50) NULL DEFAULT 'PUR-'" },
    { name: "lab_prefix", def: "VARCHAR(50) NULL DEFAULT 'LAB-'" },
    { name: "color_code", def: "VARCHAR(50) NULL DEFAULT NULL" },
  ];
  for (const c of cols) {
    try {
      await metaQuery(`ALTER TABLE company ADD COLUMN ${c.name} ${c.def}`);
    } catch (_) {
      // already exists
    }
  }
  prefixColumnsReady = true;
};

const seedIncrementId = (companyId, pool, cb) => {
  pool.query("SELECT * FROM dai_incrementid WHERE company = ? LIMIT 1", [companyId], (existsErr, existsRows) => {
    if (existsErr) return cb(existsErr);
    if (existsRows?.length) return cb(null);

    pool.query("SHOW COLUMNS FROM dai_incrementid", (colsErr, columns) => {
      if (colsErr) return cb(colsErr);

      const available = new Set((columns || []).map((c) => c.Field));
      const seedValues = {
        company: companyId,
        inward: "Inward-1",
        outward: "Outward-1",
        invoice: "Invoice-1",
        reference: "1",
        purchase: "Purchase-1",
        sale: "Sale-1",
        payment: "Payment-1",
        receipt: "Receipt-1",
        journal: "Journal-1",
        contra: "Contra-1",
      };

      const payload = {};
      Object.keys(seedValues).forEach((key) => {
        if (available.has(key)) payload[key] = seedValues[key];
      });

      if (!payload.company) {
        return cb(new Error("dai_incrementid.company column missing"));
      }

      const data = helper.insertString(payload);
      const sql = `INSERT INTO dai_incrementid (${data[0]}) VALUES (${data[1]})`;
      pool.query(sql, cb);
    });
  });
};

tenantCompanyRouter.get("/admin/tenant-company/options", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    await ensureBranchSchema();
    const rows = await metaQuery(
      `SELECT c.id, c.name, c.shortcutName, c.branch_id, c.bank_details, b.name AS branch_name
       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       ORDER BY c.name ASC`
    );
    res.json({ status: true, Data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

tenantCompanyRouter.get("/admin/tenant-company", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    await ensureLogoColumn();
    await ensureCompanyPrefixColumns();
    await ensureCompanyBankDetailsColumn();
    await ensureBranchSchema();
    const { searchInput = "", branch_id: branchId, all = false } = req.query;
    const userContext = buildUserContext(req);
    const sessionCompanyId = Number(userContext.companyId) || 0;

    let sql = `
      SELECT ${COMPANY_SAFE_SELECT}, b.name AS branch_name, b.shortcutName AS branch_shortcut
      FROM company c
      LEFT JOIN branch b ON b.id = c.branch_id
    `;
    const params = [];
    const where = [];

    // Only the companies of the active branch are listed — the branch companies
    // are all active, so an HK session must show every HK company.
    // `all=true` returns every tenant company.
    if (!all && sessionCompanyId > 0) {
      const branchCompanyIds = await getBranchCompanyIds(sessionCompanyId);
      if (branchCompanyIds.length) {
        where.push(`c.id IN (${branchCompanyIds.map(() => "?").join(", ")})`);
        params.push(...branchCompanyIds);
      }
    }

    if (searchInput) {
      where.push("(c.name LIKE ? OR c.address LIKE ? OR c.number LIKE ?)");
      const term = `%${searchInput}%`;
      params.push(term, term, term);
    }
    if (branchId !== undefined && branchId !== null && String(branchId).trim() !== "") {
      where.push("c.branch_id = ?");
      params.push(Number(branchId));
    }
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY c.id ASC";
    const rows = await metaQuery(sql, params);
    res.json({ status: true, TotalItems: rows.length, Data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

tenantCompanyRouter.get("/admin/tenant-company/:id", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    await ensureLogoColumn();
    await ensureCompanyPrefixColumns();
    await ensureCompanyBankDetailsColumn();
    await ensureBranchSchema();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Invalid id" });
    const rows = await metaQuery(
      `SELECT ${COMPANY_SAFE_SELECT}, b.name AS branch_name
       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       WHERE c.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ status: false, message: "Company not found" });
    }
    res.json({ status: true, Data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

tenantCompanyRouter.post(
  "/admin/tenant-company/save",
  authenticateToken,
  isSuperAdmin,
  (req, res, next) => {
    uploadLogo.single("logo")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ status: false, message: err.message || "Logo upload failed" });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      await ensureLogoColumn();
      await ensureCompanyPrefixColumns();
      await ensureCompanyBankDetailsColumn();
      await ensureBranchSchema();
      const body = req.body || {};
      const id = Number(body.id) || 0;

      if (!body.name || !body.number || !body.address) {
        return res.status(400).json({
          status: false,
          message: "Value can't be Blank.",
        });
      }

      const post = {};
      COMPANY_COLUMNS.forEach((col) => {
        if (body[col] !== undefined && col !== "logo") post[col] = body[col];
      });
      if (body.bank_details !== undefined) {
        post.bank_details = typeof body.bank_details === "object"
          ? JSON.stringify(body.bank_details)
          : String(body.bank_details || "");
      }
      if (post.branch_id !== undefined && post.branch_id !== null && post.branch_id !== "") {
        post.branch_id = Number(post.branch_id) || null;
      } else if (body.branch_id === "" || body.branch_id === null) {
        post.branch_id = null;
      }
      if (post.color_code !== undefined) {
        post.color_code = post.color_code && String(post.color_code).trim() ? String(post.color_code).trim() : null;
      }
      if (!post.date) post.date = new Date().toISOString().slice(0, 10);

      if (req.file) {
        post.logo = `/uploads/company-logos/${req.file.filename}`;
      } else if (body.clear_logo === "1" || body.logo === "") {
        post.logo = null;
      } else if (body.logo !== undefined && body.logo !== "null") {
        // keep existing path when no new file uploaded
        post.logo = body.logo;
      }

      const meta = connection.getMetaPool();

      if (id > 0) {
        post.id = id;
        const data = helper.updateString(post);
        const sql = `UPDATE company SET ${data} WHERE id = ?`;
        meta.query(sql, [id], (err) => {
          if (err) return res.status(500).json({ status: false, message: err.message });
          res.json({ status: true, message: "Successfully Saved !!!", id, logo: post.logo || null, color_code: post.color_code || null });
        });
        return;
      }

      const data = helper.insertString(post);
      const sql = `INSERT INTO company (${data[0]}) VALUES (${data[1]})`;
      meta.query(sql, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: err.message });

        const newId = result.insertId;
        seedIncrementId(newId, meta, async (seedErr) => {
          if (seedErr) {
            return res.status(500).json({
              status: false,
              message: "Company created but increment seed failed: " + seedErr.message,
              id: newId,
            });
          }
          try {
            await ensureCurrentFiscalYear();
          } catch (fyErr) {
            console.error("ensureCurrentFiscalYear after company create:", fyErr?.message || fyErr);
          }
          res.status(201).json({
            status: true,
            message: "Successfully Saved !!!",
            id: newId,
            logo: post.logo || null,
            color_code: post.color_code || null,
          });
        });
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  }
);

/** Verify admin password (reusable) */
const verifyAdminPassword = (userId, password) =>
  new Promise((resolve, reject) => {
    connection.query(
      "SELECT pass FROM user WHERE user_id = ? LIMIT 1",
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        if (!rows?.length) return resolve(false);
        const valid = verifyAndMigratePassword(password, rows[0].pass, (newHash) => {
          connection.query("UPDATE user SET pass = ? WHERE user_id = ?", [newHash, userId]);
        });
        resolve(valid);
      }
    );
  });

// ── Impact preview endpoint ────────────────────────────────────────────────────
tenantCompanyRouter.post(
  "/admin/tenant-company/delete-impact",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const id = Number(req.body?.id);
      if (!id) return res.status(400).json({ status: false, message: "Company id is required." });
      const impact = await getCompanyDeleteImpact(id);
      res.json({ status: true, Data: impact });
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ status: false, message: err.message });
    }
  }
);

// ── Permanent delete endpoint ──────────────────────────────────────────────────
tenantCompanyRouter.post(
  "/admin/tenant-company/delete",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const id = Number(req.body?.id);
      const password = String(req.body?.password || "").trim();
      const confirmPassword = String(req.body?.confirmPassword || "").trim();
      const confirmName = String(req.body?.confirmName || "").trim();
      const userId = req.user.user_id;

      if (!id) return res.status(400).json({ status: false, message: "Company id is required." });

      // Rate limit check (per user, failures only)
      if (isRateLimited(userId)) {
        const msLeft = getRateLimitResetMs(userId);
        const minLeft = Math.ceil(msLeft / 60000);
        return res.status(429).json({
          status: false,
          message: `Too many failed attempts. Please try again in ${minLeft} minute(s).`,
          retryAfterMs: msLeft,
        });
      }

      if (!password) return res.status(400).json({ status: false, message: "Password is required." });
      if (!confirmPassword) return res.status(400).json({ status: false, message: "Please confirm your password." });
      if (password !== confirmPassword) return res.status(400).json({ status: false, message: "Passwords do not match." });
      if (!confirmName) return res.status(400).json({ status: false, message: "Please type the company name to confirm." });

      // Verify password
      const passwordOk = await verifyAdminPassword(userId, password);
      if (!passwordOk) {
        recordFailedAttempt(userId);
        return res.status(403).json({
          status: false,
          message: "Incorrect password. Company was not deleted.",
        });
      }

      // Verify company name matches
      const existing = await metaQuery("SELECT id, name FROM company WHERE id = ? LIMIT 1", [id]);
      if (!existing.length) return res.status(404).json({ status: false, message: "Company not found." });
      if (confirmName !== existing[0].name) {
        return res.status(400).json({
          status: false,
          message: `Company name does not match. Expected: "${existing[0].name}"`,
        });
      }

      // Session safety
      const sessionCompanyId = Number(req.user?.companyId);
      if (sessionCompanyId && sessionCompanyId === id) {
        return res.status(400).json({
          status: false,
          message: "Cannot delete the company you are currently logged into. Switch to another company first.",
        });
      }

      // Execute permanent delete
      const reqInfo = {
        userId: req.user.user_id,
        userName: req.user.user_name || req.user.username || "Unknown",
        userRole: req.user.role || req.user.roll || "Super Admin",
        userRoleId: req.user.roll_id || req.user.roleId || null,
        companyId: sessionCompanyId || 1,
        ip: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
      };

      const result = await executePermanentDeleteCompany({
        companyId: id,
        sessionCompanyId,
        reqInfo,
      });

      clearFailedAttempts(userId);

      res.json({
        status: true,
        message: `"${result.companyName}" permanently deleted. ${result.total} record(s) removed.`,
        Data: result,
      });
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ status: false, message: err.message });
    }
  }
);

module.exports = tenantCompanyRouter;
