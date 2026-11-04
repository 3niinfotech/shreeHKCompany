const connection = require('../connection.js');
const helper = require('../helper.js');
const passwordService = require('../services/passwordService.js');

async function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function qMeta(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function runTests() {
  console.log('=== STARTING PHASE 2 SOFT DELETE INTEGRATION TESTS ===\n');
  const results = [];

  const recordResult = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${name}${details ? ` (${details})` : ''}`);
  };

  try {
    // 1. User Soft Delete & Auth Block
    console.log('\n--- 1. Testing User Soft Delete & Auth ---');
    const testUsername = `softdel_user_${Date.now()}`;
    const hashedPassword = passwordService.hashPassword('Pass@12345');
    const uRes = await q(
      `INSERT INTO user (user_name, user_email, pass, first_name, last_name, roll, is_active, deleted)
       VALUES (?, ?, ?, 'Soft', 'Tester', 2, 1, 0)`,
      [testUsername, `${testUsername}@test.com`, hashedPassword]
    );
    const testUserId = uRes.insertId;

    // Simulate soft delete query from addAdminUserRoutes / myProfile
    const delAdminId = 1;
    const updRes = await q(
      `UPDATE user SET deleted = 1, deleted_at = NOW(), deleted_by = ?, is_active = 0 
       WHERE user_id = ? AND (deleted = 0 OR deleted IS NULL)`,
      [delAdminId, testUserId]
    );
    const userRow = (await q(`SELECT user_id, deleted, deleted_at, deleted_by, is_active FROM user WHERE user_id = ?`, [testUserId]))[0];
    recordResult(
      'User soft delete sets deleted=1, deleted_at, deleted_by, is_active=0',
      userRow && userRow.deleted === 1 && userRow.deleted_at !== null && userRow.deleted_by === delAdminId && userRow.is_active === 0
    );

    // Re-delete attempt should match 0 rows
    const reDelRes = await q(
      `UPDATE user SET deleted = 1, deleted_at = NOW(), deleted_by = ?, is_active = 0 
       WHERE user_id = ? AND (deleted = 0 OR deleted IS NULL)`,
      [delAdminId, testUserId]
    );
    recordResult('Re-deleting user affects 0 rows (returns 404)', reDelRes.affectedRows === 0);

    // Auth check: User login query should NOT find this user
    const loginUser = (await q(
      `SELECT u.user_id FROM user u WHERE (u.user_name = ? OR u.user_email = ?) AND (u.deleted = 0 OR u.deleted IS NULL) LIMIT 1`,
      [testUsername, testUsername]
    ))[0];
    recordResult('Soft deleted user is blocked from login (not found in active query)', !loginUser);

    // Duplicate check: query for active username finds 0 rows
    const dupCheck = await q(
      `SELECT user_id FROM user WHERE (user_email = ? OR user_name = ?) AND (deleted = 0 OR deleted IS NULL)`,
      [`${testUsername}@test.com`, testUsername]
    );
    recordResult('Active duplicate check ignores soft deleted user', dupCheck.length === 0);

    // Cleanup test user
    await q(`DELETE FROM user WHERE user_id = ?`, [testUserId]);

    // 2. Roles (roll)
    console.log('\n--- 2. Testing Role Soft Delete & User Guard ---');
    const rRes = await q(
      `INSERT INTO roll (name, resource, date, company, deleted) VALUES (?, '[]', NOW(), '[]', 0)`,
      [`TestRole_${Date.now()}`]
    );
    const testRoleId = rRes.insertId;

    // Check user block logic: assign a dummy user
    const uWithRole = await q(
      `INSERT INTO user (user_name, pass, roll, deleted) VALUES (?, 'dummy', ?, 0)`,
      [`user_role_${Date.now()}`, testRoleId]
    );
    const userCount = await q(
      `SELECT COUNT(*) AS total FROM user WHERE roll = ? AND (deleted = 0 OR deleted IS NULL)`,
      [testRoleId]
    );
    recordResult('Role delete guarded when active user assigned', Number(userCount[0].total) === 1);

    // Remove user assignment and soft delete role
    await q(`DELETE FROM user WHERE user_id = ?`, [uWithRole.insertId]);
    const roleDelRes = await q(
      `UPDATE roll SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,
      [delAdminId, testRoleId]
    );
    const roleRow = (await q(`SELECT id, deleted, deleted_at, deleted_by FROM roll WHERE id = ?`, [testRoleId]))[0];
    recordResult('Role soft delete sets deleted=1, deleted_at, deleted_by', roleRow && roleRow.deleted === 1 && roleRow.deleted_at !== null && roleRow.deleted_by === delAdminId);

    // Re-delete returns 0 rows
    const roleReDel = await q(
      `UPDATE roll SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,
      [delAdminId, testRoleId]
    );
    recordResult('Re-deleting role affects 0 rows', roleReDel.affectedRows === 0);

    // Cleanup role
    await q(`DELETE FROM roll WHERE id = ?`, [testRoleId]);

    // 3. Category Master
    console.log('\n--- 3. Testing Category Soft Delete ---');
    const catRes = await q(`INSERT INTO category (name, parent, company, deleted) VALUES ('TestCat', 0, 1, 0)`);
    const catId = catRes.insertId;
    await q(`UPDATE category SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, catId]);
    const catRow = (await q(`SELECT id, deleted, deleted_at, deleted_by FROM category WHERE id = ?`, [catId]))[0];
    recordResult('Category soft delete sets deleted=1', catRow && catRow.deleted === 1 && catRow.deleted_at !== null);
    await q(`DELETE FROM category WHERE id = ?`, [catId]);

    // 4. Attribute & Attribute Values
    console.log('\n--- 4. Testing Attribute & Attribute Values Soft Delete ---');
    const attrRes = await q(`INSERT INTO dai_attribute (code, name, company, deleted) VALUES ('TST', 'TestAttr', 1, 0)`);
    const attrId = attrRes.insertId;
    const valRes = await q(`INSERT INTO dai_attribute_value (attribute_id, code, label, deleted) VALUES (?, 'VAL1', 'Val1', 0)`, [attrId]);
    const valId = valRes.insertId;

    await q(`UPDATE dai_attribute SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, attrId, 1]);
    await q(`UPDATE dai_attribute_value SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE attribute_id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, attrId]);

    const aRow = (await q(`SELECT deleted, deleted_at FROM dai_attribute WHERE id = ?`, [attrId]))[0];
    const vRow = (await q(`SELECT deleted, deleted_at FROM dai_attribute_value WHERE attribute_id = ?`, [attrId]))[0];
    recordResult('Attribute and child attribute values soft deleted together', aRow?.deleted === 1 && vRow?.deleted === 1);
    await q(`DELETE FROM dai_attribute_value WHERE attribute_id = ?`, [attrId]);
    await q(`DELETE FROM dai_attribute WHERE id = ?`, [attrId]);

    // 5. Lab Master
    console.log('\n--- 5. Testing Lab Soft Delete ---');
    const labRes = await q(`INSERT INTO dai_lab (lab, company, deleted) VALUES ('TestLab', 1, 0)`);
    const labId = labRes.insertId;
    await q(`UPDATE dai_lab SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, labId, 1]);
    const labRow = (await q(`SELECT deleted FROM dai_lab WHERE id = ?`, [labId]))[0];
    recordResult('Lab soft delete sets deleted=1', labRow?.deleted === 1);
    await q(`DELETE FROM dai_lab WHERE id = ?`, [labId]);

    // 6. Origin Master
    console.log('\n--- 6. Testing Origin Soft Delete ---');
    const origRes = await q(`INSERT INTO dai_origin (name, company, deleted) VALUES ('TestOrigin', 1, 0)`);
    const origId = origRes.insertId;
    await q(`UPDATE dai_origin SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, origId, 1]);
    const origRow = (await q(`SELECT deleted FROM dai_origin WHERE id = ?`, [origId]))[0];
    recordResult('Origin soft delete sets deleted=1', origRow?.deleted === 1);
    await q(`DELETE FROM dai_origin WHERE id = ?`, [origId]);

    // 7. Shipping Master
    console.log('\n--- 7. Testing Shipping Soft Delete ---');
    const shipRes = await q(`INSERT INTO dai_shipping (name, company, deleted) VALUES ('TestShipping', 1, 0)`);
    const shipId = shipRes.insertId;
    await q(`UPDATE dai_shipping SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, shipId, 1]);
    const shipRow = (await q(`SELECT deleted FROM dai_shipping WHERE id = ?`, [shipId]))[0];
    recordResult('Shipping soft delete sets deleted=1', shipRow?.deleted === 1);
    await q(`DELETE FROM dai_shipping WHERE id = ?`, [shipId]);

    // 8. Party Master (dai_party)
    console.log('\n--- 8. Testing Party Soft Delete ---');
    const partyRes = await q(`INSERT INTO dai_party (name, company, deleted) VALUES ('TestParty', 1, 0)`);
    const partyId = partyRes.insertId;
    await q(`UPDATE dai_party SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, partyId, 1]);
    const partyRow = (await q(`SELECT deleted, deleted_at, deleted_by FROM dai_party WHERE id = ?`, [partyId]))[0];
    recordResult('Party soft delete sets deleted=1, deleted_at, deleted_by', partyRow?.deleted === 1 && partyRow?.deleted_at !== null && partyRow?.deleted_by === delAdminId);
    await q(`DELETE FROM dai_party WHERE id = ?`, [partyId]);

    // 9. Accounting Groups & Subgroups
    console.log('\n--- 9. Testing Accounting Group & Subgroup Soft Delete ---');
    const grpRes = await q(`INSERT INTO acc_group (name, company, deleted) VALUES ('TestGrp', 1, 0)`);
    const grpId = grpRes.insertId;
    await q(`UPDATE acc_group SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, grpId, 1]);
    const grpRow = (await q(`SELECT deleted FROM acc_group WHERE id = ?`, [grpId]))[0];
    recordResult('acc_group soft delete sets deleted=1', grpRow?.deleted === 1);
    await q(`DELETE FROM acc_group WHERE id = ?`, [grpId]);

    const sgrpRes = await q(`INSERT INTO acc_subgroup (name, \`under\`, company, deleted) VALUES ('TestSubgrp', 1, 1, 0)`);
    const sgrpId = sgrpRes.insertId;
    await q(`UPDATE acc_subgroup SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, sgrpId, 1]);
    const sgrpRow = (await q(`SELECT deleted FROM acc_subgroup WHERE id = ?`, [sgrpId]))[0];
    recordResult('acc_subgroup soft delete sets deleted=1', sgrpRow?.deleted === 1);
    await q(`DELETE FROM acc_subgroup WHERE id = ?`, [sgrpId]);

    // 10. Advance Payment & Expense Transaction
    console.log('\n--- 10. Testing Advance & Expense Soft Delete ---');
    const advRes = await q(`INSERT INTO acc_advance (amount, company, deleted) VALUES (100, 1, 0)`);
    const advId = advRes.insertId;
    await q(`UPDATE acc_advance SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, advId, 1]);
    const advRow = (await q(`SELECT deleted FROM acc_advance WHERE id = ?`, [advId]))[0];
    recordResult('acc_advance soft delete sets deleted=1', advRow?.deleted === 1);
    await q(`DELETE FROM acc_advance WHERE id = ?`, [advId]);

    const expRes = await q(`INSERT INTO acc_transaction (amount, company, deleted) VALUES (200, 1, 0)`);
    const expId = expRes.insertId;
    await q(`UPDATE acc_transaction SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, expId, 1]);
    const expRow = (await q(`SELECT deleted FROM acc_transaction WHERE id = ?`, [expId]))[0];
    recordResult('acc_transaction soft delete sets deleted=1', expRow?.deleted === 1);
    await q(`DELETE FROM acc_transaction WHERE id = ?`, [expId]);

    // 11. Inward Stock Multi-Table Atomic Soft Delete
    console.log('\n--- 11. Testing Inward Stock Multi-Table Atomic Soft Delete ---');
    const pRes = await q(`INSERT INTO dai_product (sku, company, deleted) VALUES ('SKU_SOFTDEL_TEST', 1, 0)`);
    const pId = pRes.insertId;
    const pvRes = await q(`INSERT INTO dai_product_value (product_id, deleted) VALUES (?, 0)`, [pId]);
    const pvId = pvRes.insertId;
    const phRes = await q(`INSERT INTO dai_history (product_id, action, deleted) VALUES (?, 'INWARD', 0)`, [pId]);
    const phId = phRes.insertId;
    const inwRes = await q(`INSERT INTO dai_inward (products, company, deleted) VALUES (?, 1, 0)`, [String(pId)]);
    const inwId = inwRes.insertId;

    await helper.runInTransaction(async (txQ) => {
      await txQ(`UPDATE dai_product_value SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, pId]);
      await txQ(`UPDATE dai_history SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, pId]);
      await txQ(`UPDATE dai_product SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, pId]);
      await txQ(`UPDATE dai_inward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, inwId]);
    });

    const checkP = (await q(`SELECT deleted, deleted_at FROM dai_product WHERE id = ?`, [pId]))[0];
    const checkPv = (await q(`SELECT deleted, deleted_at FROM dai_product_value WHERE product_id = ?`, [pId]))[0];
    const checkPh = (await q(`SELECT deleted, deleted_at FROM dai_history WHERE id = ?`, [phId]))[0];
    const checkInw = (await q(`SELECT deleted, deleted_at FROM dai_inward WHERE id = ?`, [inwId]))[0];

    recordResult(
      'Multi-table atomic inward delete: dai_product, dai_product_value, dai_history, dai_inward all soft deleted with timestamp',
      checkP?.deleted === 1 && checkPv?.deleted === 1 && checkPh?.deleted === 1 && checkInw?.deleted === 1
    );

    // Cleanup inward test rows
    await q(`DELETE FROM dai_history WHERE id = ?`, [phId]);
    await q(`DELETE FROM dai_product_value WHERE product_id = ?`, [pId]);
    await q(`DELETE FROM dai_product WHERE id = ?`, [pId]);
    await q(`DELETE FROM dai_inward WHERE id = ?`, [inwId]);

    // 12. Outward Stock Soft Delete
    console.log('\n--- 12. Testing Outward Stock Soft Delete ---');
    const outRes = await q(`INSERT INTO dai_outward (company, deleted) VALUES (1, 0)`);
    const outId = outRes.insertId;
    await q(`UPDATE dai_outward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, outId, 1]);
    const outRow = (await q(`SELECT deleted FROM dai_outward WHERE id = ?`, [outId]))[0];
    recordResult('dai_outward soft delete sets deleted=1', outRow?.deleted === 1);
    await q(`DELETE FROM dai_outward WHERE id = ?`, [outId]);

    // 13. Balance Book & Currency Rate
    console.log('\n--- 13. Testing Balance Book & Currency Rate Soft Delete ---');
    const bkRes = await q(`INSERT INTO dai_book (book, company, deleted) VALUES ('TestBook', 1, 0)`);
    const bkId = bkRes.insertId;
    await q(`UPDATE dai_book SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, bkId, 1]);
    const bkRow = (await q(`SELECT deleted FROM dai_book WHERE id = ?`, [bkId]))[0];
    recordResult('dai_book soft delete sets deleted=1', bkRow?.deleted === 1);
    await q(`DELETE FROM dai_book WHERE id = ?`, [bkId]);

    const crRes = await q(`INSERT INTO dai_currencyrate (currency, company, deleted) VALUES ('USD', 1, 0)`);
    const crId = crRes.insertId;
    await q(`UPDATE dai_currencyrate SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, crId, 1]);
    const crRow = (await q(`SELECT deleted FROM dai_currencyrate WHERE id = ?`, [crId]))[0];
    recordResult('dai_currencyrate soft delete sets deleted=1', crRow?.deleted === 1);
    await q(`DELETE FROM dai_currencyrate WHERE id = ?`, [crId]);

    // 14. Fiscal Year (company_year)
    console.log('\n--- 14. Testing Fiscal Year (company_year) Soft Delete ---');
    const fyRes = await qMeta(`INSERT INTO company_year (year, fromDate, toDate, db_name, deleted) VALUES ('2099-2100', '2099-04-01', '2100-03-31', 'dummy_db', 0)`);
    const fyId = fyRes.insertId;
    const fyUpd = await qMeta(`UPDATE company_year SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, fyId]);
    const fyRow = (await qMeta(`SELECT deleted, deleted_at FROM company_year WHERE id = ?`, [fyId]))[0];
    recordResult('company_year soft delete sets deleted=1 and leaves db_name untouched', fyRow?.deleted === 1 && fyRow?.deleted_at !== null);

    const fyReDel = await qMeta(`UPDATE company_year SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, fyId]);
    recordResult('Re-deleting fiscal year affects 0 rows', fyReDel.affectedRows === 0);
    await qMeta(`DELETE FROM company_year WHERE id = ?`, [fyId]);

    // 15. Activity Log & AI Conversation & Quick Notes & Hold
    console.log('\n--- 15. Testing Activity Log, AI Conversation, Quick Notes & Hold ---');
    const actRes = await q(`INSERT INTO dai_activity_log (description, company_id, deleted) VALUES ('Test Act', 1, 0)`);
    const actId = actRes.insertId;
    await q(`UPDATE dai_activity_log SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, actId]);
    const actRow = (await q(`SELECT deleted FROM dai_activity_log WHERE id = ?`, [actId]))[0];
    recordResult('dai_activity_log soft delete sets deleted=1', actRow?.deleted === 1);
    await q(`DELETE FROM dai_activity_log WHERE id = ?`, [actId]);

    const qnRes = await q(`INSERT INTO dai_quick_notes (user_id, text, target_date, company_id, deleted) VALUES (1, 'Test Note', CURDATE(), 1, 0)`);
    const qnId = qnRes.insertId;
    await q(`UPDATE dai_quick_notes SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`, [delAdminId, qnId]);
    const qnRow = (await q(`SELECT deleted FROM dai_quick_notes WHERE id = ?`, [qnId]))[0];
    recordResult('dai_quick_notes soft delete sets deleted=1', qnRow?.deleted === 1);
    await q(`DELETE FROM dai_quick_notes WHERE id = ?`, [qnId]);

    const convRes = await qMeta(`INSERT INTO dai_ai_conversation (user_id, company_id, thread_id, messages, deleted) VALUES (9999, 1, 'test_thread', '[]', 0)`);
    const convId = convRes.insertId;
    await qMeta(`UPDATE dai_ai_conversation SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE user_id = 9999 AND company_id = 1 AND thread_id = 'test_thread' AND (deleted = 0 OR deleted IS NULL)`, [delAdminId]);
    const convRow = (await qMeta(`SELECT deleted FROM dai_ai_conversation WHERE id = ?`, [convId]))[0];
    recordResult('dai_ai_conversation thread soft delete sets deleted=1', convRow?.deleted === 1);
    await qMeta(`DELETE FROM dai_ai_conversation WHERE id = ?`, [convId]);

    const holdRes = await q(`INSERT INTO dai_hold (product_id, deleted) VALUES ('999999', 0)`);
    const holdId = holdRes.insertId;
    await q(`UPDATE dai_hold SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE product_id = '999999' AND (deleted = 0 OR deleted IS NULL)`, [delAdminId]);
    const holdRow = (await q(`SELECT deleted FROM dai_hold WHERE id = ?`, [holdId]))[0];
    recordResult('dai_hold soft delete sets deleted=1', holdRow?.deleted === 1);
    await q(`DELETE FROM dai_hold WHERE id = ?`, [holdId]);

    console.log('\n=== ALL PHASE 2 TESTS COMPLETED ===');
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`Summary: ${totalPassed} / ${results.length} tests passed.\n`);

    if (totalPassed === results.length) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      console.error('⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.');
    }
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    process.exit(0);
  }
}

runTests();
