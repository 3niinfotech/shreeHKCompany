const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");

const accGroupRouter = express.Router();
accGroupRouter.use(express.json());

accGroupRouter.get("/accounting/group", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  const query = "SELECT * FROM acc_group WHERE (company = ? OR company = 1 OR company IS NULL) ORDER BY name";
  connection.query(query, [companyId], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ TotalItems: data.length, Data: data });
  });
});

accGroupRouter.post("/accounting/group/save", authenticateToken, async (req, res) => {
  const { id, name } = req.body;
  const companyId = buildUserContext(req).companyId || 1;
  if (!name) return res.status(400).json({ error: "name required" });

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id) {
        const rows = await q("SELECT * FROM acc_group WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
        if (!oldRow) {
          const error = new Error("Record not found or access denied");
          error.statusCode = 404;
          throw error;
        }
      }

      if (id) {
        await q("UPDATE acc_group SET name = ? WHERE id = ? AND company = ?", [name, id, companyId]);
        const newRows = await q("SELECT * FROM acc_group WHERE id=? AND company=?", [id, companyId]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Accounting Group",
          recordId: id,
          recordReference: name,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      } else {
        const result = await q("INSERT INTO acc_group (name, company) VALUES (?, ?)", [name, companyId]);
        const newRows = await q("SELECT * FROM acc_group WHERE id=? AND company=?", [result.insertId, companyId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Accounting Group",
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

accGroupRouter.delete("/accounting/group/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  const companyId = buildUserContext(req).companyId;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM acc_group WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      if (!oldRow) {
        const error = new Error("Record not found or access denied");
        error.statusCode = 404;
        throw error;
      }
      await q("DELETE FROM acc_group WHERE id = ? AND company = ?", [id, companyId]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Accounting Group",
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

module.exports = accGroupRouter;
