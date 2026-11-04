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

async function runTest() {
  console.log('=== TARGETED REGRESSION DIFF: HOLD & TRANSFER ENDPOINTS (Port 3501 vs Port 3500) ===\n');

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
      jti: 'hold_trf_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  const tests = [
    { name: '1. Hold Listing via /product/inventory?hold=1', path: '/product/inventory?hold=1&limit=20', method: 'GET' },
    { name: '2. Hold Listing via /product/inventory?row_status=hold', path: '/product/inventory?row_status=hold&limit=20', method: 'GET' },
    { name: '3. Real Hold Detail for Stone #20477', path: '/product/holdDetail?id=20477', method: 'GET' },
    { name: '4. Real Hold Detail for Stone #20491', path: '/product/holdDetail?id=20491', method: 'GET' },
    { name: '5. Company Transfer List', path: '/transaction/company-transfer/list', method: 'GET' },
    { name: '6. Company Transfer Detail #1 (Non-existent record 404 behavior)', path: '/transaction/company-transfer/1', method: 'GET' },
    { name: '7. Mixing Container Children for #24225', path: '/product/mixing/container-children?containerId=24225', method: 'GET' },
  ];

  let passed = 0;
  for (const t of tests) {
    const orig = await requestPort(3501, t.path, { headers: authHeader, method: t.method });
    const upd = await requestPort(3500, t.path, { headers: authHeader, method: t.method });
    const match = deepCompare(orig.data, upd.data);

    console.log(`[${t.name}]`);
    console.log(`  Path: ${t.method} ${t.path}`);
    console.log(`  Port 3501 (Original): status=${orig.status}, length=${orig.rawLength}`);
    console.log(`  Port 3500 (Updated):  status=${upd.status}, length=${upd.rawLength}`);
    console.log(`  Result: ${match ? 'EXACT RAW JSON MATCH' : 'DIFF DETECTED'}\n`);

    if (match) passed++;
    else {
      console.log('  Orig:', JSON.stringify(orig.data).slice(0, 300));
      console.log('  Upd: ', JSON.stringify(upd.data).slice(0, 300));
    }
  }

  console.log(`Total: ${tests.length}, Passed: ${passed}, Failed: ${tests.length - passed}`);
  process.exit(tests.length === passed ? 0 : 1);
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});

