const express = require("express");
const md5 = require("md5");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken, isSuperAdmin } = require("../../authMiddleware.js");
const { clearPermissionCache } = require("../../permissionHelper.js");
const { metaQuery, parseCompanyJson } = require("../../tenantHelper.js");

const tenantCompanyRouter = express.Router();
tenantCompanyRouter.use(express.json());

const COMPANY_COLUMNS = [
  "name", "address", "number", "date", "type", "partner", "city", "state",
  "pincode", "country", "email", "website", "panno", "tinno", "iecno",
  "vatno", "vwef", "cstno", "cwef", "period", "startdate", "enddate",
  "rapnet_id", "rapnet_password",
];

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
    const rows = await metaQuery("SELECT id, name FROM company ORDER BY name ASC");
    res.json({ status: true, Data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

tenantCompanyRouter.get("/admin/tenant-company", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { searchInput = "" } = req.query;
    let sql = "SELECT * FROM company";
    const params = [];
    if (searchInput) {
      sql += " WHERE name LIKE ? OR address LIKE ? OR number LIKE ?";
      const term = `%${searchInput}%`;
      params.push(term, term, term);
    }
    sql += " ORDER BY id ASC";
    const rows = await metaQuery(sql, params);
    res.json({ status: true, TotalItems: rows.length, Data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

tenantCompanyRouter.get("/admin/tenant-company/:id", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Invalid id" });
    const rows = await metaQuery("SELECT * FROM company WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) {
      return res.status(404).json({ status: false, message: "Company not found" });
    }
    res.json({ status: true, Data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

tenantCompanyRouter.post("/admin/tenant-company/save", authenticateToken, isSuperAdmin, (req, res) => {
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
    if (body[col] !== undefined) post[col] = body[col];
  });
  if (!post.date) post.date = new Date().toISOString().slice(0, 10);

  const meta = connection.getMetaPool();

  if (id > 0) {
    post.id = id;
    const data = helper.updateString(post);
    const sql = `UPDATE company SET ${data} WHERE id = ?`;
    meta.query(sql, [id], (err) => {
      if (err) return res.status(500).json({ status: false, message: err.message });
      res.json({ status: true, message: "Successfully Saved !!!", id });
    });
    return;
  }

  const data = helper.insertString(post);
  const sql = `INSERT INTO company (${data[0]}) VALUES (${data[1]})`;
  meta.query(sql, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: err.message });

    const newId = result.insertId;
    seedIncrementId(newId, meta, (seedErr) => {
      if (seedErr) {
        return res.status(500).json({
          status: false,
          message: "Company created but increment seed failed: " + seedErr.message,
          id: newId,
        });
      }
      res.status(201).json({
        status: true,
        message: "Successfully Saved !!!",
        id: newId,
      });
    });
  });
});

const verifyAdminPassword = (userId, password) =>
  new Promise((resolve, reject) => {
    connection.query(
      "SELECT pass FROM user WHERE user_id = ? LIMIT 1",
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        if (!rows?.length) return resolve(false);
        resolve(md5(password) === rows[0].pass);
      }
    );
  });

const removeCompanyFromRolls = async (companyId) => {
  const rolls = await metaQuery("SELECT id, company FROM roll");
  const meta = connection.getMetaPool();

  for (const row of rolls || []) {
    const ids = parseCompanyJson(row.company);
    if (!ids.includes(Number(companyId))) continue;

    const next = ids.filter((id) => id !== Number(companyId));
    await new Promise((resolve, reject) => {
      meta.query(
        "UPDATE roll SET company = ? WHERE id = ?",
        [JSON.stringify(next), row.id],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }
};

tenantCompanyRouter.post("/admin/tenant-company/delete", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.body?.id);
    const password = String(req.body?.password || "").trim();

    if (!id) {
      return res.status(400).json({ status: false, message: "Company id is required." });
    }
    if (!password) {
      return res.status(400).json({ status: false, message: "Password is required to delete a company." });
    }

    const passwordOk = await verifyAdminPassword(req.user.user_id, password);
    if (!passwordOk) {
      return res.status(403).json({
        status: false,
        message: "Incorrect password. Company was not deleted.",
      });
    }

    const existing = await metaQuery("SELECT id, name FROM company WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) {
      return res.status(404).json({ status: false, message: "Company not found." });
    }

    const sessionCompanyId = Number(req.user?.companyId);
    if (sessionCompanyId && sessionCompanyId === id) {
      return res.status(400).json({
        status: false,
        message: "Cannot delete the company you are currently using. Switch to another company first.",
      });
    }

    const meta = connection.getMetaPool();
    await new Promise((resolve, reject) => {
      meta.query("DELETE FROM dai_incrementid WHERE company = ?", [id], (err) => (err ? reject(err) : resolve()));
    });

    await removeCompanyFromRolls(id);

    await new Promise((resolve, reject) => {
      meta.query("DELETE FROM company WHERE id = ?", [id], (err) => (err ? reject(err) : resolve()));
    });

    clearPermissionCache();

    res.json({
      status: true,
      message: `"${existing[0].name}" deleted successfully.`,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = tenantCompanyRouter;
