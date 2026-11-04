const connection = require('../connection.js');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function run() {
  console.log('=== Inward Breakdown Analysis ===');
  const breakdown = await q('SELECT deleted, COUNT(*) as cnt FROM dai_inward GROUP BY deleted');
  console.log('Breakdown by `deleted` column:');
  console.table(breakdown);

  const [total] = await q('SELECT COUNT(*) as total FROM dai_inward');
  console.log('Total rows in dai_inward:', total.total);

  const [active] = await q('SELECT COUNT(*) as active FROM dai_inward WHERE deleted = 0 OR deleted IS NULL');
  console.log('Active rows (deleted = 0 OR deleted IS NULL):', active.active);

  const deletedSample = await q('SELECT id, entryno, invoiceno, party, date, company, deleted, deleted_at, deleted_by FROM dai_inward WHERE deleted = 1 LIMIT 10');
  console.log('Sample deleted = 1 rows from production dump:');
  console.table(deletedSample);

  // Check if prod_dump itself had deleted=1
  console.log('Total deleted=1 rows:', (await q('SELECT COUNT(*) as cnt FROM dai_inward WHERE deleted = 1'))[0].cnt);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
