const conn = require('../connection.js');
const fs = require('fs');
const path = require('path');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function recover() {
  console.log('=== EXTRACTING DELETED STONES FROM DAI_ACTIVITY_LOG ===');

  const logs = await q(`
    SELECT id, action_type, module_name, record_id, record_reference, new_value, old_value, description, created_at 
    FROM dai_activity_log 
    WHERE module_name IN ('Diamond Stock', 'Inward', 'My Inventory', 'Box/Parcel')
    ORDER BY id ASC
  `);

  console.log('Total activity logs inspected:', logs.length);

  // The 55 target IDs that were deleted by checkAndPurgeTestRows.js
  const targetIds = [
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
    35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
    49, 50, 51, 52, 53, 54, 55, 56, 73, 85154, 85162, 85163, 85164
  ];

  const stoneMap = {};

  for (const log of logs) {
    let newVal = null;
    let oldVal = null;
    try { newVal = JSON.parse(log.new_value); } catch (_) {}
    try { oldVal = JSON.parse(log.old_value); } catch (_) {}

    // Check direct newVal
    if (newVal) {
      if (newVal.id && targetIds.includes(Number(newVal.id))) {
        const id = Number(newVal.id);
        stoneMap[id] = stoneMap[id] || [];
        stoneMap[id].push({ logId: log.id, action: log.action_type, data: newVal, date: log.created_at });
      }
      // Check if newVal has products array
      if (Array.isArray(newVal.products)) {
        for (const p of newVal.products) {
          if (p.id && targetIds.includes(Number(p.id))) {
            const id = Number(p.id);
            stoneMap[id] = stoneMap[id] || [];
            stoneMap[id].push({ logId: log.id, action: log.action_type, data: p, date: log.created_at });
          }
        }
      }
      // Check if newVal.record has _submittedRows
      if (newVal.record && Array.isArray(newVal.record._submittedRows)) {
        for (const p of newVal.record._submittedRows) {
          if (p.id && targetIds.includes(Number(p.id))) {
            const id = Number(p.id);
            stoneMap[id] = stoneMap[id] || [];
            stoneMap[id].push({ logId: log.id, action: log.action_type, data: p, date: log.created_at });
          }
        }
      }
    }
  }

  console.log(`Matched stones count: ${Object.keys(stoneMap).length} / ${targetIds.length}`);
  const missing = targetIds.filter(id => !stoneMap[id]);
  console.log('Missing IDs from log search:', missing);

  fs.writeFileSync(path.join(__dirname, 'recovered_stoneMap.json'), JSON.stringify(stoneMap, null, 2));
  process.exit(0);
}

recover().catch(err => {
  console.error(err);
  process.exit(1);
});

