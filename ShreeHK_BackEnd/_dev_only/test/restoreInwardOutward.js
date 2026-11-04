const conn = require('../connection.js');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function run() {
  const inwLogs = await q(
    `SELECT record_id, module_name, new_value, old_value, action_type, created_at 
     FROM dai_activity_log 
     WHERE (module_name LIKE '%Inward%' OR module_name LIKE '%Purchase%')
     ORDER BY id ASC`
  );
  console.log('Total inward activity logs:', inwLogs.length);
  
  const inwMap = {};
  for (const log of inwLogs) {
    if (log.new_value) {
      try {
        const val = typeof log.new_value === 'string' ? JSON.parse(log.new_value) : log.new_value;
        if (val && val.id) {
          inwMap[val.id] = val;
        } else if (log.record_id) {
          inwMap[log.record_id] = val;
        }
      } catch (e) {}
    }
  }
  console.log('Recoverable inward IDs from activity log:', Object.keys(inwMap));

  const outLogs = await q(
    `SELECT record_id, module_name, new_value, old_value, action_type, created_at 
     FROM dai_activity_log 
     WHERE (module_name LIKE '%Outward%' OR module_name LIKE '%Sale%' OR module_name LIKE '%Memo%')
     ORDER BY id ASC`
  );
  console.log('Total outward activity logs:', outLogs.length);
  const outMap = {};
  for (const log of outLogs) {
    if (log.new_value) {
      try {
        const val = typeof log.new_value === 'string' ? JSON.parse(log.new_value) : log.new_value;
        if (val && val.id) {
          outMap[val.id] = val;
        } else if (log.record_id) {
          outMap[log.record_id] = val;
        }
      } catch (e) {}
    }
  }
  console.log('Recoverable outward IDs from activity log:', Object.keys(outMap));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

