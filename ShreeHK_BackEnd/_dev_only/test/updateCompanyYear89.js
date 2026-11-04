const mysql = require('mysql');

const c = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shreehkweb_snj2024_test'
});

c.connect((err) => {
  if (err) throw err;
  c.query("SELECT id, year, db_name, fromDate, toDate FROM company_year WHERE id IN (8, 9)", (err, before) => {
    if (err) throw err;
    console.log('BEFORE UPDATE:');
    console.table(before);

    c.query("UPDATE company_year SET db_name = 'shreehkweb_snj2024_test' WHERE id IN (8, 9)", (err, res) => {
      if (err) throw err;
      console.log(`Update result: affectedRows = ${res.affectedRows}, changedRows = ${res.changedRows}`);

      c.query("SELECT id, year, db_name, fromDate, toDate FROM company_year WHERE id IN (8, 9)", (err, after) => {
        if (err) throw err;
        console.log('AFTER UPDATE:');
        console.table(after);
        c.end();
        process.exit(0);
      });
    });
  });
});

