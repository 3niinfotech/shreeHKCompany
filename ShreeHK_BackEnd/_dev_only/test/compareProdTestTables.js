const mysql = require('mysql');

const c = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

c.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }

  c.query("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = 'shreehkweb_snj2024' ORDER BY TABLE_NAME", async (err, tables) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log(`Comparing ${tables.length} tables between shreehkweb_snj2024 (prod) and shreehkweb_snj2024_test (test):`);
    let allMatch = true;
    const mismatches = [];
    const tableList = [];

    for (const t of tables) {
      const name = t.TABLE_NAME;
      const pCount = await new Promise((res) => {
        c.query(`SELECT COUNT(*) as c FROM shreehkweb_snj2024.\`${name}\``, (e, r) => res(r ? r[0].c : -1));
      });
      const tCount = await new Promise((res) => {
        c.query(`SELECT COUNT(*) as c FROM shreehkweb_snj2024_test.\`${name}\``, (e, r) => res(r ? r[0].c : -1));
      });

      const match = pCount === tCount;
      if (!match) {
        allMatch = false;
        mismatches.push({ table: name, prod: pCount, test: tCount });
      }
      tableList.push({ table: name, prod: pCount, test: tCount, match: match ? 'MATCH' : 'DIFF' });
    }

    console.table(tableList);

    if (mismatches.length > 0) {
      console.log('Mismatches found:', mismatches);
    } else {
      console.log(`\nALL ${tables.length} TABLES HAVE EXACTLY IDENTICAL ROW COUNTS!`);
    }

    console.log('\nOVERALL MATCH:', allMatch);
    c.end();
    process.exit(allMatch ? 0 : 1);
  });
});

