/**
 * One-time: create dai_activity_log on the meta DB (and optional tenant DB via arg).
 * Usage: node scripts/runActivityLogMigration.js
 *        node scripts/runActivityLogMigration.js other_database_name
 */
try {
  require("dotenv").config();
} catch (e) {}

const fs = require("fs");
const path = require("path");
const mysql = require("mysql");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || "3306",
  multipleStatements: true,
};

const database = process.argv[2] || process.env.DB_NAME || "shreehkweb_snj2024";
const sqlPath = path.join(__dirname, "..", "migrations", "create_dai_activity_log.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const conn = mysql.createConnection({ ...dbConfig, database });

conn.connect((err) => {
  if (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }

  conn.query(sql, (queryErr) => {
    if (queryErr) {
      console.error("Migration failed:", queryErr.message);
      conn.end();
      process.exit(1);
    }
    console.log(`OK: dai_activity_log ensured on database "${database}"`);
    conn.end();
    process.exit(0);
  });
});
