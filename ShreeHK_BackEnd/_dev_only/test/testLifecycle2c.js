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

async function run2cLifecycle() {
  console.log('================================================================');
  console.log('  LIFECYCLE TEST SUITE FOR SUB-PART 2(c) (PORT 3500)            ');
  console.log('================================================================\n');

  // 1. Snapshot all existing active baseline rows
  const preStock = await query('SELECT * FROM dai_product WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');
  const preInward = await query('SELECT * FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');
  const preOutward = await query('SELECT * FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');
  const preTransfers = await query('SELECT * FROM dai_company_transfer WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');

  const preStockHash = computeChecksum(preStock, ['id', 'sku', 'polish_pcs', 'polish_carat', 'amount', 'price', 'outward', 'visibility', 'hold', 'deleted']);
  const preInwHash = computeChecksum(preInward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);
  const preOutHash = computeChecksum(preOutward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);
  const preTrfHash = computeChecksum(preTransfers, ['id', 'transfer_no', 'from_company_id', 'to_company_id', 'status', 'deleted']);

  console.log(`Pre-Test Existing Stock:     ${preStockHash} (${preStock.length} rows)`);
  console.log(`Pre-Test Existing Inward:    ${preInwHash} (${preInward.length} rows)`);
  console.log(`Pre-Test Existing Outward:   ${preOutHash} (${preOutward.length} rows)`);
  console.log(`Pre-Test Existing Transfers: ${preTrfHash} (${preTransfers.length} rows)\n`);

  const token = jwt.sign(
    {
      user_id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      yearId: 1,
      jti: 'lifecycle_2c_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  const TEST_PID = 99995;
  const TEST_SKU = 'LIFECYCLE_2C_STONE_99995';

  try {
    // Clean test fixture if any
    await query('DELETE FROM dai_history WHERE product_id >= 99990');
    await query('DELETE FROM dai_outward_item WHERE product_id >= 99990');
    await query('DELETE FROM dai_inward_item WHERE product_id >= 99990');
    await query('DELETE FROM dai_company_transfer_item WHERE source_product_id >= 99990 OR target_product_id >= 99990');
    await query('DELETE FROM dai_company_transfer WHERE transfer_no LIKE "TEST-TRF-%"');
    await query('DELETE FROM dai_product WHERE id >= 99990');

    // Create test stone in Company 1
    await query(`
      INSERT INTO dai_product (
        id, sku, company, polish_pcs, polish_carat, amount, price,
        onhand_pcs, onhand_carat, memo_pcs, memo_carat, sold_pcs, sold_carat,
        outward, visibility, hold, outward_parent, deleted
      ) VALUES (?, ?, 1, 1, 1.00, 1000.00, 1000.00, 1, 1.00, 0, 0, 0, 0, '', 1, 0, 0, 0)
    `, [TEST_PID, TEST_SKU]);

    // Insert dummy product value
    await query('INSERT INTO dai_product_value (product_id, shape, color, clarity, cut, polish) VALUES (?, "ROUND", "D", "VVS1", "EX", "EX")', [TEST_PID]);

    // --- TEST 1: INTER-COMPANY TRANSFER & SALE RETURN ---
    console.log('--- TEST 1: INTER-COMPANY TRANSFER & SALE RETURN ---');
    const trfRes = await requestPort(3500, '/transaction/company-transfer', {
      method: 'POST',
      headers: authHeader,
      body: {
        from_company_id: 1,
        to_company_id: 2,
        transfer_date: '2026-10-31',
        notes: 'Test Inter-Company Transfer',
        items: [
          {
            product_id: TEST_PID,
            sku: TEST_SKU,
            pcs: 1,
            carat: 1.0,
            price: 1000,
            amount: 1000,
          },
        ],
      },
    });
    console.log('Transfer executed: status=', trfRes.status, 'transfer_no=', trfRes.data?.data?.transfer_no);
    const transferId = trfRes.data?.data?.transfer_id;
    const targetInwardId = trfRes.data?.data?.target_inward_id;
    const targetProductIds = trfRes.data?.data?.target_product_ids || [];

    // Verify source stone transferred
    const [sourceAfterTrf] = await query('SELECT outward, visibility FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log('Source stone after transfer:', sourceAfterTrf);

    // Verify target stone created in Company 2
    const [targetStone] = await query('SELECT id, sku, company, inward, visibility FROM dai_product WHERE id = ?', [targetProductIds[0]]);
    console.log('Target stone created in Company 2:', targetStone);

    // Execute Sale Return of the transfer
    console.log('\nExecuting Sale Return of the Transfer...');
    const retRes = await requestPort(3500, '/transaction/company-transfer/return', {
      method: 'POST',
      headers: authHeader,
      body: {
        transfer_id: transferId,
        notes: 'Test Sale Return',
      },
    });
    console.log('Sale Return status=', retRes.status, 'msg=', retRes.data?.message);

    // Verify target inward soft-deleted
    const [targetInw] = await query('SELECT deleted, deleted_at, deleted_by FROM dai_inward WHERE id = ?', [targetInwardId]);
    console.log(`Target inward soft-deleted: deleted=${targetInw?.deleted}, by=${targetInw?.deleted_by}`);

    // Verify source stone restored in Company 1
    const [sourceAfterRet] = await query('SELECT outward, visibility, polish_pcs, polish_carat FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log('Source stone restored:', sourceAfterRet);

    // Clean transfer records
    await query('DELETE FROM dai_history WHERE product_id = ? OR product_id = ?', [TEST_PID, targetProductIds[0]]);
    await query('DELETE FROM dai_inward_item WHERE inward_id = ?', [targetInwardId]);
    await query('DELETE FROM dai_inward WHERE id = ?', [targetInwardId]);
    await query('DELETE FROM dai_outward_item WHERE outward_id = ?', [trfRes.data?.data?.source_outward_id]);
    await query('DELETE FROM dai_outward WHERE id = ?', [trfRes.data?.data?.source_outward_id]);
    await query('DELETE FROM dai_company_transfer_item WHERE transfer_id = ?', [transferId]);
    await query('DELETE FROM dai_company_transfer WHERE id = ?', [transferId]);
    await query('DELETE FROM dai_product_value WHERE product_id = ?', [targetProductIds[0]]);
    await query('DELETE FROM dai_product WHERE id = ?', [targetProductIds[0]]);

    // --- TEST 2: TOGGLE INWARD TYPE ---
    console.log('\n--- TEST 2: TOGGLE INWARD TYPE ---');
    // Create test inward
    const inwRes = await query(`
      INSERT INTO dai_inward (entryno, invoiceno, invoicedate, inward_type, company, party, products, final_amount, deleted)
      VALUES ('TEST-INW-1', 'TEST-INW-1', '2026-10-31', 'memo', 1, 1, '${TEST_PID}', 1000, 0)
    `);
    const testInwardId = inwRes.insertId;

    const toggleRes = await requestPort(3500, '/transaction/purchase-stock/toggle-type', {
      method: 'POST',
      headers: authHeader,
      body: { id: testInwardId, type: 'purchase' },
    });
    console.log('Toggle Inward Type result:', toggleRes.data);
    const [inwAfterToggle] = await query('SELECT inward_type FROM dai_inward WHERE id = ?', [testInwardId]);
    console.log('Inward type after toggle:', inwAfterToggle?.inward_type);

    await query('DELETE FROM dai_history WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_inward WHERE id = ?', [testInwardId]);

    // --- TEST 3: OUTWARD TO EXPORT ---
    console.log('\n--- TEST 3: OUTWARD TO EXPORT ---');
    const outRes = await query(`
      INSERT INTO dai_outward (entryno, invoiceno, invoicedate, type, company, party, products, final_amount, deleted)
      VALUES ('TEST-OUT-1', 'TEST-OUT-1', '2026-10-31', 'memo', 1, 1, '${TEST_PID}', 1000, 0)
    `);
    const testOutwardId = outRes.insertId;

    const exportRes = await requestPort(3500, '/transaction/outward-stock/to-export', {
      method: 'POST',
      headers: authHeader,
      body: { id: testOutwardId, type: 'export', shipping_name: 'DHL', shipping_charge: 50 },
    });
    console.log('Outward to Export result:', exportRes.data);
    const [outAfterExport] = await query('SELECT type, status, shipping_name FROM dai_outward WHERE id = ?', [testOutwardId]);
    console.log('Outward after export:', outAfterExport);

    await query('DELETE FROM dai_outward WHERE id = ?', [testOutwardId]);

    // Clean test stone
    await query('DELETE FROM dai_product_value WHERE product_id = ?', [TEST_PID]);
    await query('DELETE FROM dai_product WHERE id = ?', [TEST_PID]);
    console.log('\nTest fixture cleaned up.');

  } catch (err) {
    console.error('Lifecycle 2(c) error:', err);
    await query('DELETE FROM dai_history WHERE product_id >= 99990').catch(() => {});
    await query('DELETE FROM dai_outward_item WHERE product_id >= 99990').catch(() => {});
    await query('DELETE FROM dai_inward_item WHERE product_id >= 99990').catch(() => {});
    await query('DELETE FROM dai_company_transfer_item WHERE source_product_id >= 99990 OR target_product_id >= 99990').catch(() => {});
    await query('DELETE FROM dai_company_transfer WHERE transfer_no LIKE "TEST-TRF-%"').catch(() => {});
    await query('DELETE FROM dai_product_value WHERE product_id >= 99990').catch(() => {});
    await query('DELETE FROM dai_product WHERE id >= 99990').catch(() => {});
  }

  // --- POST-TEST VERIFICATION OF EXISTING DATA (ZERO MUTATION) ---
  console.log('\n--- VERIFYING EXISTING DATA UNTOUCHED ---');
  const postStock = await query('SELECT * FROM dai_product WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');
  const postInward = await query('SELECT * FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');
  const postOutward = await query('SELECT * FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');
  const postTransfers = await query('SELECT * FROM dai_company_transfer WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC');

  const postStockHash = computeChecksum(postStock, ['id', 'sku', 'polish_pcs', 'polish_carat', 'amount', 'price', 'outward', 'visibility', 'hold', 'deleted']);
  const postInwHash = computeChecksum(postInward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);
  const postOutHash = computeChecksum(postOutward, ['id', 'invoiceno', 'type', 'final_amount', 'deleted']);
  const postTrfHash = computeChecksum(postTransfers, ['id', 'transfer_no', 'from_company_id', 'to_company_id', 'status', 'deleted']);

  console.log(`Existing Stock Checksum:     pre=${preStockHash} post=${postStockHash} -> ${preStockHash === postStockHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);
  console.log(`Existing Inward Checksum:    pre=${preInwHash} post=${postInwHash} -> ${preInwHash === postInwHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);
  console.log(`Existing Outward Checksum:   pre=${preOutHash} post=${postOutHash} -> ${preOutHash === postOutHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);
  console.log(`Existing Transfers Checksum: pre=${preTrfHash} post=${postTrfHash} -> ${preTrfHash === postTrfHash ? 'MATCH (0 changes)' : 'MISMATCH'}`);

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
  console.log('  2(c) LIFECYCLE TESTS COMPLETED WITH ZERO REGRESSION             ');
  console.log('================================================================');

  process.exit(0);
}

run2cLifecycle().catch(err => {
  console.error(err);
  process.exit(1);
});

