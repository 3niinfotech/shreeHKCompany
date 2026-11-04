const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const helper = require('../helper.js');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';
const token = jwt.sign(
  {
    user_id: 1,
    user_name: 'sksmadmin',
    user_email: 'info@3niinfotech.com',
    roll: 1,
    company: 1,
    companyId: 1,
    yearId: 1,
    jti: 'test_g3_br_' + Date.now(),
  },
  SECRET_KEY,
  { expiresIn: '1h' }
);

function request(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${port}`);
    const headers = {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };
    const method = options.method || 'GET';
    const postData = options.body ? JSON.stringify(options.body) : null;

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers, timeout: 20000 }, (res) => {
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

async function runRegressionDiff() {
  console.log('\n======================================================');
  console.log('1. ORIGINAL (3501) vs NEW (3500) RAW DIFF ON EXISTING DATA');
  console.log('======================================================\n');

  const cases = [
    { name: 'GET /balance/get', path: '/balance/get' },
    { name: 'GET /currency-rate/get', path: '/currency-rate/get' },
  ];

  for (const tc of cases) {
    const resOrig = await request(3501, tc.path);
    const resNew = await request(3500, tc.path);

    const matchStatus = resOrig.status === resNew.status;
    const matchData = deepCompare(resOrig.data, resNew.data);

    if (matchStatus && matchData) {
      console.log(`[PASS 100% EXACT MATCH] ${tc.name}`);
      console.log(`       Status: ${resOrig.status} | Bytes: ${resOrig.rawLength} vs ${resNew.rawLength}`);
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error(`       Status: 3501=${resOrig.status}, 3500=${resNew.status}`);
      console.error(`       Bytes:  3501=${resOrig.rawLength}, 3500=${resNew.rawLength}`);
      throw new Error(`Diff failure on ${tc.name}`);
    }
  }
}

async function runLifecycleTests() {
  console.log('\n======================================================');
  console.log('2. BOOK & CURRENCY-RATE RE-SAVE LIFECYCLE TESTS');
  console.log('======================================================\n');

  const createdBooks = [];
  const createdRates = [];

  try {
    // --- PART A: BOOK LIFECYCLE ---
    const testBookName = `TEST_BOOK_${Date.now()}`;
    console.log(`--- Testing Book: "${testBookName}" ---`);

    // 1. Initial Create
    const bCreateRes = await request(3500, '/my-balance-book', {
      method: 'POST',
      body: { book: testBookName, currency: 'USD', cash: 1000 },
    });
    console.log(`Initial book create response:`, bCreateRes.data);

    const bRows1 = await helper.query(
      'SELECT id, book, currency, balance, deleted FROM dai_book WHERE book = ? AND company = 1',
      [testBookName]
    );
    const book1Id = bRows1[0]?.id;
    createdBooks.push(book1Id);
    console.log(`Created Book Row 1: ID=${book1Id}, Balance=${bRows1[0]?.balance}, Deleted=${bRows1[0]?.deleted}`);

    // Verify in GET /balance/get
    const bGet1 = await request(3500, '/balance/get');
    const hasBook1 = (bGet1.data?.Data || []).some((b) => b.id === book1Id);
    console.log(`Book visible in GET /balance/get: ${hasBook1 ? 'YES [PASS]' : 'NO [FAIL]'}`);

    // 2. Soft-delete the book
    const bDelRes = await request(3500, `/my-balance-delete?deleteId=${book1Id}`, { method: 'DELETE' });
    console.log(`Book soft-delete response:`, bDelRes.data);

    const bRowsDel = await helper.query('SELECT deleted FROM dai_book WHERE id = ?', [book1Id]);
    console.log(`Book Row 1 in DB after delete: deleted=${bRowsDel[0]?.deleted} (Expected: 1)`);

    // Verify excluded from GET /balance/get
    const bGet2 = await request(3500, '/balance/get');
    const hasBookDel = (bGet2.data?.Data || []).some((b) => b.id === book1Id);
    console.log(`Deleted book excluded from GET /balance/get: ${!hasBookDel ? 'EXCLUDED [PASS]' : 'STILL PRESENT [FAIL]'}`);

    // 3. Re-save same book name and currency with new balance
    const bRecreateRes = await request(3500, '/my-balance-book', {
      method: 'POST',
      body: { book: testBookName, currency: 'USD', cash: 2500 },
    });
    console.log(`Re-save same book response:`, bRecreateRes.data);

    const bRows2 = await helper.query(
      'SELECT id, book, currency, balance, deleted FROM dai_book WHERE book = ? AND company = 1 ORDER BY id ASC',
      [testBookName]
    );
    console.log(`dai_book rows for "${testBookName}":`);
    bRows2.forEach((r) => console.log(`  - ID=${r.id}, Balance=${r.balance}, Deleted=${r.deleted}`));

    if (bRows2.length !== 2) {
      throw new Error(`Expected 2 rows (1 deleted, 1 active) for book, but found ${bRows2.length}`);
    }
    const book2Id = bRows2[1].id;
    createdBooks.push(book2Id);

    const oldRowIntact = bRows2[0].id === book1Id && bRows2[0].deleted === 1;
    const newRowActive = bRows2[1].id === book2Id && bRows2[1].deleted === 0 && Number(bRows2[1].balance) === 2500;
    console.log(`Old row preserved as deleted=1: ${oldRowIntact ? 'YES [PASS]' : 'NO [FAIL]'}`);
    console.log(`New row created as deleted=0 with balance=2500: ${newRowActive ? 'YES [PASS]' : 'NO [FAIL]'}`);

    // Verify new row is visible in GET /balance/get
    const bGet3 = await request(3500, '/balance/get');
    const visibleBook = (bGet3.data?.Data || []).find((b) => b.id === book2Id);
    console.log(`New book visible in GET /balance/get: ${visibleBook ? 'YES [PASS]' : 'NO [FAIL]'} (cash=${visibleBook?.cash})`);


    // --- PART B: CURRENCY RATE LIFECYCLE ---
    const testCurrency = `TC${(Date.now() % 100000).toString()}`;
    console.log(`\n--- Testing Currency Rate: "${testCurrency}" ---`);

    // 1. Initial Create
    const cCreateRes = await request(3500, '/currency-rate', {
      method: 'POST',
      body: { currency: testCurrency, USD: 1.25, HKD: 9.75 },
    });
    console.log(`Initial currency create response:`, cCreateRes.data);

    const cRows1 = await helper.query(
      'SELECT id, currency, USD, HKD, deleted FROM dai_currencyrate WHERE currency = ? AND company = 1',
      [testCurrency]
    );
    const rate1Id = cRows1[0]?.id;
    createdRates.push(rate1Id);
    console.log(`Created Rate Row 1: ID=${rate1Id}, USD=${cRows1[0]?.USD}, Deleted=${cRows1[0]?.deleted}`);

    // Verify in GET /currency-rate/get
    const cGet1 = await request(3500, '/currency-rate/get');
    const hasRate1 = (cGet1.data?.Data || []).some((r) => r.id === rate1Id);
    console.log(`Rate visible in GET /currency-rate/get: ${hasRate1 ? 'YES [PASS]' : 'NO [FAIL]'}`);

    // 2. Soft-delete the currency rate
    const cDelRes = await request(3500, `/currency-rate-delete?deleteId=${rate1Id}`, { method: 'DELETE' });
    console.log(`Rate soft-delete response:`, cDelRes.data);

    const cRowsDel = await helper.query('SELECT deleted FROM dai_currencyrate WHERE id = ?', [rate1Id]);
    console.log(`Rate Row 1 in DB after delete: deleted=${cRowsDel[0]?.deleted} (Expected: 1)`);

    // Verify excluded from GET /currency-rate/get
    const cGet2 = await request(3500, '/currency-rate/get');
    const hasRateDel = (cGet2.data?.Data || []).some((r) => r.id === rate1Id);
    console.log(`Deleted rate excluded from GET /currency-rate/get: ${!hasRateDel ? 'EXCLUDED [PASS]' : 'STILL PRESENT [FAIL]'}`);

    // 3. Re-save same currency with new rates
    const cRecreateRes = await request(3500, '/currency-rate', {
      method: 'POST',
      body: { currency: testCurrency, USD: 1.55, HKD: 12.10 },
    });
    console.log(`Re-save same currency response:`, cRecreateRes.data);

    const cRows2 = await helper.query(
      'SELECT id, currency, USD, HKD, deleted FROM dai_currencyrate WHERE currency = ? AND company = 1 ORDER BY id ASC',
      [testCurrency]
    );
    console.log(`dai_currencyrate rows for "${testCurrency}":`);
    cRows2.forEach((r) => console.log(`  - ID=${r.id}, USD=${r.USD}, HKD=${r.HKD}, Deleted=${r.deleted}`));

    if (cRows2.length !== 2) {
      throw new Error(`Expected 2 rows (1 deleted, 1 active) for currency, but found ${cRows2.length}`);
    }
    const rate2Id = cRows2[1].id;
    createdRates.push(rate2Id);

    const oldRateIntact = cRows2[0].id === rate1Id && cRows2[0].deleted === 1;
    const newRateActive = cRows2[1].id === rate2Id && cRows2[1].deleted === 0 && Number(cRows2[1].USD) === 1.55;
    console.log(`Old rate row preserved as deleted=1: ${oldRateIntact ? 'YES [PASS]' : 'NO [FAIL]'}`);
    console.log(`New rate row created as deleted=0 with USD=1.55: ${newRateActive ? 'YES [PASS]' : 'NO [FAIL]'}`);

    // Verify new row is visible in GET /currency-rate/get
    const cGet3 = await request(3500, '/currency-rate/get');
    const visibleRate = (cGet3.data?.Data || []).find((r) => r.id === rate2Id);
    console.log(`New rate visible in GET /currency-rate/get: ${visibleRate ? 'YES [PASS]' : 'NO [FAIL]'} (USD=${visibleRate?.USD})`);

  } finally {
    console.log('\n--- Strict Fixture Purge by explicit IDs ---');
    if (createdBooks.length > 0) {
      const ph = createdBooks.map(() => '?').join(',');
      await helper.query(`DELETE FROM dai_book WHERE id IN (${ph})`, createdBooks);
      console.log(`Purged dai_book IDs: ${createdBooks.join(', ')}`);
    }
    if (createdRates.length > 0) {
      const ph = createdRates.map(() => '?').join(',');
      await helper.query(`DELETE FROM dai_currencyrate WHERE id IN (${ph})`, createdRates);
      console.log(`Purged dai_currencyrate IDs: ${createdRates.join(', ')}`);
    }
  }
}

async function verifyBaselineMetrics() {
  console.log('\n======================================================');
  console.log('3. BASELINE INTEGRITY VERIFICATION');
  console.log('======================================================\n');

  const baseline = JSON.parse(fs.readFileSync('ShreeHK_BackEnd/test/baseline_metrics.json', 'utf8'));

  const [pRows, ptRows, inRows, outRows] = await Promise.all([
    helper.query('SELECT COUNT(*) as p, SUM(polish_carat) as c, SUM(polish_pcs) as pcs, SUM(amount) as a FROM dai_product'),
    helper.query('SELECT COUNT(*) as p FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)'),
    helper.query('SELECT COUNT(*) as i FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL)'),
    helper.query('SELECT COUNT(*) as o FROM dai_outward WHERE (deleted = 0 OR deleted IS NULL)'),
  ]);

  const p = pRows[0];
  const pt = ptRows[0].p;
  const i = inRows[0].i;
  const o = outRows[0].o;

  console.log(`Products: ${p.p} == ${baseline.stock.total_products} -> ${p.p === baseline.stock.total_products ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Carats: ${p.c} == ${baseline.stock.total_carats} -> ${Math.abs(p.c - baseline.stock.total_carats) < 0.001 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Pcs: ${p.pcs} == ${baseline.stock.total_pcs} -> ${p.pcs === baseline.stock.total_pcs ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Parties: ${pt} == ${baseline.masters.total_parties} -> ${pt === baseline.masters.total_parties ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Inwards: ${i} == ${baseline.transactions.total_inward} -> ${i === baseline.transactions.total_inward ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Outwards: ${o} == ${baseline.transactions.total_outward} -> ${o === baseline.transactions.total_outward ? 'MATCH' : 'MISMATCH'}`);

  const allMatch =
    p.p === baseline.stock.total_products &&
    Math.abs(p.c - baseline.stock.total_carats) < 0.001 &&
    p.pcs === baseline.stock.total_pcs &&
    pt === baseline.masters.total_parties &&
    i === baseline.transactions.total_inward &&
    o === baseline.transactions.total_outward;

  if (!allMatch) {
    throw new Error('Baseline metrics mismatch!');
  }
  console.log('\n[ALL BASELINE METRICS 100% CLEAN AND MATCHED]');
}

async function main() {
  try {
    await runRegressionDiff();
    await runLifecycleTests();
    await verifyBaselineMetrics();
    console.log('\nTest completed successfully!\n');
    process.exit(0);
  } catch (e) {
    console.error('\nFAILED with error:', e.message);
    process.exit(1);
  }
}

main();

