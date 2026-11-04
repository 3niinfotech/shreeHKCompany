const connection = require('../connection.js');

connection.query('SELECT id, sku, polish_carat, polish_pcs, date FROM dai_product WHERE id > 11337', (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  process.exit(0);
});

