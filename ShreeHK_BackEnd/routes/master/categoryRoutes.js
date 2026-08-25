const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const categoryRouter = express.Router();

categoryRouter.use(express.json());

// Get
categoryRouter.get("/master/category", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.json({ TotalItems: 0, Data: [] });
  }

  const id = parseInt(req?.query?.id) || 0;
  const searchInput = req.query.searchInput;

  // Join parent so Parent column can show name even when search filters out the parent row
  let query = `
    SELECT c.*, p.name AS parent_name
    FROM category c
    LEFT JOIN category p ON c.parent = p.id AND c.parent <> 0 AND p.company = ${companyId}
    WHERE c.company = ${companyId}
  `;

  const countQuery = `SELECT COUNT(*) as totalItems FROM category WHERE company = ${companyId}`;

  connection.query(countQuery, (countError, countResult) => {
    if (countError) return res.status(500).json({ error: countError.message });

    const totalItems = countResult[0]?.totalItems || 0;

    if (id == 0) {
      if (searchInput) {
        const escaped = connection.escape("%" + searchInput + "%");
        // Search category name OR parent category name (not numeric parent id)
        query += ` AND (c.name LIKE ${escaped} OR p.name LIKE ${escaped})`;
      }

      query += ` ORDER BY c.id DESC`;
    } else {
      query += ` AND c.id=${parseInt(id)}`;
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
categoryRouter.post("/category/save", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId || 1;
  const { id, name, parent } = req.body;

  try {
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
