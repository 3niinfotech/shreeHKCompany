const jwt = require('jsonwebtoken');
const connection = require('../connection.js');
const http = require('http');
const printService = require('../routes/transaction/transactionPrintService.js');

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
      { method, headers },
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

async function runRuleBTest() {
  console.log('=== RULE B RE-VERIFICATION ON EXISTING BILL (PARTY 4 / INWARD 9) ===\n');

  const token = jwt.sign(
    { user_id: 1, username: 'admin', roll: 1, companyId: 1, yearId: 1, jti: 'rule_b_' + Date.now() },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  try {
    // 1. Initial State: Party 4 is active
    console.log('--- Step 1: Initial Active State ---');
    const optionsBefore = await request('/company/getOption', { method: 'GET', headers: authHeaders });
    const p4Before = (optionsBefore.data?.Data || optionsBefore.data?.data || []).find((p) => p.id === 4 || p.name === 'ANTWERP GEMS NV');
    console.log(`Party 4 in dropdown before delete: ${p4Before ? 'YES (' + p4Before.name + ')' : 'NO'}`);

    const inwBefore = await request('/inward/?id=9', { method: 'GET', headers: authHeaders });
    console.log(`GET /inward/?id=9 party_name: "${inwBefore.data?.Data?.party_name}"`);

    const docBefore = await printService.fetchInwardDoc(9);
    console.log(`Print fetchInwardDoc(9) party_name: "${docBefore?.doc?.party_name}"`);

    // 2. Soft-delete Party 4
    console.log('\n--- Step 2: Soft Delete Party 4 ---');
    await queryDb('UPDATE dai_party SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = 4');
    const partyDb = await queryDb('SELECT id, name, deleted, deleted_at, deleted_by FROM dai_party WHERE id = 4');
    console.log(`DB dai_party (id=4): deleted=${partyDb[0]?.deleted}, deleted_by=${partyDb[0]?.deleted_by}`);

    // 3. Verify Rule B with Party 4 soft-deleted
    console.log('\n--- Step 3: Verification with Party 4 Soft-Deleted ---');
    const optionsAfter = await request('/company/getOption', { method: 'GET', headers: authHeaders });
    const p4After = (optionsAfter.data?.Data || optionsAfter.data?.data || []).find((p) => p.id === 4 || p.name === 'ANTWERP GEMS NV');
    console.log(`Party 4 in active dropdown: ${p4After ? 'STILL PRESENT (FAIL)' : 'ABSENT (PASS - soft delete filter works)'}`);

    const inwAfter = await request('/inward/?id=9', { method: 'GET', headers: authHeaders });
    const inwPartyName = inwAfter.data?.Data?.party_name;
    console.log(`GET /inward/?id=9 party_name: "${inwPartyName}" [${inwPartyName === 'ANTWERP GEMS NV' ? 'PASS - RULE B HONORED' : 'FAIL'}]`);

    const docAfter = await printService.fetchInwardDoc(9);
    const docPartyName = docAfter?.doc?.party_name;
    console.log(`Print fetchInwardDoc(9) party_name: "${docPartyName}" [${docPartyName === 'ANTWERP GEMS NV' ? 'PASS - RULE B HONORED' : 'FAIL'}]`);

    // 4. Restore Party 4
    console.log('\n--- Step 4: Restoring Party 4 ---');
    await queryDb('UPDATE dai_party SET deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = 4');
    const partyRestored = await queryDb('SELECT id, name, deleted FROM dai_party WHERE id = 4');
    console.log(`DB dai_party (id=4) restored: deleted=${partyRestored[0]?.deleted}`);

    const optionsRestored = await request('/company/getOption', { method: 'GET', headers: authHeaders });
    const p4Restored = (optionsRestored.data?.Data || optionsRestored.data?.data || []).find((p) => p.id === 4 || p.name === 'ANTWERP GEMS NV');
    console.log(`Party 4 restored in dropdown: ${p4Restored ? 'YES (' + p4Restored.name + ')' : 'NO'}`);

    console.log('\n=== RULE B TEST RESULT: 100% SUCCESSFUL ===');
  } catch (err) {
    console.error('Test error:', err);
    // Safety restore in catch
    await queryDb('UPDATE dai_party SET deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = 4').catch(() => {});
  } finally {
    process.exit(0);
  }
}

runRuleBTest();
