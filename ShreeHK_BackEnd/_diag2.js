const connection = require("./connection.js");

const META_DB = connection.META_DB;

function q(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function schemaExists(pool, schemaName) {
  const rows = await q(
    pool,
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1",
    [schemaName]
  );
  return rows.length > 0;
}

async function tableExists(pool, schema, table) {
  const rows = await q(
    pool,
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1",
    [schema, table]
  );
  return rows.length > 0;
}

async function hasCompanyColumn(pool, schema, table) {
  const rows = await q(
    pool,
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'company' LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

const DATA_TABLES = ["product", "dai_product", "stock", "invoice", "party", "company"];
const GROUP_TABLES = ["product", "dai_product", "stock", "invoice", "party", "category", "dai_origin", "dai_lab"];

(async () => {
  const metaPool = connection.getMetaPool();
  try {
    const dbRow = await q(metaPool, "SELECT DATABASE() AS db");
    console.log("=== SELECT DATABASE() (meta pool) ===");
    console.log(JSON.stringify(dbRow[0], null, 2));
    console.log("META_DB env/default:", META_DB);

    const years = await q(metaPool, "SELECT id, year, db_name FROM company_year ORDER BY id");
    console.log("\n=== company_year (id, year, db_name) ===");
    console.log(JSON.stringify(years, null, 2));

    console.log("\n=== DB existence (INFORMATION_SCHEMA.SCHEMATA) ===");
    const dbStatus = [];
    const seen = new Set([META_DB]);
    for (const row of years) {
      if (row.db_name && !seen.has(row.db_name)) seen.add(row.db_name);
    }
    for (const name of seen) {
      const exists = await schemaExists(metaPool, name);
      dbStatus.push({ db_name: name, exists });
      console.log(`${name}: ${exists ? "EXISTS" : "MISSING"}`);
    }
    for (const row of years) {
      if (row.db_name && !dbStatus.find((d) => d.db_name === row.db_name)) {
        const exists = await schemaExists(metaPool, row.db_name);
        dbStatus.push({ db_name: row.db_name, exists });
        console.log(`${row.db_name} (from year ${row.id}): ${exists ? "EXISTS" : "MISSING"}`);
      }
    }

    console.log("\n=== resolveYearDbName fallback (no yearId => META) ===");
    console.log(
      "Default connection.query uses getActivePool() => META when no tenant:",
      META_DB
    );
    console.log(
      "Per-year: company_year.db_name if schema exists, else META_DB:",
      META_DB
    );

    const targetSchema = META_DB;
    console.log(`\n=== Table counts in schema: ${targetSchema} ===`);
    for (const table of DATA_TABLES) {
      const exists = await tableExists(metaPool, targetSchema, table);
      if (!exists) {
        console.log(`${table}: TABLE NOT FOUND`);
        continue;
      }
      const cnt = await q(
        metaPool,
        `SELECT COUNT(*) AS c FROM \`${targetSchema}\`.\`${table}\``
      );
      console.log(`${table}: COUNT(*) = ${cnt[0].c}`);
    }

    console.log(`\n=== Group by company (schema ${targetSchema}) ===`);
    for (const table of GROUP_TABLES) {
      const exists = await tableExists(metaPool, targetSchema, table);
      if (!exists) {
        console.log(`${table}: skip (no table)`);
        continue;
      }
      const hasCo = await hasCompanyColumn(metaPool, targetSchema, table);
      if (!hasCo) {
        const total = await q(
          metaPool,
          `SELECT COUNT(*) AS c FROM \`${targetSchema}\`.\`${table}\``
        );
        console.log(`${table}: no company column, total=${total[0].c}`);
        continue;
      }
      const byCo = await q(
        metaPool,
        `SELECT company, COUNT(*) AS c FROM \`${targetSchema}\`.\`${table}\`
         GROUP BY company ORDER BY c DESC LIMIT 15`
      );
      console.log(`${table}:`, JSON.stringify(byCo));
    }
  } catch (e) {
    console.error("FATAL", e);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
})();
