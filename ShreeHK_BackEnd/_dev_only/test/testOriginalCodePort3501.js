const http = require('http');
const jwt = require('jsonwebtoken');
const connection = require('../connection.js');
const fs = require('fs');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

function q(sql, params = []) {
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

async function runTest() {
  console.log('=== TESTING ORIGINAL CODE BEHAVIOR ON PORT 3501 ===\n');

  const token = jwt.sign(
    {
      user_id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      yearId: 1,
      jti: 'test_orig_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  const TEST_PRODUCT_ID = 99999;
  const TEST_SKU = 'TEST_ORIG_STONE_99999';

  try {
    // 1. Clean any remnant
    await q('DELETE FROM dai_history WHERE product_id = ?', [TEST_PRODUCT_ID]);
    await q('DELETE FROM dai_outward_item WHERE product_id = ?', [TEST_PRODUCT_ID]);
    await q('DELETE FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);

    // 2. Insert test product (standalone stone, outward_parent = 0)
    await q(`
      INSERT INTO dai_product (
        id, sku, company, polish_pcs, polish_carat, amount, price,
        onhand_pcs, onhand_carat, memo_pcs, memo_carat, sold_pcs, sold_carat,
        outward, visibility, hold, outward_parent, deleted
      ) VALUES (?, ?, 1, 1, 1.00, 1000.00, 1000.00, 1, 1.00, 0, 0, 0, 0, '', 1, 0, 0, 0)
    `, [TEST_PRODUCT_ID, TEST_SKU]);

    console.log('[Step 1] Created standalone test stone in DB:');
    const [pInitial] = await q('SELECT id, sku, outward, visibility, outward_parent FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);
    console.log('  Initial stone:', pInitial);

    // 3. Put on MEMO via Port 3501 (Original Server)
    const memoInv = `ORIG-MEMO-${Date.now().toString().slice(-5)}`;
    console.log(`\n[Step 2] Sending stone to MEMO via Port 3501 (invoice: ${memoInv})...`);
    const memoRes = await requestPort(3501, '/outward/sendTo', {
      method: 'POST',
      headers: authHeader,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'memo',
        invoiceno: memoInv,
        invoicedate: '01-01-2025',
        terms: false,
        products: [
          {
            id: TEST_PRODUCT_ID,
            sku: TEST_SKU,
            pcs: 1,
            carat: 1.0,
            price: 1000,
            amount: 1000,
          },
        ],
      },
    });

    console.log('  memo response status:', memoRes.status, 'body:', memoRes.data);
    const outwardId = memoRes.data?.id;
    if (!outwardId) {
      throw new Error('Failed to create memo on port 3501: ' + JSON.stringify(memoRes.data));
    }

    const [pAfterMemo] = await q('SELECT id, sku, outward, visibility, outward_parent FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);
    console.log('  Stone state after memo:', pAfterMemo);

    // 4. Delete the MEMO via Port 3501 (Original deleteOutwardStock)
    console.log(`\n[Step 3] Calling DELETE /transaction/outward-stock?deleteId=${outwardId} on Port 3501...`);
    const delRes = await requestPort(3501, `/transaction/outward-stock?deleteId=${outwardId}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    console.log('  delete response status:', delRes.status, 'body:', delRes.data);

    // 5. Inspect stone state after deletion in original code
    const [pAfterDel] = await q('SELECT id, sku, outward, visibility, outward_parent FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);
    console.log('\n[Step 4] Stone state after memo was deleted by ORIGINAL CODE:');
    console.log('  Stone:', pAfterDel);

    const isRestored = pAfterDel.outward === '' && pAfterDel.visibility === 1;
    console.log('\n=== RESULT IN ORIGINAL CODE ===');
    console.log(`Stone restored to inventory (outward='', visibility=1)? -> ${isRestored ? 'YES' : 'NO'}`);
    console.log(`Actual outward value: "${pAfterDel.outward}"`);
    console.log(`Actual visibility value: ${pAfterDel.visibility}`);

    // Clean up memo
    await q('DELETE FROM dai_history WHERE product_id = ?', [TEST_PRODUCT_ID]);
    await q('DELETE FROM dai_outward_item WHERE outward_id = ?', [outwardId]);
    await q('DELETE FROM dai_outward WHERE id = ?', [outwardId]);

    // Reset stone for SALE test
    await q("UPDATE dai_product SET outward = '', visibility = 1, onhand_pcs = 1, onhand_carat = 1.0, sold_pcs = 0, sold_carat = 0 WHERE id = ?", [TEST_PRODUCT_ID]);

    // 5. Test SALE on Port 3501
    const saleInv = `ORIG-SALE-${Date.now().toString().slice(-5)}`;
    console.log(`\n[Step 5] Sending stone to SALE via Port 3501 (invoice: ${saleInv})...`);
    const saleRes = await requestPort(3501, '/outward/sendTo', {
      method: 'POST',
      headers: authHeader,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'sale',
        invoiceno: saleInv,
        invoicedate: '01-01-2025',
        terms: false,
        products: [
          {
            id: TEST_PRODUCT_ID,
            sku: TEST_SKU,
            pcs: 1,
            carat: 1.0,
            price: 1000,
            amount: 1000,
          },
        ],
      },
    });

    console.log('  sale response status:', saleRes.status, 'body:', saleRes.data);
    const saleId = saleRes.data?.id;
    if (!saleId) {
      throw new Error('Failed to create sale on port 3501: ' + JSON.stringify(saleRes.data));
    }

    const [pAfterSale] = await q('SELECT id, sku, outward, visibility, outward_parent FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);
    console.log('  Stone state after sale:', pAfterSale);

    // 6. Delete the SALE via Port 3501
    console.log(`\n[Step 6] Calling DELETE /transaction/outward-stock?deleteId=${saleId} on Port 3501...`);
    const delSaleRes = await requestPort(3501, `/transaction/outward-stock?deleteId=${saleId}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    console.log('  delete sale status:', delSaleRes.status, 'body:', delSaleRes.data);

    const [pAfterSaleDel] = await q('SELECT id, sku, outward, visibility, outward_parent FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);
    console.log('\n[Step 7] Stone state after SALE was deleted by ORIGINAL CODE:');
    console.log('  Stone:', pAfterSaleDel);

    console.log('\n=== RESULT FOR SALE IN ORIGINAL CODE ===');
    console.log(`Stone restored to inventory (outward='', visibility=1)? -> ${pAfterSaleDel.outward === '' && pAfterSaleDel.visibility === 1 ? 'YES' : 'NO'}`);
    console.log(`Actual outward value: "${pAfterSaleDel.outward}"`);
    console.log(`Actual visibility value: ${pAfterSaleDel.visibility}`);

    // Clean up
    await q('DELETE FROM dai_history WHERE product_id = ?', [TEST_PRODUCT_ID]);
    await q('DELETE FROM dai_outward_item WHERE outward_id = ?', [saleId]);
    await q('DELETE FROM dai_outward WHERE id = ?', [saleId]);
    await q('DELETE FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]);
    console.log('\n[Cleanup] Test records cleaned up.');

  } catch (err) {
    console.error('Test error:', err);
    // Cleanup on error
    await q('DELETE FROM dai_history WHERE product_id = ?', [TEST_PRODUCT_ID]).catch(() => {});
    await q('DELETE FROM dai_outward_item WHERE product_id = ?', [TEST_PRODUCT_ID]).catch(() => {});
    await q('DELETE FROM dai_product WHERE id = ?', [TEST_PRODUCT_ID]).catch(() => {});
  } finally {
    process.exit(0);
  }
}

runTest();
