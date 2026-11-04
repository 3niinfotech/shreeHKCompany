const jwt = require('jsonwebtoken');
const connection = require('../connection.js');
const http = require('http');

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

async function runRealHttpTests() {
  console.log('=== REAL HTTP ENDPOINT TESTS FOR GROUP 1 (Port 3500) ===\n');
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
      jti: 'http_test_jti_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-company-id': '1',
  };

  try {
    // 1. Party (dai_party) via HTTP
    console.log('--- 1. Testing Party HTTP APIs & Rule B ---');
    const pName = `HTTP_Party_${Date.now()}`;
    const pCreate = await request('/company/save', {
      method: 'POST',
      headers: authHeaders,
      body: { id: 0, name: pName },
    });
    recordResult('Party created via POST /company/save', pCreate.status === 201);

    // Fetch dropdown
    const pListBefore = await request('/company/getOption', { headers: authHeaders });
    const pFoundBefore = (pListBefore.data?.Data || []).find((p) => p.name === pName);
    recordResult('Party found in GET /company/getOption', Boolean(pFoundBefore));
    const createdPartyId = pFoundBefore?.id;

    // Delete party via DELETE /company/delete
    const pDel = await request(`/company/delete?deleteId=${createdPartyId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('Party deleted via DELETE /company/delete', pDel.status === 200 || pDel.status === 201);

    // Fetch dropdown again -> Party MUST be gone
    const pListAfter = await request('/company/getOption', { headers: authHeaders });
    const pFoundAfter = (pListAfter.data?.Data || []).some((p) => p.id === createdPartyId);
    recordResult('Soft-deleted party NOT present in GET /company/getOption', !pFoundAfter);

    // Rule B Verification:
    // Create an inward transaction linked to a soft-deleted party, then fetch via GET /inward/get
    const histPartyName = `HTTP_HistParty_${Date.now()}`;
    const pHistIns = await new Promise((res, rej) => {
      connection.query(
        "INSERT INTO dai_party (name, company, deleted, deleted_at) VALUES (?, 1, 1, NOW())",
        [histPartyName],
        (e, r) => (e ? rej(e) : res(r))
      );
    });
    const histPartyId = pHistIns.insertId;

    const inwRes = await new Promise((res, rej) => {
      connection.query(
        "INSERT INTO dai_inward (party, invoiceno, company, deleted) VALUES (?, 'HTTP_HIST_INV', 1, 0)",
        [String(histPartyId)],
        (e, r) => (e ? rej(e) : res(r))
      );
    });
    const mockInwId = inwRes.insertId;

    const histInwardHttp = await request(`/inward/?id=${mockInwId}`, { headers: authHeaders });
    const inwRecord = histInwardHttp.data?.Data;
    const retrievedPartyName = inwRecord?.party_name || inwRecord?.party;
    recordResult(
      'Rule B Verified via HTTP: Historical inward API still displays soft-deleted party name',
      retrievedPartyName === histPartyName
    );

    // Cleanup mock inward & party
    await new Promise((res, rej) => connection.query('DELETE FROM dai_inward WHERE id = ?', [mockInwId], (e, r) => (e ? rej(e) : res(r))));
    await new Promise((res, rej) => connection.query('DELETE FROM dai_party WHERE id = ?', [histPartyId], (e, r) => (e ? rej(e) : res(r))));
    await new Promise((res, rej) => connection.query('DELETE FROM dai_party WHERE id = ?', [createdPartyId], (e, r) => (e ? rej(e) : res(r))));

    // 2. Category via HTTP
    console.log('\n--- 2. Testing Category HTTP APIs ---');
    const catName = `HTTP_Cat_${Date.now()}`;
    const catCreate = await request('/category/save', {
      method: 'POST',
      headers: authHeaders,
      body: { id: 0, name: catName, parent: 0 },
    });
    recordResult('Category created via POST /category/save', catCreate.status === 201);

    const catListBefore = await request('/master/category', { headers: authHeaders });
    const catFound = (catListBefore.data?.Data || []).find((c) => c.name === catName);
    recordResult('Category found in GET /master/category', Boolean(catFound));
    const catId = catFound?.id;

    const catDel = await request(`/category/delete?deleteId=${catId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('Category deleted via DELETE /category/delete', catDel.status === 200 || catDel.status === 201);

    const catListAfter = await request('/master/category', { headers: authHeaders });
    const catFoundAfter = (catListAfter.data?.Data || []).some((c) => c.id === catId);
    recordResult('Soft-deleted category NOT present in GET /master/category', !catFoundAfter);
    await new Promise((res, rej) => connection.query('DELETE FROM category WHERE id = ?', [catId], (e, r) => (e ? rej(e) : res(r))));

    // 3. Lab via HTTP
    console.log('\n--- 3. Testing Lab HTTP APIs ---');
    const labName = `HTTP_Lab_${Date.now()}`;
    const labCreate = await request('/lab/post', {
      method: 'POST',
      headers: authHeaders,
      body: { id: 0, lab: labName },
    });
    recordResult('Lab created via POST /lab/post', labCreate.status === 201);

    const labListBefore = await request('/master/lab', { headers: authHeaders });
    const labFound = (labListBefore.data?.Data || []).find((l) => l.lab === labName);
    recordResult('Lab found in GET /master/lab', Boolean(labFound));
    const labId = labFound?.id;

    const labDel = await request(`/lab/delete?deleteId=${labId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('Lab deleted via DELETE /lab/delete', labDel.status === 200);

    const labListAfter = await request('/master/lab', { headers: authHeaders });
    const labFoundAfter = (labListAfter.data?.Data || []).some((l) => l.id === labId);
    recordResult('Soft-deleted lab NOT present in GET /master/lab', !labFoundAfter);
    await new Promise((res, rej) => connection.query('DELETE FROM dai_lab WHERE id = ?', [labId], (e, r) => (e ? rej(e) : res(r))));

    // 4. Origin via HTTP
    console.log('\n--- 4. Testing Origin HTTP APIs ---');
    const origName = `HTTP_Orig_${Date.now()}`;
    const origCreate = await request('/origin/save', {
      method: 'POST',
      headers: authHeaders,
      body: { id: 0, name: origName },
    });
    recordResult('Origin created via POST /origin/save', origCreate.status === 201);

    const origListBefore = await request('/master/origin', { headers: authHeaders });
    const origFound = (origListBefore.data?.Data || []).find((o) => o.name === origName);
    recordResult('Origin found in GET /master/origin', Boolean(origFound));
    const origId = origFound?.id;

    const origDel = await request(`/origin/delete?deleteId=${origId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('Origin deleted via DELETE /origin/delete', origDel.status === 200);

    const origListAfter = await request('/master/origin', { headers: authHeaders });
    const origFoundAfter = (origListAfter.data?.Data || []).some((o) => o.id === origId);
    recordResult('Soft-deleted origin NOT present in GET /master/origin', !origFoundAfter);
    await new Promise((res, rej) => connection.query('DELETE FROM dai_origin WHERE id = ?', [origId], (e, r) => (e ? rej(e) : res(r))));

    // 5. Shipping via HTTP
    console.log('\n--- 5. Testing Shipping HTTP APIs ---');
    const shipName = `HTTP_Ship_${Date.now()}`;
    const shipCreate = await request('/shipping/save', {
      method: 'POST',
      headers: authHeaders,
      body: { id: 0, name: shipName },
    });
    recordResult('Shipping created via POST /shipping/save', shipCreate.status === 201);

    const shipListBefore = await request('/master/shipping', { headers: authHeaders });
    const shipFound = (shipListBefore.data?.Data || []).find((s) => s.name === shipName);
    recordResult('Shipping found in GET /master/shipping', Boolean(shipFound));
    const shipId = shipFound?.id;

    const shipDel = await request(`/shipping/delete?deleteId=${shipId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('Shipping deleted via DELETE /shipping/delete', shipDel.status === 200);

    const shipListAfter = await request('/master/shipping', { headers: authHeaders });
    const shipFoundAfter = (shipListAfter.data?.Data || []).some((s) => s.id === shipId);
    recordResult('Soft-deleted shipping NOT present in GET /master/shipping', !shipFoundAfter);
    await new Promise((res, rej) => connection.query('DELETE FROM dai_shipping WHERE id = ?', [shipId], (e, r) => (e ? rej(e) : res(r))));

    // 6. User via HTTP
    console.log('\n--- 6. Testing User HTTP APIs ---');
    const uName = `http_u_${Date.now()}`;
    const userCreate = await request('/api/admin/users/create', {
      method: 'POST',
      headers: authHeaders,
      body: {
        user_name: uName,
        user_email: `${uName}@test.com`,
        password: 'Password@123',
        roll: 2,
      },
    });
    recordResult('User created via POST /api/admin/users/create', userCreate.status === 200 || userCreate.status === 201);
    const userId = userCreate.data?.user_id;

    const userListBefore = await request('/getAdminManageUser', { headers: authHeaders });
    const userFound = (userListBefore.data?.Data || []).find((u) => u.username === uName);
    recordResult('User found in GET /getAdminManageUser', Boolean(userFound));

    const userDel = await request(`/api/admin/users/${userId}/delete`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('User deleted via DELETE /api/admin/users/:id/delete', userDel.status === 200);

    const userListAfter = await request('/getAdminManageUser', { headers: authHeaders });
    const userFoundAfter = (userListAfter.data?.Data || []).some((u) => u.id === userId);
    recordResult('Soft-deleted user NOT present in GET /getAdminManageUser', !userFoundAfter);
    await new Promise((res, rej) => connection.query('DELETE FROM user WHERE user_id = ?', [userId], (e, r) => (e ? rej(e) : res(r))));

    // 7. Role via HTTP
    console.log('\n--- 7. Testing Role HTTP APIs ---');
    const rName = `HTTP_Role_${Date.now()}`;
    const roleCreate = await request('/role-add', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: rName,
        resource: ['core.dashboard'],
        company: [1],
      },
    });
    recordResult('Role created via POST /role-add', roleCreate.status === 201);
    const roleId = roleCreate.data?.data?.id;

    const roleListBefore = await request('/role-list', { headers: authHeaders });
    const roleFound = (roleListBefore.data?.data || []).find((r) => r.id === roleId);
    recordResult('Role found in GET /role-list', Boolean(roleFound));

    const roleDel = await request(`/role-delete/${roleId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    recordResult('Role deleted via DELETE /role-delete/:id', roleDel.status === 200);

    const roleListAfter = await request('/role-list', { headers: authHeaders });
    const roleFoundAfter = (roleListAfter.data?.data || []).some((r) => r.id === roleId);
    recordResult('Soft-deleted role NOT present in GET /role-list', !roleFoundAfter);
    await new Promise((res, rej) => connection.query('DELETE FROM roll WHERE id = ?', [roleId], (e, r) => (e ? rej(e) : res(r))));

    console.log('\n=== REAL HTTP TESTS SUMMARY ===');
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`${totalPassed} / ${results.length} HTTP tests passed.`);

    if (totalPassed === results.length) {
      console.log('🎉 ALL REAL HTTP TESTS PASSED PERFECTLY!');
    } else {
      console.error('⚠️ SOME HTTP TESTS FAILED.');
    }
  } catch (err) {
    console.error('HTTP Test Error:', err);
  } finally {
    process.exit(0);
  }
}

runRealHttpTests();
