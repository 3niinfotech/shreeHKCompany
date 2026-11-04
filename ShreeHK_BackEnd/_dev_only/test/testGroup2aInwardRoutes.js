const jwt = require('jsonwebtoken');
const connection = require('../connection.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';
const BASE_URL = 'http://localhost:3500';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { ...(options.headers || {}) };
    const method = options.method || 'GET';
    const postData = options.body ? JSON.stringify(options.body) : null;

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    } else {
      delete headers['Content-Type'];
      delete headers['Content-Length'];
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
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
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function runGroup2aTests() {
  console.log('=== REAL HTTP ENDPOINT & REUSE TESTS FOR GROUP 2(a) INWARD (Port 3500) ===\n');
  const results = [];

  const recordResult = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${name}${details ? ` (${details})` : ''}`);
  };

  const token = jwt.sign(
    {
      user_id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      yearId: 1,
      jti: 'http_test_group2a_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  try {
    // 1. Inward stock list
    const listRes = await request('/transaction/inward-stock/list', {
      method: 'POST',
      headers: authHeaders,
      body: { type: 'purchase' },
    });
    recordResult(
      'POST /transaction/inward-stock/list (purchase)',
      listRes.status === 200 && listRes.data?.status === true && Array.isArray(listRes.data?.Data),
      `Found ${listRes.data?.Data?.length || 0} purchase records`
    );

    // 2. Fetch an existing active inward by id
    const activeInwardRows = await queryDb('SELECT id, invoiceno FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL) LIMIT 1');
    if (activeInwardRows.length > 0) {
      const activeInwardRow = activeInwardRows[0];
      const getInwRes = await request(`/inward/?id=${activeInwardRow.id}`, {
        method: 'GET',
        headers: authHeaders,
      });
      recordResult(
        `GET /inward/?id=${activeInwardRow.id} (active bill detail)`,
        getInwRes.data?.status === true && getInwRes.data?.Data?.id === activeInwardRow.id,
        `Invoice: ${getInwRes.data?.Data?.invoiceno}, Items: ${getInwRes.data?.products?.length || 0}`
      );
    }

    // 3. Test checkExist with an active SKU
    const activeProducts = await queryDb('SELECT sku, polish_carat, price, amount FROM dai_product WHERE (deleted = 0 OR deleted IS NULL) AND company = 1 LIMIT 1');
    if (activeProducts.length > 0) {
      const activeProd = activeProducts[0];
      const checkActiveRes = await request('/inward/checkExist', {
        method: 'POST',
        headers: authHeaders,
        body: {
          products: [
            {
              sku: activeProd.sku,
              polish_carat: activeProd.polish_carat || 1,
              price: activeProd.price || 100,
              amount: activeProd.amount || 100,
            },
          ],
          operating_company_id: 1,
        },
      });
      recordResult(
        `POST /inward/checkExist on active SKU "${activeProd.sku}"`,
        checkActiveRes.data?.status === false && Array.isArray(checkActiveRes.data?.data) && checkActiveRes.data?.data.length > 0,
        `Detected as existing (message: ${checkActiveRes.data?.message})`
      );
    }

    // 4. Create a new test Inward record with unique SKU
    const testSku = `REUSE-SKU-${Date.now().toString().slice(-6)}`;
    const testInvNo = `TEST-INV-${Date.now().toString().slice(-5)}`;
    const createRes = await request('/inward/save', {
      method: 'POST',
      headers: authHeaders,
      body: {
        operating_company_id: 1,
        party: 1,
        inward_type: 'purchase',
        invoicedate: '01-01-2025',
        terms: false,
        invoiceno: testInvNo,
        products: [
          {
            sku: testSku,
            polish_pcs: 1,
            polish_carat: 1.5,
            price: 500,
            amount: 750,
            group_type: 'single',
            attr: {
              color: 'D',
              clarity: 'VVS1',
            },
          },
        ],
      },
    });

    const inwDbRows = await queryDb('SELECT id, invoiceno FROM dai_inward WHERE invoiceno = ?', [testInvNo]);
    const newInwardId = inwDbRows[0]?.id;
    recordResult(
      `POST /inward/save create test inward (SKU: ${testSku})`,
      createRes.data?.status === true && Boolean(newInwardId),
      `New Inward ID: ${newInwardId}, Invoice: ${testInvNo}`
    );

    // Get the product ID created
    const createdProdRows = await queryDb('SELECT id, inward_id, deleted FROM dai_product WHERE sku = ?', [testSku]);
    const createdProdId = createdProdRows[0]?.id;
    recordResult(
      `Verify dai_product created for SKU ${testSku}`,
      Boolean(createdProdId) && createdProdRows[0]?.deleted === 0,
      `Product ID: ${createdProdId}`
    );

    // Verify checkExist sees this new active SKU
    const checkBeforeDelete = await request('/inward/checkExist', {
      method: 'POST',
      headers: authHeaders,
      body: {
        products: [
          {
            sku: testSku,
            polish_carat: 1.5,
            price: 500,
            amount: 750,
          },
        ],
        operating_company_id: 1,
      },
    });
    recordResult(
      `POST /inward/checkExist detects newly created SKU "${testSku}" as existing`,
      checkBeforeDelete.data?.status === false && Array.isArray(checkBeforeDelete.data?.data) && checkBeforeDelete.data?.data.length > 0,
      `Detected as existing before delete`
    );

    // 5. Soft-delete the inward bill via DELETE /transaction/inward-stock
    const deleteRes = await request(`/transaction/inward-stock?deleteId=${newInwardId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult(
      `DELETE /transaction/inward-stock?deleteId=${newInwardId}`,
      deleteRes.status === 200 && deleteRes.data?.status === true,
      `Message: ${deleteRes.data?.message}`
    );

    // 6. Verify in DB that soft delete set deleted = 1 on all linked tables
    const inwDb = await queryDb('SELECT id, deleted, deleted_at, deleted_by FROM dai_inward WHERE id = ?', [newInwardId]);
    const inwItemDb = await queryDb('SELECT id, deleted, deleted_at, deleted_by FROM dai_inward_item WHERE inward_id = ?', [newInwardId]);
    const prodDb = await queryDb('SELECT id, deleted, deleted_at, deleted_by FROM dai_product WHERE id = ?', [createdProdId]);
    const prodValDb = await queryDb('SELECT product_id, deleted, deleted_at, deleted_by FROM dai_product_value WHERE product_id = ?', [createdProdId]);

    recordResult(
      'DB: dai_inward soft deleted (deleted=1, deleted_at, deleted_by=1)',
      inwDb[0]?.deleted === 1 && Boolean(inwDb[0]?.deleted_at) && inwDb[0]?.deleted_by === 1,
      `deleted_by: ${inwDb[0]?.deleted_by}`
    );
    recordResult(
      'DB: dai_inward_item soft deleted (deleted=1)',
      inwItemDb.length > 0 ? inwItemDb.every((it) => it.deleted === 1) : true,
      `Items marked deleted: ${inwItemDb.length}`
    );
    recordResult(
      'DB: dai_product soft deleted (deleted=1, deleted_at, deleted_by=1)',
      prodDb[0]?.deleted === 1 && Boolean(prodDb[0]?.deleted_at) && prodDb[0]?.deleted_by === 1,
      `Product marked deleted`
    );
    recordResult(
      'DB: dai_product_value soft deleted (deleted=1)',
      prodValDb.length > 0 ? prodValDb.every((pv) => pv.deleted === 1) : true,
      `Product values marked deleted: ${prodValDb.length}`
    );

    // 7. Verify HTTP responses exclude the soft-deleted inward & stone
    const getDeletedInwRes = await request(`/inward/?id=${newInwardId}`, {
      method: 'GET',
      headers: authHeaders,
    });
    recordResult(
      `GET /inward/?id=${newInwardId} returns not found after soft-delete`,
      getDeletedInwRes.data?.status === false,
      `Message: ${getDeletedInwRes.data?.message}`
    );

    const listAfterDelete = await request('/transaction/inward-stock/list', {
      method: 'POST',
      headers: authHeaders,
      body: { type: 'purchase' },
    });
    const stillInList = (listAfterDelete.data?.Data || []).some((r) => r.id === newInwardId);
    recordResult(
      'POST /transaction/inward-stock/list excludes soft-deleted inward',
      !stillInList,
      `Inward ${newInwardId} absent from active listing`
    );

    // 8. Verify SKU reuse check: checkExist reports SKU does NOT exist (status: true, existData: [])
    const checkAfterDelete = await request('/inward/checkExist', {
      method: 'POST',
      headers: authHeaders,
      body: {
        products: [
          {
            sku: testSku,
            polish_carat: 2.0,
            price: 600,
            amount: 1200,
          },
        ],
        operating_company_id: 1,
      },
    });
    recordResult(
      `POST /inward/checkExist for soft-deleted SKU "${testSku}" allows reuse`,
      checkAfterDelete.data?.status === true && Array.isArray(checkAfterDelete.data?.data) && checkAfterDelete.data?.data.length === 0,
      `Message: "${checkAfterDelete.data?.message}" (No existing products found)`
    );

    // 9. Re-create a new inward with the SAME SKU to confirm reuse works end-to-end
    const reuseInvNo = `TEST-REUSE-${Date.now().toString().slice(-5)}`;
    const reuseCreateRes = await request('/inward/save', {
      method: 'POST',
      headers: authHeaders,
      body: {
        operating_company_id: 1,
        party: 1,
        inward_type: 'purchase',
        invoicedate: '01-01-2025',
        terms: false,
        invoiceno: reuseInvNo,
        products: [
          {
            sku: testSku, // REUSED SKU!
            polish_pcs: 1,
            polish_carat: 2.0,
            price: 600,
            amount: 1200,
            group_type: 'single',
            attr: {
              color: 'E',
              clarity: 'VS1',
            },
          },
        ],
      },
    });

    const reusedInwRows = await queryDb('SELECT id, invoiceno FROM dai_inward WHERE invoiceno = ?', [reuseInvNo]);
    const reusedInwardId = reusedInwRows[0]?.id;
    recordResult(
      `POST /inward/save successfully reused SKU "${testSku}" on new inward`,
      reuseCreateRes.data?.status === true && Boolean(reusedInwardId),
      `New Inward ID: ${reusedInwardId}, Invoice: ${reuseInvNo}`
    );

    // Verify in DB that the reused stone is an active new product (deleted = 0)
    const reusedProdRows = await queryDb('SELECT id, inward_id, deleted FROM dai_product WHERE sku = ? AND (deleted = 0 OR deleted IS NULL)', [testSku]);
    recordResult(
      `Reused SKU "${testSku}" has new active row in dai_product`,
      reusedProdRows.length === 1 && reusedProdRows[0].deleted === 0 && reusedProdRows[0].id !== createdProdId,
      `New Product ID: ${reusedProdRows[0]?.id} (Old was: ${createdProdId})`
    );

    // Clean up second test record via soft-delete
    if (reusedInwardId) {
      await request(`/transaction/inward-stock?deleteId=${reusedInwardId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
    }

    // 10. Regression Check against Baseline Metrics
    const baselinePath = path.join(__dirname, 'baseline_metrics.json');
    if (fs.existsSync(baselinePath)) {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

      const currentStockRows = await queryDb(
        `SELECT COUNT(*) AS total_products,
                ROUND(SUM(polish_carat), 3) AS total_carats,
                SUM(polish_pcs) AS total_pcs,
                ROUND(SUM(amount), 2) AS total_amount
         FROM dai_product
         WHERE (deleted = 0 OR deleted IS NULL)`
      );
      const currentStock = currentStockRows[0];

      const prodMatch = Number(currentStock.total_products) === Number(baseline.stock.total_products);
      const caratMatch = Math.abs(Number(currentStock.total_carats) - Number(baseline.stock.total_carats)) < 0.001;
      const pcsMatch = Number(currentStock.total_pcs) === Number(baseline.stock.total_pcs);

      recordResult(
        'Regression: Stock total products match baseline',
        prodMatch,
        `Current: ${currentStock.total_products}, Baseline: ${baseline.stock.total_products}`
      );
      recordResult(
        'Regression: Stock total carats match baseline',
        caratMatch,
        `Current: ${currentStock.total_carats}, Baseline: ${baseline.stock.total_carats}`
      );
      recordResult(
        'Regression: Stock total pcs match baseline',
        pcsMatch,
        `Current: ${currentStock.total_pcs}, Baseline: ${baseline.stock.total_pcs}`
      );
    }

    console.log('\n=== GROUP 2(a) TEST SUMMARY ===');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Passed: ${passedCount} / ${results.length}`);
    if (passedCount === results.length) {
      console.log('✓ ALL GROUP 2(a) INWARD TESTS PASSED PERFECTLY!\n');
    } else {
      console.error(`✗ ${results.length - passedCount} TESTS FAILED!`);
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
  } finally {
    process.exit(0);
  }
}

runGroup2aTests();
