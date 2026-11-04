const http = require('http');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

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

    const req = http.request(url, { method, headers, timeout: 25000 }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (_) {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, data: parsed, rawLength: rawData.length });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting port ${port} ${path}`));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

function deepCompare(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

async function runRegression() {
  console.log('=== EXPANDED DUAL-SERVER READ-ONLY REGRESSION (Port 3501 Original vs Port 3500 Updated) ===\n');

  const token = jwt.sign(
    {
      user_id: 1,
      userId: 1,
      id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      company: 1,
      yearId: 8,
      jti: 'regression_expanded_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  const testEndpoints = [
    // 1. Inward listing & details
    { name: '1. Inward Stock List (POST /transaction/inward-stock/list)', path: '/transaction/inward-stock/list', method: 'POST', body: { page: 1, limit: 20 } },
    { name: '2. Purchase Stock List (POST /transaction/purchase-stock/list)', path: '/transaction/purchase-stock/list', method: 'POST', body: { page: 1, limit: 20 } },
    { name: '3. Inward Detail #147', path: '/inward/?id=147', method: 'GET' },
    { name: '4. Inward Detail #243', path: '/inward/?id=243', method: 'GET' },
    { name: '5. Inward Detail #259', path: '/inward/?id=259', method: 'GET' },

    // 2. Outward lists & details (both transactionStock and outwardRouter)
    { name: '6. Outward Stock List - Memo', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'memo', page: 1, limit: 20 } },
    { name: '7. Outward Stock List - Sale', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'sale', page: 1, limit: 20 } },
    { name: '8. Outward Stock List - Return', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'return', page: 1, limit: 20 } },
    { name: '9. Outward Stock List - Consign', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'consign', page: 1, limit: 20 } },
    { name: '10. Outward Router - Memo', path: '/outward/list', method: 'POST', body: { type: 'memo', page: 1, limit: 20 } },
    { name: '11. Outward Router - Sale', path: '/outward/list', method: 'POST', body: { type: 'sale', page: 1, limit: 20 } },
    { name: '12. Outward Router - Export', path: '/outward/list', method: 'POST', body: { type: 'export', page: 1, limit: 20 } },
    { name: '13. Outward Detail #707', path: '/outward/?id=707', method: 'GET' },
    { name: '14. Outward Detail #1080', path: '/outward/?id=1080', method: 'GET' },
    { name: '15. Outward Detail #1150', path: '/outward/?id=1150', method: 'GET' },
    { name: '16. Outward Detail #1603', path: '/outward/?id=1603', method: 'GET' },

    // 3. GIA List
    { name: '17. GIA List (POST /transaction/gia/list)', path: '/transaction/gia/list', method: 'POST', body: { page: 1, limit: 20 } },

    // 4. Hold Stock
    { name: '18. Hold Stock Listing (POST /product/all hold=1)', path: '/product/all', method: 'POST', body: { hold: 1, page: 1, limit: 20 } },
    { name: '19. Hold Stock Listing (POST /product/all row_status=hold)', path: '/product/all', method: 'POST', body: { row_status: 'hold', page: 1, limit: 20 } },
    { name: '20. Hold Detail #4022', path: '/product/holdDetail?id=4022', method: 'GET' },

    // 5. Company Transfer
    { name: '21. Company Transfer List', path: '/transaction/company-transfer/list', method: 'GET' },
    { name: '22. Company Transfer Detail #1', path: '/transaction/company-transfer/1', method: 'GET' },
    { name: '23. Company Transfer Detail #2', path: '/transaction/company-transfer/2', method: 'GET' },

    // 6. Categorize & Pair
    { name: '24. Categorize Tree', path: '/product/categorize/tree', method: 'GET' },
    { name: '25. Categorize Stats (Cat 1)', path: '/product/categorize/stats?categoryId=1', method: 'GET' },

    // 7. Stock search & suggest
    { name: '26. Stock Inventory Suggest (query=D)', path: '/product/inventory/suggest?query=D', method: 'GET' },
    { name: '27. Stock Product Detail #4022', path: '/product/detail?id=4022', method: 'GET' },
    { name: '28. Stock Product Detail #6686', path: '/product/detail?id=6686', method: 'GET' },

    // 8. Masters & Dropdowns
    { name: '29. Master Company/Party List', path: '/master/company', method: 'GET' },
    { name: '30. Master Party Dropdown (getOption)', path: '/company/getOption', method: 'GET' },
    { name: '31. Master Category List', path: '/master/category', method: 'GET' },
    { name: '32. Master Lab List', path: '/master/lab', method: 'GET' },
    { name: '33. Master Origin List', path: '/master/origin', method: 'GET' },
    { name: '34. Master Shipping List', path: '/master/shipping', method: 'GET' },
    { name: '35. Master Attribute List', path: '/master/attribute', method: 'GET' },
    { name: '36. Admin Users List', path: '/getAdminManageUser', method: 'GET' },
    { name: '37. Roles List', path: '/role-list', method: 'GET' },
  ];

  let passedCount = 0;
  let diffCount = 0;
  const diffDetails = [];

  for (const t of testEndpoints) {
    try {
      const opts = {
        headers: authHeader,
        method: t.method || 'GET',
        body: t.body || null,
      };
      const resOrig = await requestPort(3501, t.path, opts);
      const resNew = await requestPort(3500, t.path, opts);

      const isMatch = deepCompare(resOrig.data, resNew.data);

      console.log(`[${t.name}]`);
      console.log(`  Endpoint: ${t.method || 'GET'} ${t.path}`);
      console.log(`  Port 3501 (Original): status=${resOrig.status}, length=${resOrig.rawLength}`);
      console.log(`  Port 3500 (Updated):  status=${resNew.status}, length=${resNew.rawLength}`);

      if (isMatch) {
        console.log(`  Result: EXACT RAW JSON MATCH\n`);
        passedCount++;
      } else {
        console.log(`  Result: DIFF DETECTED!`);
        diffCount++;
        const sOrig = JSON.stringify(resOrig.data);
        const sNew = JSON.stringify(resNew.data);
        console.log(`  Port 3501 snippet: ${sOrig.slice(0, 300)}`);
        console.log(`  Port 3500 snippet: ${sNew.slice(0, 300)}\n`);
        diffDetails.push({ name: t.name, path: t.path, orig: sOrig.slice(0, 300), updated: sNew.slice(0, 300) });
      }
    } catch (err) {
      console.error(`  ERROR testing ${t.name}:`, err.message, '\n');
      diffCount++;
      diffDetails.push({ name: t.name, path: t.path, error: err.message });
    }
  }

  console.log('====================================================');
  console.log(`REGRESSION SUMMARY: Total=${testEndpoints.length}, Passed=${passedCount}, Diffs/Errors=${diffCount}`);
  console.log('====================================================');

  if (diffCount > 0) {
    console.log('Diff details:');
    console.log(JSON.stringify(diffDetails, null, 2));
    process.exit(1);
  } else {
    console.log('SUCCESS: All endpoints produced EXACT identical responses!');
    process.exit(0);
  }
}

runRegression().catch((err) => {
  console.error('Fatal regression failure:', err);
  process.exit(1);
});
