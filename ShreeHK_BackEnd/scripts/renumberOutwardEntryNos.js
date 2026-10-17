/**
 * Renumber dai_outward.entryno per company (oldest → newest).
 * Then set dai_incrementid.outward = max + 1.
 *
 * Usage: node scripts/renumberOutwardEntryNos.js
 * Optional: node scripts/renumberOutwardEntryNos.js --memo-only
 */
try {
  require("dotenv").config();
} catch (_) {
  /* optional */
}

const mysql = require("mysql");

const memoOnly = process.argv.includes("--memo-only");
const dbName = process.env.DB_NAME || "shreehkweb_snj2024_test";

const conn = mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
  database: dbName,
  connectTimeout: 20000,
});

function q(sql, vals = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, vals, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

(async () => {
  try {
    console.log("DB:", dbName, memoOnly ? "(memo/consign only)" : "(all outward)");

    const companies = await q(
      `SELECT DISTINCT company FROM dai_outward WHERE company IS NOT NULL AND company <> ''`
    );

    if (!companies.length) {
      console.log("No dai_outward rows found.");
      return;
    }

    for (const c of companies) {
      const companyId = c.company;
      const typeFilter = memoOnly
        ? " AND LOWER(TRIM(type)) IN ('memo', 'consign')"
        : "";

      const rows = await q(
        `SELECT id, entryno, type, invoiceno
         FROM dai_outward
         WHERE (company = ? OR company = ?) ${typeFilter}
         ORDER BY COALESCE(date, invoicedate, '1970-01-01') ASC, id ASC`,
        [companyId, String(companyId)]
      );

      console.log(`\ncompany=${companyId} rows=${rows.length}`);

      let n = 0;
      for (const row of rows) {
        n += 1;
        const nextEntry = String(n);
        if (String(row.entryno) === nextEntry) {
          console.log(`  id=${row.id} already entryno=${nextEntry} (${row.type})`);
          continue;
        }
        await q("UPDATE dai_outward SET entryno = ? WHERE id = ?", [nextEntry, row.id]);
        console.log(
          `  id=${row.id} ${row.entryno} → ${nextEntry} (${row.type} / inv ${row.invoiceno})`
        );
      }

      // Next free number for this company (consider ALL outward if memo-only renumber)
      const allForMax = await q(
        `SELECT entryno FROM dai_outward WHERE company = ? OR company = ?`,
        [companyId, String(companyId)]
      );
      let maxEntry = 0;
      for (const r of allForMax) {
        const e = parseInt(String(r.entryno ?? "").replace(/\D/g, ""), 10);
        if (!Number.isNaN(e) && e > maxEntry) maxEntry = e;
      }
      const nextOutward = String(maxEntry + 1);

      const inc = await q("SELECT outward FROM dai_incrementid WHERE company = ? LIMIT 1", [
        companyId,
      ]);
      if (inc.length) {
        await q("UPDATE dai_incrementid SET outward = ? WHERE company = ?", [
          nextOutward,
          companyId,
        ]);
        console.log(
          `  incrementid.outward ${inc[0].outward} → ${nextOutward}`
        );
      } else {
        console.log(`  no dai_incrementid row for company=${companyId} (skipped)`);
      }
    }

    console.log("\nDone.");
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    conn.end();
  }
})();
