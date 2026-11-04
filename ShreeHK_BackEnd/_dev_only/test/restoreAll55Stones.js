const conn = require('../connection.js');
const fs = require('fs');
const path = require('path');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function restoreAll() {
  console.log('=== RESTORING ALL 55 BASELINE STONES INTO DAI_PRODUCT ===');

  const stoneMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'recovered_stoneMap.json'), 'utf8'));

  // Define the 55 stones
  // IDs 7 to 56:
  const targetIds = [
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
    35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
    49, 50, 51, 52, 53, 54, 55, 56, 73, 85154, 85162, 85163, 85164
  ];

  // Specific objects for 85162, 85163, 85164 from activity logs 49661, 50034, 50035
  const specialStones = {
    85162: {
      id: 85162,
      sku: 'HKD-TEST-050',
      company: '4', // Antwerp
      inward: 'transfer',
      inward_id: 21,
      group_type: 'parcel',
      lab: 'IGI',
      color: 'H',
      shape: 'ROUND',
      cost: 458,
      price: 4500,
      amount: 0,
      polish_pcs: 0,
      polish_carat: 0,
      sold_pcs: 1,
      sold_carat: 2.5,
      onhand_pcs: 0,
      onhand_carat: 0,
      memo_pcs: 0,
      memo_carat: 0,
      outward: 'sale',
      visibility: 1,
      hold: 0,
      remark: 'Transferred from Shree International (HK) Ltd (From SKU: HKD-TEST-050)',
      deleted: 0
    },
    85163: {
      id: 85163,
      sku: 'HKD-TEST-048',
      company: '1', // HK
      inward: 'transfer',
      inward_id: 22,
      group_type: 'parcel',
      lab: 'GIA',
      color: 'Pink',
      shape: 'PEAR',
      cost: 3690,
      price: 4500,
      amount: 0,
      polish_pcs: 0,
      polish_carat: 0,
      sold_pcs: 1,
      sold_carat: 2.04,
      onhand_pcs: 0,
      onhand_carat: 0,
      memo_pcs: 0,
      memo_carat: 0,
      outward: 'sale',
      visibility: 1,
      hold: 0,
      remark: 'Transferred from Shree Gems Antwerp NV (From SKU: HKD-TEST-048)',
      deleted: 0
    },
    85164: {
      id: 85164,
      sku: 'HKD-TEST-047-T1',
      company: '1', // HK
      inward: 'transfer',
      inward_id: 23,
      group_type: 'parcel',
      lab: 'HRD',
      color: 'H',
      shape: 'OVAL',
      cost: 2624,
      price: 3200,
      amount: 0,
      polish_pcs: 0,
      polish_carat: 0,
      sold_pcs: 1,
      sold_carat: 2.04,
      onhand_pcs: 0,
      onhand_carat: 0,
      memo_pcs: 0,
      memo_carat: 0,
      outward: 'sale',
      visibility: 1,
      hold: 0,
      remark: 'Transferred from Shree Diamonds India Pvt Ltd (From SKU: HKD-TEST-047-T1)',
      deleted: 0
    }
  };

  for (const id of targetIds) {
    let s = null;
    if (specialStones[id]) {
      s = specialStones[id];
    } else if (stoneMap[id]) {
      // Find the latest full object or create object
      const entries = stoneMap[id];
      // Pick the entry with the most keys
      let best = entries[0].data;
      for (const e of entries) {
        if (Object.keys(e.data).length > Object.keys(best).length) {
          best = e.data;
        }
      }
      s = { ...best, id };
    }

    if (!s) {
      console.error(`Could not build stone object for ID ${id}`);
      continue;
    }

    // Baseline adjustments for Stones 8 and 9
    // Stone 8: HKD-TEST-002: polish_pcs=0, polish_carat=0, onhand=0, memo_pcs=1, memo_carat=1.04, outward='memo', visibility=1, price=3200, amount=0
    if (id === 8) {
      s.polish_pcs = 0;
      s.polish_carat = 0;
      s.onhand_pcs = 0;
      s.onhand_carat = 0;
      s.memo_pcs = 1;
      s.memo_carat = 1.04;
      s.sold_pcs = 0;
      s.sold_carat = 0;
      s.outward = 'memo';
      s.visibility = 1;
      s.hold = 0;
      s.price = 3200;
      s.amount = 0;
    }
    // Stone 9: HKD-TEST-003: polish_pcs=1, polish_carat=0.71, onhand=1, onhand_carat=0.71, memo_pcs=0, memo_carat=0, sold_pcs=0, sold_carat=0, outward='', visibility=1, hold=0, price=2000, amount=1420
    if (id === 9) {
      s.polish_pcs = 1;
      s.polish_carat = 0.71;
      s.onhand_pcs = 1;
      s.onhand_carat = 0.71;
      s.memo_pcs = 0;
      s.memo_carat = 0;
      s.sold_pcs = 0;
      s.sold_carat = 0;
      s.outward = '';
      s.visibility = 1;
      s.hold = 0;
      s.price = 2000;
      s.amount = 1420;
    }

    // Normal stones (e.g. 7, 10..56) that are on memo in baseline:
    // Recall guard from Group 2(a) inward test:
    // "Cannot delete Inward #10001: SKU HKD-TEST-044 is currently on memo; SKU HKD-TEST-045 is currently on memo; SKU HKD-TEST-046 is currently on memo and 2 more items."
    // Inward 9 had 48 items, total carats = 69.82.
    // If a stone is on memo, polish_carat and amount in dai_product is 0 if outward='memo' or polish_carat remains its carat if polish_pcs=1.
    // Let's check how dai_product stores it from best:
    const row = {
      id: s.id,
      mfg_code: s.mfg_code || s.mfgCode || null,
      diamond_no: s.diamond_no || s.d_no || null,
      sku: s.sku || null,
      pair: s.pair || null,
      rought_pcs: s.rought_pcs || s.r_pcs || 1,
      rought_carat: s.rought_carat || s.r_carat || 0,
      polish_pcs: s.polish_pcs !== undefined ? s.polish_pcs : (s.p_pcs !== undefined ? s.p_pcs : 1),
      polish_carat: s.polish_carat !== undefined ? s.polish_carat : (s.p_carat !== undefined ? s.p_carat : 1),
      cost: s.cost || 0,
      price: s.price || 0,
      amount: s.amount !== undefined ? s.amount : 0,
      main_group: s.main_group || null,
      sub_group: s.sub_group || null,
      remark: s.remark || 'TEST STOCK',
      location: s.location || s.loc || 'SURAT',
      date: s.date ? new Date(s.date) : new Date('2026-10-14'),
      company: s.company || '4',
      inward_id: s.inward_id || (id <= 54 ? 9 : (id <= 56 ? 10 : 21)),
      group_type: s.group_type || s.groupType || 'parcel',
      lab: s.lab || 'GIA',
      send_to_lab: s.send_to_lab || null,
      outward: s.outward || null,
      hold: s.hold || 0,
      visibility: s.visibility !== undefined ? s.visibility : 1,
      main_color: s.main_color || s.color || 'WHITE',
      user: s.user || 1,
      purchase_carat: s.purchase_carat || s.polish_carat || 1,
      purchase_pcs: s.purchase_pcs || s.polish_pcs || 1,
      purchase_price: s.purchase_price || s.price || 0,
      purchase_amount: s.purchase_amount || s.amount || 0,
      inward: s.inward || 'import',
      indexonline_id: s.indexonline_id || '',
      category: s.category || '',
      argyle_color: s.argyle_color || '',
      in_house_clarity: s.in_house_clarity || '',
      mining: s.mining || '',
      origin: s.origin || '',
      purchased_pcs: s.purchased_pcs || s.polish_pcs || 1,
      purchased_carat: s.purchased_carat || s.polish_carat || 1,
      memo_pcs: s.memo_pcs || 0,
      memo_carat: s.memo_carat || 0,
      sold_pcs: s.sold_pcs || 0,
      sold_carat: s.sold_carat || 0,
      onhand_pcs: s.onhand_pcs !== undefined ? s.onhand_pcs : (s.polish_pcs || 1),
      onhand_carat: s.onhand_carat !== undefined ? s.onhand_carat : (s.polish_carat || 1),
      deleted: 0,
      deleted_at: null,
      deleted_by: null
    };

    // If outward is 'memo', polish_pcs and polish_carat are 0, amount is 0
    if (row.outward === 'memo') {
      row.polish_pcs = 0;
      row.polish_carat = 0;
      row.amount = 0;
    }
    if (row.outward === 'sale') {
      row.polish_pcs = 0;
      row.polish_carat = 0;
      row.amount = 0;
    }

    await q(
      `INSERT INTO dai_product (${Object.keys(row).join(',')})
       VALUES (${Object.keys(row).map(() => '?').join(',')})
       ON DUPLICATE KEY UPDATE sku = VALUES(sku), polish_pcs = VALUES(polish_pcs), polish_carat = VALUES(polish_carat), amount = VALUES(amount), deleted = 0`,
      Object.values(row)
    );
  }

  console.log(`Finished inserting / restoring ${targetIds.length} stones.`);

  // Check counts
  const [tot] = await q('SELECT COUNT(*) AS total_products, COALESCE(SUM(polish_carat), 0) AS total_carats, COALESCE(SUM(polish_pcs), 0) AS total_pcs, COALESCE(SUM(amount), 0) AS total_amount FROM dai_product WHERE (deleted = 0 OR deleted IS NULL)');
  console.log('Current Stock after restore:', tot);

  process.exit(0);
}

restoreAll().catch(err => {
  console.error(err);
  process.exit(1);
});

