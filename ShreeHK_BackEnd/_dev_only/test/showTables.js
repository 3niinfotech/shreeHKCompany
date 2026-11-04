const connection = require('../connection.js');
connection.query("SHOW TABLES LIKE '%transfer%'", (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  process.exit(0);
});

