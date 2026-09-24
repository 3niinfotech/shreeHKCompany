const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");

const accSubgroupRouter = express.Router();
accSubgroupRouter.use(express.json());

accSubgroupRouter.get("/accounting/subgroup", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  const sql = `
    SELECT s.id, s.name, s.under, g.name AS under_name
    FROM acc_subgroup s
    LEFT JOIN acc_group g ON (s.under = g.id OR s.under = g.name)
    WHERE (s.company = ? OR s.company = 1 OR s.company IS NULL)
    ORDER BY s.name
  `;
  connection.query(sql, [companyId], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ TotalItems: data.length, Data: data });
  });
});

accSubgroupRouter.post("/accounting/subgroup/save", authenticateToken, async (req, res) => {
  const { id, name } = req.body;
  const companyId = buildUserContext(req).companyId || 1;
  const under = req.body.under !== undefined ? req.body.under : (req.body.group_id !== undefined ? req.body.group_id : null);
  if (!name) return res.status(400).json({ error: "name required" });

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id) {
        const rows = await q("SELECT * FROM acc_subgroup WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
        if (!oldRow) {
          const error = new Error("Record not found or access denied");
          error.statusCode = 404;
          throw error;
        }
      }

      if (id) {
        await q("UPDATE acc_subgroup SET name = ?, `under` = ? WHERE id = ? AND company = ?", [
          name,
          under,
          id,
          companyId,
        ]);
        const newRows = await q("SELECT * FROM acc_subgroup WHERE id=? AND company=?", [id, companyId]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Accounting Sub Group",
          recordId: id,
          recordReference: name,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      } else {
        const result = await q("INSERT INTO acc_subgroup (name, `under`, company) VALUES (?, ?, ?)", [
          name,
          under,
          companyId,
        ]);
        const newRows = await q("SELECT * FROM acc_subgroup WHERE id=? AND company=?", [result.insertId, companyId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Accounting Sub Group",
          recordId: result.insertId,
          recordReference: name,
          newValue: newRows[0],
          companyId,
        });
      }
    });
    res.status(201).json({ message: "Saved" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

accSubgroupRouter.delete("/accounting/subgroup/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  const companyId = buildUserContext(req).companyId;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM acc_subgroup WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      if (!oldRow) {
        const error = new Error("Record not found or access denied");
        error.statusCode = 404;
        throw error;
      }
      await q("DELETE FROM acc_subgroup WHERE id = ? AND company = ?", [id, companyId]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Accounting Sub Group",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
        companyId,
      });
    });
    res.status(201).json({ message: "Deleted" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = accSubgroupRouter;
