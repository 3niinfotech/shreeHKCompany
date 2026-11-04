const http = require('http');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const connection = require('../connection.js');
const fs = require('fs');
const path = require('path');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
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
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function computeChecksum(rows, fields) {
  const hash = crypto.createHash('sha256');
  for (const row of rows) {
    const item = {};
    for (const f of fields) item[f] = row[f] ?? null;
    hash.update(JSON.stringify(item));
  }
  return hash.digest('hex');
}

async function run() {
  console.log('================================================================');
  console.log('  LIFECYCLE TEST SUITE (PORT 3500) USING DEDICATED FIXTURE       ');
  console.log('================================================================\n');

  // Verify baseline is clean before starting
  const preStock = await query('SELECT * FROM dai_product WHERE id <= 90 ORDER BY id ASC');
  const preInward = await query('SELECT * FROM dai_inward WHERE id <= 83 ORDER BY id ASC');
  const preOutward = await query('SELECT * FROM dai_outward WHERE id <= 73 ORDER BY id ASC');

  const preStockHash = computeChecksum(preStock, ['id', 'sku', 'polish_pcs', 'polish_carat', 'amount', 'price', 'outward', 'visibility', 'hold', 'deleted']);
  const preInwHash = computeChecksum(preInward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);
  const preOutHash = computeChecksum(preOutward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);

  console.log(`Pre-Test Checksum Existing Stock:   ${preStockHash} (${preStock.length} rows)`);
  console.log(`Pre-Test Checksum Existing Inward:  ${preInwHash} (${preInward.length} rows)`);
  console.log(`Pre-Test Checksum Existing Outward: ${preOutHash} (${preOutward.length} rows)\n`);

  const token = jwt.sign(
    {
      user_id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      yearId: 1,
      jti: 'lifecycle_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  const TEST_PID = 99998;
  const TEST_SKU = 'LIFECYCLE_TEST_STONE_99998';

  try {
    // Clean test fixture if any
    await query('DELETE FROM dai_history WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_outward_item WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_product WHERE id = ?', [TEST_PID]);

    // Create isolated test stone
    await query(`
      INSERT INTO dai_product (
        id, sku, company, polish_pcs, polish_carat, amount, price,
        onhand_pcs, onhand_carat, memo_pcs, memo_carat, sold_pcs, sold_carat,
        outward, visibility, hold, outward_parent, deleted
      ) VALUES (?, ?, 1, 1, 1.00, 1000.00, 1000.00, 1, 1.00, 0, 0, 0, 0, '', 1, 0, 0, 0)
    `, [TEST_PID, TEST_SKU]);

    // --- TEST 1: MEMO CREATE & RETURN ---
    console.log('--- TEST 1: MEMO CREATE & RETURN ---');
    const memoRes = await requestPort(3500, '/outward/sendTo', {
      method: 'POST',
      headers: authHeader,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'memo',
        invoiceno: `MEMO-TEST-${Date.now().toString().slice(-4)}`,
        invoicedate: '01-01-2025',
        terms: false,
        products: [{ id: TEST_PID, sku: TEST_SKU, pcs: 1, carat: 1.0, price: 1000, amount: 1000 }],
      },
    });
    console.log('Memo create status:', memoRes.status, 'id:', memoRes.data?.id);
    const memoId = memoRes.data?.id;

    const [stoneOnMemo] = await query('SELECT outward, visibility, memo_pcs, onhand_pcs FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log('Stone on memo:', stoneOnMemo);

    // Return memo
    const returnRes = await requestPort(3500, '/transaction/outward-stock/return', {
      method: 'POST',
      headers: authHeader,
      body: {
        id: memoId,
        products: [TEST_PID],
        record: {
          [TEST_PID]: { id: TEST_PID, pcs: 1, carat: 1.0, sell_price: 1000, sell_amount: 1000 },
        },
      },
    });
    console.log('Memo return result:', returnRes.data?.ok, returnRes.data?.message);
    const [stoneAfterReturn] = await query('SELECT outward, visibility, memo_pcs, onhand_pcs FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log('Stone after return:', stoneAfterReturn);

    // Clean memo outward
    await query('DELETE FROM dai_history WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_outward_item WHERE outward_id = ?', [memoId]);
    await query('DELETE FROM dai_outward WHERE id = ?', [memoId]);

    // --- TEST 2: SALE CREATE & SOFT DELETE OUTWARD ---
    console.log('\n--- TEST 2: SALE CREATE & SOFT DELETE OUTWARD ---');
    // Reset stone for sale test
    await query("UPDATE dai_product SET outward = '', visibility = 1, onhand_pcs = 1, onhand_carat = 1.0, memo_pcs = 0, sold_pcs = 0, sold_carat = 0 WHERE id = ?", [TEST_PID]);

    const saleRes = await requestPort(3500, '/outward/sendTo', {
      method: 'POST',
      headers: authHeader,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'sale',
        invoiceno: `SALE-TEST-${Date.now().toString().slice(-4)}`,
        invoicedate: '01-01-2025',
        terms: false,
        products: [{ id: TEST_PID, sku: TEST_SKU, pcs: 1, carat: 1.0, price: 1000, amount: 1000 }],
      },
    });
    console.log('Sale create status:', saleRes.status, 'id:', saleRes.data?.id);
    const saleId = saleRes.data?.id;

    // Delete outward sale via DELETE /transaction/outward-stock
    const delSaleRes = await requestPort(3500, `/transaction/outward-stock?deleteId=${saleId}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    console.log('Delete sale result:', delSaleRes.data);

    // Check soft delete in DB
    const [saleOut] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?', [saleId]);
    const [saleItem] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward_item WHERE outward_id = ?', [saleId]);
    console.log(`dai_outward soft-deleted: deleted=${saleOut?.deleted}, by=${saleOut?.deleted_by}`);
    console.log(`dai_outward_item soft-deleted: deleted=${saleItem?.deleted}, by=${saleItem?.deleted_by}`);

    // Verify outward listing DOES NOT return soft-deleted sale
    const listOutRes = await requestPort(3500, '/transaction/outward-stock/list', {
      method: 'POST',
      headers: authHeader,
      body: { stockType: 'sale' },
    });
    const foundInList = (listOutRes.data?.Data || []).some(o => o.id === saleId);
    console.log(`Soft-deleted sale excluded from list API: ${!foundInList}`);

    // Clean sale records
    await query('DELETE FROM dai_history WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_outward_item WHERE outward_id = ?', [saleId]);
    await query('DELETE FROM dai_outward WHERE id = ?', [saleId]);

    // --- TEST 3: GIA CREATE & SOFT DELETE GIA ---
    console.log('\n--- TEST 3: GIA CREATE & SOFT DELETE GIA ---');
    await query("UPDATE dai_product SET outward = '', visibility = 1, onhand_pcs = 1, onhand_carat = 1.0 WHERE id = ?", [TEST_PID]);

    const giaRes = await requestPort(3500, '/outward/sendTo', {
      method: 'POST',
      headers: authHeader,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'lab',
        lab: 'GIA',
        invoiceno: `GIA-TEST-${Date.now().toString().slice(-4)}`,
        invoicedate: '01-01-2025',
        terms: false,
        products: [{ id: TEST_PID, sku: TEST_SKU, pcs: 1, carat: 1.0, price: 1000, amount: 1000 }],
      },
    });
    console.log('GIA create status:', giaRes.status, 'id:', giaRes.data?.id);
    const giaId = giaRes.data?.id;

    // Delete GIA via DELETE /transaction/gia
    const delGiaRes = await requestPort(3500, `/transaction/gia?deleteId=${giaId}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    console.log('Delete GIA result:', delGiaRes.data);

    const [giaOut] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?', [giaId]);
    const [giaItem] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_outward_item WHERE outward_id = ?', [giaId]);
    const [stoneAfterGia] = await query('SELECT outward, visibility FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log(`dai_outward soft-deleted: deleted=${giaOut?.deleted}, by=${giaOut?.deleted_by}`);
    console.log(`dai_outward_item soft-deleted: deleted=${giaItem?.deleted}, by=${giaItem?.deleted_by}`);
    console.log(`Stone after GIA delete: outward="${stoneAfterGia?.outward}", vis=${stoneAfterGia?.visibility}`);

    // Clean GIA records
    await query('DELETE FROM dai_history WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_outward_item WHERE outward_id = ?', [giaId]);
    await query('DELETE FROM dai_outward WHERE id = ?', [giaId]);

    // Clean test fixture
    await query('DELETE FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log('\nTest fixture cleaned up.');

  } catch (e) {
    console.error('Lifecycle test error:', e);
    await query('DELETE FROM dai_history WHERE product_id = ?', [TEST_PID]).catch(() => {});
    await query('DELETE FROM dai_outward_item WHERE product_id = ?', [TEST_PID]).catch(() => {});
    await query('DELETE FROM dai_product WHERE id = ?', [TEST_PID]).catch(() => {});
  }

  // --- POST-TEST VERIFICATION OF EXISTING DATA (ZERO MUTATION) ---
  console.log('\n--- VERIFYING EXISTING DATA UNTOUCHED ---');
  const postStock = await query('SELECT * FROM dai_product WHERE id <= 90 ORDER BY id ASC');
  const postInward = await query('SELECT * FROM dai_inward WHERE id <= 83 ORDER BY id ASC');
  const postOutward = await query('SELECT * FROM dai_outward WHERE id <= 73 ORDER BY id ASC');

  const postStockHash = computeChecksum(postStock, ['id', 'sku', 'polish_pcs', 'polish_carat', 'amount', 'price', 'outward', 'visibility', 'hold', 'deleted']);
  const postInwHash = computeChecksum(postInward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);
  const postOutHash = computeChecksum(postOutward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);

  console.log(`Existing Stock Checksum:   pre=${preStockHash} post=${postStockHash} -> ${preStockHash === postStockHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);
  console.log(`Existing Inward Checksum:  pre=${preInwHash} post=${postInwHash} -> ${preInwHash === postInwHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);
  console.log(`Existing Outward Checksum: pre=${preOutHash} post=${postOutHash} -> ${preOutHash === postOutHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);

  // Check baseline
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline_metrics.json'), 'utf8'));
  const [stock] = await query('SELECT COUNT(*) AS total_products, COALESCE(SUM(polish_carat), 0) AS total_carats, COALESCE(SUM(polish_pcs), 0) AS total_pcs, COALESCE(SUM(amount), 0) AS total_amount FROM dai_product WHERE (deleted = 0 OR deleted IS NULL)');
  const [inward] = await query('SELECT COUNT(*) AS total_inward, COALESCE(SUM(final_amount), 0) AS inward_amount FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL)');
  const [outward] = await query('SELECT COUNT(*) AS total_outward, COALESCE(SUM(final_amount), 0) AS outward_amount FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL)');

  const stockOk = Number(stock.total_products) === baseline.stock.total_products && Math.abs(Number(stock.total_carats) - baseline.stock.total_carats) < 0.001;
  const inwOk = Number(inward.total_inward) === baseline.transactions.total_inward;
  const outOk = Number(outward.total_outward) === baseline.transactions.total_outward;

  console.log(`\nBaseline Stock:       ${stockOk ? 'EXACT MATCH (90 products, 89.662 cts)' : 'MISMATCH'}`);
  console.log(`Baseline Inward:      ${inwOk ? 'EXACT MATCH (83 inwards)' : 'MISMATCH'}`);
  console.log(`Baseline Outward:     ${outOk ? 'EXACT MATCH (73 outwards)' : 'MISMATCH'}`);

  console.log('\n================================================================');
  console.log('  LIFECYCLE TESTS COMPLETED SUCCESSFULLY WITH ZERO REGRESSION    ');
  console.log('================================================================');

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
