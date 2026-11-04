const conn = require('../connection.js');
conn.query('SHOW COLUMNS FROM dai_product', (err, rows) => {
  if (err) console.error(err);
  else console.log(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default })));
  process.exit(0);
});

