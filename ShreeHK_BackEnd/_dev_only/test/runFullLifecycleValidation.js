const http = require('http');
const jwt = require('jsonwebtoken');
const connection = require('../connection.js');
const fs = require('fs');
const path = require('path');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function queryMeta(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
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
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
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

// Global Tracking Registry: Explicit primary key IDs only
const tracking = {
  dai_party: [],
  category: [],
  dai_lab: [],
  dai_origin: [],
  dai_shipping: [],
  dai_attribute: [],
  roll: [],
  user: [],
  dai_inward: [],
  dai_inward_item: [],
  dai_outward: [],
  dai_outward_item: [],
  dai_product: [],
  dai_product_value: [],
  dai_company_transfer: [],
  dai_company_transfer_item: [],
};

async function executeLifecycle() {
  console.log('========================================================================');
  console.log('  COMPREHENSIVE HTTP LIFECYCLE VALIDATION & STRICT AUDIT SUITE         ');
  console.log('========================================================================\n');

  // Guard: Confirm DB is test
  const [dbRow] = await query('SELECT DATABASE() AS db');
  console.log(`Verified DB Guard: Database = ${dbRow.db}`);
  if (dbRow.db !== 'shreehkweb_snj2024_test') {
    throw new Error(`ABORT: Target is not shreehkweb_snj2024_test! Current: ${dbRow.db}`);
  }

  // Pre-test Baseline Snapshot
  const baselineFile = path.resolve(__dirname, 'baseline_metrics.json');
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  console.log('Loaded Baseline Metrics:', {
    stock_products: baseline.stock.total_products,
    inward_active: baseline.transactions.total_inward,
    outward_active: baseline.transactions.total_outward,
    masters_parties: baseline.masters.total_parties,
  });

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
      jti: 'lfc_admin_' + Date.now(),
    },
    SECRET_KEY,
    { expiresIn: '2h' }
  );

  const auth1 = {
    Authorization: `Bearer ${adminToken}`,
    'x-company-id': '1',
  };

  const results = [];
  const logStep = (name, pass, details = '') => {
    results.push({ name, pass, details });
    console.log(`${pass ? '  ✓ PASS' : '  ✗ FAIL'}: ${name}${details ? ` -> ${details}` : ''}`);
  };

  try {
    // ========================================================================
    // 1. MASTERS LIFECYCLE (Party, Category, Lab, Origin, Shipping, Attribute, Role, User)
    // ========================================================================
    console.log('\n--- 1. MASTERS LIFECYCLE VALIDATION ---');

    // 1.1 Party
    console.log('\n[1.1] Party Lifecycle:');
    const pName = `LFC_Party_${Date.now()}`;
    const pCreate = await requestPort(3500, '/company/save', { method: 'POST', headers: auth1, body: { id: 0, name: pName } });
    const pId = pCreate.data?.data?.id || (await query('SELECT id FROM dai_party WHERE name = ? ORDER BY id DESC LIMIT 1', [pName]))[0]?.id;
    tracking.dai_party.push(pId);
    logStep('Create Party via POST /company/save', Boolean(pId), `Party ID: ${pId}`);

    const pDropdown1 = await requestPort(3500, '/company/getOption', { headers: auth1 });
    const pFound1 = (pDropdown1.data?.Data || []).some((p) => p.id === pId);
    logStep('Verify party present in GET /company/getOption', pFound1);

    const pDel = await requestPort(3500, `/company/delete?deleteId=${pId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Party via DELETE /company/delete', pDel.status === 200 || pDel.status === 201);

    const [pDbAfter] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_party WHERE id = ?', [pId]);
    logStep(
      'Verify DB soft-delete: deleted=1, deleted_at, deleted_by',
      pDbAfter?.deleted === 1 && pDbAfter?.deleted_at != null && pDbAfter?.deleted_by != null,
      `deleted=${pDbAfter?.deleted}, by=${pDbAfter?.deleted_by}`
    );

    const pDropdown2 = await requestPort(3500, '/company/getOption', { headers: auth1 });
    const pFound2 = (pDropdown2.data?.Data || []).some((p) => p.id === pId);
    logStep('Verify deleted party excluded from GET /company/getOption', !pFound2);

    // Recreate same name
    const pCreate2 = await requestPort(3500, '/company/save', { method: 'POST', headers: auth1, body: { id: 0, name: pName } });
    const pId2 = pCreate2.data?.data?.id || (await query('SELECT id FROM dai_party WHERE name = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [pName]))[0]?.id;
    if (pId2) tracking.dai_party.push(pId2);
    logStep('Recreate party with SAME NAME (allowed after soft delete)', Boolean(pId2), `New Party ID: ${pId2}`);

    // Rule B: Purani bill par party name resolution
    const histBill = await requestPort(3500, '/inward/?id=147', { headers: auth1 });
    logStep('Rule B: Existing historical bill still resolves party name', histBill.status === 201 && Boolean(histBill.data?.Data?.party_name));

    // 1.2 Category
    console.log('\n[1.2] Category Lifecycle:');
    const cName = `LFC_Cat_${Date.now()}`;
    const cCreate = await requestPort(3500, '/category/save', { method: 'POST', headers: auth1, body: { id: 0, name: cName, parent: 0 } });
    const cId = cCreate.data?.id || (await query('SELECT id FROM category WHERE name = ? ORDER BY id DESC LIMIT 1', [cName]))[0]?.id;
    tracking.category.push(cId);
    logStep('Create Category via POST /category/save', Boolean(cId), `Category ID: ${cId}`);

    const cList1 = await requestPort(3500, '/master/category', { headers: auth1 });
    const cFound1 = (cList1.data?.Data || []).some((c) => c.id === cId);
    logStep('Verify category in GET /master/category', cFound1);

    const cDel = await requestPort(3500, `/category/delete?deleteId=${cId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Category via DELETE /category/delete', cDel.status === 200 || cDel.status === 201);

    const [cDbAfter] = await query('SELECT id, deleted, deleted_at, deleted_by FROM category WHERE id = ?', [cId]);
    logStep('Verify DB soft-delete: category deleted=1', cDbAfter?.deleted === 1 && cDbAfter?.deleted_at != null);

    const cList2 = await requestPort(3500, '/master/category', { headers: auth1 });
    const cFound2 = (cList2.data?.Data || []).some((c) => c.id === cId);
    logStep('Verify category excluded from list after soft delete', !cFound2);

    const cCreate2 = await requestPort(3500, '/category/save', { method: 'POST', headers: auth1, body: { id: 0, name: cName, parent: 0 } });
    const cId2 = cCreate2.data?.id || (await query('SELECT id FROM category WHERE name = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [cName]))[0]?.id;
    if (cId2) tracking.category.push(cId2);
    logStep('Recreate category with same name succeeds', Boolean(cId2), `New Category ID: ${cId2}`);

    // 1.3 Lab
    console.log('\n[1.3] Lab Lifecycle:');
    const labName = `LFC_Lab_${Date.now()}`;
    const labCreate = await requestPort(3500, '/lab/post', { method: 'POST', headers: auth1, body: { id: 0, lab: labName } });
    const labId = (await query('SELECT id FROM dai_lab WHERE lab = ? ORDER BY id DESC LIMIT 1', [labName]))[0]?.id;
    tracking.dai_lab.push(labId);
    logStep('Create Lab via POST /lab/post', Boolean(labId), `Lab ID: ${labId}`);

    const labDel = await requestPort(3500, `/lab/delete?deleteId=${labId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Lab via DELETE /lab/delete', labDel.status === 200 || labDel.status === 201);

    const [labDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_lab WHERE id = ?', [labId]);
    logStep('Verify DB soft-delete: dai_lab deleted=1', labDb?.deleted === 1 && labDb?.deleted_at != null);

    const labCreate2 = await requestPort(3500, '/lab/post', { method: 'POST', headers: auth1, body: { id: 0, lab: labName } });
    const labId2 = (await query('SELECT id FROM dai_lab WHERE lab = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [labName]))[0]?.id;
    if (labId2) tracking.dai_lab.push(labId2);
    logStep('Recreate lab with same name succeeds', Boolean(labId2));

    // 1.4 Origin
    console.log('\n[1.4] Origin Lifecycle:');
    const origName = `LFC_Orig_${Date.now()}`;
    const origCreate = await requestPort(3500, '/origin/save', { method: 'POST', headers: auth1, body: { id: 0, name: origName } });
    const origId = (await query('SELECT id FROM dai_origin WHERE name = ? ORDER BY id DESC LIMIT 1', [origName]))[0]?.id;
    tracking.dai_origin.push(origId);
    logStep('Create Origin via POST /origin/save', Boolean(origId), `Origin ID: ${origId}`);

    const origDel = await requestPort(3500, `/origin/delete?deleteId=${origId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Origin via DELETE /origin/delete', origDel.status === 200 || origDel.status === 201);

    const [origDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_origin WHERE id = ?', [origId]);
    logStep('Verify DB soft-delete: dai_origin deleted=1', origDb?.deleted === 1 && origDb?.deleted_at != null);

    const origCreate2 = await requestPort(3500, '/origin/save', { method: 'POST', headers: auth1, body: { id: 0, name: origName } });
    const origId2 = (await query('SELECT id FROM dai_origin WHERE name = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [origName]))[0]?.id;
    if (origId2) tracking.dai_origin.push(origId2);
    logStep('Recreate origin with same name succeeds', Boolean(origId2));

    // 1.5 Shipping
    console.log('\n[1.5] Shipping Lifecycle:');
    const shipName = `LFC_Ship_${Date.now()}`;
    const shipCreate = await requestPort(3500, '/shipping/save', { method: 'POST', headers: auth1, body: { id: 0, name: shipName } });
    const shipId = (await query('SELECT id FROM dai_shipping WHERE name = ? ORDER BY id DESC LIMIT 1', [shipName]))[0]?.id;
    tracking.dai_shipping.push(shipId);
    logStep('Create Shipping via POST /shipping/save', Boolean(shipId), `Shipping ID: ${shipId}`);

    const shipDel = await requestPort(3500, `/shipping/delete?deleteId=${shipId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Shipping via DELETE /shipping/delete', shipDel.status === 200 || shipDel.status === 201);

    const [shipDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_shipping WHERE id = ?', [shipId]);
    logStep('Verify DB soft-delete: dai_shipping deleted=1', shipDb?.deleted === 1 && shipDb?.deleted_at != null);

    const shipCreate2 = await requestPort(3500, '/shipping/save', { method: 'POST', headers: auth1, body: { id: 0, name: shipName } });
    const shipId2 = (await query('SELECT id FROM dai_shipping WHERE name = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [shipName]))[0]?.id;
    if (shipId2) tracking.dai_shipping.push(shipId2);
    logStep('Recreate shipping with same name succeeds', Boolean(shipId2));

    // 1.6 Attribute
    console.log('\n[1.6] Attribute Lifecycle:');
    const attrName = `LFC_Attr_${Date.now()}`;
    const attrCode = `CD_${Date.now().toString().slice(-4)}`;
    const attrCreate = await requestPort(3500, '/attribute/save', { method: 'POST', headers: auth1, body: { id: 0, name: attrName, code: attrCode } });
    const attrId = (await query('SELECT id FROM dai_attribute WHERE name = ? ORDER BY id DESC LIMIT 1', [attrName]))[0]?.id;
    tracking.dai_attribute.push(attrId);
    logStep('Create Attribute via POST /attribute/save', Boolean(attrId), `Attribute ID: ${attrId}`);

    const attrDel = await requestPort(3500, `/attribute/delete?deleteId=${attrId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Attribute via DELETE /attribute/delete', attrDel.status === 200 || attrDel.status === 201);

    const [attrDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_attribute WHERE id = ?', [attrId]);
    logStep('Verify DB soft-delete: dai_attribute deleted=1', attrDb?.deleted === 1 && attrDb?.deleted_at != null);

    const attrCreate2 = await requestPort(3500, '/attribute/save', { method: 'POST', headers: auth1, body: { id: 0, name: attrName, code: attrCode } });
    const attrId2 = (await query('SELECT id FROM dai_attribute WHERE name = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [attrName]))[0]?.id;
    if (attrId2) tracking.dai_attribute.push(attrId2);
    logStep('Recreate attribute with same name succeeds', Boolean(attrId2));

    // 1.7 Role
    console.log('\n[1.7] Role Lifecycle:');
    const roleName = `LFC_Role_${Date.now()}`;
    const roleCreate = await requestPort(3500, '/role-add', {
      method: 'POST',
      headers: auth1,
      body: { name: roleName, resource: ['all'], company: [1] },
    });
    const roleId = roleCreate.data?.data?.id || (await query('SELECT id FROM roll WHERE name = ? ORDER BY id DESC LIMIT 1', [roleName]))[0]?.id;
    tracking.roll.push(roleId);
    logStep('Create Role via POST /role-add', Boolean(roleId), `Role ID: ${roleId}`);

    const roleDel = await requestPort(3500, `/role-delete/${roleId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete Role via DELETE /role-delete/:id', roleDel.status === 200);

    const [roleDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM roll WHERE id = ?', [roleId]);
    logStep('Verify DB soft-delete: roll deleted=1', roleDb?.deleted === 1 && roleDb?.deleted_at != null);

    const roleCreate2 = await requestPort(3500, '/role-add', {
      method: 'POST',
      headers: auth1,
      body: { name: roleName, resource: ['all'], company: [1] },
    });
    const roleId2 = roleCreate2.data?.data?.id || (await query('SELECT id FROM roll WHERE name = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT 1', [roleName]))[0]?.id;
    if (roleId2) tracking.roll.push(roleId2);
    logStep('Recreate role with same name succeeds', Boolean(roleId2));

    // 1.8 User Lifecycle & Token Invalidation
    console.log('\n[1.8] User Lifecycle & Token Invalidation:');
    const uName = `user_${Date.now().toString().slice(-6)}`;
    const uPass = 'StrongPass123!';
    const uEmail = `${uName}@example.com`;
    const uCreate = await requestPort(3500, '/addNewUser', {
      method: 'POST',
      headers: auth1,
      body: {
        fname: 'Test',
        lname: 'User',
        username: uName,
        email: uEmail,
        mobileno: '9999888877',
        userroll: 1,
        password: uPass,
      },
    });
    const uRow = (await queryMeta('SELECT user_id FROM user WHERE user_name = ? ORDER BY user_id DESC LIMIT 1', [uName]))[0];
    const uId = uRow?.user_id;
    tracking.user.push(uId);
    logStep('Create User via POST /addNewUser', Boolean(uId), `User ID: ${uId}`);

    // Generate JWT token for this user
    const userToken = jwt.sign(
      {
        user_id: uId,
        userId: uId,
        id: uId,
        username: uName,
        roll: 1,
        companyId: 1,
        company: 1,
        yearId: 8,
        jti: 'lfc_user_' + Date.now(),
      },
      SECRET_KEY,
      { expiresIn: '1h' }
    );
    const userAuth = {
      Authorization: `Bearer ${userToken}`,
      'x-company-id': '1',
    };

    // Verify authenticated request succeeds with active user token
    const testReqBefore = await requestPort(3500, '/master/category', { headers: userAuth });
    logStep('Active user JWT token works for API request (status=200)', testReqBefore.status === 200);

    // Delete user
    const uDel = await requestPort(3500, `/deleteUser?deleteId=${uId}`, { method: 'DELETE', headers: auth1 });
    logStep('Delete user via DELETE /deleteUser?deleteId=...', uDel.status === 200 || uDel.data?.status === true);

    const [uDb] = await queryMeta('SELECT user_id, deleted, deleted_at, deleted_by FROM user WHERE user_id = ?', [uId]);
    logStep('Verify DB soft-delete: user deleted=1', uDb?.deleted === 1 && uDb?.deleted_at != null);

    // Verify login attempt of deleted user fails (401)
    const loginAttempt = await requestPort(3500, '/user/login', {
      method: 'POST',
      body: { username: uName, password: uPass },
    });
    logStep('Deleted user login attempt rejected with 401', loginAttempt.status === 401, `Message: ${loginAttempt.data?.message}`);

    // Verify existing JWT token of deleted user is rejected with 401
    const tokenReqAfter = await requestPort(3500, '/master/category', { headers: userAuth });
    logStep(
      'Existing JWT token of deleted user rejected with 401 ("User account deleted...")',
      tokenReqAfter.status === 401,
      `Status: ${tokenReqAfter.status}, Message: ${tokenReqAfter.data?.message}`
    );

    // ========================================================================
    // 2. INWARD LIFECYCLE & SKU REUSE
    // ========================================================================
    console.log('\n--- 2. INWARD LIFECYCLE & SKU REUSE ---');
    const inwSku = `LFC-SKU-${Date.now().toString().slice(-6)}`;
    const inwInvNo = `LFC-INV-${Date.now().toString().slice(-5)}`;

    const inwCreate = await requestPort(3500, '/inward/save', {
      method: 'POST',
      headers: auth1,
      body: {
        operating_company_id: 1,
        party: 1,
        inward_type: 'purchase',
        invoicedate: '01-01-2025',
        terms: false,
        invoiceno: inwInvNo,
        products: [
          {
            sku: inwSku,
            polish_pcs: 1,
            polish_carat: 1.25,
            price: 800,
            amount: 1000,
            group_type: 'single',
            attr: { color: 'E', clarity: 'VS1' },
          },
        ],
      },
    });

    const inwRow = (await query('SELECT id FROM dai_inward WHERE invoiceno = ? ORDER BY id DESC LIMIT 1', [inwInvNo]))[0];
    const inwId = inwRow?.id;
    tracking.dai_inward.push(inwId);

    const inwProdRow = (await query('SELECT id FROM dai_product WHERE inward_id = ? ORDER BY id DESC LIMIT 1', [inwId]))[0];
    const inwProdId = inwProdRow?.id;
    tracking.dai_product.push(inwProdId);
    tracking.dai_product_value.push(inwProdId);

    const inwItemRow = (await query('SELECT id FROM dai_inward_item WHERE inward_id = ? ORDER BY id DESC LIMIT 1', [inwId]))[0];
    const inwItemId = inwItemRow?.id;
    if (inwItemId) tracking.dai_inward_item.push(inwItemId);

    logStep('Create Inward via POST /inward/save', inwCreate.data?.status === true && Boolean(inwId), `Inward ID: ${inwId}, Product ID: ${inwProdId}`);

    // Soft delete the inward
    const inwDel = await requestPort(3500, `/transaction/inward-stock?deleteId=${inwId}`, { method: 'DELETE', headers: auth1 });
    logStep('Soft-delete Inward via DELETE /transaction/inward-stock', inwDel.data?.status === true || inwDel.status === 200);

    const [inwDbAfter] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_inward WHERE id = ?', [inwId]);
    const [inwItemDbAfter] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_inward_item WHERE inward_id = ?', [inwId]);
    const [prodDbAfter] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_product WHERE id = ?', [inwProdId]);

    logStep(
      'Verify DB soft-delete: dai_inward, dai_inward_item, dai_product ALL deleted=1',
      inwDbAfter?.deleted === 1 && inwItemDbAfter?.deleted === 1 && prodDbAfter?.deleted === 1,
      `inward.deleted=${inwDbAfter?.deleted}, item.deleted=${inwItemDbAfter?.deleted}, prod.deleted=${prodDbAfter?.deleted}`
    );

    // SKU Reuse Verification: create new inward with exact SAME SKU
    const inwInvNo2 = `LFC-INV2-${Date.now().toString().slice(-5)}`;
    const inwCreate2 = await requestPort(3500, '/inward/save', {
      method: 'POST',
      headers: auth1,
      body: {
        operating_company_id: 1,
        party: 1,
        inward_type: 'purchase',
        invoicedate: '01-01-2025',
        terms: false,
        invoiceno: inwInvNo2,
        products: [
          {
            sku: inwSku, // SAME SKU
            polish_pcs: 1,
            polish_carat: 1.25,
            price: 800,
            amount: 1000,
            group_type: 'single',
            attr: { color: 'E', clarity: 'VS1' },
          },
        ],
      },
    });

    const inwRow2 = (await query('SELECT id FROM dai_inward WHERE invoiceno = ? ORDER BY id DESC LIMIT 1', [inwInvNo2]))[0];
    const inwId2 = inwRow2?.id;
    if (inwId2) tracking.dai_inward.push(inwId2);

    const inwProdRow2 = (await query('SELECT id FROM dai_product WHERE inward_id = ? ORDER BY id DESC LIMIT 1', [inwId2]))[0];
    const inwProdId2 = inwProdRow2?.id;
    if (inwProdId2) {
      tracking.dai_product.push(inwProdId2);
      tracking.dai_product_value.push(inwProdId2);
    }
    const inwItemRow2 = (await query('SELECT id FROM dai_inward_item WHERE inward_id = ? ORDER BY id DESC LIMIT 1', [inwId2]))[0];
    if (inwItemRow2?.id) tracking.dai_inward_item.push(inwItemRow2.id);

    logStep('SKU REUSE ALLOWED: Inward created with same SKU after previous inward soft-deleted', inwCreate2.data?.status === true && Boolean(inwId2));

    // Soft delete second inward as well
    if (inwId2) {
      await requestPort(3500, `/transaction/inward-stock?deleteId=${inwId2}`, { method: 'DELETE', headers: auth1 });
    }

    // ========================================================================
    // 3. OUTWARD LIFECYCLE (MEMO, SALE, GIA)
    // ========================================================================
    console.log('\n--- 3. OUTWARD LIFECYCLE (MEMO, SALE, GIA) ---');

    // Helper: Create an isolated inward stone fixture
    async function createTestStone(prefix, carat = 1.0) {
      const sku = `LFC-${prefix}-${Date.now().toString().slice(-5)}`;
      const inv = `INV-${prefix}-${Date.now().toString().slice(-5)}`;
      const res = await requestPort(3500, '/inward/save', {
        method: 'POST',
        headers: auth1,
        body: {
          operating_company_id: 1,
          party: 1,
          inward_type: 'purchase',
          invoicedate: '01-01-2025',
          terms: false,
          invoiceno: inv,
          products: [{ sku, polish_pcs: 1, polish_carat: carat, price: 1500, amount: 1500 * carat, group_type: 'single', attr: { color: 'F', clarity: 'VVS2' } }],
        },
      });
      const inw = (await query('SELECT id FROM dai_inward WHERE invoiceno = ? ORDER BY id DESC LIMIT 1', [inv]))[0];
      tracking.dai_inward.push(inw.id);
      const prod = (await query('SELECT id FROM dai_product WHERE inward_id = ? ORDER BY id DESC LIMIT 1', [inw.id]))[0];
      tracking.dai_product.push(prod.id);
      tracking.dai_product_value.push(prod.id);
      const item = (await query('SELECT id FROM dai_inward_item WHERE inward_id = ? ORDER BY id DESC LIMIT 1', [inw.id]))[0];
      if (item?.id) tracking.dai_inward_item.push(item.id);
      return { inwardId: inw.id, productId: prod.id, sku };
    }

    // 3.1 Memo Outward -> Return Lifecycle
    console.log('\n[3.1] Memo Outward -> Return:');
    const memoStone = await createTestStone('MEMO');
    logStep('Created dedicated stone fixture for Memo testing', Boolean(memoStone.productId), `ID: ${memoStone.productId}, SKU: ${memoStone.sku}`);

    const memoInv = `LFC-MEMO-${Date.now().toString().slice(-5)}`;
    const memoCreate = await requestPort(3500, '/outward/sendTo', {
      method: 'POST',
      headers: auth1,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'memo',
        invoiceno: memoInv,
        invoicedate: '01-01-2025',
        terms: false,
        products: [{ id: memoStone.productId, sku: memoStone.sku, pcs: 1, carat: 1.0, price: 1500, amount: 1500 }],
      },
    });
    const memoId = memoCreate.data?.id;
    tracking.dai_outward.push(memoId);
    const memoItem = (await query('SELECT id FROM dai_outward_item WHERE outward_id = ?', [memoId]))[0];
    if (memoItem?.id) tracking.dai_outward_item.push(memoItem.id);

    logStep('Create Memo Outward via POST /outward/sendTo', Boolean(memoId), `Memo ID: ${memoId}`);

    const [stoneOnMemo] = await query('SELECT outward, memo_pcs, memo_carat FROM dai_product WHERE id = ?', [memoStone.productId]);
    logStep('Stone marked on memo', stoneOnMemo?.outward === 'memo' && Number(stoneOnMemo?.memo_pcs) === 1);

    // Return memo
    const memoReturn = await requestPort(3500, '/transaction/outward-stock/return', {
      method: 'POST',
      headers: auth1,
      body: {
        id: memoId,
        products: [memoStone.productId],
        record: {
          [memoStone.productId]: { id: memoStone.productId, pcs: 1, carat: 1.0, sell_price: 1500, sell_amount: 1500 },
        },
      },
    });
    logStep('Return Memo via POST /transaction/outward-stock/return', memoReturn.data?.ok === true || memoReturn.status === 200);

    const [stoneAfterMemoRet] = await query('SELECT outward, visibility, onhand_pcs, onhand_carat FROM dai_product WHERE id = ?', [memoStone.productId]);
    logStep('Stone restored after memo return (outward="", vis=1)', stoneAfterMemoRet?.outward === '' && stoneAfterMemoRet?.visibility === 1);

    // Soft delete the stone inward now that memo is returned
    await requestPort(3500, `/transaction/inward-stock?deleteId=${memoStone.inwardId}`, { method: 'DELETE', headers: auth1 });

    // 3.2 Sale Outward -> Soft Delete Lifecycle
    console.log('\n[3.2] Sale Outward -> Soft Delete:');
    const saleStone = await createTestStone('SALE');
    logStep('Created dedicated stone fixture for Sale testing', Boolean(saleStone.productId), `ID: ${saleStone.productId}, SKU: ${saleStone.sku}`);

    const saleInv = `LFC-SALE-${Date.now().toString().slice(-5)}`;
    const saleCreate = await requestPort(3500, '/outward/sendTo', {
      method: 'POST',
      headers: auth1,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'sale',
        invoiceno: saleInv,
        invoicedate: '01-01-2025',
        terms: false,
        products: [{ id: saleStone.productId, sku: saleStone.sku, pcs: 1, carat: 1.0, price: 1500, amount: 1500 }],
      },
    });
    const saleId = saleCreate.data?.id;
    tracking.dai_outward.push(saleId);
    const saleItem = (await query('SELECT id FROM dai_outward_item WHERE outward_id = ?', [saleId]))[0];
    if (saleItem?.id) tracking.dai_outward_item.push(saleItem.id);

    logStep('Create Sale Outward via POST /outward/sendTo', Boolean(saleId), `Sale ID: ${saleId}`);

    // Inward Guard: verify inward delete blocked while stone is on sale
    const inwBlocked = await requestPort(3500, `/transaction/inward-stock?deleteId=${saleStone.inwardId}`, { method: 'DELETE', headers: auth1 });
    logStep('Inward Guard Blocked: Cannot delete inward while stone is on outward sale', inwBlocked.data?.status === false || inwBlocked.status === 400);

    // Soft delete sale outward
    const delSale = await requestPort(3500, `/transaction/outward-stock?deleteId=${saleId}`, { method: 'DELETE', headers: auth1 });
    logStep('Soft-delete Sale via DELETE /transaction/outward-stock', delSale.status === 200 || delSale.data?.status === true);

    const [saleDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?', [saleId]);
    const [saleItemDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_outward_item WHERE outward_id = ?', [saleId]);
    logStep('Verify DB soft-delete: dai_outward & dai_outward_item deleted=1', saleDb?.deleted === 1 && saleItemDb?.deleted === 1);

    // Soft delete sale stone inward
    await requestPort(3500, `/transaction/inward-stock?deleteId=${saleStone.inwardId}`, { method: 'DELETE', headers: auth1 });

    // 3.3 GIA (Lab) Outward -> Soft Delete Lifecycle
    console.log('\n[3.3] GIA Outward -> Soft Delete:');
    const giaStone = await createTestStone('GIA');
    logStep('Created dedicated stone fixture for GIA testing', Boolean(giaStone.productId), `ID: ${giaStone.productId}, SKU: ${giaStone.sku}`);

    const giaInv = `LFC-GIA-${Date.now().toString().slice(-5)}`;
    const giaCreate = await requestPort(3500, '/outward/sendTo', {
      method: 'POST',
      headers: auth1,
      body: {
        operating_company_id: 1,
        party: 1,
        type: 'lab',
        lab: 'GIA',
        invoiceno: giaInv,
        invoicedate: '01-01-2025',
        terms: false,
        products: [{ id: giaStone.productId, sku: giaStone.sku, pcs: 1, carat: 1.0, price: 1500, amount: 1500 }],
      },
    });
    const giaId = giaCreate.data?.id;
    tracking.dai_outward.push(giaId);
    const giaItem = (await query('SELECT id FROM dai_outward_item WHERE outward_id = ?', [giaId]))[0];
    if (giaItem?.id) tracking.dai_outward_item.push(giaItem.id);

    logStep('Create GIA Outward via POST /outward/sendTo', Boolean(giaId), `GIA ID: ${giaId}`);

    const delGia = await requestPort(3500, `/transaction/gia?deleteId=${giaId}`, { method: 'DELETE', headers: auth1 });
    logStep('Soft-delete GIA via DELETE /transaction/gia', delGia.status === 200 || delGia.data?.status === true || delGia.data?.ok === true);

    const [giaOutDb] = await query('SELECT id, deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?', [giaId]);
    const [giaItemDb] = await query('SELECT id, deleted FROM dai_outward_item WHERE outward_id = ?', [giaId]);
    logStep('Verify DB soft-delete: GIA dai_outward & dai_outward_item deleted=1', giaOutDb?.deleted === 1 && giaItemDb?.deleted === 1);

    // Soft delete gia stone inward
    await requestPort(3500, `/transaction/inward-stock?deleteId=${giaStone.inwardId}`, { method: 'DELETE', headers: auth1 });

    // ========================================================================
    // 4. BOX / PARCEL / PAIR / UNBOX / SEPARATE / CATEGORIZE / PACKAGE
    // ========================================================================
    console.log('\n--- 4. BOX / PARCEL / PAIR / UNBOX / SEPARATE / CATEGORIZE / PACKAGE ---');

    // Create 2 isolated stones directly
    const boxStoneId1 = 99991;
    const boxStoneSku1 = 'LFC-BOX-99991';
    const boxStoneId2 = 99992;
    const boxStoneSku2 = 'LFC-BOX-99992';
    tracking.dai_product.push(boxStoneId1, boxStoneId2);
    tracking.dai_product_value.push(boxStoneId1, boxStoneId2);

    await query(`
      INSERT INTO dai_product (id, sku, company, polish_pcs, polish_carat, price, amount, cost, visibility, outward, group_type, deleted)
      VALUES 
        (?, ?, 1, 1, 1.50, 2000, 3000, 1500, 1, '', 'single', 0),
        (?, ?, 1, 1, 1.50, 2000, 3000, 1500, 1, '', 'single', 0)
      ON DUPLICATE KEY UPDATE sku = VALUES(sku), polish_pcs = VALUES(polish_pcs), polish_carat = VALUES(polish_carat), amount = VALUES(amount), visibility = 1, outward = '', deleted = 0
    `, [boxStoneId1, boxStoneSku1, boxStoneId2, boxStoneSku2]);

    await query(`
      INSERT INTO dai_product_value (product_id, shape, color, clarity, cut, polish, symmentry)
      VALUES 
        (?, 'ROUND', 'D', 'VVS1', 'EX', 'EX', 'EX'),
        (?, 'ROUND', 'D', 'VVS1', 'EX', 'EX', 'EX')
      ON DUPLICATE KEY UPDATE shape = VALUES(shape), color = VALUES(color), clarity = VALUES(clarity)
    `, [boxStoneId1, boxStoneId2]);

    logStep('Created isolated Box/Parcel stone fixtures (99991 & 99992)', true);

    // 4.1 Box add-stones
    const boxRes = await requestPort(3500, '/product/box/add-stones', {
      method: 'POST',
      headers: auth1,
      body: { mode: 'new', newBoxSku: 'BOX-LFC-AUTO-01', stoneIds: [boxStoneId1], remark: 'LFC box' },
    });
    const boxStoneId = boxRes.data?.containerId;
    if (boxStoneId) {
      tracking.dai_product.push(boxStoneId);
      tracking.dai_product_value.push(boxStoneId);
    }
    logStep('Box add-stones via POST /product/box/add-stones', boxRes.status === 200 && Boolean(boxStoneId), `Box Stone ID: ${boxStoneId}`);

    // 4.2 Parcel add-stones
    const parcelRes = await requestPort(3500, '/product/parcel/add-stones', {
      method: 'POST',
      headers: auth1,
      body: { mode: 'new', newParcelSku: 'PARCEL-LFC-AUTO-01', stoneIds: [boxStoneId2], remark: 'LFC parcel' },
    });
    const parcelStoneId = parcelRes.data?.containerId;
    if (parcelStoneId) {
      tracking.dai_product.push(parcelStoneId);
      tracking.dai_product_value.push(parcelStoneId);
    }
    logStep('Parcel add-stones via POST /product/parcel/add-stones', parcelRes.status === 200 && Boolean(parcelStoneId), `Parcel Stone ID: ${parcelStoneId}`);

    // 4.3 Categorize Assign
    const catAssign = await requestPort(3500, '/product/categorize/assign', {
      method: 'POST',
      headers: auth1,
      body: { productIds: [boxStoneId1], categoryId: 1 },
    });
    logStep('Categorize assign via POST /product/categorize/assign', catAssign.status === 200);

    // 4.4 Package Assign
    const pkgAssign = await requestPort(3500, '/product/package/assign', {
      method: 'POST',
      headers: auth1,
      body: { productIds: [boxStoneId1], packageName: 'LFC_PACKAGE' },
    });
    logStep('Package assign via POST /product/package/assign', pkgAssign.status === 200);

    // 4.5 Pair assign & unpair
    await query("UPDATE dai_product SET group_type = 'single', box_id = NULL, parcel_id = NULL, visibility = 1, outward = '' WHERE id IN (?, ?)", [boxStoneId1, boxStoneId2]);
    const pairAssign = await requestPort(3500, '/product/pair/assign', {
      method: 'POST',
      headers: auth1,
      body: { id1: boxStoneId1, id2: boxStoneId2, pairName: 'PAIR-LFC-99991' },
    });
    logStep('Pair assign via POST /product/pair/assign', pairAssign.status === 200);

    const unpairRes = await requestPort(3500, '/product/pair/unpair', {
      method: 'POST',
      headers: auth1,
      body: { ids: [boxStoneId1, boxStoneId2] },
    });
    logStep('Pair unpair via POST /product/pair/unpair', unpairRes.status === 200);

    // 4.6 Mixing separate & unbox
    const boxContRes = await requestPort(3500, '/product/box/add-stones', {
      method: 'POST',
      headers: auth1,
      body: { mode: 'new', newBoxSku: 'BOX-LFC-SEP-99991', stoneIds: [boxStoneId1, boxStoneId2] },
    });
    const boxContId = boxContRes.data?.containerId;
    if (boxContId) {
      tracking.dai_product.push(boxContId);
      tracking.dai_product_value.push(boxContId);
    }
    logStep('Created container for mixing test', Boolean(boxContId), `Container ID: ${boxContId}`);

    const unboxRes = await requestPort(3500, '/product/mixing/unbox', {
      method: 'POST',
      headers: auth1,
      body: { containerId: boxContId, stoneIds: [boxStoneId1] },
    });
    logStep('Mixing unbox via POST /product/mixing/unbox', unboxRes.status === 200);

    const sepRes = await requestPort(3500, '/product/mixing/separate', {
      method: 'POST',
      headers: auth1,
      body: {
        containerId: boxContId,
        records: [{ sku: 'LFC-SEP-99991-01', polish_pcs: 1, polish_carat: 0.5, price: 2000, amount: 1000 }],
      },
    });
    logStep('Mixing separate via POST /product/mixing/separate', sepRes.status === 200);

    const sepProdRow = (await query('SELECT id FROM dai_product WHERE sku = "LFC-SEP-99991-01"'))[0];
    if (sepProdRow?.id) {
      tracking.dai_product.push(sepProdRow.id);
      tracking.dai_product_value.push(sepProdRow.id);
    }

    // ========================================================================
    // 5. INTER-COMPANY TRANSFER & RETURN FLOW
    // ========================================================================
    console.log('\n--- 5. INTER-COMPANY TRANSFER & RETURN FLOW ---');
    const trfStoneId = 99993;
    const trfStoneSku = 'LFC-TRF-STONE-99993';
    tracking.dai_product.push(trfStoneId);
    tracking.dai_product_value.push(trfStoneId);

    await query(`
      INSERT INTO dai_product (
        id, sku, company, polish_pcs, polish_carat, amount, price,
        onhand_pcs, onhand_carat, memo_pcs, memo_carat, sold_pcs, sold_carat,
        outward, visibility, hold, outward_parent, deleted
      ) VALUES (?, ?, 1, 1, 1.00, 1000.00, 1000.00, 1, 1.00, 0, 0, 0, 0, '', 1, 0, 0, 0)
      ON DUPLICATE KEY UPDATE sku = VALUES(sku), polish_pcs = 1, polish_carat = 1.0, visibility = 1, outward = '', deleted = 0
    `, [trfStoneId, trfStoneSku]);

    await query(`
      INSERT INTO dai_product_value (product_id, shape, color, clarity, cut, polish)
      VALUES (?, "ROUND", "D", "VVS1", "EX", "EX")
      ON DUPLICATE KEY UPDATE shape = VALUES(shape)
    `, [trfStoneId]);

    logStep('Created dedicated fixture for Company Transfer (ID: 99993)', true);

    const trfRes = await requestPort(3500, '/transaction/company-transfer', {
      method: 'POST',
      headers: auth1,
      body: {
        from_company_id: 1,
        to_company_id: 3, // Valid company #3: KG Infrastructure
        transfer_date: '2026-10-31',
        notes: 'LFC Test Inter-Company Transfer',
        items: [{ product_id: trfStoneId, sku: trfStoneSku, pcs: 1, carat: 1.0, price: 1000, amount: 1000 }],
      },
    });

    const trfData = trfRes.data?.data;
    const trfId = trfData?.transfer_id;
    if (trfId) tracking.dai_company_transfer.push(trfId);

    const trfItems = await query('SELECT id, target_product_id FROM dai_company_transfer_item WHERE transfer_id = ?', [trfId]);
    for (const item of trfItems) {
      tracking.dai_company_transfer_item.push(item.id);
      if (item.target_product_id) {
        tracking.dai_product.push(item.target_product_id);
        tracking.dai_product_value.push(item.target_product_id);
      }
    }
    if (trfData?.source_outward_id) {
      tracking.dai_outward.push(trfData.source_outward_id);
      const outItems = await query('SELECT id FROM dai_outward_item WHERE outward_id = ?', [trfData.source_outward_id]);
      for (const oi of outItems) tracking.dai_outward_item.push(oi.id);
    }
    if (trfData?.target_inward_id) {
      tracking.dai_inward.push(trfData.target_inward_id);
      const inItems = await query('SELECT id FROM dai_inward_item WHERE inward_id = ?', [trfData.target_inward_id]);
      for (const ii of inItems) tracking.dai_inward_item.push(ii.id);
    }

    logStep('Execute Transfer via POST /transaction/company-transfer', trfRes.status === 201 && Boolean(trfId), `Transfer ID: ${trfId}`);

    const [sourceStoneAfterTrf] = await query('SELECT outward, visibility, polish_pcs, polish_carat FROM dai_product WHERE id = ?', [trfStoneId]);
    logStep('Source stone transferred (outward="transferred", pcs=0, carat=0)', sourceStoneAfterTrf?.outward === 'transferred' && Number(sourceStoneAfterTrf?.polish_pcs) === 0);

    // Return the transfer
    const retRes = await requestPort(3500, '/transaction/company-transfer/return', {
      method: 'POST',
      headers: auth1,
      body: {
        transfer_id: trfId,
        return_date: '2026-10-31',
        notes: 'LFC Sale Return',
        items: [{ transfer_item_id: trfItems[0]?.id, pcs: 1, carat: 1.0 }],
      },
    });
    logStep('Return Transfer via POST /transaction/company-transfer/return', retRes.status === 200);

    const [sourceStoneAfterRet] = await query('SELECT outward, visibility, polish_pcs, polish_carat FROM dai_product WHERE id = ?', [trfStoneId]);
    logStep('Source stone restored after transfer return (vis=1, pcs=1, carat=1.0)', sourceStoneAfterRet?.visibility === 1 && Number(sourceStoneAfterRet?.polish_carat) === 1.0);

    const [trfStatusAfter] = await query('SELECT status FROM dai_company_transfer WHERE id = ?', [trfId]);
    logStep('Transfer record status updated to "returned"', trfStatusAfter?.status === 'returned');
  } catch (err) {
    console.error('Fatal error during lifecycle execution:', err);
    logStep('Fatal Error in test execution', false, err.message);
  } finally {
    // ========================================================================
    // 6. EXPLICIT FIXTURE PURGE (SELECT then DELETE strictly by primary key ID)
    // ========================================================================
    console.log('\n========================================================================');
    console.log('  EXPLICIT FIXTURE PURGE (SELECT then DELETE by Primary Key)             ');
    console.log('========================================================================\n');

    // Also collect any history, notifications, and activity logs explicitly referencing our test product or user IDs
    const trackedProducts = [...new Set(tracking.dai_product.filter(Boolean))];
    const trackedUsers = [...new Set(tracking.user.filter(Boolean))];

    if (trackedProducts.length > 0) {
      const phProd = trackedProducts.map(() => '?').join(',');
      const histRows = await query(`SELECT id FROM dai_history WHERE product_id IN (${phProd})`, trackedProducts).catch(() => []);
      const histIds = histRows.map((r) => r.id);
      if (histIds.length > 0) {
        console.log(`[dai_history] Found ${histIds.length} history rows to purge for products [${trackedProducts.join(', ')}]`);
        const phH = histIds.map(() => '?').join(',');
        await query(`DELETE FROM dai_history WHERE id IN (${phH})`, histIds);
      }
    }

    if (trackedUsers.length > 0) {
      const phUser = trackedUsers.map(() => '?').join(',');
      const notifRows = await query(`SELECT id FROM notification WHERE user_id IN (${phUser})`, trackedUsers).catch(() => []);
      const notifIds = notifRows.map((r) => r.id);
      if (notifIds.length > 0) {
        console.log(`[notification] Found ${notifIds.length} notification rows to purge for users [${trackedUsers.join(', ')}]`);
        const phN = notifIds.map(() => '?').join(',');
        await query(`DELETE FROM notification WHERE id IN (${phN})`, notifIds);
      }
    }

    // Now purge all tracked tables strictly by explicit IDs
    for (const [table, rawIds] of Object.entries(tracking)) {
      const ids = [...new Set(rawIds.filter(Boolean))];
      if (ids.length === 0) continue;

      const idCol = table === 'user' ? 'user_id' : table === 'dai_product_value' ? 'product_id' : 'id';
      const placeholders = ids.map(() => '?').join(',');
      const pool = table === 'user' ? connection.getMetaPool() : connection;

      // 1. SELECT and display
      const rows = await new Promise((res, rej) => {
        pool.query(`SELECT ${idCol} FROM ${table} WHERE ${idCol} IN (${placeholders})`, ids, (e, r) => (e ? rej(e) : res(r)));
      });
      console.log(`[${table}] Displaying ${rows.length} rows to be purged:`, rows.map((r) => r[idCol]));

      // 2. DELETE strictly by explicit primary key
      if (rows.length > 0) {
        await new Promise((res, rej) => {
          pool.query(`DELETE FROM ${table} WHERE ${idCol} IN (${placeholders})`, ids, (e, r) => (e ? rej(e) : res(r)));
        });
        console.log(`[${table}] Purged ${rows.length} rows.`);
      }
    }

    // Clean audit logs generated by test user ID or referencing test entities
    if (trackedUsers.length > 0) {
      const phU = trackedUsers.map(() => '?').join(',');
      await queryMeta(`DELETE FROM dai_activity_log WHERE user_id IN (${phU})`, trackedUsers).catch(() => {});
    }

    // ========================================================================
    // 7. POST-TEST ROW COUNTS & BASELINE CHECKSUM VERIFICATION
    // ========================================================================
    console.log('\n========================================================================');
    console.log('  POST-TEST BASELINE COMPARISON & AUDIT VERIFICATION                     ');
    console.log('========================================================================\n');

    const [stockAfter] = await query(`
      SELECT 
        COUNT(*) AS total_products,
        COALESCE(SUM(polish_carat), 0) AS total_carats,
        COALESCE(SUM(polish_pcs), 0) AS total_pcs,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM dai_product
      WHERE (deleted = 0 OR deleted IS NULL)
    `);

    const [inwAfter] = await query(`
      SELECT COUNT(*) AS total_inward, COALESCE(SUM(final_amount), 0) AS inward_amount
      FROM dai_inward
      WHERE (deleted = 0 OR deleted IS NULL)
    `);

    const [outAfter] = await query(`
      SELECT COUNT(*) AS total_outward, COALESCE(SUM(final_amount), 0) AS outward_amount
      FROM dai_outward
      WHERE (deleted = 0 OR deleted IS NULL)
    `);

    const [pAfter] = await query('SELECT COUNT(*) AS cnt FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)');
    const [cAfter] = await query('SELECT COUNT(*) AS cnt FROM category WHERE (deleted = 0 OR deleted IS NULL)');
    const [lAfter] = await query('SELECT COUNT(*) AS cnt FROM dai_lab WHERE (deleted = 0 OR deleted IS NULL)');
    const [oAfter] = await query('SELECT COUNT(*) AS cnt FROM dai_origin WHERE (deleted = 0 OR deleted IS NULL)');
    const [sAfter] = await query('SELECT COUNT(*) AS cnt FROM dai_shipping WHERE (deleted = 0 OR deleted IS NULL)');
    const [aAfter] = await query('SELECT COUNT(*) AS cnt FROM dai_attribute WHERE (deleted = 0 OR deleted IS NULL)');
    const [uAfter] = await queryMeta('SELECT COUNT(*) AS cnt FROM user WHERE (deleted = 0 OR deleted IS NULL)');

    const comparisons = [
      { metric: 'Stock Products', baseline: baseline.stock.total_products, current: stockAfter.total_products },
      { metric: 'Stock Carats', baseline: baseline.stock.total_carats, current: Number(stockAfter.total_carats) },
      { metric: 'Stock Pcs', baseline: baseline.stock.total_pcs, current: stockAfter.total_pcs },
      { metric: 'Inward Active Count', baseline: baseline.transactions.total_inward, current: inwAfter.total_inward },
      { metric: 'Inward Amount', baseline: baseline.transactions.inward_amount, current: Number(inwAfter.inward_amount) },
      { metric: 'Outward Active Count', baseline: baseline.transactions.total_outward, current: outAfter.total_outward },
      { metric: 'Outward Amount', baseline: baseline.transactions.outward_amount, current: Number(outAfter.outward_amount) },
      { metric: 'Master Parties', baseline: baseline.masters.total_parties, current: pAfter.cnt },
      { metric: 'Master Categories', baseline: baseline.masters.total_categories, current: cAfter.cnt },
      { metric: 'Master Labs', baseline: baseline.masters.total_labs, current: lAfter.cnt },
      { metric: 'Master Origins', baseline: baseline.masters.total_origins, current: oAfter.cnt },
      { metric: 'Master Shipping', baseline: baseline.masters.total_shippings, current: sAfter.cnt },
      { metric: 'Master Attributes', baseline: baseline.masters.total_attributes, current: aAfter.cnt },
      { metric: 'Master Users', baseline: baseline.masters.total_users, current: uAfter.cnt },
    ];

    console.table(comparisons);

    let allBaselineMatched = true;
    for (const c of comparisons) {
      if (c.baseline !== c.current) {
        allBaselineMatched = false;
        console.error(`MISMATCH on ${c.metric}: Baseline=${c.baseline}, Current=${c.current}`);
      }
    }

    const passedSteps = results.filter((r) => r.pass).length;
    const failedSteps = results.filter((r) => !r.pass).length;
    console.log(`\nLIFECYCLE SUMMARY: Total Steps=${results.length}, Passed=${passedSteps}, Failed=${failedSteps}`);
    console.log(`BASELINE MATCH: ${allBaselineMatched ? '100% EXACT MATCH ACROSS ALL METRICS' : 'MISMATCH DETECTED'}`);

    if (failedSteps > 0 || !allBaselineMatched) {
      process.exit(1);
    } else {
      console.log('\nSUCCESS: ALL LIFECYCLE TESTS AND CLEANUP VERIFICATIONS PASSED 100%!');
      process.exit(0);
    }
  }
}

executeLifecycle().catch((err) => {
  console.error('Fatal crash:', err);
  process.exit(1);
});
