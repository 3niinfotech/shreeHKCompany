const express = require("express");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { ensureCompanyColumn } = require("../../schemaHelper.js");
const { fetchMasterList } = require("./masterListHelper.js");
const categoryRouter = express.Router();

categoryRouter.use(express.json());

// Get
categoryRouter.get("/master/category", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;

  const id = parseInt(req?.query?.id) || 0;
  const searchInput = req.query.searchInput;

  try {
    const response = await fetchMasterList({
      tableName: "category",
      companyId,
      buildQueries: (cid) => {
        let dataSql = `
          SELECT c.*, p.name AS parent_name
          FROM category c
          LEFT JOIN category p ON c.parent = p.id AND c.parent <> 0 AND p.company = ?
          WHERE c.company = ?
        `;
        let countSql = `SELECT COUNT(*) as totalItems FROM category WHERE company = ?`;
        const dataParams = [cid, cid];
        const countParams = [cid];

        if (id === 0) {
          if (searchInput) {
            const like = `%${searchInput}%`;
            dataSql += ` AND (c.name LIKE ? OR p.name LIKE ?)`;
            dataParams.push(like, like);
          }
          dataSql += ` ORDER BY c.id DESC`;
        } else {
          dataSql += ` AND c.id = ?`;
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
categoryRouter.post("/category/save", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;
  const { id, name, parent } = req.body;

  try {
    await ensureCompanyColumn("category", companyId);
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id != 0) {
        const rows = await q("SELECT * FROM category WHERE id=?", [id]);
        oldRow = rows[0] || null;
      }

      if (id == 0) {
        const result = await q("INSERT INTO category (name, parent, company) VALUES (?, ?, ?)", [name, parent, companyId]);
        const newRows = await q("SELECT * FROM category WHERE id=?", [result.insertId]);
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Category",
          recordId: result.insertId,
          recordReference: name,
          newValue: newRows[0],
          companyId,
        });
      } else {
        await q("UPDATE category SET name=?, parent=? WHERE id=? AND company=?", [name, parent, id, companyId]);
        const newRows = await q("SELECT * FROM category WHERE id=?", [id]);
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Category",
          recordId: id,
          recordReference: name,
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      }
    });

    res.status(201).json({ message: "Category created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
categoryRouter.delete("/category/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId);
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM category WHERE id=?", [id]);
      const oldRow = rows[0] || null;
      await q("DELETE FROM category WHERE id=?", [id]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Category",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
      });
    });

    res.status(201).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = categoryRouter;
