const http = require('http');
const jwt = require('jsonwebtoken');
const connection = require('../connection.js');
const fs = require('fs');
const path = require('path');

const inventoryTools = require('../services/ai/tools/inventoryTools.js');
const partyTransactionTools = require('../services/ai/tools/partyTransactionTools.js');
const analyticsAiTools = require('../services/ai/tools/analyticsAiTools.js');
const iExportRepository = require('../routes/product/iExportRepository.js');
const labelA4Repository = require('../routes/product/labelA4Repository.js');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function requestPort(port, reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, `http://localhost:${port}`);
    const headers = { ...(options.headers || {}) };
    const method = options.method || 'GET';
    const postData = options.body ? JSON.stringify(options.body) : null;

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers, timeout: 25000 }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          raw: rawData,
          data: json,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting port ${port} ${reqPath}`));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

// Strip dynamic keys (timestamps, execution time, etc.) before deep comparing JSON
function normalizeResponse(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeResponse);
  }
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (['executionTimeMs', 'timestamp', 'dateCol', 'generatedAt', 'time'].includes(k)) {
      continue;
    }
    clean[k] = normalizeResponse(v);
  }
  return clean;
}

function deepEqual(a, b) {
  return JSON.stringify(normalizeResponse(a)) === JSON.stringify(normalizeResponse(b));
}

const tracking = {
  dai_party: [],
  dai_product: [],
  dai_product_value: [],
};

async function runValidation() {
  console.log('========================================================================');
  console.log('  SUB-PART 2(d) + GROUP 4: DUAL-SERVER REGRESSION & EXCLUSION TEST      ');
  console.log('========================================================================\n');

  // Guard: Database must be test
  const [dbRow] = await query('SELECT DATABASE() AS db');
  console.log(`Verified DB Guard: Database = ${dbRow.db}`);
  if (dbRow.db !== 'shreehkweb_snj2024_test') {
    throw new Error(`ABORT: Target is not shreehkweb_snj2024_test! Current: ${dbRow.db}`);
  }

  // Load baseline metrics
  const baselineFile = path.resolve(__dirname, 'baseline_metrics.json');
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

  const adminToken = jwt.sign(
    {
      user_id: 1,
      userId: 1,
      id: 1,
      username: 'admin',
      roll: 1,
      companyId: 1,
      company: 1,
      yearId: 8,
      jti: 'g4_admin_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '2h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'x-company-id': '1',
  };

  const results = [];
  const logStep = (name, pass, details = '') => {
    results.push({ name, pass, details });
    console.log(`${pass ? '  ✓ PASS' : '  ✗ FAIL'}: ${name}${details ? ` -> ${details}` : ''}`);
  };

  // ------------------------------------------------------------------------
  // PART 1: DUAL-SERVER RAW JSON REGRESSION (PORT 3501 vs 3500)
  // ------------------------------------------------------------------------
  console.log('\n--- 1. DUAL-SERVER REGRESSION (Original 3501 vs Updated 3500) ---');

  const regressionEndpoints = [
    { name: 'GET /dashboard/summary', method: 'GET', path: '/dashboard/summary' },
    { name: 'GET /dashboard/trends', method: 'GET', path: '/dashboard/trends' },
    { name: 'POST /report/outstanding (sale)', method: 'POST', path: '/report/outstanding', body: { type: 'sale' } },
    { name: 'POST /report/outstanding (purchase)', method: 'POST', path: '/report/outstanding', body: { type: 'purchase' } },
    { name: 'POST /report/group (sale)', method: 'POST', path: '/report/group', body: { report: 'sale', type: ['sale'] } },
    { name: 'POST /report/group (memo)', method: 'POST', path: '/report/group', body: { report: 'memo', type: ['memo'] } },
    { name: 'POST /report/group (purchase)', method: 'POST', path: '/report/group', body: { report: 'purchase', type: ['purchase'] } },
    { name: 'POST /report/sale-stock', method: 'POST', path: '/report/sale-stock', body: { type: 'sale' } },
    { name: 'POST /report/transaction', method: 'POST', path: '/report/transaction', body: { report: 'sale' } },
    { name: 'GET /report/filter-options', method: 'GET', path: '/report/filter-options' },
  ];

  for (const ep of regressionEndpoints) {
    try {
      const [resOrig, resNew] = await Promise.all([
        requestPort(3501, ep.path, { method: ep.method, headers: authHeaders, body: ep.body }),
        requestPort(3500, ep.path, { method: ep.method, headers: authHeaders, body: ep.body }),
      ]);

      const statusMatch = resOrig.statusCode === resNew.statusCode;
      const jsonMatch = deepEqual(resOrig.data, resNew.data);
      const pass = statusMatch && jsonMatch;
      const details = pass
        ? `Status ${resNew.statusCode}, JSON Match (Orig: ${resOrig.raw.length} bytes, New: ${resNew.raw.length} bytes)`
        : `MISMATCH: Status(${resOrig.statusCode} vs ${resNew.statusCode}), BodyMatch=${jsonMatch}`;

      logStep(`Dual-server regression: ${ep.name}`, pass, details);
    } catch (err) {
      logStep(`Dual-server regression: ${ep.name}`, false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // PART 2: AI TOOLS VERIFICATION (Tenant Context: companyId = 1)
  // ------------------------------------------------------------------------
  console.log('\n--- 2. AI TOOLS FUNCTIONAL VERIFICATION ---');
  const aiCtx = { companyId: 1, userId: 1, roleId: 1, username: 'admin' };

  try {
    const searchRes = await inventoryTools.searchInventory({ limit: 10 }, aiCtx);
    logStep('AI Tool: searchInventory', searchRes.totalResults > 0, `Returned ${searchRes.totalResults} stones`);

    const summaryRes = await inventoryTools.getInventorySummary({}, aiCtx);
    logStep('AI Tool: getInventorySummary', Boolean(summaryRes.summary?.totals), `Total items: ${summaryRes.summary?.totalItems}`);

    const anomaliesRes = await analyticsAiTools.detectAnomalies({}, aiCtx);
    logStep('AI Tool: detectAnomalies', Array.isArray(anomaliesRes.anomalies), `Categories found: ${anomaliesRes.totalAnomalyCategories}`);

    const demandRes = await analyticsAiTools.forecastDemand({}, aiCtx);
    logStep('AI Tool: forecastDemand', Array.isArray(demandRes.demandAnalysis), `Demand shapes: ${demandRes.demandAnalysis.length}`);

    const priceRes = await analyticsAiTools.suggestPrice({ shape: 'ROUND', carat: 1.0, color: 'D', clarity: 'VVS1' }, aiCtx);
    logStep('AI Tool: suggestPrice', Boolean(priceRes.suggestedRateRange), `Suggested range: ${JSON.stringify(priceRes.suggestedRateRange)}`);

    const partiesRes = await partyTransactionTools.getPartiesList({ limit: 10 }, aiCtx);
    logStep('AI Tool: getPartiesList', partiesRes.totalResults > 0, `Returned ${partiesRes.totalResults} parties`);

    const outSummaryRes = await partyTransactionTools.getOutstandingSummary({}, aiCtx);
    logStep('AI Tool: getOutstandingSummary', outSummaryRes.totalReceivable >= 0, `Receivable: $${outSummaryRes.totalReceivable}`);
  } catch (err) {
    logStep('AI Tools execution', false, err.message);
  }

  // ------------------------------------------------------------------------
  // PART 3: DEDICATED FIXTURE & SOFT-DELETE EXCLUSION LIFECYCLE
  // ------------------------------------------------------------------------
  console.log('\n--- 3. FIXTURE CREATION & SOFT-DELETE EXCLUSION LIFECYCLE ---');

  const fixSku = 'HKD-G4-TEST-99991';
  let fixtureStoneId = null;
  let fixturePartyId = null;

  try {
    // 3.1 Pre-fixture widget metrics
    const preDash = await requestPort(3500, '/dashboard/summary', { method: 'GET', headers: authHeaders });
    const preOnHandPcs = Number(preDash.data?.Data?.widgets?.onHand?.pcs) || 0;
    const preOnHandCarat = Number(preDash.data?.Data?.widgets?.onHand?.carat) || 0;

    // 3.2 Create fixture party
    const partyRes = await query(
      `INSERT INTO dai_party (name, type, country, company)
       VALUES ('HKD-G4-FIXTURE-PARTY', 'Customer', 'India', 1)`
    );
    fixturePartyId = partyRes.insertId;
    tracking.dai_party.push(fixturePartyId);

    // 3.3 Create fixture stone
    const prodRes = await query(
      `INSERT INTO dai_product (sku, polish_pcs, polish_carat, price, amount, cost, visibility, outward, company, date)
       VALUES (?, 1, 2.50, 2000, 5000, 1500, 1, '', 1, CURDATE())`,
      [fixSku]
    );
    fixtureStoneId = prodRes.insertId;
    tracking.dai_product.push(fixtureStoneId);

    const valRes = await query(
      `INSERT INTO dai_product_value (product_id, shape, color, clarity, report_no)
       VALUES (?, 'ROUND', 'D', 'IF', 'TESTG4_CERT_99991')`,
      [fixtureStoneId]
    );
    tracking.dai_product_value.push(valRes.insertId);

    // Verify Active State
    const activeDash = await requestPort(3500, '/dashboard/summary', { method: 'GET', headers: authHeaders });
    const activeOnHandPcs = Number(activeDash.data?.Data?.widgets?.onHand?.pcs) || 0;
    const activeOnHandCarat = Number(activeDash.data?.Data?.widgets?.onHand?.carat) || 0;
    const activeIncPcs = activeOnHandPcs - preOnHandPcs;
    const activeIncCarat = Number((activeOnHandCarat - preOnHandCarat).toFixed(2));

    logStep(
      'Active fixture visible in dashboard summary',
      activeIncPcs === 1 && activeIncCarat === 2.5,
      `Pcs: ${preOnHandPcs} -> ${activeOnHandPcs} (+${activeIncPcs}), Carat: ${preOnHandCarat} -> ${activeOnHandCarat} (+${activeIncCarat})`
    );

    const aiActiveSearch = await inventoryTools.searchInventory({ sku: fixSku }, aiCtx);
    logStep(
      'Active fixture found by AI searchInventory',
      aiActiveSearch.totalResults === 1 && aiActiveSearch.stones[0]?.sku === fixSku,
      `Found ${aiActiveSearch.totalResults} stone(s)`
    );

    const exportActive = await iExportRepository.getExportInventoryByIds([fixtureStoneId], 1);
    logStep(
      'Active fixture included in export repository query',
      exportActive.length === 1,
      `Returned ${exportActive.length} product`
    );

    const labelActive = await labelA4Repository.loadDataBySku(fixSku);
    logStep(
      'Active fixture included in label repository query',
      labelActive !== null && labelActive.sku === fixSku,
      `Loaded label data for SKU: ${labelActive?.sku}`
    );

    // 3.4 Soft-Delete the fixture stone
    await query(
      `UPDATE dai_product SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ?`,
      [fixtureStoneId]
    );
    await query(
      `UPDATE dai_party SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ?`,
      [fixturePartyId]
    );

    // 3.5 Verify Exclusion
    const postDelDash = await requestPort(3500, '/dashboard/summary', { method: 'GET', headers: authHeaders });
    const postOnHandPcs = Number(postDelDash.data?.Data?.widgets?.onHand?.pcs) || 0;
    const postOnHandCarat = Number(postDelDash.data?.Data?.widgets?.onHand?.carat) || 0;

    logStep(
      'Soft-deleted stone EXCLUDED from dashboard widget counts',
      postOnHandPcs === preOnHandPcs && Number(postOnHandCarat.toFixed(2)) === Number(preOnHandCarat.toFixed(2)),
      `Pcs returned to ${postOnHandPcs}, Carats returned to ${postOnHandCarat}`
    );

    const aiPostSearch = await inventoryTools.searchInventory({ sku: fixSku }, aiCtx);
    logStep(
      'Soft-deleted stone EXCLUDED from AI searchInventory',
      aiPostSearch.totalResults === 0,
      `Results for ${fixSku}: ${aiPostSearch.totalResults}`
    );

    const aiPartiesPost = await partyTransactionTools.getPartiesList({ search: 'HKD-G4-FIXTURE-PARTY' }, aiCtx);
    logStep(
      'Soft-deleted party EXCLUDED from AI getPartiesList',
      aiPartiesPost.totalResults === 0,
      `Results for HKD-G4-FIXTURE-PARTY: ${aiPartiesPost.totalResults}`
    );

    const exportPost = await iExportRepository.getExportInventoryByIds([fixtureStoneId], 1);
    logStep(
      'Soft-deleted stone EXCLUDED from export repository',
      exportPost.length === 0,
      `Returned ${exportPost.length} products`
    );

    const labelPost = await labelA4Repository.loadDataBySku(fixSku);
    logStep(
      'Soft-deleted stone EXCLUDED from label repository',
      labelPost === null,
      `loadDataBySku returned: ${labelPost}`
    );

    // 3.6 Verify Stone History remains accessible (Mandatory Rule)
    // Add history entry for fixture stone
    const histRes = await query(
      `INSERT INTO dai_history (sku, product_id, date, action, party, description, user)
       VALUES (?, ?, CURDATE(), 'create', 'HKD-G4-FIXTURE-PARTY', 'Test stone history entry', 'admin')`,
      [fixSku, fixtureStoneId]
    );
    const fixtureHistId = histRes.insertId;

    const histResHttp = await requestPort(3500, `/report/transfer-history?sku=${fixSku}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const historyRows = histResHttp.data?.Data || [];
    logStep(
      'MANDATORY RULE: Stone history for soft-deleted stone REMAINS ACCESSIBLE via /report/transfer-history',
      historyRows.length > 0 && historyRows[0]?.sku === fixSku,
      `Retrieved ${historyRows.length} history row(s) for soft-deleted stone ${fixSku}`
    );

    // Clean history entry
    await query(`DELETE FROM dai_history WHERE id = ?`, [fixtureHistId]);

  } catch (err) {
    logStep('Fixture lifecycle execution', false, err.message);
  } finally {
    // ------------------------------------------------------------------------
    // STRICT PURGE: Explicit primary key IDs only
    // ------------------------------------------------------------------------
    console.log('\n--- 4. STRICT PURGE OF TEST FIXTURES ---');
    if (tracking.dai_product_value.length > 0) {
      await query(`DELETE FROM dai_product_value WHERE pid IN (?)`, [tracking.dai_product_value]);
      console.log(`  Purged dai_product_value (by pid): [${tracking.dai_product_value.join(', ')}]`);
    }
    if (tracking.dai_product.length > 0) {
      await query(`DELETE FROM dai_product WHERE id IN (?)`, [tracking.dai_product]);
      console.log(`  Purged dai_product (by id): [${tracking.dai_product.join(', ')}]`);
    }
    if (tracking.dai_party.length > 0) {
      await query(`DELETE FROM dai_party WHERE id IN (?)`, [tracking.dai_party]);
      console.log(`  Purged dai_party (by id): [${tracking.dai_party.join(', ')}]`);
    }
  }

  // ------------------------------------------------------------------------
  // PART 5: BASELINE VERIFICATION
  // ------------------------------------------------------------------------
  console.log('\n--- 5. BASELINE METRICS RE-VERIFICATION ---');
  const [stockRow] = await query(
    `SELECT COUNT(id) AS total_products,
            COALESCE(SUM(polish_carat), 0) AS total_carats,
            COALESCE(SUM(polish_pcs), 0) AS total_pcs,
            COALESCE(SUM(amount), 0) AS total_amount
     FROM dai_product`
  );
  const [partyRow] = await query('SELECT COUNT(id) AS total_parties FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)');
  const [inwardRow] = await query('SELECT COUNT(id) AS total_inward FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL)');
  const [rawInwardRow] = await query('SELECT COUNT(id) AS total_raw_inward FROM dai_inward');
  const [outwardRow] = await query('SELECT COUNT(id) AS total_outward FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL)');

  const stockMatch = Number(stockRow.total_products) === baseline.stock.total_products;
  const caratMatch = Math.abs(Number(stockRow.total_carats) - baseline.stock.total_carats) < 0.001;
  const pcsMatch = Number(stockRow.total_pcs) === baseline.stock.total_pcs;
  const amtMatch = Math.abs(Number(stockRow.total_amount) - baseline.stock.total_amount) < 0.01;
  const partyMatch = Number(partyRow.total_parties) === baseline.masters.total_parties;
  const inwardMatch = Number(inwardRow.total_inward) === baseline.transactions.total_inward;
  const outwardMatch = Number(outwardRow.total_outward) === baseline.transactions.total_outward;

  logStep('Baseline Stock Products Match', stockMatch, `${stockRow.total_products} vs ${baseline.stock.total_products}`);
  logStep('Baseline Stock Carats Match', caratMatch, `${stockRow.total_carats} vs ${baseline.stock.total_carats}`);
  logStep('Baseline Stock Pcs Match', pcsMatch, `${stockRow.total_pcs} vs ${baseline.stock.total_pcs}`);
  logStep('Baseline Stock Amount Match', amtMatch, `$${stockRow.total_amount} vs $${baseline.stock.total_amount}`);
  logStep('Baseline Masters Parties Match', partyMatch, `${partyRow.total_parties} vs ${baseline.masters.total_parties}`);
  logStep('Baseline Inward Count Match', inwardMatch, `${inwardRow.total_inward} active (raw total: ${rawInwardRow.total_raw_inward}) vs ${baseline.transactions.total_inward}`);
  logStep('Baseline Outward Count Match', outwardMatch, `${outwardRow.total_outward} vs ${baseline.transactions.total_outward}`);

  const totalPassed = results.filter((r) => r.pass).length;
  console.log('\n========================================================================');
  console.log(`  SUMMARY: ${totalPassed} / ${results.length} CHECKS PASSED`);
  console.log('========================================================================\n');

  process.exit(totalPassed === results.length ? 0 : 1);
}

runValidation().catch((err) => {
  console.error('Fatal Validation Error:', err);
  process.exit(1);
});
