const conn = require('../connection.js');
conn.query('SHOW DATABASES', (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
  process.exit(0);
});

