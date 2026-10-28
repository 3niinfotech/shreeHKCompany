const express = require("express");
const helper = require("../../helper.js");
const connection = require("../../connection.js");
const { authenticateToken, isSuperAdmin } = require("../../authMiddleware.js");
const { metaQuery } = require("../../tenantHelper.js");
const { ensureBranchSchema } = require("../../services/ensureBranchSchemaService.js");
const { ensureCurrentFiscalYear } = require("../../services/ensureCurrentFiscalYearService.js");
const { reassignSuratCompanies } = require("../../services/reassignSuratCompaniesService.js");
const { attachCurrentYearToBranch } = require("../../services/branchYearService.js");

const branchRouter = express.Router();
branchRouter.use(express.json());

const BRANCH_COLUMNS = ["name", "shortcutName", "address", "number", "city", "country", "status", "color_code"];

const ensureReady = async (_req, _res, next) => {
  try {
    await ensureBranchSchema();
    next();
  } catch (err) {
    next(err);
  }
};

branchRouter.use(ensureReady);

branchRouter.get("/admin/branch/options", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const rows = await metaQuery(
      "SELECT id, name, shortcutName, color_code FROM branch WHERE status = 1 ORDER BY name ASC"
    );
    res.json({ status: true, Data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.get("/admin/branch", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    // Seed HK / Dubai only (Surat is not auto-recreated after delete)
    await ensureBranchSchema();
    try {
      await reassignSuratCompanies();
    } catch (reErr) {
      console.error("reassignSuratCompanies:", reErr?.message || reErr);
    }

    const { searchInput = "", activeOnly } = req.query;
    let sql = `
      SELECT b.id, b.name, b.shortcutName, b.address, b.number, b.city, b.country, b.status, b.color_code, b.created_at,
        (SELECT COUNT(*) FROM company c WHERE c.branch_id = b.id) AS company_count,
        (SELECT GROUP_CONCAT(c.name ORDER BY c.id SEPARATOR '||')
           FROM company c WHERE c.branch_id = b.id) AS company_names
      FROM branch b
    `;
    const params = [];
    const where = [];
    // Default: show login-modal branches (active). Pass activeOnly=0 to include inactive.
    if (String(activeOnly) !== "0") {
      where.push("b.status = 1");
    }
    if (searchInput) {
      where.push("(b.name LIKE ? OR b.shortcutName LIKE ? OR b.city LIKE ? OR b.country LIKE ?)");
      const term = `%${searchInput}%`;
      params.push(term, term, term, term);
    }
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    // Same order as login modal
    sql += ` ORDER BY FIELD(LOWER(b.name), 'dubai', 'hk', 'surat'), b.name ASC`;
    const rows = await metaQuery(sql, params);
    res.json({
      status: true,
      TotalItems: rows.length,
      Data: (rows || []).map((r) => {
        const companyNames = String(r.company_names || "")
          .split("||")
          .map((n) => n.trim())
          .filter(Boolean);
        return {
          ...r,
          company_count: Number(r.company_count) || companyNames.length,
          company_names: companyNames,
          status: Number(r.status) ? 1 : 0,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.get("/admin/branch/:id", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Invalid id" });
    const rows = await metaQuery("SELECT * FROM branch WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) {
      return res.status(404).json({ status: false, message: "Branch not found" });
    }
    res.json({ status: true, Data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.post("/admin/branch/save", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const id = Number(body.id) || 0;
    const name = String(body.name || "").trim();
    if (!name) {
      return res.status(400).json({ status: false, message: "Branch name is required." });
    }

    const post = {};
    BRANCH_COLUMNS.forEach((col) => {
      if (body[col] !== undefined) post[col] = body[col];
    });
    post.name = name;
    if (post.status === undefined || post.status === null || post.status === "") {
      post.status = 1;
    } else {
      post.status = Number(post.status) ? 1 : 0;
    }

    if (post.color_code && typeof post.color_code === "string") {
      const trimmed = post.color_code.trim();
      if (/^[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
        post.color_code = `#${trimmed}`;
      } else {
        post.color_code = trimmed || null;
      }
    }

    const meta = connection.getMetaPool();

    if (id > 0) {
      post.id = id;
      const data = helper.updateString(post);
      meta.query(`UPDATE branch SET ${data} WHERE id = ?`, [id], (err) => {
        if (err) {
          if (/Duplicate|ER_DUP_ENTRY/i.test(String(err.message || ""))) {
            return res.status(400).json({ status: false, message: "Branch name already exists." });
          }
          return res.status(500).json({ status: false, message: err.message });
        }
        res.json({ status: true, message: "Branch saved successfully.", id });
      });
      return;
    }

    const data = helper.insertString(post);
    meta.query(`INSERT INTO branch (${data[0]}) VALUES (${data[1]})`, async (err, result) => {
      if (err) {
        if (/Duplicate|ER_DUP_ENTRY/i.test(String(err.message || ""))) {
          return res.status(400).json({ status: false, message: "Branch name already exists." });
        }
        return res.status(500).json({ status: false, message: err.message });
      }
      let fy = null;
      try {
        // New branch → only current FY (not all historical years from other companies)
        fy = await attachCurrentYearToBranch(result.insertId);
      } catch (fyErr) {
        console.error("attachCurrentYearToBranch after branch create:", fyErr?.message || fyErr);
        try {
          fy = await ensureCurrentFiscalYear();
        } catch (_) {
          /* ignore */
        }
      }
      const fyNote = fy?.year
        ? ` Current financial year ${fy.year} linked (only this year).`
        : "";
      res.status(201).json({
        status: true,
        message: `Branch created successfully.${fyNote}`,
        id: result.insertId,
        currentYear: fy
          ? { yearId: fy.id, yearLabel: fy.year, fromDate: fy.fromDate, toDate: fy.toDate }
          : null,
      });
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

branchRouter.post("/admin/branch/delete", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.body?.id);
    if (!id) {
      return res.status(400).json({ status: false, message: "Branch id is required." });
    }

    const existing = await metaQuery("SELECT id, name FROM branch WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) {
      return res.status(404).json({ status: false, message: "Branch not found." });
    }

    // Always free linked companies first (move to HK/Dubai, else clear branch_id)
    const linked = await metaQuery(
      "SELECT id FROM company WHERE branch_id = ? ORDER BY id",
      [id]
    );
    let moved = 0;
    if (linked.length) {
      const targets = await metaQuery(
        `SELECT id, name FROM branch
         WHERE id <> ? AND status = 1
         ORDER BY FIELD(LOWER(TRIM(name)), 'hk', 'dubai', 'uae'), id ASC`,
        [id]
      );
      if (targets.length) {
        for (let i = 0; i < linked.length; i += 1) {
          await metaQuery("UPDATE company SET branch_id = ? WHERE id = ?", [
            targets[i % targets.length].id,
            linked[i].id,
          ]);
        }
        moved = linked.length;
      } else {
        await metaQuery("UPDATE company SET branch_id = NULL WHERE branch_id = ?", [id]);
        moved = linked.length;
      }
    }

    try {
      await metaQuery("DELETE FROM branch_year WHERE branch_id = ?", [id]);
    } catch (_) {
      /* table may not exist yet */
    }
    await metaQuery("DELETE FROM branch WHERE id = ?", [id]);
    const movedNote = moved
      ? ` ${moved} compan${moved === 1 ? "y" : "ies"} moved off this branch.`
      : "";
    res.json({
      status: true,
      message: `"${existing[0].name}" deleted successfully.${movedNote}`,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = branchRouter;
