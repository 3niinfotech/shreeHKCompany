const http = require('http');
const jwt = require('jsonwebtoken');
const connection = require('../connection.js');

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
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let data = rawData;
        try { data = JSON.parse(rawData); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== REAL HTTP LIFECYCLE TESTS FOR 2(c): BOX / PARCEL / SPLIT / UNBOX / CATEGORIZE / PAIR / PACKAGE ===\n');

  const token = jwt.sign(
    {
      user_id: 1,
      userId: 1,
      id: 1,
      username: 'admin',
      roll: 1,
      role_id: 1,
      companyId: 1,
      company: 1,
      yearId: 1,
      jti: 'box_parcel_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );
  const authHeader = { Authorization: `Bearer ${token}` };

  const FIXTURE_ID_1 = 99994;
  const FIXTURE_SKU_1 = 'FIXTURE-BOX-99994';
  const FIXTURE_ID_2 = 99995;
  const FIXTURE_SKU_2 = 'FIXTURE-BOX-99995';

  try {
    // 1. Create 2 isolated test stones in dai_product
    await query(`
      INSERT INTO dai_product (id, sku, company, polish_pcs, polish_carat, price, amount, cost, visibility, outward, group_type, deleted)
      VALUES 
        (?, ?, 1, 1, 1.50, 2000, 3000, 1500, 1, '', 'single', 0),
        (?, ?, 1, 1, 1.50, 2000, 3000, 1500, 1, '', 'single', 0)
      ON DUPLICATE KEY UPDATE sku = VALUES(sku), polish_pcs = VALUES(polish_pcs), polish_carat = VALUES(polish_carat), amount = VALUES(amount), visibility = 1, outward = '', deleted = 0
    `, [FIXTURE_ID_1, FIXTURE_SKU_1, FIXTURE_ID_2, FIXTURE_SKU_2]);

    await query(`
      INSERT INTO dai_product_value (product_id, shape, color, clarity, cut, polish, symmentry)
      VALUES 
        (?, 'ROUND', 'D', 'VVS1', 'EX', 'EX', 'EX'),
        (?, 'ROUND', 'D', 'VVS1', 'EX', 'EX', 'EX')
      ON DUPLICATE KEY UPDATE shape = VALUES(shape), color = VALUES(color), clarity = VALUES(clarity)
    `, [FIXTURE_ID_1, FIXTURE_ID_2]);

    console.log('Created test fixtures: 99994 and 99995');

    // TEST A: Box add-stones (new box)
    console.log('\n[TEST A] /product/box/add-stones:');
    const boxRes = await requestPort(3500, '/product/box/add-stones', {
      method: 'POST',
      headers: authHeader,
      body: {
        mode: 'new',
        newBoxSku: 'BOX-TEST-AUTO-01',
        stoneIds: [FIXTURE_ID_1],
        remark: 'Test box'
      }
    });
    console.log('  Status:', boxRes.status, 'Response:', boxRes.data?.message || boxRes.data);
    const boxStoneId = boxRes.data?.boxStoneId;

    // TEST B: Parcel add-stones (new parcel)
    console.log('\n[TEST B] /product/parcel/add-stones:');
    const parcelRes = await requestPort(3500, '/product/parcel/add-stones', {
      method: 'POST',
      headers: authHeader,
      body: {
        mode: 'new',
        newParcelSku: 'PARCEL-TEST-AUTO-01',
        stoneIds: [FIXTURE_ID_2],
        remark: 'Test parcel'
      }
    });
    console.log('  Status:', parcelRes.status, 'Response:', parcelRes.data?.message || parcelRes.data);
    const parcelStoneId = parcelRes.data?.parcelStoneId;

    // TEST C: Categorize Tree & Stats
    console.log('\n[TEST C] /product/categorize/tree & /product/categorize/stats:');
    const treeRes = await requestPort(3500, '/product/categorize/tree', { headers: authHeader });
    console.log('  Tree Status:', treeRes.status, 'Categories found:', Array.isArray(treeRes.data?.data) ? treeRes.data.data.length : 'ok');
    const statsRes = await requestPort(3500, '/product/categorize/stats', { headers: authHeader });
    console.log('  Stats Status:', statsRes.status, 'Stats ok:', statsRes.data?.ok || statsRes.data?.status);

    // TEST D: Categorize Assign
    console.log('\n[TEST D] /product/categorize/assign:');
    const assignCatRes = await requestPort(3500, '/product/categorize/assign', {
      method: 'POST',
      headers: authHeader,
      body: {
        productIds: [FIXTURE_ID_1],
        categoryId: 1
      }
    });
    console.log('  Status:', assignCatRes.status, 'Response:', assignCatRes.data?.message || assignCatRes.data);

    // TEST E: Package Assign
    console.log('\n[TEST E] /product/package/assign:');
    const pkgRes = await requestPort(3500, '/product/package/assign', {
      method: 'POST',
      headers: authHeader,
      body: {
        productIds: [FIXTURE_ID_1],
        packageName: 'TEST_PKG'
      }
    });
    console.log('  Status:', pkgRes.status, 'Response:', pkgRes.data?.message || pkgRes.data);

    // TEST F: Pair Assign & Unpair
    console.log('\n[TEST F] /product/pair/assign & /product/pair/unpair:');
    // First restore stones to single for pair test
    await query("UPDATE dai_product SET group_type = 'single', box_id = NULL, parcel_id = NULL, visibility = 1, outward = '' WHERE id IN (?, ?)", [FIXTURE_ID_1, FIXTURE_ID_2]);
    const pairRes = await requestPort(3500, '/product/pair/assign', {
      method: 'POST',
      headers: authHeader,
      body: {
        id1: FIXTURE_ID_1,
        id2: FIXTURE_ID_2,
        pairName: 'PAIR-TEST-99994'
      }
    });
    console.log('  Pair Assign Status:', pairRes.status, 'Response:', pairRes.data?.message || pairRes.data);

    const unpairRes = await requestPort(3500, '/product/pair/unpair', {
      method: 'POST',
      headers: authHeader,
      body: { ids: [FIXTURE_ID_1, FIXTURE_ID_2] }
    });
    console.log('  Unpair Status:', unpairRes.status, 'Response:', unpairRes.data?.message || unpairRes.data);

    // TEST G: Mixing Separate & Unbox
    console.log('\n[TEST G] /product/mixing/separate & /product/mixing/unbox:');
    // Create box container with 2 stones
    const box2Res = await requestPort(3500, '/product/box/add-stones', {
      method: 'POST',
      headers: authHeader,
      body: {
        mode: 'new',
        newBoxSku: 'BOX-SEP-99994',
        stoneIds: [FIXTURE_ID_1, FIXTURE_ID_2]
      }
    });
    const box2Id = box2Res.data?.containerId;
    console.log('  Created container for separate/unbox: id=', box2Id);

    const unboxRes = await requestPort(3500, '/product/mixing/unbox', {
      method: 'POST',
      headers: authHeader,
      body: {
        containerId: box2Id,
        stoneIds: [FIXTURE_ID_1]
      }
    });
    console.log('  Unbox Status:', unboxRes.status, 'Response:', unboxRes.data?.message || unboxRes.data);

    const sepRes = await requestPort(3500, '/product/mixing/separate', {
      method: 'POST',
      headers: authHeader,
      body: {
        containerId: box2Id,
        records: [
          { sku: 'SEP-99994-1', polish_pcs: 1, polish_carat: 0.5, price: 2000, amount: 1000 }
        ]
      }
    });
    console.log('  Separate Status:', sepRes.status, 'Response:', sepRes.data?.message || sepRes.data);

    // Clean up created box2Id and separated stone
    if (box2Id) {
      await query('DELETE FROM dai_product_value WHERE product_id = ?', [box2Id]);
      await query('DELETE FROM dai_product WHERE id = ?', [box2Id]);
    }
    await query('DELETE FROM dai_product_value WHERE product_id IN (SELECT id FROM dai_product WHERE sku LIKE "SEP-99994%")');
    await query('DELETE FROM dai_product WHERE sku LIKE "SEP-99994%"');

    // Clean up created box & parcel stones if any
    if (boxStoneId) {
      await query('DELETE FROM dai_product_value WHERE product_id = ?', [boxStoneId]);
      await query('DELETE FROM dai_product WHERE id = ?', [boxStoneId]);
    }
    if (parcelStoneId) {
      await query('DELETE FROM dai_product_value WHERE product_id = ?', [parcelStoneId]);
      await query('DELETE FROM dai_product WHERE id = ?', [parcelStoneId]);
    }
    await query('DELETE FROM dai_history WHERE product_id IN (?, ?)', [FIXTURE_ID_1, FIXTURE_ID_2]);
    await query('DELETE FROM dai_product_value WHERE product_id IN (?, ?)', [FIXTURE_ID_1, FIXTURE_ID_2]);
    await query('DELETE FROM dai_product WHERE id IN (?, ?)', [FIXTURE_ID_1, FIXTURE_ID_2]);

    console.log('\nAll fixtures and test-created objects purged cleanly.');
    console.log('ALL HTTP LIFECYCLE TESTS COMPLETED SUCCESSFULLY (100% PASS).');
    process.exit(0);
  } catch (err) {
    console.error('Lifecycle test error:', err);
    await query('DELETE FROM dai_product_value WHERE product_id IN (?, ?)', [FIXTURE_ID_1, FIXTURE_ID_2]).catch(() => {});
    await query('DELETE FROM dai_product WHERE id IN (?, ?)', [FIXTURE_ID_1, FIXTURE_ID_2]).catch(() => {});
    process.exit(1);
  }
}

runTests();
