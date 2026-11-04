const conn = require('../connection.js');

function q(sql) {
  return new Promise((res, rej) => conn.query(sql, (err, rows) => err ? rej(err) : res(rows)));
}

async function run() {
  const inws = await q("SELECT id, invoiceno, final_amount, products FROM dai_inward WHERE products IS NOT NULL AND products != '' LIMIT 5");
  console.log('Sample inwards:', inws);

  const memo = await q("SELECT id, invoiceno, type, status, final_amount, products FROM dai_outward WHERE type = 'memo' AND products IS NOT NULL AND products != '' LIMIT 3");
  console.log('Sample memo outwards:', memo);

  const sale = await q("SELECT id, invoiceno, type, status, final_amount, products FROM dai_outward WHERE type = 'sale' AND products IS NOT NULL AND products != '' LIMIT 3");
  console.log('Sample sale outwards:', sale);

  const ret = await q("SELECT id, invoiceno, type, status, final_amount, products FROM dai_outward WHERE status = 'returned' OR type = 'return' LIMIT 3");
  console.log('Sample return outwards:', ret);

  const gia = await q("SELECT id, invoiceno, type, status, final_amount, products FROM dai_outward WHERE type = 'gia' OR status = 'on_gia' LIMIT 3");
  console.log('Sample gia outwards:', gia);

  const exp = await q("SELECT id, invoiceno, type, status, final_amount, products FROM dai_outward WHERE type = 'export' OR status = 'on_export' LIMIT 3");
  console.log('Sample export outwards:', exp);

  const trf = await q("SELECT id, transfer_no, status FROM dai_company_transfer LIMIT 3");
  console.log('Sample transfers:', trf);

  process.exit(0);
}

run();

