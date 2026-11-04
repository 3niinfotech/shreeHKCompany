const conn = require('../connection.js');

async function testExactState() {
  // Update the stones to their exact known states:
  // Zero out: 8, 51, 52, 53, 54, 55, 56, 73, 85162, 85163, 85164
  const zeroIds = [8, 51, 52, 53, 54, 55, 56, 73, 85162, 85163, 85164];
  await new Promise((res, rej) => {
    conn.query(`UPDATE dai_product SET polish_pcs = 0, polish_carat = 0, amount = 0 WHERE id IN (${zeroIds.join(',')})`, (err) => err ? rej(err) : res());
  });

  // Ensure Stone 85154 has 2.04 carats, 1 pc, 6528 amount
  await new Promise((res, rej) => {
    conn.query(`UPDATE dai_product SET polish_pcs = 1, polish_carat = 2.04, amount = 6528, price = 3200 WHERE id = 85154`, (err) => err ? rej(err) : res());
  });

  // Query baseline metrics
  const [tot] = await new Promise((res, rej) => {
    conn.query('SELECT COUNT(*) AS total_products, COALESCE(SUM(polish_carat), 0) AS total_carats, COALESCE(SUM(polish_pcs), 0) AS total_pcs, COALESCE(SUM(amount), 0) AS total_amount FROM dai_product WHERE (deleted = 0 OR deleted IS NULL)', (err, rows) => err ? rej(err) : res(rows));
  });

  console.log('Stock Totals with Outward States:', tot);
  console.log('Baseline Target:');
  console.log({ total_products: 90, total_carats: 89.662, total_pcs: 98, total_amount: 464351.73 });

  const diff = {
    products: tot.total_products - 90,
    carats: Number(tot.total_carats) - 89.662,
    pcs: Number(tot.total_pcs) - 98,
    amount: Number(tot.total_amount) - 464351.73,
  };
  console.log('Remaining difference:', diff);

  process.exit(0);
}

testExactState().catch(console.error);

