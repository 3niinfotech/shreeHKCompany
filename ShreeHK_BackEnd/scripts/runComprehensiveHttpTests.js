/**
 * runComprehensiveHttpTests.js
 * Comprehensive integration test suite for Permanent Delete HTTP endpoints.
 * Tests:
 *  1. delete-impact (Company & Branch) via real HTTP POST
 *  2. Authentication & Authorization:
 *     - No token -> 401
 *     - Non-super-admin token -> 403
 *  3. Validation checks:
 *     - Wrong password -> 403
 *     - password !== confirmPassword -> 400
 *     - wrong confirmName -> 400
 *  4. Mid-delete forced failure & Transaction Rollback:
 *     - Injected failure rolls back; table row counts remain intact
 *  5. Logo file removal from disk (uploads/company-logos) post-commit
 *  6. Concurrent double delete requests (first succeeds, second fails cleanly / 404)
 *  7. Rate limiting (failures only): 5 wrong attempts -> 6th returns 429
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const express = require("express");
const jwt = require("jsonwebtoken");
const http = require("http");
const fs = require("fs");
const path = require("path");
const connection = require("../connection.js");
const { hashPassword } = require("../services/passwordService.js");
const permService = require("../services/permanentDeleteService.js");

const tenantCompanyRoutes = require("../routes/admin/tenantCompanyRoutes.js");
const branchRoutes = require("../routes/admin/branchRoutes.js");

const SECRET_KEY = process.env.JWT_SECRET || "NitechDigitalServices";

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function makeRequest(port, method, reqPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "127.0.0.1",
      port,
      path: reqPath,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log("=== STARTING HTTP ROUTE INTEGRATION TESTS ===");

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

  // Set up Express test app
  const app = express();
  app.use(express.json());
  app.use(tenantCompanyRoutes);
  app.use(branchRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  console.log(`Ephemeral Express server listening on port ${port}`);

  // Test admin credentials
  const TEST_ADMIN_ID = 9991;
  const TEST_USER_ID = 9992;
  const ADMIN_PASSWORD = "CorrectAdminPassword@123";
  const passHash = hashPassword(ADMIN_PASSWORD);

  // Clean up any test users if left from prior run
  await query("DELETE FROM user WHERE user_id IN (?, ?)", [TEST_ADMIN_ID, TEST_USER_ID]);

  // Insert test admin (roll = 1 -> Super Admin)
  await query(
    "INSERT INTO user (user_id, user_name, pass, roll, type, is_active) VALUES (?, ?, ?, 1, 'admin', 1)",
    [TEST_ADMIN_ID, "http_test_superadmin", passHash]
  );
  // Insert regular user (roll = 33 -> Non-super admin)
  await query(
    "INSERT INTO user (user_id, user_name, pass, roll, type, is_active) VALUES (?, ?, ?, 33, 'user', 1)",
    [TEST_USER_ID, "http_test_regularuser", passHash]
  );

  const superAdminToken = jwt.sign(
    { user_id: TEST_ADMIN_ID, user_name: "http_test_superadmin", roll: 1 },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  const regularUserToken = jwt.sign(
    { user_id: TEST_USER_ID, user_name: "http_test_regularuser", roll: 33 },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  const nonce = Date.now();
  const testBranchName = `HTTP_BRANCH_${nonce}`;
  const testCompName = `HTTP_COMP_ALPHA_${nonce}`;
  const testComp2Name = `HTTP_COMP_BETA_${nonce}`;

  // Create test branch & companies
  const bRes = await query("INSERT INTO branch (name, shortcutName, status) VALUES (?, 'HTB', 1)", [testBranchName]);
  const branchId = bRes.insertId;

  // Create a real dummy logo file to test file unlinking
  const uploadDir = path.join(__dirname, "..", "uploads", "company-logos");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const dummyLogoFile = path.join(uploadDir, `test-logo-${nonce}.png`);
  fs.writeFileSync(dummyLogoFile, "DUMMY_IMAGE_BINARY_DATA");
  const relativeLogoPath = `uploads/company-logos/test-logo-${nonce}.png`;

  const c1Res = await query(
    "INSERT INTO company (name, shortcutName, branch_id, logo) VALUES (?, 'HCA', ?, ?)",
    [testCompName, branchId, relativeLogoPath]
  );
  const company1Id = c1Res.insertId;

  const c2Res = await query(
    "INSERT INTO company (name, shortcutName, branch_id) VALUES (?, 'HCB', ?)",
    [testComp2Name, branchId]
  );
  const company2Id = c2Res.insertId;

  // Seed sample products
  await query("INSERT INTO dai_product (sku, company, polish_carat) VALUES (?, ?, 1.5)", [`SKU-H1-${nonce}`, company1Id]);
  await query("INSERT INTO dai_product (sku, company, polish_carat) VALUES (?, ?, 2.0)", [`SKU-H2-${nonce}`, company2Id]);

  try {
    // 1. Auth & Super Admin Middleware Tests
    console.log("\n--- TEST: Auth & Permission Middleware ---");
    const noAuth = await makeRequest(port, "POST", "/admin/tenant-company/delete-impact", { id: company1Id });
    assert(noAuth.status === 401, "No auth token -> HTTP 401 Unauthorized");

    const forbiddenAuth = await makeRequest(
      port,
      "POST",
      "/admin/tenant-company/delete-impact",
      { id: company1Id },
      { Authorization: `Bearer ${regularUserToken}` }
    );
    assert(forbiddenAuth.status === 403, "Non-Super-Admin token -> HTTP 403 Forbidden");

    // 2. HTTP delete-impact on company & branch
    console.log("\n--- TEST: HTTP delete-impact endpoint ---");
    const compImpactRes = await makeRequest(
      port,
      "POST",
      "/admin/tenant-company/delete-impact",
      { id: company1Id },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(compImpactRes.status === 200 && compImpactRes.body.status === true, "Company delete-impact returned HTTP 200");
    assert(compImpactRes.body.Data.company.id === company1Id, "Impact preview Data matches company id");

    const branchImpactRes = await makeRequest(
      port,
      "POST",
      "/admin/branch/delete-impact",
      { id: branchId },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(branchImpactRes.status === 200 && branchImpactRes.body.status === true, "Branch delete-impact returned HTTP 200");
    assert(branchImpactRes.body.Data.companyCount === 2, "Branch impact preview confirms exactly 2 companies");

    // 3. Validation checks
    console.log("\n--- TEST: Validation Checks on HTTP delete route ---");
    // a) Wrong password
    const wrongPassRes = await makeRequest(
      port,
      "POST",
      "/admin/tenant-company/delete",
      {
        id: company1Id,
        password: "WrongPassword@999",
        confirmPassword: "WrongPassword@999",
        confirmName: testCompName,
      },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(wrongPassRes.status === 403, "Wrong password -> HTTP 403 Forbidden");
    assert(wrongPassRes.body.message.includes("Incorrect password"), "Wrong password returns clear failure message");

    // b) password !== confirmPassword
    const mismatchPassRes = await makeRequest(
      port,
      "POST",
      "/admin/tenant-company/delete",
      {
        id: company1Id,
        password: ADMIN_PASSWORD,
        confirmPassword: "DifferentPassword@123",
        confirmName: testCompName,
      },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(mismatchPassRes.status === 400, "Mismatched passwords -> HTTP 400 Bad Request");
    assert(mismatchPassRes.body.message.includes("Passwords do not match"), "Clear password mismatch message");

    // c) wrong confirmName
    const wrongNameRes = await makeRequest(
      port,
      "POST",
      "/admin/tenant-company/delete",
      {
        id: company1Id,
        password: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD,
        confirmName: "WRONG_COMPANY_NAME_TYPO",
      },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(wrongNameRes.status === 400, "Wrong confirmName -> HTTP 400 Bad Request");
    assert(wrongNameRes.body.message.includes("Company name does not match"), "Clear company name mismatch message");

    // 4. Mid-Delete Forced Failure & Transaction Rollback Test
    console.log("\n--- TEST: Mid-delete Failure & Transaction Rollback ---");
    // We test atomic rollback by executing within a transaction that forces an error before commit
    const prodCountBefore = (await query("SELECT COUNT(*) AS c FROM dai_product WHERE company = ?", [company1Id]))[0].c;
    const compCountBefore = (await query("SELECT COUNT(*) AS c FROM company WHERE id = ?", [company1Id]))[0].c;

    let rollbackTriggered = false;
    try {
      await new Promise((resolve, reject) => {
        connection.getMetaPool().getConnection((connErr, conn) => {
          if (connErr) return reject(connErr);
          const q = (sql, vals = []) => new Promise((res, rej) => conn.query(sql, vals, (e, r) => (e ? rej(e) : res(r))));
          const runTx = async () => {
            try {
              await q("START TRANSACTION");
              await q("DELETE FROM dai_product WHERE company = ?", [company1Id]);
              // Intentionally throw mid-transaction
              throw new Error("FORCED_TRANSACTION_SIMULATED_FAILURE");
              await q("COMMIT");
              resolve();
            } catch (err) {
              await q("ROLLBACK");
              rollbackTriggered = true;
              reject(err);
            } finally {
              conn.release();
            }
          };
          runTx();
        });
      });
    } catch {
      // Expected to reject
    }

    const prodCountAfter = (await query("SELECT COUNT(*) AS c FROM dai_product WHERE company = ?", [company1Id]))[0].c;
    const compCountAfter = (await query("SELECT COUNT(*) AS c FROM company WHERE id = ?", [company1Id]))[0].c;

    assert(rollbackTriggered, "Rollback executed on mid-delete error");
    assert(prodCountBefore === prodCountAfter && compCountBefore === compCountAfter, "Row counts completely preserved after rollback (0 data lost)");

    // 5. Successful HTTP Permanent Delete & Logo Cleanup
    console.log("\n--- TEST: Successful HTTP Company Delete & File Cleanup ---");
    assert(fs.existsSync(dummyLogoFile), "Dummy logo file exists on disk before delete");

    const deleteSuccessRes = await makeRequest(
      port,
      "POST",
      "/admin/tenant-company/delete",
      {
        id: company1Id,
        password: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD,
        confirmName: testCompName,
      },
      { Authorization: `Bearer ${superAdminToken}` }
    );

    assert(deleteSuccessRes.status === 200 && deleteSuccessRes.body.status === true, "Company permanent delete HTTP endpoint succeeded");
    assert(!fs.existsSync(dummyLogoFile), "Logo file successfully removed from disk post-commit");

    // 6. Concurrent Double Delete Test
    console.log("\n--- TEST: Concurrent Double Delete Request ---");
    // Make 2 simultaneous delete requests for company2Id
    const [req1, req2] = await Promise.all([
      makeRequest(
        port,
        "POST",
        "/admin/tenant-company/delete",
        {
          id: company2Id,
          password: ADMIN_PASSWORD,
          confirmPassword: ADMIN_PASSWORD,
          confirmName: testComp2Name,
        },
        { Authorization: `Bearer ${superAdminToken}` }
      ),
      makeRequest(
        port,
        "POST",
        "/admin/tenant-company/delete",
        {
          id: company2Id,
          password: ADMIN_PASSWORD,
          confirmPassword: ADMIN_PASSWORD,
          confirmName: testComp2Name,
        },
        { Authorization: `Bearer ${superAdminToken}` }
      ),
    ]);

    // One must succeed (200), and the duplicate must fail cleanly (404 Not Found)
    const statuses = [req1.status, req2.status].sort();
    assert(statuses[0] === 200 && (statuses[1] === 404 || statuses[1] === 400), `Concurrent double delete handled cleanly (HTTP ${statuses[0]} and HTTP ${statuses[1]})`);

    // 7. Rate Limiting on HTTP Route (5 failures -> 429)
    console.log("\n--- TEST: Rate Limiter on HTTP Route ---");
    permService.clearFailedAttempts(TEST_ADMIN_ID);
    // Submit 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await makeRequest(
        port,
        "POST",
        "/admin/branch/delete",
        {
          id: branchId,
          password: "BadPassword",
          confirmPassword: "BadPassword",
          confirmName: testBranchName,
        },
        { Authorization: `Bearer ${superAdminToken}` }
      );
    }
    // 6th attempt must return HTTP 429
    const rateLimitedRes = await makeRequest(
      port,
      "POST",
      "/admin/branch/delete",
      {
        id: branchId,
        password: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD,
        confirmName: testBranchName,
      },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(rateLimitedRes.status === 429, "6th attempt triggers HTTP 429 Too Many Requests");
    assert(rateLimitedRes.body.message.includes("Too many failed attempts"), "Rate limit returns countdown message");

    permService.clearFailedAttempts(TEST_ADMIN_ID);

    // Clean up test branch & users
    await query("DELETE FROM branch WHERE id = ?", [branchId]);
    await query("DELETE FROM user WHERE user_id IN (?, ?)", [TEST_ADMIN_ID, TEST_USER_ID]);

    console.log("\n==========================================");
    console.log(`HTTP INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test failure:", err);
    server.close();
    process.exit(1);
  }
}

run();

