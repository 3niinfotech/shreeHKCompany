const helper = require("../../helper.js");

const BASE_WHERE = `p.company = ? AND p.visibility = 1`;

const getInventorySuggestions = async (q, limit = 12, companyId = 1) => {
  const trimmed = String(q ?? "").trim();
  if (!trimmed) return [];

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 20);
  const like = `%${trimmed}%`;
  const cid = Number(companyId) || 1;

  const rows = await helper.query(
    `SELECT
      p.sku,
      p.mfg_code,
      pv.report_no,
      pv.shape,
      pv.cut,
      pv.polish,
      p.polish_carat
    FROM dai_product p
    JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ? AND p.visibility = 1
      AND (
        p.sku LIKE ?
        OR p.mfg_code LIKE ?
        OR pv.report_no LIKE ?
        OR pv.shape LIKE ?
        OR pv.cut LIKE ?
        OR pv.polish LIKE ?
        OR CAST(p.polish_carat AS CHAR) LIKE ?
      )
    ORDER BY p.sku ASC
    LIMIT ?`,
    [cid, like, like, like, like, like, like, like, safeLimit * 4],
  );

  const suggestions = [];
  const seen = new Set();
  const qLower = trimmed.toLowerCase();

  const add = (type, value, label, meta = "") => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return;
    const key = `${type}:${normalized.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ type, value: normalized, label, meta });
  };

  for (const row of rows) {
    const meta = [row.shape, row.polish_carat != null ? `${row.polish_carat} ct` : null, row.cut, row.polish]
      .filter(Boolean)
      .join(" · ");

    if (row.sku && String(row.sku).toLowerCase().includes(qLower)) {
      add("sku", row.sku, row.sku, meta);
    }
    if (row.mfg_code && String(row.mfg_code).toLowerCase().includes(qLower)) {
      add("mfg", row.mfg_code, `MFG: ${row.mfg_code}`, meta);
    }
    if (row.report_no && String(row.report_no).toLowerCase().includes(qLower)) {
      add("report", row.report_no, `Report: ${row.report_no}`, meta);
    }
    if (row.shape && String(row.shape).toLowerCase().includes(qLower)) {
      add("shape", row.shape, `Shape: ${row.shape}`);
    }
    if (row.cut && String(row.cut).toLowerCase().includes(qLower)) {
      add("cut", row.cut, `Cut: ${row.cut}`);
    }
    if (row.polish && String(row.polish).toLowerCase().includes(qLower)) {
      add("polish", row.polish, `Polish: ${row.polish}`);
    }
    if (row.polish_carat != null && String(row.polish_carat).includes(trimmed)) {
      add("carat", row.polish_carat, `Carat: ${row.polish_carat} ct`);
    }

    if (suggestions.length >= safeLimit) break;
  }

  return suggestions.slice(0, safeLimit);
};

module.exports = { getInventorySuggestions };
