/**
 * Point app + company_year.db_name to shreehkweb_snj2024_test
 * Usage: node scripts/switchToTestDb.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mysql = require("mysql");

const TARGET = "shreehkweb_snj2024_test";
const cfg = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
};

const conn = mysql.createConnection({ ...cfg, database: TARGET });

conn.connect((err) => {
  if (err) {
    console.error("Connect failed:", err.message);
    console.error("Make sure database exists:", TARGET);
    process.exit(1);
  }
  console.log("Connected to", TARGET);

  const sql = `
    UPDATE company_year
    SET db_name = ?
    WHERE db_name = 'shreehkweb_snj2024'
       OR db_name IS NULL
       OR TRIM(IFNULL(db_name, '')) = ''
  `;

  conn.query(sql, [TARGET], (updErr, result) => {
    if (updErr) {
      console.error("UPDATE failed:", updErr.message);
      conn.end();
      process.exit(1);
    }
    console.log("company_year rows updated:", result.affectedRows);

    conn.query(
      "SELECT id, year, db_name FROM company_year ORDER BY id DESC LIMIT 10",
      (selErr, rows) => {
        if (selErr) console.error(selErr.message);
        else console.table(rows);
        conn.end();
        console.log("Done. Restart backend (nodemon) if it is running.");
      }
    );
  });
});
