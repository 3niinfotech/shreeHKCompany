const connection = require("./connection.js");

function q(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

(async () => {
  try {
    const db = await q("SELECT DATABASE() AS db");
    console.log("DATABASE:", db[0]?.db);

    for (const table of ["dai_origin", "category", "dai_lab", "dai_shipping"]) {
      try {
        const cols = await q(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'company'`,
          [table]
        );
        const total = await q(`SELECT COUNT(*) AS c FROM \`${table}\``);
        let byCompany = [];
        if (cols.length) {
          byCompany = await q(
            `SELECT company, COUNT(*) AS c FROM \`${table}\` GROUP BY company ORDER BY c DESC`
          );
        }
        console.log(`\n${table}: hasCompany=${cols.length > 0} total=${total[0]?.c}`);
        console.log("  byCompany:", JSON.stringify(byCompany));
      } catch (e) {
        console.log(`\n${table}: ERROR`, e.message);
      }
    }

    const companies = await q("SELECT id, name FROM company ORDER BY id LIMIT 20");
    console.log("\ncompanies:", JSON.stringify(companies));
    const years = await q("SELECT id, year, db_name FROM company_year ORDER BY id LIMIT 20");
    console.log("years:", JSON.stringify(years));
  } catch (e) {
    console.error("FATAL", e);
  } finally {
    process.exit(0);
  }
})();
