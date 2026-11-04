/**
 * One-off: verify dai_history qty/balance for a SKU (JB0001).
 * Usage: node scripts/_checkStoneHistory.js [sku] [companyId]
 */
try {
  require("dotenv").config();
} catch (_) {
  /* optional */
}
const mysql = require("mysql");

const sku = process.argv[2] || "JB0001";
const companyId = Number(process.argv[3]) || 4;
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
    const products = await q(
      `SELECT id, sku, company, polish_pcs, polish_carat, onhand_pcs, onhand_carat,
              memo_pcs, memo_carat, sold_pcs, sold_carat, outward, price, amount, group_type
       FROM dai_product WHERE UPPER(TRIM(sku)) = UPPER(?) LIMIT 5`,
      [sku]
    );
    console.log("DB:", dbName);
    console.log("PRODUCTS:", JSON.stringify(products, null, 2));

    if (!products.length) {
      console.log("No product found");
      process.exit(0);
    }

    const pid = products.find((p) => Number(p.company) === companyId)?.id || products[0].id;
    const hist = await q(
      `SELECT id, action, type, pcs, carat, balance_pcs, balance_carat, price, amount,
              description, invoice, party, date, user
       FROM dai_history WHERE product_id = ? ORDER BY id`,
      [pid]
    );

    console.log("\nHISTORY product_id=", pid);
    let runPcs = 0;
    let runCarat = 0;
    for (const h of hist) {
      const pcs = Number(h.pcs) || 0;
      const carat = Number(h.carat) || 0;
      const sign = String(h.type || "").toLowerCase() === "cr" ? 1 : -1;
      runPcs += sign * pcs;
      runCarat += sign * carat;
      const dispPcs = sign * pcs;
      const dispCarat = sign * carat;
      console.log(
        [
          `#${h.id}`,
          h.action,
          `type=${h.type}`,
          `pcs=${dispPcs}`,
          `carat=${dispCarat}`,
          `B.pcs=${h.balance_pcs}`,
          `B.carat=${h.balance_carat}`,
          `naiveRun=${runPcs}/${runCarat}`,
          `amt=${h.amount}`,
          String(h.description || "").slice(0, 60),
        ].join(" | ")
      );
    }
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    conn.end();
  }
})();
