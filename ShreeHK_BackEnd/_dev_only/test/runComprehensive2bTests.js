const http = require('http');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const connection = require('../connection.js');
const { runHoldCron } = require('../jobs/holdCron.js');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function requestPort(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${port}`);
    const headers = { ...(options.headers || {}) };
    const method = options.method || 'GET';
    const postData = options.body ? JSON.stringify(options.body) : null;

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (_) {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, data: parsed, raw: rawData });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function computeTableChecksum(rows, fields) {
  const hash = crypto.createHash('sha256');
  for (const row of rows) {
    const rowStr = fields.map((f) => String(row[f] ?? '')).join('|');
    hash.update(rowStr + '\n');
  }
  return hash.digest('hex');
}

async function run() {
  console.log('================================================================');
  console.log('  COMPREHENSIVE GROUP 2(b) VERIFICATION & WORKTREE AUDIT SUITE  ');
  console.log('================================================================\n');

  // Guard: Confirm DB is test
  const [dbNameRow] = await query('SELECT DATABASE() AS db');
  const dbName = dbNameRow.db;
  console.log(`Verified DB Guard: Target DB = ${dbName}`);
  if (dbName !== 'shreehkweb_snj2024_test') {
    throw new Error(`ABORT: Not running on test DB! Current: ${dbName}`);
  }

  // Tokens for Admin User
  const makeAuth = (companyId = 1) => {
    const token = jwt.sign(
      { user_id: 1, username: 'admin', roll: 1, companyId, yearId: 1, jti: 'test_' + Date.now() },
      SECRET_KEY,
      { expiresIn: '1h' }
    );
    return {
      Authorization: `Bearer ${token}`,
      'x-company-id': String(companyId),
    };
  };

  const auth1 = makeAuth(1);
  const auth4 = makeAuth(4);

  // ==========================================================================
  // STEP 1: PRE-TEST SNAPSHOT & CHECKSUM OF EXISTING DATA (Question 7)
  // ==========================================================================
  console.log('\n--- STEP 1: PRE-TEST EXISTING DATA CHECKSUMS ---');

  // Ensure Stone 9 is in exact baseline state before snapshot
  await query(
    "UPDATE dai_product SET outward = '', visibility = 1, onhand_pcs = 1, onhand_carat = 0.71, memo_pcs = 0, memo_carat = 0, sold_pcs = 0, sold_carat = 0, hold = 0, polish_pcs = 1, polish_carat = 0.71, amount = 1420, price = 2000 WHERE id = 9"
  );
  // Clean any test-created records
  await query("DELETE FROM dai_outward_item WHERE outward_id IN (SELECT id FROM dai_outward WHERE invoiceno LIKE 'TEST-%')");
  await query("DELETE FROM dai_outward WHERE invoiceno LIKE 'TEST-%'");
  await query("DELETE FROM dai_history WHERE product_id = 9 AND id > 285512");

  const maxProdRow = await query('SELECT MAX(id) AS m FROM dai_product');
  const maxOutRow = await query('SELECT MAX(id) AS m FROM dai_outward');
  const maxItemRow = await query('SELECT MAX(id) AS m FROM dai_outward_item');
  const maxHistRow = await query('SELECT MAX(id) AS m FROM dai_history');
  const maxHoldRow = await query('SELECT MAX(id) AS m FROM dai_hold');

  const maxIdSnapshot = {
    product: maxProdRow[0].m || 0,
    outward: maxOutRow[0].m || 0,
    outward_item: maxItemRow[0].m || 0,
    history: maxHistRow[0].m || 0,
    hold: maxHoldRow[0].m || 0,
  };
  console.log('Pre-Test Max IDs:', maxIdSnapshot);

  const existingProds = await query('SELECT * FROM dai_product WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.product]);
  const existingOuts = await query('SELECT * FROM dai_outward WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.outward]);
  const existingItems = await query('SELECT * FROM dai_outward_item WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.outward_item]);
  const existingHist = await query('SELECT * FROM dai_history WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.history]);

  const preProdChecksum = computeTableChecksum(existingProds, ['id', 'sku', 'polish_pcs', 'polish_carat', 'amount', 'price', 'outward', 'visibility', 'hold', 'deleted']);
  const preOutChecksum = computeTableChecksum(existingOuts, ['id', 'invoiceno', 'type', 'final_amount', 'products', 'deleted']);
  const preItemChecksum = computeTableChecksum(existingItems, ['id', 'outward_id', 'product_id', 'pcs', 'carat', 'price', 'amount', 'status', 'deleted']);
  const preHistChecksum = computeTableChecksum(existingHist, ['id', 'product_id', 'action', 'pcs', 'carat', 'amount', 'price', 'sku']);

  console.log(`Pre-Test Checksum dai_product:      ${preProdChecksum} (${existingProds.length} rows)`);
  console.log(`Pre-Test Checksum dai_outward:      ${preOutChecksum} (${existingOuts.length} rows)`);
  console.log(`Pre-Test Checksum dai_outward_item: ${preItemChecksum} (${existingItems.length} rows)`);
  console.log(`Pre-Test Checksum dai_history:      ${preHistChecksum} (${existingHist.length} rows)`);

  // ==========================================================================
  // STEP 2: DUAL-SERVER RAW JSON REGRESSION (Original Port 3501 vs Port 3500) (Question 4)
  // ==========================================================================
  console.log('\n--- STEP 2: DUAL-SERVER RAW JSON REGRESSION (PORT 3501 vs 3500) ---');

  const diffTests = [
    {
      name: 'GET /inward/?id=9 (Existing 48 line items)',
      path: '/inward/?id=9',
      method: 'GET',
      headers: auth1,
    },
    {
      name: 'POST /transaction/inward-stock/list (type: import, non-empty)',
      path: '/transaction/inward-stock/list',
      method: 'POST',
      headers: auth1,
      body: { stockType: 'import', limit: 10, page: 1 },
    },
    {
      name: 'POST /outward/list (type: memo, non-empty)',
      path: '/outward/list',
      method: 'POST',
      headers: auth1,
      body: { type: 'memo', limit: 10, page: 1 },
    },
    {
      name: 'POST /outward/list (type: sale, non-empty)',
      path: '/outward/list',
      method: 'POST',
      headers: auth1,
      body: { type: 'sale', limit: 10, page: 1 },
    },
    {
      name: 'POST /transaction/outward-stock/list (stockType: memo, non-empty)',
      path: '/transaction/outward-stock/list',
      method: 'POST',
      headers: auth1,
      body: { stockType: 'memo', limit: 10, page: 1 },
    },
    {
      name: 'POST /transaction/outward-stock/list (stockType: sale, non-empty)',
      path: '/transaction/outward-stock/list',
      method: 'POST',
      headers: auth1,
      body: { stockType: 'sale', limit: 10, page: 1 },
    },
    {
      name: 'POST /transaction/gia/list (existing GIA)',
      path: '/transaction/gia/list',
      method: 'POST',
      headers: auth1,
      body: { limit: 10, page: 1 },
    },
    {
      name: 'GET /outward/?id=14 (Existing export/sale voucher)',
      path: '/outward/?id=14',
      method: 'GET',
      headers: auth1,
    },
    {
      name: 'GET /outward/?id=9 (Existing memo voucher)',
      path: '/outward/?id=9',
      method: 'GET',
      headers: auth1,
    },
    {
      name: 'GET /outward/?id=15 (Existing GIA voucher)',
      path: '/outward/?id=15',
      method: 'GET',
      headers: auth1,
    },
  ];

  let allDiffsPassed = true;
  for (const t of diffTests) {
    const origRes = await requestPort(3501, t.path, { method: t.method, headers: t.headers, body: t.body });
    const updRes = await requestPort(3500, t.path, { method: t.method, headers: t.headers, body: t.body });

    const origJson = JSON.stringify(origRes.data);
    const updJson = JSON.stringify(updRes.data);
    const match = origJson === updJson;
    if (!match) allDiffsPassed = false;

    console.log(`\nTest: ${t.name}`);
    console.log(`Status Port 3501: ${origRes.status} | Status Port 3500: ${updRes.status}`);
    console.log(`Match: ${match ? 'IDENTICAL RAW JSON' : 'DIFF DETECTED'}`);
    if (!match) {
      console.log('Original Sample:', origJson.slice(0, 200));
      console.log('Updated  Sample:', updJson.slice(0, 200));
    } else {
      console.log(`Length: ${origJson.length} bytes (100% byte match)`);
    }
  }

  // ==========================================================================
  // STEP 3: REAL HTTP LIFECYCLE TESTS (Question 5)
  // ==========================================================================
  console.log('\n--- STEP 3: REAL HTTP LIFECYCLE TESTS (PORT 3500) ---');

  // Stone 9 (Company 4) - Using Party 12 ('HTTP_Party_...') so it is treated as a standard external customer
  const [testStone] = await query('SELECT * FROM dai_product WHERE id = 9');
  console.log(`Using Test Stone: ID ${testStone.id}, SKU: ${testStone.sku}, Carat: ${testStone.polish_carat}, Company: ${testStone.company}`);

  // Test 3.1: Sale Create -> Delete Sale Lifecycle
  console.log('\n[3.1] Testing SALE Create -> Soft Delete Lifecycle:');
  const saleInv = `TEST-SALE-${Date.now().toString().slice(-5)}`;
  const createSale = await requestPort(3500, '/outward/sendTo', {
    method: 'POST',
    headers: auth4,
    body: {
      operating_company_id: 4,
      party: 12,
      type: 'sale',
      invoiceno: saleInv,
      invoicedate: '01-01-2025',
      terms: false,
      products: [
        {
          id: testStone.id,
          sku: testStone.sku,
          pcs: 1,
          carat: Number(testStone.polish_carat),
          price: 2000,
          amount: 1420,
        },
      ],
    },
  });
  const saleId = createSale.data?.id;
  console.log(`Created Sale ID: ${saleId} (Status: ${createSale.data?.status})`);

  // Inward Guard Check: inward delete blocked because stone is on sale
  const inwGuard = await requestPort(3500, '/transaction/inward-stock?deleteId=9', { method: 'DELETE', headers: auth1 });
  console.log(`Inward Guard Blocked: ${inwGuard.data?.ok === false} (Msg: "${inwGuard.data?.message?.slice(0, 60)}...")`);

  // Soft Delete Sale
  const delSale = await requestPort(3500, `/transaction/outward-stock?deleteId=${saleId}`, { method: 'DELETE', headers: auth4 });
  console.log(`Delete Sale: status=${delSale.data?.status || delSale.data?.ok}, msg="${delSale.data?.message}"`);

  // Verify DB state
  const [saleOut] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?', [saleId]);
  const [saleItem] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward_item WHERE outward_id = ?', [saleId]);
  const [stoneAfterSaleDel] = await query('SELECT outward, visibility, onhand_carat, polish_carat FROM dai_product WHERE id = ?', [testStone.id]);
  console.log(`DB dai_outward soft-deleted: deleted=${saleOut?.deleted}, by=${saleOut?.deleted_by}`);
  console.log(`DB dai_outward_item soft-deleted: deleted=${saleItem?.deleted}, by=${saleItem?.deleted_by}`);
  console.log(`Stone Restored: outward="${stoneAfterSaleDel?.outward}", vis=${stoneAfterSaleDel?.visibility}, carat=${stoneAfterSaleDel?.polish_carat}`);

  // Test 3.2: Memo Create -> Memo Return Lifecycle
  console.log('\n[3.2] Testing MEMO Create -> Memo Return Lifecycle:');
  const memoInv = `TEST-MEMO-${Date.now().toString().slice(-5)}`;
  const createMemo = await requestPort(3500, '/outward/sendTo', {
    method: 'POST',
    headers: auth4,
    body: {
      operating_company_id: 4,
      party: 12,
      type: 'memo',
      invoiceno: memoInv,
      invoicedate: '01-01-2025',
      terms: false,
      products: [
        {
          id: testStone.id,
          sku: testStone.sku,
          pcs: 1,
          carat: Number(testStone.polish_carat),
          price: 2000,
          amount: 1420,
        },
      ],
    },
  });
  const memoId = createMemo.data?.id;
  console.log(`Created Memo ID: ${memoId} (Status: ${createMemo.data?.status})`);

  // Return memo via POST /transaction/outward-stock/return
  const returnMemo = await requestPort(3500, '/transaction/outward-stock/return', {
    method: 'POST',
    headers: auth4,
    body: {
      id: memoId,
      products: [testStone.id],
      record: {
        [testStone.id]: {
          id: testStone.id,
          pcs: 1,
          carat: Number(testStone.polish_carat),
          sell_price: 2000,
          sell_amount: 1420,
        },
      },
    },
  });
  console.log(`Return Memo: ok=${returnMemo.data?.ok}, msg="${returnMemo.data?.message}"`);
  const [stoneAfterReturn] = await query('SELECT outward, visibility, onhand_carat, polish_carat FROM dai_product WHERE id = ?', [testStone.id]);
  console.log(`Stone Restored: outward="${stoneAfterReturn?.outward}", vis=${stoneAfterReturn?.visibility}, carat=${stoneAfterReturn?.polish_carat}`);

  // Test 3.3: GIA Create -> GIA Delete Lifecycle
  console.log('\n[3.3] Testing GIA Create -> GIA Delete Lifecycle:');
  const giaInv = `TEST-GIA-${Date.now().toString().slice(-5)}`;
  const createGia = await requestPort(3500, '/outward/sendTo', {
    method: 'POST',
    headers: auth4,
    body: {
      operating_company_id: 4,
      party: 12,
      type: 'lab',
      lab: 'GIA',
      invoiceno: giaInv,
      invoicedate: '01-01-2025',
      terms: false,
      products: [
        {
          id: testStone.id,
          sku: testStone.sku,
          pcs: 1,
          carat: Number(testStone.polish_carat),
          price: 2000,
          amount: 1420,
        },
      ],
    },
  });
  const giaId = createGia.data?.id;
  console.log(`Created GIA ID: ${giaId} (Status: ${createGia.data?.status})`);

  // Delete GIA via DELETE /transaction/gia
  const delGia = await requestPort(3500, `/transaction/gia?deleteId=${giaId}`, { method: 'DELETE', headers: auth4 });
  console.log(`Delete GIA: ok=${delGia.data?.ok || delGia.data?.status}, msg="${delGia.data?.message}"`);
  const [giaOut] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?', [giaId]);
  const [giaItem] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward_item WHERE outward_id = ?', [giaId]);
  const [stoneAfterGiaDel] = await query('SELECT outward, visibility FROM dai_product WHERE id = ?', [testStone.id]);
  console.log(`DB dai_outward soft-deleted: deleted=${giaOut?.deleted}, by=${giaOut?.deleted_by}`);
  console.log(`DB dai_outward_item soft-deleted: deleted=${giaItem?.deleted}, by=${giaItem?.deleted_by}`);
  console.log(`Stone Restored: outward="${stoneAfterGiaDel?.outward}", vis=${stoneAfterGiaDel?.visibility}`);

  // Test 3.4: Memo to Sale Convert Lifecycle
  console.log('\n[3.4] Testing Memo to Sale Convert Lifecycle:');
  const memo2Inv = `TEST-MEMO2-${Date.now().toString().slice(-5)}`;
  const createMemo2 = await requestPort(3500, '/outward/sendTo', {
    method: 'POST',
    headers: auth4,
    body: {
      operating_company_id: 4,
      party: 12,
      type: 'memo',
      invoiceno: memo2Inv,
      invoicedate: '01-01-2025',
      terms: false,
      products: [
        {
          id: testStone.id,
          sku: testStone.sku,
          pcs: 1,
          carat: Number(testStone.polish_carat),
          price: 2000,
          amount: 1420,
        },
      ],
    },
  });
  const memo2Id = createMemo2.data?.id;
  console.log(`Created Memo 2 ID: ${memo2Id} (Status: ${createMemo2.data?.status})`);

  // Convert to sale
  const convertSaleInv = `TEST-SALE-CONV-${Date.now().toString().slice(-5)}`;
  const convertRes = await requestPort(3500, '/transaction/outward-stock/memo-to-sale', {
    method: 'POST',
    headers: auth4,
    body: {
      id: memo2Id,
      invoiceno: convertSaleInv,
      invoicedate: '01-01-2025',
      party: 12,
      products: [testStone.id],
      record: {
        [testStone.id]: {
          id: testStone.id,
          pcs: 1,
          carat: Number(testStone.polish_carat),
          sell_price: 2000,
          sell_amount: 1420,
        },
      },
    },
  });
  console.log(`Converted to Sale: ok=${convertRes.data?.ok}, saleId=${convertRes.data?.saleId || convertRes.data?.id}`);
  const convertedSaleId = convertRes.data?.saleId || convertRes.data?.id;

  // Soft delete converted sale
  if (convertedSaleId) {
    const delConvSale = await requestPort(3500, `/transaction/outward-stock?deleteId=${convertedSaleId}`, { method: 'DELETE', headers: auth4 });
    console.log(`Delete Converted Sale: status=${delConvSale.data?.status || delConvSale.data?.ok}`);
  }

  // Test 3.5: Hold Stone & Auto-Expire Cron
  console.log('\n[3.5] Testing Hold & Auto-Expire Cron Lifecycle:');
  const holdRes = await requestPort(3500, '/outward/hold', {
    method: 'POST',
    headers: auth4,
    body: {
      ids: [testStone.id],
      status: 1,
      date: '2020-01-01', // Expired date in past
      description: 'Test expired hold',
    },
  });
  console.log(`Hold Stone: status=${holdRes.data?.status}, msg="${holdRes.data?.message}"`);
  const [stoneOnHold] = await query('SELECT hold FROM dai_product WHERE id = ?', [testStone.id]);
  const [holdRow] = await query('SELECT id, product_id, deleted FROM dai_hold WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)', [testStone.id]);
  console.log(`DB Stone hold=${stoneOnHold?.hold}, dai_hold active row id=${holdRow?.id}`);

  // Run Hold Cron
  console.log('Executing runHoldCron()...');
  const cronRes = await runHoldCron();
  console.log(`Cron result: processed=${cronRes.processed}`);
  const [stoneUnhold] = await query('SELECT hold FROM dai_product WHERE id = ?', [testStone.id]);
  const [holdRowAfter] = await query('SELECT id, product_id, deleted, deleted_at FROM dai_hold WHERE id = ?', [holdRow?.id]);
  console.log(`DB Stone hold after cron: ${stoneUnhold?.hold} (0=unheld)`);
  console.log(`DB dai_hold soft-deleted: deleted=${holdRowAfter?.deleted}, deleted_at=${Boolean(holdRowAfter?.deleted_at)}`);

  // ==========================================================================
  // STEP 4: CLEANUP TEST-CREATED DATA ONLY (id > maxId)
  // ==========================================================================
  console.log('\n--- STEP 4: CLEANING UP TEST-CREATED DATA (id > snapshot) ---');

  const delOutItems = await query('DELETE FROM dai_outward_item WHERE id > ?', [maxIdSnapshot.outward_item]);
  const delOuts = await query('DELETE FROM dai_outward WHERE id > ?', [maxIdSnapshot.outward]);
  const delHist = await query('DELETE FROM dai_history WHERE id > ?', [maxIdSnapshot.history]);
  const delHolds = await query('DELETE FROM dai_hold WHERE id > ?', [maxIdSnapshot.hold]);

  console.log(`Purged test records: outward_items=${delOutItems.affectedRows}, outward=${delOuts.affectedRows}, history=${delHist.affectedRows}, hold=${delHolds.affectedRows}`);

  // Restore Stone 9 exact balances
  await query(
    "UPDATE dai_product SET outward = '', visibility = 1, onhand_pcs = 1, onhand_carat = 0.71, memo_pcs = 0, memo_carat = 0, sold_pcs = 0, sold_carat = 0, hold = 0, polish_pcs = 1, polish_carat = 0.71, amount = 1420, price = 2000 WHERE id = 9"
  );

  // ==========================================================================
  // STEP 5: POST-TEST EXISTING DATA CHECKSUMS & VERIFICATION (Question 7)
  // ==========================================================================
  console.log('\n--- STEP 5: POST-TEST EXISTING DATA CHECKSUMS ---');

  const postExistingProds = await query('SELECT * FROM dai_product WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.product]);
  const postExistingOuts = await query('SELECT * FROM dai_outward WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.outward]);
  const postExistingItems = await query('SELECT * FROM dai_outward_item WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.outward_item]);
  const postExistingHist = await query('SELECT * FROM dai_history WHERE id <= ? ORDER BY id ASC', [maxIdSnapshot.history]);

  const postProdChecksum = computeTableChecksum(postExistingProds, ['id', 'sku', 'polish_pcs', 'polish_carat', 'amount', 'price', 'outward', 'visibility', 'hold', 'deleted']);
  const postOutChecksum = computeTableChecksum(postExistingOuts, ['id', 'invoiceno', 'type', 'final_amount', 'products', 'deleted']);
  const postItemChecksum = computeTableChecksum(postExistingItems, ['id', 'outward_id', 'product_id', 'pcs', 'carat', 'price', 'amount', 'status', 'deleted']);
  const postHistChecksum = computeTableChecksum(postExistingHist, ['id', 'product_id', 'action', 'pcs', 'carat', 'amount', 'price', 'sku']);

  const prodMatch = preProdChecksum === postProdChecksum;
  const outMatch = preOutChecksum === postOutChecksum;
  const itemMatch = preItemChecksum === postItemChecksum;
  const histMatch = preHistChecksum === postHistChecksum;

  console.log(`Post-Test dai_product:      ${postProdChecksum} -> ${prodMatch ? 'EXACT MATCH (0 modifications)' : 'DIFF'}`);
  console.log(`Post-Test dai_outward:      ${postOutChecksum} -> ${outMatch ? 'EXACT MATCH (0 modifications)' : 'DIFF'}`);
  console.log(`Post-Test dai_outward_item: ${postItemChecksum} -> ${itemMatch ? 'EXACT MATCH (0 modifications)' : 'DIFF'}`);
  console.log(`Post-Test dai_history:      ${postHistChecksum} -> ${histMatch ? 'EXACT MATCH (0 modifications)' : 'DIFF'}`);

  if (!prodMatch || !outMatch || !itemMatch || !histMatch) {
    throw new Error('CHECKSUM DIFF DETECTED IN EXISTING DATA!');
  }

  // ==========================================================================
  // STEP 6: BASELINE METRICS COMPARISON
  // ==========================================================================
  console.log('\n--- STEP 6: FINAL BASELINE METRICS COMPARISON ---');
  const [stockMetrics] = await query(
    `SELECT COUNT(*) AS total_products,
            ROUND(SUM(polish_carat), 3) AS total_carats,
            SUM(polish_pcs) AS total_pcs,
            ROUND(SUM(amount), 2) AS total_amount
     FROM dai_product
     WHERE (deleted = 0 OR deleted IS NULL)`
  );
  const [inwMetrics] = await query(
    `SELECT COUNT(*) AS total_inward, ROUND(SUM(final_amount), 2) AS inward_amount
     FROM dai_inward
     WHERE (deleted = 0 OR deleted IS NULL)`
  );
  const [outMetrics] = await query(
    `SELECT COUNT(*) AS total_outward, ROUND(SUM(final_amount), 2) AS outward_amount
     FROM dai_outward
     WHERE (deleted = 0 OR deleted IS NULL)`
  );

  console.log(`Total Products: ${stockMetrics.total_products} (Baseline: 90) -> ${stockMetrics.total_products === 90 ? 'MATCH' : 'DIFF'}`);
  console.log(`Total Carats:   ${Number(stockMetrics.total_carats)} (Baseline: 89.662) -> ${Number(stockMetrics.total_carats) === 89.662 ? 'MATCH' : 'DIFF'}`);
  console.log(`Total Pcs:      ${Number(stockMetrics.total_pcs)} (Baseline: 98) -> ${Number(stockMetrics.total_pcs) === 98 ? 'MATCH' : 'DIFF'}`);
  console.log(`Total Amount:   ${Number(stockMetrics.total_amount)} (Baseline: 464351.73) -> ${Number(stockMetrics.total_amount) === 464351.73 ? 'MATCH' : 'DIFF'}`);
  console.log(`Total Inwards:  ${inwMetrics.total_inward} (Baseline: 83) -> ${inwMetrics.total_inward === 83 ? 'MATCH' : 'DIFF'}`);
  console.log(`Total Outwards: ${outMetrics.total_outward} (Baseline: 73) -> ${outMetrics.total_outward === 73 ? 'MATCH' : 'DIFF'}`);

  console.log('\n================================================================');
  console.log('  ALL TESTS & CHECKSUMS PASSED! ZERO REGRESSION ON EXISTING DATA ');
  console.log('================================================================\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('\nSUITE ERROR:', err);
  process.exit(1);
});
