const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const shippingRouter = express.Router();

shippingRouter.use(express.json());

// Get
shippingRouter.get("/master/shipping", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.json({ TotalItems: 0, Data: [] });
  }

  const id = parseInt(req?.query?.id) || 0;
  const searchInput = req.query.searchInput;

  let query = `SELECT * FROM dai_shipping WHERE company = ${companyId}`;
  const countQuery = `SELECT COUNT(*) as totalItems FROM dai_shipping WHERE company = ${companyId}`;

  connection.query(countQuery, (countError, countResult) => {
    if (countError) return res.status(500).json({ error: countError.message });

    const totalItems = countResult[0]?.totalItems || 0;

    if (id == 0) {
      if (searchInput) {
        query += ` AND name LIKE ${connection.escape("%" + searchInput + "%")}`;
      }

      query += ` ORDER BY id DESC`;
    } else {
      query += ` AND id=${parseInt(id)}`;
    }

    connection.query(query, (error, data) => {
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
shippingRouter.post("/shipping/save", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;
  const { id, name } = req.body;

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id != 0) {
        const rows = await q("SELECT * FROM dai_shipping WHERE id=?", [id]);
        oldRow = rows[0] || null;
      }

      if (id == 0) {
        const result = await q("INSERT INTO dai_shipping (name, company) VALUES (?, ?)", [name, companyId]);
        const newRows = await q("SELECT * FROM dai_shipping WHERE id=?", [result.insertId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Shipping",
          recordId: result.insertId,
          recordReference: name,
          newValue: newRows[0],
          companyId,
        });
      } else {
        await q("UPDATE dai_shipping SET name=? WHERE id=? AND company=?", [name, id, companyId]);
        const newRows = await q("SELECT * FROM dai_shipping WHERE id=?", [id]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Shipping",
          recordId: id,
          recordReference: name,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      }
    });

    res.status(201).json({ message: "Shipping created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
shippingRouter.delete("/shipping/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId);
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_shipping WHERE id=?", [id]);
      const oldRow = rows[0] || null;
      await q("DELETE FROM dai_shipping WHERE id=?", [id]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Shipping",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
      });
    });

    res.status(201).json({ message: "Shipping deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = shippingRouter;
