const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const labRouter = express.Router();

labRouter.use(express.json());

// Get
labRouter.get("/master/lab", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.json({ TotalItems: 0, Data: [] });
  }

  const searchInput = req.query.searchInput;

  let query = `SELECT * FROM dai_lab WHERE company = ?`;
  let countQuery = `SELECT COUNT(*) as totalItems FROM dai_lab WHERE company = ?`;
  const params = [companyId];
  const countParams = [companyId];

  if (searchInput) {
    query += ` AND lab LIKE ?`;
    countQuery += ` AND lab LIKE ?`;
    params.push(`%${searchInput}%`);
    countParams.push(`%${searchInput}%`);
  }

  query += ` ORDER BY id DESC`;

  connection.query(countQuery, countParams, (countError, countResult) => {
    if (countError) return res.status(500).json({ error: countError.message });

    const totalItems = countResult[0]?.totalItems || 0;

    connection.query(query, params, (error, data) => {
      if (error) return res.status(500).json({ error: error.message });

      const response = {
        TotalItems: totalItems,
        Data: data,
      };
      res.json(response);
    });
  });
});

// Post
labRouter.post("/lab/post", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;
  const { id, lab, name, date } = req.body;
  const labName = (lab ?? name ?? "").trim();

  if (!labName) {
    return res.status(400).json({ error: "Lab name is required" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id != 0) {
        const rows = await q("SELECT * FROM dai_lab WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
        if (!oldRow) {
          const error = new Error("Lab record not found or access denied");
          error.statusCode = 404;
          throw error;
        }
      }

      if (id == 0) {
        const result = await q("INSERT INTO dai_lab (lab, date, company) VALUES (?, ?, ?)", [labName, date, companyId]);
        const newRows = await q("SELECT * FROM dai_lab WHERE id=? AND company=?", [result.insertId, companyId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Lab",
          recordId: result.insertId,
          recordReference: labName,
          newValue: newRows[0],
          companyId,
        });
      } else {
        await q("UPDATE dai_lab SET lab=?, date=? WHERE id=? AND company=?", [labName, date, id, companyId]);
        const newRows = await q("SELECT * FROM dai_lab WHERE id=? AND company=?", [id, companyId]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Lab",
          recordId: id,
          recordReference: labName,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      }
    });

    res.status(201).json({ message: "Lab created successfully" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Delete
labRouter.delete("/lab/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId);
  const companyId = buildUserContext(req).companyId;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_lab WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      if (!oldRow) {
        const error = new Error("Lab record not found or access denied");
        error.statusCode = 404;
        throw error;
      }
      await q("DELETE FROM dai_lab WHERE id=? AND company=?", [id, companyId]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Lab",
        recordId: id,
        recordReference: oldRow?.lab || String(id),
        oldValue: oldRow,
        companyId,
      });
    });

    res.status(200).json({ status: true, message: "Lab deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = labRouter;
