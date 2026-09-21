const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");

const accSubgroupRouter = express.Router();
accSubgroupRouter.use(express.json());

accSubgroupRouter.get("/accounting/subgroup", authenticateToken, (req, res) => {
  const sql = `
    SELECT s.id, s.name, s.under, g.name AS under_name
    FROM acc_subgroup s
    LEFT JOIN acc_group g ON (s.under = g.id OR s.under = g.name)
    ORDER BY s.name
  `;
  connection.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ TotalItems: data.length, Data: data });
  });
});

accSubgroupRouter.post("/accounting/subgroup/save", authenticateToken, async (req, res) => {
  const { id, name } = req.body;
  const under = req.body.under !== undefined ? req.body.under : (req.body.group_id !== undefined ? req.body.group_id : null);
  if (!name) return res.status(400).json({ error: "name required" });

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id) {
        const rows = await q("SELECT * FROM acc_subgroup WHERE id=?", [id]);
        oldRow = rows[0] || null;
      }

      if (id) {
        await q("UPDATE acc_subgroup SET name = ?, `under` = ? WHERE id = ?", [
          name,
          under,
          id,
        ]);
        const newRows = await q("SELECT * FROM acc_subgroup WHERE id=?", [id]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Accounting Sub Group",
          recordId: id,
          recordReference: name,
          oldValue: oldRow,
          newValue: newRows[0],
        });
      } else {
        const result = await q("INSERT INTO acc_subgroup (name, `under`) VALUES (?, ?)", [
          name,
          under,
        ]);
        const newRows = await q("SELECT * FROM acc_subgroup WHERE id=?", [result.insertId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Accounting Sub Group",
          recordId: result.insertId,
          recordReference: name,
          newValue: newRows[0],
        });
      }
    });
    res.status(201).json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

accSubgroupRouter.delete("/accounting/subgroup/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM acc_subgroup WHERE id=?", [id]);
      const oldRow = rows[0] || null;
      await q("DELETE FROM acc_subgroup WHERE id = ?", [id]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Accounting Sub Group",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
      });
    });
    res.status(201).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = accSubgroupRouter;
