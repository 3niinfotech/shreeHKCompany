const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const companyRouter = express.Router();

companyRouter.use(express.json());

//Get
companyRouter.get("/master/company", authenticateToken, (req, res) => {
  const limit = parseInt(req?.query?.limit) || 100;
  const offset = parseInt(req?.query?.offset) || 0;
  const id = parseInt(req?.query?.id) || 0;
  const searchInput = req.query.searchInput;
  const companyId = buildUserContext(req).companyId;

  const paginationOffset = offset * limit;

  let query = `SELECT * FROM dai_party WHERE company = ? `;
  const countQuery = `SELECT COUNT(*) as totalItems FROM dai_party WHERE company = ? `;
  const baseParams = [companyId];

  connection.query(countQuery, baseParams, (countError, countResult) => {
    if (countError) return res.status(500).json({ error: countError.message });

    const params = [...baseParams];
    if (id == 0) {
      if (searchInput) {
        const term = `%${searchInput}%`;
        query += `AND (name LIKE ? OR country LIKE ? OR contact_number LIKE ? OR contact_person LIKE ?) `;
        params.push(term, term, term, term);
      }
      query += ` ORDER BY id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(paginationOffset)}`;
    } else {
      query += ` AND id=?`;
      params.push(parseInt(id));
    }

    const totalItems = countResult[0].totalItems;

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
companyRouter.post("/company/save", authenticateToken, async (req, res) => {
  const { id } = req.body;
  const { body } = req;
  const companyId = buildUserContext(req).companyId;

  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: "Request body is empty" });
  }

  let message = "There was an error. Please check it";

  try {
    await helper.runInTransaction(async (q) => {
      let oldRow = null;
      if (id != 0) {
        const rows = await q("SELECT * FROM dai_party WHERE id=? AND company=?", [id, companyId]);
        oldRow = rows[0] || null;
      }

      if (id == 0) {
        body.company = companyId;
        const insertResponse = helper.insertString(body);
        const insertResult = await q(
          `INSERT INTO dai_party (${insertResponse[0]}) VALUES (${insertResponse[1]})`,
        );
        const newId = insertResult.insertId;
        const newRows = await q("SELECT * FROM dai_party WHERE id=?", [newId]);
        message = "New Company has been addedd successfully!";
        await logAuditInTx(q, {
          actionType: "CREATE",
          moduleName: "Party",
          recordId: newId,
          recordReference: newRows[0]?.name || String(newId),
          newValue: newRows[0],
          companyId,
        });
      } else {
        const updateResponse = helper.updateString(body);
        await q(`UPDATE dai_party SET ${updateResponse} WHERE id=? AND company=?`, [id, companyId]);
        const newRows = await q("SELECT * FROM dai_party WHERE id=? AND company=?", [id, companyId]);
        message = "Company has been updated successfully!";
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Party",
          recordId: id,
          recordReference: newRows[0]?.name || String(id),
          oldValue: oldRow,
          newValue: newRows[0],
          companyId,
        });
      }
    });

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
companyRouter.delete("/company/delete", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId);
  const companyId = buildUserContext(req).companyId;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing deleteId" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_party WHERE id=? AND company=?", [id, companyId]);
      const oldRow = rows[0] || null;
      await q("DELETE FROM dai_party WHERE id=? AND company=?", [id, companyId]);
      await logAuditInTx(q, {
        actionType: "DELETE",
        moduleName: "Party",
        recordId: id,
        recordReference: oldRow?.name || String(id),
        oldValue: oldRow,
        companyId,
      });
    });

    res.status(201).json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Option
companyRouter.get("/company/getOption", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  const query = `SELECT id,name FROM dai_party WHERE company = ? ORDER BY name`;

  connection.query(query, [companyId], (error, data) => {
    if (error) return res.status(500).json({ error: error.message });

    const response = {
      Data: data,
    };
    res.json(response);
  });
});

module.exports = companyRouter;
