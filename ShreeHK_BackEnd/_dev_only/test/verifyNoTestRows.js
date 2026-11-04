const conn = require('../connection.js');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function checkRemaining() {
  const r1 = await q("SELECT id, transfer_no, deleted FROM dai_company_transfer WHERE transfer_no LIKE '%TRF-5%' OR id > 20");
  const r2 = await q("SELECT id, transfer_id, sku, deleted FROM dai_company_transfer_item WHERE transfer_id > 20 OR id > 20");
  const r3 = await q("SELECT id, sku, deleted FROM dai_product WHERE id >= 90000");
  const r4 = await q("SELECT id, invoiceno, deleted FROM dai_inward WHERE invoiceno LIKE 'TEST%'");
  const r5 = await q("SELECT id, invoiceno, deleted FROM dai_outward WHERE invoiceno LIKE 'TEST%'");
  const r6 = await q("SELECT id, product_id, action FROM dai_history WHERE product_id >= 90000");

  console.log('Test transfers remaining:', r1.length);
  console.log('Test transfer items remaining:', r2.length);
  console.log('Test products >= 90000 remaining:', r3.length);
  console.log('Test inwards remaining:', r4.length);
  console.log('Test outwards remaining:', r5.length);
  console.log('Test history remaining:', r6.length);

  // Check if any deleted=1 test row remains
  const allDel = [
    ...r1.filter(r => r.deleted === 1),
    ...r2.filter(r => r.deleted === 1),
    ...r3.filter(r => r.deleted === 1),
    ...r4.filter(r => r.deleted === 1),
    ...r5.filter(r => r.deleted === 1),
  ];
  console.log('Test rows with deleted = 1 remaining:', allDel.length);

  process.exit(0);
}

checkRemaining();

