const express = require("express");
const helper = require("../../helper.js");
const connection = require("../../connection.js");
const { authenticateToken, isSuperAdmin } = require("../../authMiddleware.js");
const { metaQuery } = require("../../tenantHelper.js");
const { ensureBranchSchema } = require("../../services/ensureBranchSchemaService.js");
const { ensureCurrentFiscalYear } = require("../../services/ensureCurrentFiscalYearService.js");
const { reassignSuratCompanies } = require("../../services/reassignSuratCompaniesService.js");
const { attachCurrentYearToBranch } = require("../../services/branchYearService.js");
const { verifyAndMigratePassword } = require("../../services/passwordService.js");
const {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  getRateLimitResetMs,
  getBranchDeleteImpact,
  executePermanentDeleteBranch,
} = require("../../services/permanentDeleteService.js");

const branchRouter = express.Router();
branchRouter.use(express.json());

const BRANCH_COLUMNS = ["name", "shortcutName", "address", "number", "city", "country", "status", "color_code"];

const ensureReady = async (_req, _res, next) => {
  try {
    await ensureBranchSchema();
    next();
  } catch (err) {
    next(err);
  }
};

branchRouter.use(ensureReady);

branchRouter.get("/admin/branch/options", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const rows = await metaQuery(
      "SELECT id, name, shortcutName, color_code FROM branch WHERE status = 1 ORDER BY name ASC"
    );
    res.json({ status: true, Data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.get("/admin/branch", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    // Seed HK / Dubai only (Surat is not auto-recreated after delete)
    await ensureBranchSchema();
    try {
      await reassignSuratCompanies();
    } catch (reErr) {
      console.error("reassignSuratCompanies:", reErr?.message || reErr);
    }

    const { searchInput = "", activeOnly } = req.query;
    let sql = `
      SELECT b.id, b.name, b.shortcutName, b.address, b.number, b.city, b.country, b.status, b.color_code, b.created_at,
        (SELECT COUNT(*) FROM company c WHERE c.branch_id = b.id) AS company_count,
        (SELECT GROUP_CONCAT(c.name ORDER BY c.id SEPARATOR '||')
           FROM company c WHERE c.branch_id = b.id) AS company_names
      FROM branch b
    `;
    const params = [];
    const where = [];
    // Default: show login-modal branches (active). Pass activeOnly=0 to include inactive.
    if (String(activeOnly) !== "0") {
      where.push("b.status = 1");
    }
    if (searchInput) {
      where.push("(b.name LIKE ? OR b.shortcutName LIKE ? OR b.city LIKE ? OR b.country LIKE ?)");
      const term = `%${searchInput}%`;
      params.push(term, term, term, term);
    }
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    // Same order as login modal
    sql += ` ORDER BY FIELD(LOWER(b.name), 'dubai', 'hk', 'surat'), b.name ASC`;
    const rows = await metaQuery(sql, params);
    res.json({
      status: true,
      TotalItems: rows.length,
      Data: (rows || []).map((r) => {
        const companyNames = String(r.company_names || "")
          .split("||")
          .map((n) => n.trim())
          .filter(Boolean);
        return {
          ...r,
          company_count: Number(r.company_count) || companyNames.length,
          company_names: companyNames,
          status: Number(r.status) ? 1 : 0,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.get("/admin/branch/:id", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Invalid id" });
    const rows = await metaQuery("SELECT * FROM branch WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) {
      return res.status(404).json({ status: false, message: "Branch not found" });
    }
    res.json({ status: true, Data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.post("/admin/branch/save", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const id = Number(body.id) || 0;
    const name = String(body.name || "").trim();
    if (!name) {
      return res.status(400).json({ status: false, message: "Branch name is required." });
    }

    const post = {};
    BRANCH_COLUMNS.forEach((col) => {
      if (body[col] !== undefined) post[col] = body[col];
    });
    post.name = name;
    if (post.status === undefined || post.status === null || post.status === "") {
      post.status = 1;
    } else {
      post.status = Number(post.status) ? 1 : 0;
    }

    if (post.color_code && typeof post.color_code === "string") {
      const trimmed = post.color_code.trim();
      if (/^[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
        post.color_code = `#${trimmed}`;
      } else {
        post.color_code = trimmed || null;
      }
    }

    const meta = connection.getMetaPool();

    if (id > 0) {
      post.id = id;
      const data = helper.updateString(post);
      meta.query(`UPDATE branch SET ${data} WHERE id = ?`, [id], (err) => {
        if (err) {
          if (/Duplicate|ER_DUP_ENTRY/i.test(String(err.message || ""))) {
            return res.status(400).json({ status: false, message: "Branch name already exists." });
          }
          return res.status(500).json({ status: false, message: err.message });
        }
        res.json({ status: true, message: "Branch saved successfully.", id });
      });
      return;
    }

    const data = helper.insertString(post);
    meta.query(`INSERT INTO branch (${data[0]}) VALUES (${data[1]})`, async (err, result) => {
      if (err) {
        if (/Duplicate|ER_DUP_ENTRY/i.test(String(err.message || ""))) {
          return res.status(400).json({ status: false, message: "Branch name already exists." });
        }
        return res.status(500).json({ status: false, message: err.message });
      }
      let fy = null;
      try {
        // New branch → only current FY (not all historical years from other companies)
        fy = await attachCurrentYearToBranch(result.insertId);
      } catch (fyErr) {
        console.error("attachCurrentYearToBranch after branch create:", fyErr?.message || fyErr);
        try {
          fy = await ensureCurrentFiscalYear();
        } catch (_) {
          /* ignore */
        }
      }
      const fyNote = fy?.year
        ? ` Current financial year ${fy.year} linked (only this year).`
        : "";
      res.status(201).json({
        status: true,
        message: `Branch created successfully.${fyNote}`,
        id: result.insertId,
        currentYear: fy
          ? { yearId: fy.id, yearLabel: fy.year, fromDate: fy.fromDate, toDate: fy.toDate }
          : null,
      });
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/** Verify admin password */
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

// ── Branch delete impact preview ──────────────────────────────────────────────
branchRouter.post("/admin/branch/delete-impact", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.body?.id);
    if (!id) return res.status(400).json({ status: false, message: "Branch id is required." });
    const impact = await getBranchDeleteImpact(id);
    res.json({ status: true, Data: impact });
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ status: false, message: err.message });
  }
});

// ── Branch permanent delete ────────────────────────────────────────────────────
branchRouter.post("/admin/branch/delete", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.body?.id);
    const password = String(req.body?.password || "").trim();
    const confirmPassword = String(req.body?.confirmPassword || "").trim();
    const confirmName = String(req.body?.confirmName || "").trim();
    const userId = req.user.user_id;

    if (!id) return res.status(400).json({ status: false, message: "Branch id is required." });

    // Rate limit check
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
    if (!confirmName) return res.status(400).json({ status: false, message: "Please type the branch name to confirm." });

    // Verify password
    const passwordOk = await verifyAdminPassword(userId, password);
    if (!passwordOk) {
      recordFailedAttempt(userId);
      return res.status(403).json({
        status: false,
        message: "Incorrect password. Branch was not deleted.",
      });
    }

    // Verify branch name matches
    const existing = await metaQuery("SELECT id, name FROM branch WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) return res.status(404).json({ status: false, message: "Branch not found." });
    if (confirmName !== existing[0].name) {
      return res.status(400).json({
        status: false,
        message: `Branch name does not match. Expected: "${existing[0].name}"`,
      });
    }

    // Session safety: block if session company belongs to this branch
    const sessionCompanyId = Number(req.user?.companyId);
    if (sessionCompanyId) {
      const sessionCompanyRows = await metaQuery(
        "SELECT branch_id FROM company WHERE id = ? LIMIT 1",
        [sessionCompanyId]
      );
      if (sessionCompanyRows.length && Number(sessionCompanyRows[0].branch_id) === id) {
        return res.status(400).json({
          status: false,
          message: "Cannot delete the branch your current session belongs to. Switch to another branch first.",
        });
      }
    }

    const reqInfo = {
      userId: req.user.user_id,
      userName: req.user.user_name || req.user.username || "Unknown",
      userRole: req.user.role || req.user.roll || "Super Admin",
      userRoleId: req.user.roll_id || req.user.roleId || null,
      companyId: sessionCompanyId || 1,
      ip: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
    };

    // Get branch's session company branch_id for safety check inside service
    const sessionCompanyBranchId = sessionCompanyId
      ? (await metaQuery("SELECT branch_id FROM company WHERE id = ? LIMIT 1", [sessionCompanyId]))[0]?.branch_id
      : null;

    const result = await executePermanentDeleteBranch({
      branchId: id,
      sessionCompanyBranchId: sessionCompanyBranchId || null,
      reqInfo,
    });

    clearFailedAttempts(userId);

    res.json({
      status: true,
      message: `"${result.branchName}" permanently deleted. ${result.companiesDeleted.length} company(ies) and ${result.total} record(s) removed.`,
      Data: result,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ status: false, message: err.message });
  }
});

module.exports = branchRouter;
