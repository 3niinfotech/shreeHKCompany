const connection = require('../connection.js');
const fs = require('fs');
const path = require('path');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline_metrics.json'), 'utf8'));

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function verify() {
  const stockRows = await q('SELECT COUNT(*) AS total_products, COALESCE(SUM(polish_carat), 0) AS total_carats, COALESCE(SUM(polish_pcs), 0) AS total_pcs, COALESCE(SUM(amount), 0) AS total_amount FROM dai_product WHERE (deleted = 0 OR deleted IS NULL)');
  const inwardRows = await q('SELECT COUNT(*) AS total_inward, COALESCE(SUM(final_amount), 0) AS inward_amount FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL)');
  const outwardRows = await q('SELECT COUNT(*) AS total_outward, COALESCE(SUM(final_amount), 0) AS outward_amount FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL)');
  const accRows = await q('SELECT COUNT(*) AS total_txns, COALESCE(SUM(amount), 0) AS total_amount FROM acc_transaction WHERE (deleted = 0 OR deleted IS NULL)');
  const advRows = await q('SELECT COUNT(*) AS total_advances, COALESCE(SUM(amount), 0) AS total_amount FROM acc_advance WHERE (deleted = 0 OR deleted IS NULL)');
  const partyRows = await q('SELECT COUNT(*) AS total FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)');
  const catRows = await q('SELECT COUNT(*) AS total FROM category WHERE (deleted = 0 OR deleted IS NULL)');
  const labRows = await q('SELECT COUNT(*) AS total FROM dai_lab WHERE (deleted = 0 OR deleted IS NULL)');
  const origRows = await q('SELECT COUNT(*) AS total FROM dai_origin WHERE (deleted = 0 OR deleted IS NULL)');
  const shipRows = await q('SELECT COUNT(*) AS total FROM dai_shipping WHERE (deleted = 0 OR deleted IS NULL)');
  const attrRows = await q('SELECT COUNT(*) AS total FROM dai_attribute WHERE (deleted = 0 OR deleted IS NULL)');
  const userRows = await q('SELECT COUNT(*) AS total FROM user WHERE (deleted = 0 OR deleted IS NULL)');

  const current = {
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

  console.log('=== CURRENT VS BASELINE COMPARISON ===');
  let match = true;
  for (const section of ['stock', 'transactions', 'accounting', 'masters']) {
    console.log(`[${section.toUpperCase()}]`);
    for (const key of Object.keys(baseline[section])) {
      const bVal = baseline[section][key];
      const cVal = current[section][key];
      const isOk = Math.abs(bVal - cVal) < 0.001;
      if (!isOk) match = false;
      console.log(`  ${key}: baseline=${bVal}, current=${cVal} -> ${isOk ? 'MATCH' : 'MISMATCH'}`);
    }
  }
  console.log('\nOVERALL MATCH:', match);
  process.exit(match ? 0 : 1);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});

