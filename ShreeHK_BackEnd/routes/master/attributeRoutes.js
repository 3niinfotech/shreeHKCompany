const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");

const attributeRouter = express.Router();
attributeRouter.use(express.json());

attributeRouter.get("/master/attribute", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.json({ TotalItems: 0, Data: [] });
  }
  const searchInput = req.query.searchInput;
  let query = `SELECT * FROM dai_attribute WHERE company = ?`;
  const params = [companyId];
  if (searchInput) {
    query += ` AND (name LIKE ? OR code LIKE ? OR value LIKE ?)`;
    const term = `%${searchInput}%`;
    params.push(term, term, term);
  }
  query += ` ORDER BY short_order ASC, id DESC`;
  connection.query(query, params, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ TotalItems: data.length, Data: data });
  });
});

attributeRouter.post("/attribute/save", authenticateToken, async (req, res) => {
  const { id, ...body } = req.body;
  const companyId = buildUserContext(req).companyId || 1;
  body.company = companyId;
  if (!body.name || !body.code) {
    return res.status(400).json({ error: "name and code are required" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id && id !== 0) {
        const rows = await q("SELECT * FROM dai_attribute WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
        if (!oldRow) {
          const error = new Error("Attribute not found or access denied");
          error.statusCode = 404;
          throw error;
        }
      }

      if (!id || id === 0) {
        const ins = helper.insertString(body);
        const result = await q(
          `INSERT INTO dai_attribute (${ins[0]}) VALUES (${ins[1]})`,
        );
        const newRows = await q("SELECT * FROM dai_attribute WHERE id=? AND company=?", [result.insertId, companyId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Attribute",
          recordId: result.insertId,
          recordReference: body.name,
          newValue: newRows[0],
          companyId,
        });
      } else {
        const upd = helper.updateString(body);
        await q(`UPDATE dai_attribute SET ${upd} WHERE id = ? AND company = ?`, [id, companyId]);
        const newRows = await q("SELECT * FROM dai_attribute WHERE id=? AND company=?", [id, companyId]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Attribute",
          recordId: id,
          recordReference: body.name,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      }
    });

    res.status(201).json({ message: id ? "Attribute updated" : "Attribute added" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

attributeRouter.delete("/attribute/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  const companyId = buildUserContext(req).companyId;
  if (!id) return res.status(400).json({ error: "deleteId required" });

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_attribute WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      if (!oldRow) {
        const error = new Error("Attribute not found or access denied");
        error.statusCode = 404;
        throw error;
      }
      await q("DELETE FROM dai_attribute WHERE id = ? AND company = ?", [id, companyId]);
      await q("DELETE FROM dai_attribute_value WHERE attribute_id = ?", [id]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Attribute",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
        companyId: companyId,
      });
    });

    res.status(200).json({ status: true, message: "Attribute deleted" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

attributeRouter.get("/attribute/getOption", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.json({ Data: [] });
  }
  connection.query(
    "SELECT code, name, value FROM dai_attribute WHERE company = ? ORDER BY short_order",
    [companyId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ Data: rows });
    },
  );
});

module.exports = attributeRouter;
