/**
 * runPermanentDeleteTests.js
 * Comprehensive automated test suite for Permanent Delete (Company & Branch)
 * Strictly executed on `shreehkweb_snj2024_test`.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const connection = require("../connection.js");
const permService = require("../services/permanentDeleteService.js");

const TEST_DB = "shreehkweb_snj2024_test";

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function runTests() {
  console.log("=== STARTING PERMANENT DELETE TEST SUITE ===");
  console.log("Database target:", TEST_DB);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const nonce = Date.now();
  const branchName = `BRANCH_ALPHA_${nonce}`;
  const comp1Name = `CORP_DIAMONDS_${nonce}`;
  const comp2Name = `CORP_JEWELS_${nonce}`;
  const skuExclusive = `SKU-EXCL-${nonce}`;
  const skuShared = `SKU-SHAR-${nonce}`;

  try {
    // 1. Create a temporary test branch
    console.log("\n--- Setting up Test Data ---");
    const branchRes = await query(
      "INSERT INTO branch (name, shortcutName, status) VALUES (?, ?, 1)",
      [branchName, "BAL"]
    );
    const testBranchId = branchRes.insertId;
    console.log("Created test branch id:", testBranchId);

    // 2. Create two test companies under that branch
    const comp1Res = await query(
      "INSERT INTO company (name, shortcutName, branch_id) VALUES (?, ?, ?)",
      [comp1Name, "CDA", testBranchId]
    );
    const comp1Id = comp1Res.insertId;

    const comp2Res = await query(
      "INSERT INTO company (name, shortcutName, branch_id) VALUES (?, ?, ?)",
      [comp2Name, "CJA", testBranchId]
    );
    const comp2Id = comp2Res.insertId;
    console.log("Created test companies:", { comp1Id, comp2Id });

    // 3. Seed transactional data for comp1:
    // a) Exclusive product & GIA row
    await query(
      "INSERT INTO dai_product (sku, company, polish_carat) VALUES (?, ?, 1.25)",
      [skuExclusive, comp1Id]
    );
    const prodRows = await query("SELECT id FROM dai_product WHERE sku = ?", [skuExclusive]);
    const prodId = prodRows[0].id;

    await query(
      "INSERT INTO dai_history (product_id, sku, action) VALUES (?, ?, ?)",
      [prodId, skuExclusive, "CREATED_FOR_TEST"]
    );
    await query(
      "INSERT INTO dai_gia (sku, report, value) VALUES (?, ?, ?)",
      [skuExclusive, "12345678", '{"carat":1.25}']
    );

    // b) Shared SKU product: present in BOTH comp1 and comp2
    await query(
      "INSERT INTO dai_product (sku, company, polish_carat) VALUES (?, ?, 2.50)",
      [skuShared, comp1Id]
    );
    await query(
      "INSERT INTO dai_product (sku, company, polish_carat) VALUES (?, ?, 2.50)",
      [skuShared, comp2Id]
    );
    await query(
      "INSERT INTO dai_gia (sku, report, value) VALUES (?, ?, ?)",
      [skuShared, "87654321", '{"carat":2.50}']
    );

    // c) Inward and Outward
    await query(
      "INSERT INTO dai_inward (company, invoiceno) VALUES (?, ?)",
      [comp1Id, "INW-TEST-001"]
    );
    await query(
      "INSERT INTO dai_outward (company, invoiceno) VALUES (?, ?)",
      [comp1Id, "OUT-TEST-001"]
    );

    // d) Meta tables: user_track (company name string) & notification (company id int)
    await query(
      "INSERT INTO user_track (company, user, action) VALUES (?, ?, ?)",
      [comp1Name, "test-admin", "TEST_ACTION"]
    );
    await query(
      "INSERT INTO notification (company, message) VALUES (?, ?)",
      [comp1Id, "Test notification"]
    );

    // e) Shared inter-company transfer between comp1 and comp2
    const trfRes = await query(
      "INSERT INTO dai_company_transfer (from_company_id, to_company_id, transfer_no) VALUES (?, ?, ?)",
      [comp1Id, comp2Id, "TRF-TEST-001"]
    );
    await query(
      "INSERT INTO dai_company_transfer_item (transfer_id, sku) VALUES (?, ?)",
      [trfRes.insertId, skuExclusive]
    );
    console.log("Seeded products, history, exclusive & shared gia, inward, outward, user_track, notification, transfer.");

    // --- TEST 1: Impact Preview ---
    console.log("\n--- TEST 1: Impact Preview ---");
    const impact = await permService.getCompanyDeleteImpact(comp1Id);
    assert(impact.company.name === comp1Name, "Impact identified correct company");
    assert(impact.totalRows >= 7, `Impact counted total affected rows correctly (${impact.totalRows} >= 7)`);
    assert(impact.sharedTransfers?.count >= 1, "Impact detected shared inter-company transfer");

    // --- TEST 2: Session Company Safety Block ---
    console.log("\n--- TEST 2: Session Safety Blocks ---");
    let sessionBlocked = false;
    try {
      await permService.executePermanentDeleteCompany({
        companyId: comp1Id,
        sessionCompanyId: comp1Id, // same company logged in
        reqInfo: { userId: 1, userName: "TestAdmin", userRole: "Super Admin" },
      });
    } catch (err) {
      sessionBlocked = err.message.includes("Cannot delete the company you are currently logged into");
    }
    assert(sessionBlocked, "Blocked deletion of active session company");

    let branchSessionBlocked = false;
    try {
      await permService.executePermanentDeleteBranch({
        branchId: testBranchId,
        sessionCompanyBranchId: testBranchId, // session company belongs to this branch
        reqInfo: { userId: 1, userName: "TestAdmin", userRole: "Super Admin" },
      });
    } catch (err) {
      branchSessionBlocked = err.message.includes("Cannot delete the branch your current session belongs to");
    }
    assert(branchSessionBlocked, "Blocked deletion of active session branch");

    // --- TEST 3: Rate Limiter (Failures Only) ---
    console.log("\n--- TEST 3: Failure Rate Limiter ---");
    const testUserId = 999999;
    permService.clearFailedAttempts(testUserId);
    assert(!permService.isRateLimited(testUserId), "Initially not rate-limited");
    for (let i = 1; i <= 5; i++) {
      permService.recordFailedAttempt(testUserId);
    }
    assert(permService.isRateLimited(testUserId), "Rate limited after 5 failed attempts (HTTP 429 triggered)");
    permService.clearFailedAttempts(testUserId);
    assert(!permService.isRateLimited(testUserId), "Rate limit cleared on success");

    // --- TEST 4: Single Company Permanent Delete & GIA Isolation ---
    console.log("\n--- TEST 4: Single Company Permanent Delete & GIA Rule ---");
    const delResult = await permService.executePermanentDeleteCompany({
      companyId: comp1Id,
      sessionCompanyId: 999998, // different session company
      reqInfo: {
        userId: 1,
        userName: "TestAdmin",
        userRole: "Super Admin",
        companyId: 999998,
        ip: "127.0.0.1",
        userAgent: "NodeTest",
      },
    });

    assert(delResult.total >= 7, `Deleted records count returned (${delResult.total} >= 7)`);

    // Verify comp1 is gone from company table
    const comp1Check = await query("SELECT id FROM company WHERE id = ?", [comp1Id]);
    assert(comp1Check.length === 0, "Company record deleted from company table");

    // Verify exclusive product is gone
    const prodCheck = await query("SELECT id FROM dai_product WHERE id = ?", [prodId]);
    assert(prodCheck.length === 0, "Exclusive product record deleted");

    // Verify exclusive GIA is gone
    const exclGiaCheck = await query("SELECT id FROM dai_gia WHERE sku = ?", [skuExclusive]);
    assert(exclGiaCheck.length === 0, "Exclusive GIA row deleted");

    // Mandatory Rule 2: Shared GIA must SURVIVE because comp2 still has product with skuShared!
    const sharedGiaCheck = await query("SELECT id FROM dai_gia WHERE sku = ?", [skuShared]);
    assert(sharedGiaCheck.length > 0, "Shared GIA row SURVIVED because other company holds that SKU");

    // Verify audit log has PERMANENT_DELETE
    const auditRows = await query(
      "SELECT id, action_type, record_reference FROM dai_activity_log WHERE record_id = ? AND action_type = 'PERMANENT_DELETE' ORDER BY id DESC LIMIT 1",
      [String(comp1Id)]
    );
    assert(auditRows.length > 0, "PERMANENT_DELETE audit entry preserved in dai_activity_log");

    // --- TEST 5: Multi-Company Branch Delete in ONE Transaction ---
    console.log("\n--- TEST 5: Branch Delete in ONE Transaction ---");
    // comp2 is still under testBranchId
    const branchDelResult = await permService.executePermanentDeleteBranch({
      branchId: testBranchId,
      sessionCompanyBranchId: 999999, // different branch
      reqInfo: {
        userId: 1,
        userName: "TestAdmin",
        userRole: "Super Admin",
        companyId: 999998,
        ip: "127.0.0.1",
        userAgent: "NodeTest",
      },
    });

    assert(branchDelResult.companiesDeleted.includes(comp2Name), "Cleaned up remaining companies under branch");

    const branchCheck = await query("SELECT id FROM branch WHERE id = ?", [testBranchId]);
    assert(branchCheck.length === 0, "Branch record deleted from branch table");

    const comp2Check = await query("SELECT id FROM company WHERE id = ?", [comp2Id]);
    assert(comp2Check.length === 0, "Company Beta deleted along with branch");

    // Now that comp2 is also deleted, shared GIA row was deleted with comp2!
    const sharedGiaAfterBranch = await query("SELECT id FROM dai_gia WHERE sku = ?", [skuShared]);
    assert(sharedGiaAfterBranch.length === 0, "Shared GIA row now deleted after all companies owning it are deleted");

    console.log("\n==========================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
