const http = require('http');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const helper = require('../helper.js');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

function waitPort(port, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

function requestPort(port, pathStr, options = {}, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, `http://localhost:${port}`);
    const headers = {
      Authorization: `Bearer ${token}`,
      'x-company-id': '1',
      ...(options.headers || {}),
    };
    const method = options.method || 'GET';
    const postData = options.body ? JSON.stringify(options.body) : null;

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers, timeout: 30000 }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (_) {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, data: parsed, rawData, rawLength: rawData.length });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting port ${port} ${pathStr}`));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

function findObjectDiffs(o1, o2, p = '') {
  if (o1 === o2) return [];
  if (typeof o1 !== typeof o2) return [{ path: p, val3501: o1, val3500: o2 }];
  if (typeof o1 !== 'object' || o1 === null || o2 === null) return [{ path: p, val3501: o1, val3500: o2 }];
  const keys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
  let diffs = [];
  for (const k of keys) {
    const curPath = p ? `${p}.${k}` : k;
    if (!(k in o1)) diffs.push({ path: curPath, missingIn: 'port3501 (Original)' });
    else if (!(k in o2)) diffs.push({ path: curPath, missingIn: 'port3500 (New)' });
    else diffs.push(...findObjectDiffs(o1[k], o2[k], curPath));
  }
  return diffs;
}

function deepCompare(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

async function run() {
  console.log('================================================================');
  console.log('=== STEP 3: FINAL REGRESSION SUITE (Port 3501 vs Port 3500) ===');
  console.log('================================================================\n');

  // 1. Verify Baseline Metrics first
  console.log('[1/4] Verifying baseline database metrics...');
  const baselinePath = path.resolve(__dirname, 'baseline_metrics.json');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  const stockRows = await helper.query(
    'SELECT COUNT(*) AS total_products, COALESCE(SUM(polish_carat), 0) AS total_carats, COALESCE(SUM(polish_pcs), 0) AS total_pcs, COALESCE(SUM(amount), 0) AS total_amount FROM dai_product WHERE (deleted = 0 OR deleted IS NULL)'
  );
  const inwRows = await helper.query('SELECT COUNT(*) AS total_inward, COALESCE(SUM(final_amount), 0) AS inward_amount FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL)');
  const outRows = await helper.query('SELECT COUNT(*) AS total_outward, COALESCE(SUM(final_amount), 0) AS outward_amount FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL)');
  const txnRows = await helper.query('SELECT COUNT(*) AS total_txns, COALESCE(SUM(amount), 0) AS total_txn_amount FROM acc_transaction WHERE (deleted = 0 OR deleted IS NULL)');
  const advRows = await helper.query('SELECT COUNT(*) AS total_advances, COALESCE(SUM(amount), 0) AS total_adv_amount FROM acc_advance WHERE (deleted = 0 OR deleted IS NULL)');
  const partyRows = await helper.query('SELECT COUNT(*) AS total_parties FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)');

  const liveMetrics = {
    products: Number(stockRows[0].total_products),
    carats: Number(stockRows[0].total_carats),
    pcs: Number(stockRows[0].total_pcs),
    inward_count: Number(inwRows[0].total_inward),
    outward_count: Number(outRows[0].total_outward),
    txns: Number(txnRows[0].total_txns),
    parties: Number(partyRows[0].total_parties),
  };

  console.log('Live DB counts vs baseline:');
  console.log(`  Products: ${liveMetrics.products} (expected: ${baseline.stock.total_products})`);
  console.log(`  Carats:   ${liveMetrics.carats} (expected: ${baseline.stock.total_carats})`);
  console.log(`  Pcs:      ${liveMetrics.pcs} (expected: ${baseline.stock.total_pcs})`);
  console.log(`  Inward:   ${liveMetrics.inward_count} (expected: ${baseline.transactions.total_inward})`);
  console.log(`  Outward:  ${liveMetrics.outward_count} (expected: ${baseline.transactions.total_outward})`);
  console.log(`  Txns:     ${liveMetrics.txns} (expected: ${baseline.accounting.total_txns})`);
  console.log(`  Parties:  ${liveMetrics.parties} (expected: ${baseline.masters.total_parties})`);

  if (liveMetrics.products !== baseline.stock.total_products ||
      liveMetrics.carats !== baseline.stock.total_carats ||
      liveMetrics.inward_count !== baseline.transactions.total_inward) {
    throw new Error('Database baseline metrics mismatch before regression run!');
  }
  console.log('  [PASS] Live DB 100% matches baseline!\n');

  // 2. Spawn Servers
  console.log('[2/4] Spawning both servers...');
  const newServerDir = path.resolve(__dirname, '..');
  const origServerDir = path.resolve(__dirname, '../../../shreehk-original-worktree/ShreeHK_BackEnd');

  const pNew = spawn('node', ['index.js'], {
    cwd: newServerDir,
    env: { ...process.env, PORT: '3500' },
    stdio: 'ignore',
  });

  const pOrig = spawn('node', ['index.js'], {
    cwd: origServerDir,
    env: { ...process.env, PORT: '3501' },
    stdio: 'ignore',
  });

  const killServers = () => {
    try { pNew.kill(); } catch (_) {}
    try { pOrig.kill(); } catch (_) {}
  };

  process.on('exit', killServers);
  process.on('SIGINT', killServers);
  process.on('SIGTERM', killServers);

  console.log('Waiting for Port 3500 (New) and Port 3501 (Original) to become ready...');
  await Promise.all([waitPort(3500), waitPort(3501)]);
  console.log('  [READY] Both servers responding.\n');

  // 3. Prepare Token
  const token = jwt.sign(
    {
      user_id: 1,
      userId: 1,
      id: 1,
      username: 'admin',
      user_name: 'sksmadmin',
      roll: 1,
      companyId: 1,
      company: 1,
      yearId: 8,
      jti: 'final_reg_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  // 4. Test Endpoints List
  const testEndpoints = [
    // Inward
    { name: 'Inward Stock List', path: '/transaction/inward-stock/list', method: 'POST', body: { page: 1, limit: 20 } },
    { name: 'Purchase Stock List', path: '/transaction/purchase-stock/list', method: 'POST', body: { page: 1, limit: 20 } },
    { name: 'Inward Detail #147', path: '/inward/?id=147', method: 'GET' },
    { name: 'Inward Detail #243', path: '/inward/?id=243', method: 'GET' },
    { name: 'Inward Detail #259', path: '/inward/?id=259', method: 'GET' },

    // Outward
    { name: 'Outward Stock List - Memo', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'memo', page: 1, limit: 20 } },
    { name: 'Outward Stock List - Sale', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'sale', page: 1, limit: 20 } },
    { name: 'Outward Stock List - Return', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'return', page: 1, limit: 20 } },
    { name: 'Outward Stock List - Consign', path: '/transaction/outward-stock/list', method: 'POST', body: { stockType: 'consign', page: 1, limit: 20 } },
    { name: 'Outward Router - Memo', path: '/outward/list', method: 'POST', body: { type: 'memo', page: 1, limit: 20 } },
    { name: 'Outward Router - Sale', path: '/outward/list', method: 'POST', body: { type: 'sale', page: 1, limit: 20 } },
    { name: 'Outward Router - Export', path: '/outward/list', method: 'POST', body: { type: 'export', page: 1, limit: 20 } },
    { name: 'Outward Detail #707', path: '/outward/?id=707', method: 'GET' },
    { name: 'Outward Detail #1080', path: '/outward/?id=1080', method: 'GET' },
    { name: 'Outward Detail #1150', path: '/outward/?id=1150', method: 'GET' },
    { name: 'Outward Detail #1603', path: '/outward/?id=1603', method: 'GET' },

    // Hold
    { name: 'Hold Stock Listing (hold=1)', path: '/product/all', method: 'POST', body: { hold: 1, page: 1, limit: 20 } },
    { name: 'Hold Stock Listing (row_status=hold)', path: '/product/all', method: 'POST', body: { row_status: 'hold', page: 1, limit: 20 } },
    { name: 'Hold Detail #4022', path: '/product/holdDetail?id=4022', method: 'GET' },

    // GIA
    { name: 'GIA List', path: '/transaction/gia/list', method: 'POST', body: { page: 1, limit: 20 } },

    // Company Transfer
    { name: 'Company Transfer List', path: '/transaction/company-transfer/list', method: 'GET' },
    { name: 'Company Transfer Detail #1', path: '/transaction/company-transfer/1', method: 'GET' },
    { name: 'Company Transfer Detail #2', path: '/transaction/company-transfer/2', method: 'GET' },

    // Categorize
    { name: 'Categorize Tree', path: '/product/categorize/tree', method: 'GET' },
    { name: 'Categorize Stats (Cat 1)', path: '/product/categorize/stats?categoryId=1', method: 'GET' },

    // Masters & Dropdowns
    { name: 'Master Company List', path: '/master/company', method: 'GET' },
    { name: 'Master Party Dropdown (getOption)', path: '/company/getOption', method: 'GET' },
    { name: 'Master Category List', path: '/master/category', method: 'GET' },
    { name: 'Master Lab List', path: '/master/lab', method: 'GET' },
    { name: 'Master Origin List', path: '/master/origin', method: 'GET' },
    { name: 'Master Shipping List', path: '/master/shipping', method: 'GET' },
    { name: 'Master Attribute List', path: '/master/attribute', method: 'GET' },
    { name: 'Admin Branch List', path: '/admin/branch', method: 'GET' },
    { name: 'Branch Dropdown (getOption)', path: '/branch/getOption', method: 'GET' },

    // Users / Roles
    { name: 'Admin Users List', path: '/getAdminManageUser', method: 'GET' },
    { name: 'Roles List', path: '/role-list', method: 'GET' },

    // Dashboard
    { name: 'Dashboard Summary', path: '/dashboard/summary', method: 'GET' },
    { name: 'Dashboard Trends', path: '/dashboard/trends', method: 'GET' },

    // Reports
    { name: 'Report Outstanding (Sale)', path: '/report/outstanding', method: 'POST', body: { type: 'sale' } },
    { name: 'Report Outstanding (Purchase)', path: '/report/outstanding', method: 'POST', body: { type: 'purchase' } },
    { name: 'Report Group (Sale)', path: '/report/group', method: 'POST', body: { report: 'sale', type: ['sale'] } },
    { name: 'Report Group (Memo)', path: '/report/group', method: 'POST', body: { report: 'memo', type: ['memo'] } },
    { name: 'Report Group (Purchase)', path: '/report/group', method: 'POST', body: { report: 'purchase', type: ['purchase'] } },
    { name: 'Report Sale-Stock', path: '/report/sale-stock', method: 'POST', body: { type: 'sale' } },
    { name: 'Report Transaction', path: '/report/transaction', method: 'POST', body: { report: 'sale' } },
    { name: 'Report Filter Options', path: '/report/filter-options', method: 'GET' },

    // Accounting
    { name: 'General Ledger - All', path: '/transaction', method: 'POST', body: {} },
    { name: 'General Ledger - Date Filtered', path: '/transaction', method: 'POST', body: { fromDate: '01-01-2024', toDate: '31-12-2024' } },
    { name: 'Transaction Books', path: '/transaction/books', method: 'GET' },
    { name: 'Advance List', path: '/advance/get?limit=50&offset=0', method: 'GET' },
    { name: 'Expense List', path: '/expanse/get?limit=50&offset=0', method: 'GET' },
    { name: 'Balance List', path: '/balance/get', method: 'GET' },
    { name: 'Currency Rate List', path: '/currency-rate/get', method: 'GET' },
    { name: 'Accounting Groups', path: '/accounting/group', method: 'GET' },
    { name: 'Accounting Subgroups', path: '/accounting/subgroup', method: 'GET' },
    { name: 'Party-wise Transactions', path: '/partywisetransaction?limit=50&offset=0', method: 'GET' },
    { name: 'Outstanding Records (Sale 707)', path: '/report/outstandingRecords', method: 'POST', body: { id: 707, type: 'sale' } },
    { name: 'Outstanding Records (Purchase 147)', path: '/report/outstandingRecords', method: 'POST', body: { id: 147, type: 'purchase' } },

    // Delete Impact
    { name: 'Tenant Company Delete Impact (ID 2)', path: '/admin/tenant-company/delete-impact', method: 'POST', body: { id: 2 } },
  ];

  console.log(`[3/4] Running raw JSON comparison on ${testEndpoints.length} endpoints...\n`);

  let passedCount = 0;
  let diffCount = 0;
  const results = [];

  for (const t of testEndpoints) {
    try {
      const opts = { method: t.method || 'GET', body: t.body || null };
      const resOrig = await requestPort(3501, t.path, opts, token);
      const resNew = await requestPort(3500, t.path, opts, token);

      const isExact = deepCompare(resOrig.data, resNew.data);

      if (isExact) {
        console.log(`  [PASS] ${t.name}: EXACT MATCH (status=${resNew.status}, len=${resNew.rawLength})`);
        passedCount++;
        results.push({ name: t.name, status: 'EXACT_MATCH', port3501Status: resOrig.status, port3500Status: resNew.status });
      } else {
        console.log(`  [DIFF] ${t.name}: Difference detected! (status 3501=${resOrig.status}, 3500=${resNew.status})`);
        diffCount++;
        const objDiffs = findObjectDiffs(resOrig.data, resNew.data);
        console.log(`    Detailed differences (first 5):`, JSON.stringify(objDiffs.slice(0, 5), null, 2));
        results.push({
          name: t.name,
          status: 'DIFF',
          port3501Status: resOrig.status,
          port3500Status: resNew.status,
          diffCount: objDiffs.length,
          differences: objDiffs.slice(0, 10),
        });
      }
    } catch (err) {
      console.error(`  [ERROR] ${t.name}: ${err.message}`);
      diffCount++;
      results.push({ name: t.name, status: 'ERROR', error: err.message });
    }
  }

  // 4. Shutdown
  console.log('\n[4/4] Shutting down test servers...');
  killServers();

  console.log('\n================================================================');
  console.log(`FINAL REGRESSION RESULTS: Total=${testEndpoints.length}, Passed=${passedCount}, Diffs/Errors=${diffCount}`);
  console.log('================================================================');

  if (diffCount > 0) {
    console.log('\nDifferences / Errors:');
    console.log(JSON.stringify(results.filter(r => r.status !== 'EXACT_MATCH'), null, 2));
    process.exit(1);
  } else {
    console.log('\nSUCCESS: 100% of tested endpoints returned EXACT IDENTICAL raw JSON responses!');
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
