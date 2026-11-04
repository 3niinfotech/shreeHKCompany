const connection = require('../connection.js');
const fs = require('fs');
const path = require('path');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function qMeta(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function capture() {
  console.log('Capturing baseline metrics from test DB (shreehkweb_snj2024_test)...');

  // 1. Stock & Carat totals (dai_product where deleted = 0 OR deleted IS NULL)
  const stockRows = await q(`
    SELECT 
      COUNT(*) AS total_products,
      COALESCE(SUM(polish_carat), 0) AS total_carats,
      COALESCE(SUM(polish_pcs), 0) AS total_pcs,
      COALESCE(SUM(amount), 0) AS total_amount
    FROM dai_product
    WHERE (deleted = 0 OR deleted IS NULL)
  `);

  // 2. Active Inward & Outward counts
  const inwardRows = await q(`
    SELECT COUNT(*) AS total_inward, COALESCE(SUM(final_amount), 0) AS inward_amount
    FROM dai_inward
    WHERE (deleted = 0 OR deleted IS NULL)
  `);

  const outwardRows = await q(`
    SELECT COUNT(*) AS total_outward, COALESCE(SUM(final_amount), 0) AS outward_amount
    FROM dai_outward
    WHERE (deleted = 0 OR deleted IS NULL)
  `);

  // 3. Ledger & Accounting transaction balances
  const accRows = await q(`
    SELECT 
      COUNT(*) AS total_txns,
      COALESCE(SUM(amount), 0) AS total_amount
    FROM acc_transaction
    WHERE (deleted = 0 OR deleted IS NULL)
  `);

  const advRows = await q(`
    SELECT 
      COUNT(*) AS total_advances,
      COALESCE(SUM(amount), 0) AS total_amount
    FROM acc_advance
    WHERE (deleted = 0 OR deleted IS NULL)
  `);

  // 4. Masters counts
  const partyRows = await q(`SELECT COUNT(*) AS total FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)`);
  const catRows = await q(`SELECT COUNT(*) AS total FROM category WHERE (deleted = 0 OR deleted IS NULL)`);
  const labRows = await q(`SELECT COUNT(*) AS total FROM dai_lab WHERE (deleted = 0 OR deleted IS NULL)`);
  const origRows = await q(`SELECT COUNT(*) AS total FROM dai_origin WHERE (deleted = 0 OR deleted IS NULL)`);
  const shipRows = await q(`SELECT COUNT(*) AS total FROM dai_shipping WHERE (deleted = 0 OR deleted IS NULL)`);
  const attrRows = await q(`SELECT COUNT(*) AS total FROM dai_attribute WHERE (deleted = 0 OR deleted IS NULL)`);
  const userRows = await q(`SELECT COUNT(*) AS total FROM user WHERE (deleted = 0 OR deleted IS NULL)`);

  const baseline = {
    timestamp: new Date().toISOString(),
    database: 'shreehkweb_snj2024_test',
    stock: {
      total_products: Number(stockRows[0].total_products),
      total_carats: Number(stockRows[0].total_carats),
      total_pcs: Number(stockRows[0].total_pcs),
      total_amount: Number(stockRows[0].total_amount),
    },
    transactions: {
      total_inward: Number(inwardRows[0].total_inward),
      inward_amount: Number(inwardRows[0].inward_amount),
      total_outward: Number(outwardRows[0].total_outward),
      outward_amount: Number(outwardRows[0].outward_amount),
    },
    accounting: {
      total_txns: Number(accRows[0].total_txns),
      total_txn_amount: Number(accRows[0].total_amount),
      total_advances: Number(advRows[0].total_advances),
      total_adv_amount: Number(advRows[0].total_amount),
    },
    masters: {
      total_parties: Number(partyRows[0].total),
      total_categories: Number(catRows[0].total),
      total_labs: Number(labRows[0].total),
      total_origins: Number(origRows[0].total),
      total_shippings: Number(shipRows[0].total),
      total_attributes: Number(attrRows[0].total),
      total_users: Number(userRows[0].total),
    }
  };

  const outPath = path.join(__dirname, 'baseline_metrics.json');
  fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2), 'utf8');
  console.log('Baseline captured successfully:');
  console.log(JSON.stringify(baseline, null, 2));
  process.exit(0);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
