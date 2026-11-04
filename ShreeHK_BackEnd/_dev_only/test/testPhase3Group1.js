const connection = require('../connection.js');
const fs = require('fs');
const path = require('path');
const helper = require('../helper.js');

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function qMeta(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function runGroup1Tests() {
  console.log('=== PHASE 3 GROUP 1 TESTS (Masters, Dropdowns, Search, Autocomplete) ===\n');
  const results = [];

  const recordResult = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${name}${details ? ` (${details})` : ''}`);
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Baseline Regression Verification
    // -------------------------------------------------------------
    console.log('--- 1. Baseline Regression Verification ---');
    const baselineFile = path.join(__dirname, 'baseline_metrics.json');
    if (!fs.existsSync(baselineFile)) {
      throw new Error('Baseline metrics file not found!');
    }
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

    const currentStock = (await q(`
      SELECT 
        COUNT(*) AS total_products,
        COALESCE(SUM(polish_carat), 0) AS total_carats,
        COALESCE(SUM(polish_pcs), 0) AS total_pcs,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM dai_product
      WHERE (deleted = 0 OR deleted IS NULL)
    `))[0];

    const currentMasters = {
      total_parties: Number((await q(`SELECT COUNT(*) AS total FROM dai_party WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
      total_categories: Number((await q(`SELECT COUNT(*) AS total FROM category WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
      total_labs: Number((await q(`SELECT COUNT(*) AS total FROM dai_lab WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
      total_origins: Number((await q(`SELECT COUNT(*) AS total FROM dai_origin WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
      total_shippings: Number((await q(`SELECT COUNT(*) AS total FROM dai_shipping WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
      total_attributes: Number((await q(`SELECT COUNT(*) AS total FROM dai_attribute WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
      total_users: Number((await q(`SELECT COUNT(*) AS total FROM user WHERE (deleted = 0 OR deleted IS NULL)`))[0].total),
    };

    const stockMatch = 
      Number(currentStock.total_products) === baseline.stock.total_products &&
      Number(currentStock.total_carats) === baseline.stock.total_carats &&
      Number(currentStock.total_pcs) === baseline.stock.total_pcs;

    const mastersMatch = 
      currentMasters.total_parties === baseline.masters.total_parties &&
      currentMasters.total_categories === baseline.masters.total_categories &&
      currentMasters.total_labs === baseline.masters.total_labs &&
      currentMasters.total_origins === baseline.masters.total_origins &&
      currentMasters.total_shippings === baseline.masters.total_shippings &&
      currentMasters.total_attributes === baseline.masters.total_attributes &&
      currentMasters.total_users === baseline.masters.total_users;

    recordResult('Stock totals (count, carats, pcs) identical to baseline', stockMatch);
    recordResult('Master active counts identical to baseline', mastersMatch);

    // -------------------------------------------------------------
    // TEST 2: Party Soft Delete, Dropdown Disappearance & Historical Name Preserved (Rule B)
    // -------------------------------------------------------------
    console.log('\n--- 2. Party Dropdown Disappearance & Rule B Data Integrity ---');
    const partyName = `TestParty_${Date.now()}`;
    const pIns = await q(
      `INSERT INTO dai_party (name, company, deleted) VALUES (?, 1, 0)`,
      [partyName]
    );
    const partyId = pIns.insertId;

    // Verify it appears in active dropdown query
    const ddBefore = await q(
      `SELECT id, name FROM dai_party WHERE company = 1 AND (deleted = 0 OR deleted IS NULL) ORDER BY name`
    );
    const foundBefore = ddBefore.some((p) => p.id === partyId);
    recordResult('New party appears in active dropdown', foundBefore);

    // Create a mock historical transaction linked to this party
    const inwIns = await q(
      `INSERT INTO dai_inward (party, invoiceno, company, deleted) VALUES (?, 'INV_RULE_B', 1, 0)`,
      [String(partyId)]
    );
    const inwId = inwIns.insertId;

    // Soft delete the party
    await q(
      `UPDATE dai_party SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,
      [partyId]
    );

    // Verify party is now GONE from active dropdown & listing
    const ddAfter = await q(
      `SELECT id, name FROM dai_party WHERE company = 1 AND (deleted = 0 OR deleted IS NULL) ORDER BY name`
    );
    const foundAfter = ddAfter.some((p) => p.id === partyId);
    recordResult('Soft-deleted party disappears from active dropdown', !foundAfter);

    // Rule B Verification: Historical inward query joining dai_party STILL shows the party name!
    const histInward = (await q(
      `SELECT i.id, i.invoiceno, p.name AS party_name
       FROM dai_inward i
       LEFT JOIN dai_party p ON (i.party = CAST(p.id AS CHAR) OR i.party = p.name) AND p.company = 1
       WHERE i.id = ?`,
      [inwId]
    ))[0];
    recordResult(
      'Rule B Verified: Past transaction JOIN dai_party still displays party name after soft delete',
      histInward && histInward.party_name === partyName
    );

    // Cleanup mock inward & party
    await q(`DELETE FROM dai_inward WHERE id = ?`, [inwId]);
    await q(`DELETE FROM dai_party WHERE id = ?`, [partyId]);

    // -------------------------------------------------------------
    // TEST 3: Category Soft Delete & Categorize Tree
    // -------------------------------------------------------------
    console.log('\n--- 3. Category Soft Delete & Tree Filter ---');
    const catName = `CatTest_${Date.now()}`;
    const cIns = await q(`INSERT INTO category (name, parent, company, deleted) VALUES (?, 0, 1, 0)`, [catName]);
    const catId = cIns.insertId;

    const catListBefore = await q(`SELECT id, name FROM category WHERE company = 1 AND (deleted = 0 OR deleted IS NULL)`);
    recordResult('Category appears in active list', catListBefore.some((c) => c.id === catId));

    await q(`UPDATE category SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [catId]);

    const catListAfter = await q(`SELECT id, name FROM category WHERE company = 1 AND (deleted = 0 OR deleted IS NULL)`);
    recordResult('Soft-deleted category disappears from active list', !catListAfter.some((c) => c.id === catId));

    await q(`DELETE FROM category WHERE id = ?`, [catId]);

    // -------------------------------------------------------------
    // TEST 4: Lab, Origin, Shipping Soft Delete & Options
    // -------------------------------------------------------------
    console.log('\n--- 4. Lab, Origin, Shipping Dropdowns ---');
    const labName = `LabTest_${Date.now()}`;
    const lIns = await q(`INSERT INTO dai_lab (lab, company, deleted) VALUES (?, 1, 0)`, [labName]);
    const labId = lIns.insertId;
    await q(`UPDATE dai_lab SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [labId]);
    const labs = await q(`SELECT id, lab FROM dai_lab WHERE company = 1 AND (deleted = 0 OR deleted IS NULL)`);
    recordResult('Soft-deleted lab disappears from active list', !labs.some((l) => l.id === labId));
    await q(`DELETE FROM dai_lab WHERE id = ?`, [labId]);

    const origName = `OrigTest_${Date.now()}`;
    const oIns = await q(`INSERT INTO dai_origin (name, company, deleted) VALUES (?, 1, 0)`, [origName]);
    const origId = oIns.insertId;
    await q(`UPDATE dai_origin SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [origId]);
    const origins = await q(`SELECT id, name FROM dai_origin WHERE company = 1 AND (deleted = 0 OR deleted IS NULL)`);
    recordResult('Soft-deleted origin disappears from active list', !origins.some((o) => o.id === origId));
    await q(`DELETE FROM dai_origin WHERE id = ?`, [origId]);

    const shipName = `ShipTest_${Date.now()}`;
    const sIns = await q(`INSERT INTO dai_shipping (name, company, deleted) VALUES (?, 1, 0)`, [shipName]);
    const shipId = sIns.insertId;
    await q(`UPDATE dai_shipping SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [shipId]);
    const shippings = await q(`SELECT id, name FROM dai_shipping WHERE company = 1 AND (deleted = 0 OR deleted IS NULL)`);
    recordResult('Soft-deleted shipping disappears from active list', !shippings.some((s) => s.id === shipId));
    await q(`DELETE FROM dai_shipping WHERE id = ?`, [shipId]);

    // -------------------------------------------------------------
    // TEST 5: User & Role Listings
    // -------------------------------------------------------------
    console.log('\n--- 5. User & Role Listings ---');
    const uName = `user_list_test_${Date.now()}`;
    const uIns = await q(`INSERT INTO user (user_name, pass, roll, deleted) VALUES (?, 'pass', 2, 0)`, [uName]);
    const uId = uIns.insertId;
    await q(`UPDATE user SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE user_id = ? AND (deleted = 0 OR deleted IS NULL)`, [uId]);
    const users = await q(`SELECT user_id, user_name FROM user WHERE (deleted = 0 OR deleted IS NULL)`);
    recordResult('Soft-deleted user disappears from user list', !users.some((u) => u.user_id === uId));
    await q(`DELETE FROM user WHERE user_id = ?`, [uId]);

    const rName = `role_list_test_${Date.now()}`;
    const rIns = await q(`INSERT INTO roll (name, resource, date, company, deleted) VALUES (?, '[]', NOW(), '[]', 0)`, [rName]);
    const rId = rIns.insertId;
    await q(`UPDATE roll SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [rId]);
    const roles = await q(`SELECT id, name FROM roll WHERE (deleted = 0 OR deleted IS NULL)`);
    recordResult('Soft-deleted role disappears from role list', !roles.some((r) => r.id === rId));
    await q(`DELETE FROM roll WHERE id = ?`, [rId]);

    // -------------------------------------------------------------
    // TEST 6: Inventory Autocomplete & Suggestions
    // -------------------------------------------------------------
    console.log('\n--- 6. Inventory Suggestions & Autocomplete ---');
    const testSku = `SUGG_TEST_${Date.now()}`;
    const prodIns = await q(`INSERT INTO dai_product (sku, company, visibility, deleted) VALUES (?, 1, 1, 0)`, [testSku]);
    const prodId = prodIns.insertId;
    await q(`INSERT INTO dai_product_value (product_id, shape, deleted) VALUES (?, 'Round', 0)`, [prodId]);

    const { getInventorySuggestions } = require('../routes/product/inventorySuggestService.js');
    const suggBefore = await getInventorySuggestions(testSku, 5, 1);
    const foundSuggBefore = suggBefore.some((s) => s.value === testSku);
    recordResult('New stone appears in inventory suggestions autocomplete', foundSuggBefore);

    // Soft delete the stone
    await q(`UPDATE dai_product SET deleted = 1, deleted_at = NOW(), deleted_by = 1 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [prodId]);

    const suggAfter = await getInventorySuggestions(testSku, 5, 1);
    const foundSuggAfter = suggAfter.some((s) => s.value === testSku);
    recordResult('Soft-deleted stone disappears from inventory suggestions autocomplete', !foundSuggAfter);

    // Cleanup test stone
    await q(`DELETE FROM dai_product_value WHERE product_id = ?`, [prodId]);
    await q(`DELETE FROM dai_product WHERE id = ?`, [prodId]);

    console.log('\n=== GROUP 1 TEST SUMMARY ===');
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`${totalPassed} / ${results.length} tests passed.`);

    if (totalPassed === results.length) {
      console.log('🎉 ALL GROUP 1 TESTS PASSED PERFECTLY!');
    } else {
      console.error('⚠️ SOME GROUP 1 TESTS FAILED.');
    }
  } catch (err) {
    console.error('Group 1 Test Error:', err);
  } finally {
    process.exit(0);
  }
}

runGroup1Tests();

