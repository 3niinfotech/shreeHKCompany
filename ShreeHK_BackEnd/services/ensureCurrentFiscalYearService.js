const connection = require("../connection.js");
const { metaQuery } = require("../tenantHelper.js");

/**
 * India FY Apr–Mar. E.g. Oct 2026 → 2026-27 (1 Apr 2026 – 31 Mar 2027).
 */
function getCurrentFiscalYearMeta(referenceDate = new Date()) {
  const month = referenceDate.getMonth(); // 0-based
  const startYear = month >= 3 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1;
  const endYear = startYear + 1;
  const yearLabel = `${startYear}-${String(endYear).slice(-2)}`;
  return {
    startYear,
    endYear,
    yearLabel,
    fromDate: `${startYear}-04-01`,
    toDate: `${endYear}-03-31`,
  };
}

function normalizeYearLabel(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\//g, "-");
}

/** True if label is this FY (2026-27, 2026-2027, 2026/27, …). */
function isSameFiscalLabel(raw, startYear, endYear) {
  const key = normalizeYearLabel(raw);
  if (!key) return false;
  const short = `${startYear}-${String(endYear).slice(-2)}`;
  const long = `${startYear}-${endYear}`;
  const slash = `${startYear}/${String(endYear).slice(-2)}`;
  return key === normalizeYearLabel(short) || key === normalizeYearLabel(long) || key === normalizeYearLabel(slash);
}

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Ensure current financial year exists in company_year with full fromDate/toDate.
 * Used when adding branch/company and on login company-years.
 */
async function ensureCurrentFiscalYear() {
  const { startYear, endYear, yearLabel, fromDate, toDate } = getCurrentFiscalYearMeta();

  const yearsRaw = await metaQuery(
    `SELECT id, year, fromDate, toDate, db_name FROM company_year ORDER BY id DESC`
  );

  const hit =
    (yearsRaw || []).find((r) => isSameFiscalLabel(r.year, startYear, endYear)) ||
    (yearsRaw || []).find((r) => {
      const from = toDateOnly(r.fromDate);
      const to = toDateOnly(r.toDate);
      if (!from || !to) return false;
      // Row whose range covers current FY window
      return from <= fromDate && to >= toDate;
    });

  if (hit) {
    const needLabel = normalizeYearLabel(hit.year) !== normalizeYearLabel(yearLabel);
    const needFrom = toDateOnly(hit.fromDate) !== fromDate;
    const needTo = toDateOnly(hit.toDate) !== toDate;
    if (needLabel || needFrom || needTo) {
      await metaQuery(
        `UPDATE company_year SET year = ?, fromDate = ?, toDate = ? WHERE id = ?`,
        [yearLabel, fromDate, toDate, hit.id]
      );
    }
    return {
      id: hit.id,
      year: yearLabel,
      fromDate,
      toDate,
      created: false,
      updated: needLabel || needFrom || needTo,
    };
  }

  const latestDb = await metaQuery(
    `SELECT db_name FROM company_year
     WHERE db_name IS NOT NULL AND TRIM(db_name) <> ''
     ORDER BY id DESC
     LIMIT 1`
  );
  const dbName =
    (latestDb?.[0]?.db_name && String(latestDb[0].db_name).trim()) ||
    connection.META_DB ||
    process.env.DB_NAME ||
    "shreehkweb_snj2024_test";

  const result = await new Promise((resolve, reject) => {
    connection.getMetaPool().query(
      `INSERT INTO company_year (year, fromDate, toDate, db_name) VALUES (?, ?, ?, ?)`,
      [yearLabel, fromDate, toDate, dbName],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });

  return {
    id: result.insertId,
    year: yearLabel,
    fromDate,
    toDate,
    created: true,
    dbName,
  };
}

module.exports = {
  getCurrentFiscalYearMeta,
  ensureCurrentFiscalYear,
};
