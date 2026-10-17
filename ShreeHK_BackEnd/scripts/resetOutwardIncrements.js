/**
 * After wiping sale/memo rows, sync dai_incrementid.outward + invoice
 * to (max existing + 1) or "1" when the table is empty.
 *
 * Usage: node scripts/resetOutwardIncrements.js
 */
try {
  require("dotenv").config();
} catch (_) {
  /* optional */
}

const mysql = require("mysql");

const dbName = process.env.DB_NAME || "shreehkweb_snj2024_test";
const conn = mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
  database: dbName,
  connectTimeout: 15000,
});

function q(sql, vals = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, vals, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

(async () => {
  try {
    console.log("DB:", dbName);
    const companies = await q("SELECT company, outward, invoice FROM dai_incrementid");
    for (const row of companies) {
      const companyId = row.company;
      const rows = await q(
        "SELECT entryno, invoiceno FROM dai_outward WHERE company = ?",
        [companyId]
      );
      const cnt = rows.length;
      let maxEntry = 0;
      let maxInvoice = 0;
      for (const r of rows) {
        const e = parseInt(String(r.entryno ?? "").replace(/\D/g, ""), 10);
        const i = parseInt(String(r.invoiceno ?? "").replace(/\D/g, ""), 10);
        if (!Number.isNaN(e) && e > maxEntry) maxEntry = e;
        if (!Number.isNaN(i) && i > maxInvoice) maxInvoice = i;
      }
      const nextOutward = cnt === 0 ? "1" : String(maxEntry + 1);
      const nextInvoice = cnt === 0 ? "1" : String(maxInvoice + 1);

      await q(
        "UPDATE dai_incrementid SET outward = ?, invoice = ? WHERE company = ?",
        [nextOutward, nextInvoice, companyId]
      );

      console.log(
        `company=${companyId} outward_rows=${cnt} | was outward=${row.outward} invoice=${row.invoice} → now outward=${nextOutward} invoice=${nextInvoice}`
      );
    }
    console.log("Done.");
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    conn.end();
  }
})();
