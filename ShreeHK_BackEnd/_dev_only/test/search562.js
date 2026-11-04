const conn = require('../connection.js');

conn.query("SELECT id, record_id, record_reference, new_value, old_value, description FROM dai_activity_log WHERE new_value LIKE '%5.62%' OR new_value LIKE '%40708%' OR old_value LIKE '%5.62%' OR description LIKE '%5.62%'", (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
  process.exit(0);
});

