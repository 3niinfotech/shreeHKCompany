const express = require("express");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { ensureCompanyColumn } = require("../../schemaHelper.js");
const { fetchMasterList } = require("./masterListHelper.js");
const shippingRouter = express.Router();

shippingRouter.use(express.json());

// Get
shippingRouter.get("/master/shipping", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;

  const id = parseInt(req?.query?.id) || 0;
  const searchInput = req.query.searchInput;

  try {
    const response = await fetchMasterList({
      tableName: "dai_shipping",
      companyId,
      buildQueries: (cid) => {
        let dataSql = `SELECT * FROM dai_shipping WHERE company = ?`;
        let countSql = `SELECT COUNT(*) as totalItems FROM dai_shipping WHERE company = ?`;
        const dataParams = [cid];
        const countParams = [cid];
        if (id === 0) {
          if (searchInput) {
            dataSql += ` AND name LIKE ?`;
            countSql += ` AND name LIKE ?`;
            dataParams.push(`%${searchInput}%`);
            countParams.push(`%${searchInput}%`);
          }
          dataSql += ` ORDER BY id DESC`;
        } else {
          dataSql += ` AND id = ?`;
          dataParams.push(id);
        }
        return { dataSql, countSql, dataParams, countParams };
      },
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post
shippingRouter.post("/shipping/save", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;
  const { id, name } = req.body;

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id != 0) {
        const rows = await q("SELECT * FROM dai_shipping WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
        if (!oldRow) {
          const error = new Error("Shipping record not found or access denied");
          error.statusCode = 404;
          throw error;
        }
      }

      if (id == 0) {
        const result = await q("INSERT INTO dai_shipping (name, company) VALUES (?, ?)", [name, companyId]);
        const newRows = await q("SELECT * FROM dai_shipping WHERE id=? AND company=?", [result.insertId, companyId]);
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
        const newRows = await q("SELECT * FROM dai_shipping WHERE id=? AND company=?", [id, companyId]);
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
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Delete
shippingRouter.delete("/shipping/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId);
  const companyId = buildUserContext(req).companyId;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_shipping WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      if (!oldRow) {
        const error = new Error("Shipping record not found or access denied");
        error.statusCode = 404;
        throw error;
      }
      await q("DELETE FROM dai_shipping WHERE id=? AND company=?", [id, companyId]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Shipping",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
        companyId,
      });
    });

    res.status(200).json({ status: true, message: "Shipping deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = shippingRouter;
