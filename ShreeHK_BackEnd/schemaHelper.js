const connection = require("./connection.js");

const columnCache = new Map();

function queryOnPool(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function queryAsync(sql, values = []) {
  return queryOnPool(connection.getActivePool(), sql, values);
}

function dbCacheKey() {
  const store = connection.getTenantStore?.() || null;
  return store?.dbName || connection.META_DB || "default";
}

/**
 * Cached check: does current tenant DB table have this column?
 */
async function hasColumn(tableName, columnName, pool = null) {
  const table = String(tableName || "").replace(/[^a-zA-Z0-9_]/g, "");
  const column = String(columnName || "").replace(/[^a-zA-Z0-9_]/g, "");
  if (!table || !column) return false;

  const cacheKey = `${dbCacheKey()}.${table}.${column}`;
  if (columnCache.has(cacheKey)) return columnCache.get(cacheKey);

  const run = pool ? (sql, vals) => queryOnPool(pool, sql, vals) : queryAsync;
  const rows = await run(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  const exists = Boolean(rows?.length);
  columnCache.set(cacheKey, exists);
  return exists;
}

/**
 * Ensure `company` column exists and master rows are visible for active company.
 * Venya dumps often lack the column, or use a different company id than the UI session.
 */
async function ensureCompanyColumn(tableName, companyId = 1) {
  const table = String(tableName || "").replace(/[^a-zA-Z0-9_]/g, "");
  if (!table) return false;

  const cid = Number(companyId) > 0 ? Number(companyId) : 1;
  const exists = await hasColumn(table, "company");

  if (!exists) {
    await queryAsync(
      `ALTER TABLE \`${table}\` ADD COLUMN \`company\` int(11) NOT NULL DEFAULT ${cid}`
    );
    columnCache.set(`${dbCacheKey()}.${table}.company`, true);
    await queryAsync(`UPDATE \`${table}\` SET company = ?`, [cid]);
    return true;
  }

  // NULL/0 → active company
  await queryAsync(
    `UPDATE \`${table}\` SET company = ? WHERE company IS NULL OR company = 0`,
    [cid]
  );

  // If active company still has 0 rows but table has data, rematch all to active company
  // (common after importing Venya DB where company ids differ from ShreeHK session)
  const forCompany = await queryAsync(
    `SELECT COUNT(*) AS c FROM \`${table}\` WHERE company = ?`,
    [cid]
  );
  const total = await queryAsync(`SELECT COUNT(*) AS c FROM \`${table}\``);
  if (Number(forCompany?.[0]?.c || 0) === 0 && Number(total?.[0]?.c || 0) > 0) {
    await queryAsync(`UPDATE \`${table}\` SET company = ?`, [cid]);
  }

  return true;
}

module.exports = {
  hasColumn,
  ensureCompanyColumn,
  queryAsync,
};
