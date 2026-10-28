const express = require("express");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { isSuperAdminRoll } = require("../../permissionHelper.js");
const {
  metaQuery,
  getRollCompanyIds,
  databaseExists,
  buildUserContext,
} = require("../../tenantHelper.js");

const requireSuperAdmin = (req, res, next) => {
  if (!isSuperAdminRoll(req.user?.roll)) {
    return res.status(403).json({ status: false, message: "Super admin only" });
  }
  next();
};

const mapYearRow = (row) => ({
  id: row.id,
  year: row.year,
  fromDate: row.fromDate,
  toDate: row.toDate,
  dbName: row.db_name,
});

const portalRouter = express.Router();
portalRouter.use(express.json());

portalRouter.get("/portal/company-years", authenticateToken, async (req, res) => {
  try {
    const { ensureBranchSchema } = require("../../services/ensureBranchSchemaService.js");
    const { ensureCurrentFiscalYear } = require("../../services/ensureCurrentFiscalYearService.js");
    const {
      ensureBranchYearSchema,
      getBranchYearMap,
    } = require("../../services/branchYearService.js");
    await ensureBranchSchema();
    try {
      await ensureBranchYearSchema();
      await ensureCurrentFiscalYear();
    } catch (fyErr) {
      console.error("ensureCurrentFiscalYear on company-years:", fyErr?.message || fyErr);
    }

    const yearsRaw = await metaQuery(
      `SELECT id, year, fromDate, toDate, db_name FROM company_year ORDER BY id DESC`
    );
    const companiesRaw = await metaQuery(
      `SELECT c.id, c.name, c.shortcutName, c.address, c.number, c.branch_id, c.color_code, c.email, c.website, c.rapnet_id,
              b.name AS branch_name, b.shortcutName AS branch_shortcut, b.address AS branch_address, b.color_code AS branch_color_code
       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       ORDER BY COALESCE(b.name, 'zzz'), c.name ASC`
    );
    // Login Branch step: only active branches (HK / Dubai / Surat). Never company rows.
    const branchesRaw = await metaQuery(
      `SELECT id, name, shortcutName, address, number, color_code
       FROM branch
       WHERE status = 1
       ORDER BY FIELD(LOWER(name), 'dubai', 'hk', 'surat'), name ASC`
    );
    const allowedIds = await getRollCompanyIds(req.user.roll);
    const isAdmin = isSuperAdminRoll(req.user?.roll);
    const sessionCompanyId = Number(buildUserContext(req).companyId) || 0;

    // Non-admin after login: lock to session branch companies only (HK login → HK companies only)
    let lockBranchId = null;
    if (!isAdmin && sessionCompanyId) {
      const sessionRows = await metaQuery(
        `SELECT branch_id FROM company WHERE id = ? LIMIT 1`,
        [sessionCompanyId]
      );
      if (sessionRows?.[0]?.branch_id != null) {
        lockBranchId = Number(sessionRows[0].branch_id);
      }
    }

    // Remove duplicate fiscal-year labels (keep latest id due to ORDER BY id DESC)
    const yearSeen = new Set();
    const years = (yearsRaw || []).filter((y) => {
      const key = String(y.year || "").trim().toLowerCase();
      if (!key) return false;
      if (yearSeen.has(key)) return false;
      yearSeen.add(key);
      return true;
    });

    // Keep every company id (same name under Surat/UAE/HK must each get years)
    const companySeen = new Set();
    const companies = (companiesRaw || []).filter((c) => {
      const id = Number(c.id);
      if (!Number.isFinite(id) || id <= 0) return false;
      if (companySeen.has(id)) return false;
      companySeen.add(id);
      return true;
    });

    const combos = [];
    const comboSeen = new Set();
    companies.forEach((c) => {
      if (!allowedIds.includes(c.id)) return;
      const branchId = c.branch_id != null ? Number(c.branch_id) : null;
      if (lockBranchId != null && branchId !== lockBranchId) return;
      const yearRows = years.length
        ? years
        : [{ id: new Date().getFullYear(), year: String(new Date().getFullYear()), fromDate: null, toDate: null, db_name: null }];
      yearRows.forEach((y) => {
        const comboKey = `${c.id}::${y.id}`;
        if (comboSeen.has(comboKey)) return;
        comboSeen.add(comboKey);
        combos.push({
          branchId,
          branchName: c.branch_name || (branchId ? null : "Other"),
          branchShortcutName: c.branch_shortcut || null,
          branchAddress: c.branch_address || null,
          branchColorCode: c.branch_color_code || null,
          companyId: c.id,
          companyName: c.name,
          companyShortcutName: c.shortcutName || null,
          companyColorCode: c.color_code || null,
          companyAddress: c.address,
          companyNumber: c.number,
          companyEmail: c.email || null,
          companyWebsite: c.website || null,
          companyRapnetId: c.rapnet_id || null,
          yearId: y.id,
          yearLabel: y.year || String(new Date().getFullYear()),
          fromDate: y.fromDate || null,
          toDate: y.toDate || null,
          dbName: y.db_name || null,
        });
      });
    });

    const branchesOut = (branchesRaw || [])
      .filter((b) => (lockBranchId != null ? Number(b.id) === lockBranchId : true))
      .map((b) => ({
        branchId: b.id,
        branchName: b.name,
        branchShortcutName: b.shortcutName || null,
        branchAddress: b.address || null,
        branchNumber: b.number || null,
        branchColorCode: b.color_code || null,
      }));

    // Global FY list — always includes ensureCurrentFiscalYear (dates as YYYY-MM-DD)
    const toDateOnly = (value) => {
      if (!value) return null;
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const s = String(value).trim();
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    };
    const yearsOut = years.map((y) => ({
      yearId: y.id,
      yearLabel: y.year || String(new Date().getFullYear()),
      fromDate: toDateOnly(y.fromDate),
      toDate: toDateOnly(y.toDate),
      dbName: y.db_name || null,
    }));
    // Also normalize combo dates so Current Year badge works on every branch
    combos.forEach((c) => {
      c.fromDate = toDateOnly(c.fromDate);
      c.toDate = toDateOnly(c.toDate);
    });

    let branchYearMap = {};
    try {
      branchYearMap = await getBranchYearMap();
    } catch (mapErr) {
      console.error("getBranchYearMap:", mapErr?.message || mapErr);
    }

    res.json({
      status: true,
      Data: combos,
      Years: yearsOut,
      BranchYears: branchYearMap,
      Branches: branchesOut,
      lockedToBranchId: lockBranchId,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * Companies under logged-in branch for compulsory Company dropdown
 * (sale / memo / lab / purchase / inward).
 * Example: HK branch → ShreeHK International + KG Infrastructure
 */
portalRouter.get("/portal/branch-companies", authenticateToken, async (req, res) => {
  try {
    const { ensureBranchSchema } = require("../../services/ensureBranchSchemaService.js");
    await ensureBranchSchema();

    const userContext = buildUserContext(req);
    const sessionCompanyId = Number(userContext.companyId) || 0;
    const sessionBranchId = Number(userContext.branchId) || 0;

    const allowedIds = (await getRollCompanyIds(req.user.roll)).map(Number).filter(Boolean);

    let branchId = null;
    let branchName = null;
    let branchColorCode = null;

    if (sessionCompanyId) {
      const sessionRows = await metaQuery(
        `SELECT c.id, c.name, c.branch_id, b.name AS branch_name, b.color_code AS branch_color_code
         FROM company c
         LEFT JOIN branch b ON b.id = c.branch_id
         WHERE c.id = ? LIMIT 1`,
        [sessionCompanyId]
      );
      if (!sessionRows.length) {
        return res.status(404).json({ status: false, message: "Session company not found" });
      }
      branchId = sessionRows[0].branch_id != null ? Number(sessionRows[0].branch_id) : null;
      branchName = sessionRows[0].branch_name || null;
      branchColorCode = sessionRows[0].branch_color_code || null;
    } else if (sessionBranchId) {
      const branchRows = await metaQuery(
        `SELECT id, name, color_code FROM branch WHERE id = ? LIMIT 1`,
        [sessionBranchId]
      );
      if (!branchRows.length) {
        return res.status(404).json({ status: false, message: "Branch not found" });
      }
      branchId = Number(branchRows[0].id);
      branchName = branchRows[0].name || null;
      branchColorCode = branchRows[0].color_code || null;
    } else {
      return res.status(400).json({ status: false, message: "Select company or branch context first" });
    }

    let rows;
    if (branchId) {
      // All tenant companies linked to this branch (HK → both companies)
      rows = await metaQuery(
        `SELECT c.id, c.name, c.shortcutName, c.branch_id, c.color_code, c.address, c.number, c.email, c.website, c.rapnet_id,
                b.name AS branch_name, b.color_code AS branch_color_code
         FROM company c
         LEFT JOIN branch b ON b.id = c.branch_id
         WHERE c.branch_id = ?
         ORDER BY c.name ASC`,
        [branchId]
      );
    } else {
      rows = await metaQuery(
        `SELECT c.id, c.name, c.shortcutName, c.branch_id, c.color_code, c.address, c.number, c.email, c.website, c.rapnet_id,
                NULL AS branch_name, NULL AS branch_color_code
         FROM company c
         WHERE c.id = ?
         ORDER BY c.name ASC`,
        [sessionCompanyId]
      );
    }

    const isAdmin = isSuperAdminRoll(req.user?.roll);
    // Non-admin: only companies of this branch (and roll-allowed when roll list is set).
    // Admin: all companies under the session branch.
    const canUseSession = allowedIds.includes(sessionCompanyId);
    const data = (rows || []).filter((c) => {
      const id = Number(c.id);
      const rowBranchId = c.branch_id != null ? Number(c.branch_id) : null;
      if (branchId && rowBranchId && rowBranchId !== branchId) return false;
      if (isAdmin) return true;
      if (!allowedIds.length) return true;
      if (canUseSession && branchId) return true;
      return allowedIds.includes(id);
    });

    res.json({
      status: true,
      branchId,
      branchName,
      branchColorCode,
      sessionCompanyId,
      Data: data.map((c) => ({
        id: Number(c.id),
        name: c.name,
        shortcutName: c.shortcutName || null,
        color_code: c.color_code || null,
        address: c.address || null,
        number: c.number || null,
        email: c.email || null,
        website: c.website || null,
        rapnet_id: c.rapnet_id || null,
        branchId: c.branch_id != null ? Number(c.branch_id) : null,
        branchName: c.branch_name || branchName,
        branchColorCode: c.branch_color_code || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

portalRouter.get("/portal/years", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const rows = await metaQuery(
      `SELECT id, year, fromDate, toDate, db_name FROM company_year ORDER BY id DESC`
    );
    res.json({
      status: true,
      TotalItems: rows.length,
      Data: rows.map(mapYearRow),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

portalRouter.post("/portal/year", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { year, fromDate, toDate, dbName } = req.body;
    if (!year) return res.status(400).json({ status: false, message: "year is required" });

    if (dbName && !(await databaseExists(dbName))) {
      return res.status(400).json({
        status: false,
        message: `Database "${dbName}" does not exist on server.`,
      });
    }

    const sql = `INSERT INTO company_year (year, fromDate, toDate, db_name) VALUES (?, ?, ?, ?)`;
    const result = await new Promise((resolve, reject) => {
      connection.getMetaPool().query(
        sql,
        [year, fromDate || null, toDate || null, dbName || null],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    res.status(201).json({
      status: true,
      message: "Fiscal year record created. Full DB transfer must be run separately (legacy addYear parity).",
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

portalRouter.put("/portal/year/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Invalid id" });

    const { year, fromDate, toDate, dbName } = req.body;
    if (!year) return res.status(400).json({ status: false, message: "year is required" });

    if (dbName && !(await databaseExists(dbName))) {
      return res.status(400).json({
        status: false,
        message: `Database "${dbName}" does not exist on server.`,
      });
    }

    const sql = `UPDATE company_year SET year = ?, fromDate = ?, toDate = ?, db_name = ? WHERE id = ?`;
    await new Promise((resolve, reject) => {
      connection.getMetaPool().query(
        sql,
        [year, fromDate || null, toDate || null, dbName || null, id],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    res.json({ status: true, message: "Fiscal year updated successfully.", id });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

portalRouter.delete("/portal/year", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.query.deleteId || req.query.id);
    if (!id) return res.status(400).json({ status: false, message: "deleteId is required" });

    await new Promise((resolve, reject) => {
      connection.getMetaPool().query(
        "DELETE FROM company_year WHERE id = ?",
        [id],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    res.json({ status: true, message: "Fiscal year deleted successfully." });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = portalRouter;
