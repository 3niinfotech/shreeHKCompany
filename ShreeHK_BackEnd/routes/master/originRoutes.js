const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const originRouter = express.Router();

originRouter.use(express.json());

// Get
originRouter.get("/master/origin", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.json({ TotalItems: 0, Data: [] });
  }

  const id = parseInt(req?.query?.id) || 0;
  const searchInput = req.query.searchInput;

  let query = `SELECT * FROM dai_origin WHERE company = ?`;
  let countQuery = `SELECT COUNT(*) as totalItems FROM dai_origin WHERE company = ?`;
  const params = [companyId];
  const countParams = [companyId];

  if (id === 0) {
    if (searchInput) {
      query += ` AND name LIKE ?`;
      countQuery += ` AND name LIKE ?`;
      params.push(`%${searchInput}%`);
      countParams.push(`%${searchInput}%`);
    }
    query += ` ORDER BY id DESC`;
  } else {
    query += ` AND id = ?`;
    params.push(id);
  }

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
originRouter.post("/origin/save", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;
  const { id, name } = req.body;

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id != 0) {
        const rows = await q("SELECT * FROM dai_origin WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
        if (!oldRow) {
          const error = new Error("Origin record not found or access denied");
          error.statusCode = 404;
          throw error;
        }
      }

      if (id == 0) {
        const result = await q("INSERT INTO dai_origin (name, company) VALUES (?, ?)", [name, companyId]);
        const newRows = await q("SELECT * FROM dai_origin WHERE id=? AND company=?", [result.insertId, companyId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Origin",
          recordId: result.insertId,
          recordReference: name,
          newValue: newRows[0],
          companyId,
        });
      } else {
        await q("UPDATE dai_origin SET name=? WHERE id=? AND company=?", [name, id, companyId]);
        const newRows = await q("SELECT * FROM dai_origin WHERE id=? AND company=?", [id, companyId]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Origin",
          recordId: id,
          recordReference: name,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      }
    });

    res.status(201).json({ message: "Origin created successfully" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Delete
originRouter.delete("/origin/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId);
  const companyId = buildUserContext(req).companyId;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_origin WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      if (!oldRow) {
        const error = new Error("Origin record not found or access denied");
        error.statusCode = 404;
        throw error;
      }
      await q("DELETE FROM dai_origin WHERE id=? AND company=?", [id, companyId]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Origin",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
        companyId,
      });
    });

    res.status(200).json({ status: true, message: "Origin deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = originRouter;
