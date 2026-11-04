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

function deepCompare(obj1, obj2) {
  const str1 = JSON.stringify(obj1);
  const str2 = JSON.stringify(obj2);
  return str1 === str2;
}

async function runDiffs() {
  console.log('=== DUAL-SERVER RAW JSON REGRESSION (PORT 3501 vs 3500) FOR 2(c) ===\n');

  const token = jwt.sign(
    {
      user_id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      yearId: 1,
      jti: 'diff_2c_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  const testEndpoints = [
    {
      name: '1. Transfer List (Existing 20 transfers)',
      path: '/transaction/company-transfer/list',
      companyId: 1,
    },
    {
      name: '2. Transfer Detail #9',
      path: '/transaction/company-transfer/9',
      companyId: 3,
    },
    {
      name: '3. Transfer Detail #10',
      path: '/transaction/company-transfer/10',
      companyId: 1,
    },
    {
      name: '4. Categorize Tree',
      path: '/product/categorize/tree',
      companyId: 1,
    },
    {
      name: '5. Categorize Stats (Category 1)',
      path: '/product/categorize/stats?categoryId=1',
      companyId: 1,
    },
    {
      name: '6. Pair Suggestions (Stone 9)',
      path: '/product/pair/suggest?productId=9',
      companyId: 4,
    },
  ];

  let allMatch = true;

  for (const t of testEndpoints) {
    const auth = { ...authHeader, 'x-company-id': String(t.companyId) };
    const resOrig = await requestPort(3501, t.path, { headers: auth });
    const resChanged = await requestPort(3500, t.path, { headers: auth });

    const isMatch = deepCompare(resOrig.data, resChanged.data);
    if (!isMatch) allMatch = false;

    console.log(`[${t.name}]`);
    console.log(`  Path: ${t.path}`);
    console.log(`  Port 3501 (Orig):    status=${resOrig.status}, non-empty=${Boolean(resOrig.data)}`);
    console.log(`  Port 3500 (Changed): status=${resChanged.status}, non-empty=${Boolean(resChanged.data)}`);
    console.log(`  Result: ${isMatch ? 'EXACT RAW JSON MATCH' : 'DIFF DETECTED'}\n`);

    if (!isMatch) {
      console.log('  Orig snippet:', JSON.stringify(resOrig.data).slice(0, 200));
      console.log('  Changed snippet:', JSON.stringify(resChanged.data).slice(0, 200));
    }
  }

  console.log(`OVERALL RAW JSON REGRESSION MATCH: ${allMatch}`);
  process.exit(allMatch ? 0 : 1);
}

runDiffs().catch((err) => {
  console.error(err);
  process.exit(1);
});

