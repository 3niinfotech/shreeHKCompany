const express = require("express");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { isSuperAdminRoll } = require("../../permissionHelper.js");
const { metaQuery, getRollCompanyIds, databaseExists } = require("../../tenantHelper.js");

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
    const yearsRaw = await metaQuery(
      `SELECT id, year, fromDate, toDate, db_name FROM company_year ORDER BY id DESC`
    );
    const companiesRaw = await metaQuery("SELECT id, name, address, number FROM company ORDER BY name ASC");
    const allowedIds = await getRollCompanyIds(req.user.roll);

    // Remove duplicate fiscal-year labels (keep latest id due to ORDER BY id DESC)
    const yearSeen = new Set();
    const years = (yearsRaw || []).filter((y) => {
      const key = String(y.year || "").trim().toLowerCase();
      if (!key) return false;
      if (yearSeen.has(key)) return false;
      yearSeen.add(key);
      return true;
    });

    // Remove duplicate companies by normalized name (keeps first in sorted order)
    const companySeen = new Set();
    const companies = (companiesRaw || []).filter((c) => {
      const key = String(c.name || "").trim().toLowerCase();
      if (!key) return false;
      if (companySeen.has(key)) return false;
      companySeen.add(key);
      return true;
    });

    const combos = [];
    const comboSeen = new Set();
    companies.forEach((c) => {
      if (!allowedIds.includes(c.id)) return;
      const yearRows = years.length
        ? years
        : [{ id: new Date().getFullYear(), year: String(new Date().getFullYear()), db_name: null }];
      yearRows.forEach((y) => {
        const comboKey = `${String(c.name || "").trim().toLowerCase()}::${String(y.year || "").trim().toLowerCase()}`;
        if (comboSeen.has(comboKey)) return;
        comboSeen.add(comboKey);
        combos.push({
          companyId: c.id,
          companyName: c.name,
          companyAddress: c.address,
          companyNumber: c.number,
          yearId: y.id,
          yearLabel: y.year || String(new Date().getFullYear()),
          dbName: y.db_name || null,
        });
      });
    });

    res.json({ status: true, Data: combos });
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
