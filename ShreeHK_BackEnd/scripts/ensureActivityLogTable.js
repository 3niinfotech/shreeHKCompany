const fs = require("fs");
const path = require("path");
const connection = require("../connection.js");

let ensured = false;

function queryPool(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureOnPool(pool, label) {
  const sqlPath = path.join(__dirname, "..", "migrations", "create_dai_activity_log.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await queryPool(pool, sql);
  console.log(`dai_activity_log ready on ${label}`);
}

/**
 * Ensure dai_activity_log on meta DB and all company_year databases at startup.
 */
async function ensureActivityLogTableOnMeta() {
  if (ensured) return;

  const metaPool = connection.getMetaPool();
  await ensureOnPool(metaPool, `meta (${connection.META_DB})`);

  try {
    const rows = await queryPool(
      metaPool,
      "SELECT DISTINCT db_name FROM company_year WHERE db_name IS NOT NULL AND db_name != ''",
    );
    const dbNames = [...new Set(rows.map((r) => r.db_name).filter(Boolean))];
    for (const dbName of dbNames) {
      try {
        await ensureOnPool(connection.getPoolForDb(dbName), dbName);
      } catch (e) {
        console.warn(`dai_activity_log skip ${dbName}:`, e.message);
      }
    }
  } catch (e) {
    console.warn("company_year scan skipped:", e.message);
  }

  ensured = true;
}

module.exports = { ensureActivityLogTableOnMeta };
