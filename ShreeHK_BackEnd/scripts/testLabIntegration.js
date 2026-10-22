/**
 * Comprehensive Backend Unit & Integration Tests for Lab Certificate Integration
 * Covers: Vault, Mapper, Validators, Providers, LAB_ALLOW_MOCK, SSRF, 
 * Permissions, Real DB Tenant Isolation with manual SUCCESS row, Provider Test, and Cleanup.
 * 
 * Run via: node scripts/testLabIntegration.js
 */

try { require("dotenv").config(); } catch (e) {}

const assert = require("assert");
const { encryptSecret, decryptSecret, maskSecret } = require("../services/lab/labCredentialVault.js");
const { mapToErpMasters } = require("../services/lab/labMasterMapper.js");
const { buildNormalizedCertificate } = require("../services/lab/labDataNormalizer.js");
const { validateFetchReport, validateBulkFetch, validateSaveCredential } = require("../validators/lab/labValidation.js");
const GiaProvider = require("../services/lab/giaProvider.js");
const IgiProvider = require("../services/lab/igiProvider.js");
const labService = require("../services/lab/labService.js");
const labCacheRepo = require("../repositories/lab/labCacheRepository.js");
const connection = require("../connection.js");
const { hasPagePermission, getPageForApiPath } = require("../permissionHelper.js");
const { PAGE_ENTRIES } = require("../config/permissionRegistry.js");

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    const res = fn();
    if (res && typeof res.then === "function") {
      return res
        .then(() => {
          console.log(`  [PASS] ${name}`);
          passedTests++;
        })
        .catch((err) => {
          console.error(`  [FAIL] ${name}:`, err.message);
          failedTests++;
        });
    }
    console.log(`  [PASS] ${name}`);
    passedTests++;
    return Promise.resolve();
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    failedTests++;
    return Promise.resolve();
  }
}

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function runAllTests() {
  console.log("\n=======================================================");
  console.log("   SHREEHK LAB INTEGRATION EXTENDED TEST SUITE");
  console.log("=======================================================\n");

  // 1. Vault & Security Tests
  console.log("1. Credential Vault & AES-256-GCM Encryption Tests:");
  await it("encrypts and decrypts secret string accurately", () => {
    const secret = "gia_test_secret_api_key_12345!@#";
    const cipher = encryptSecret(secret);
    assert(cipher && cipher.includes(":"), "Cipher must be IV:Tag:Cipher format");
    const decrypted = decryptSecret(cipher);
    assert.strictEqual(decrypted, secret, "Decrypted text must match original secret");
  });

  await it("returns null on corrupted or tampered ciphertext", () => {
    const corrupted = "bad:hex:data";
    const decrypted = decryptSecret(corrupted);
    assert.strictEqual(decrypted, null, "Corrupted ciphertext must safely return null");
  });

  await it("masks secret for safe presentation", () => {
    assert.strictEqual(maskSecret("secret"), "••••••••");
    assert.strictEqual(maskSecret(""), "");
    assert.strictEqual(maskSecret(null), "");
  });

  // 2. Master Mapper Tests
  console.log("\n2. Lab Master Normalizer & Mapper Tests:");
  await it("maps Round Brilliant, Polish EX, Symmetry EX, and DB column names", () => {
    const res = mapToErpMasters({
      shape: "Round Brilliant",
      color: "D",
      clarity: "VVS1",
      cut: "Excellent",
      polish: "Very Good",
      symmetry: "Excellent",
      fluorescence: "None",
      measurements: "6.45 - 6.49 x 3.98 mm",
      tablePercent: 57.5,
      depthPercent: 61.8,
      carat: 1.01,
    });

    assert.strictEqual(res.mapped.shape, "ROUND");
    assert.strictEqual(res.mapped.color, "D");
    assert.strictEqual(res.mapped.clarity, "VVS1");
    assert.strictEqual(res.mapped.cut, "EX");
    assert.strictEqual(res.mapped.polish, "VG");
    assert.strictEqual(res.mapped.symmentry, "EX", "Must map to 'symmentry' column with double 'm'");
    assert.strictEqual(res.mapped.f_intensity, "NONE", "Must map to 'f_intensity'");
    assert.strictEqual(res.mapped.mesurment, "6.45 - 6.49 x 3.98", "Must map to 'mesurment' column without 'e'");
    assert.strictEqual(res.mapped.table_pc, 57.5);
    assert.strictEqual(res.mapped.depth_pc, 61.8);
    assert.strictEqual(res.mapped.carat, 1.01);
    assert.strictEqual(Object.keys(res.unmapped).length, 0, "No unmapped fields for standard values");
  });

  await it("flags unmapped non-standard terms gracefully", () => {
    const res = mapToErpMasters({
      shape: "Star Shaped Fantasy Cut",
      color: "Mystic Rainbow",
      clarity: "SI-Special",
    });

    assert(res.unmapped.shape, "Should flag non-standard shape as unmapped");
    assert(res.unmapped.color, "Should flag non-standard color as unmapped");
    assert(res.unmapped.clarity, "Should flag non-standard clarity as unmapped");
  });

  // 3. Request Validation Tests
  console.log("\n3. Request Validation Tests:");
  await it("accepts valid GIA 10-digit report number", () => {
    const v = validateFetchReport({ lab: "GIA", reportNumber: "2225891234" });
    assert(v.isValid, "Valid GIA report must pass");
    assert.strictEqual(v.data.reportNumber, "2225891234");
  });

  await it("rejects invalid non-numeric GIA report number", () => {
    const v = validateFetchReport({ lab: "GIA", reportNumber: "INVALID_ABC" });
    assert(!v.isValid, "Invalid GIA report must fail");
    assert(v.error.includes("numeric"), "Error must mention numeric requirement");
  });

  await it("validates bulk fetch constraints (min 1, max 200)", () => {
    const emptyV = validateBulkFetch({ items: [] });
    assert(!emptyV.isValid, "Empty items array must fail");

    const oversized = new Array(205).fill({ lab: "GIA", reportNumber: "2225891234" });
    const overV = validateBulkFetch({ items: oversized });
    assert(!overV.isValid, "Oversized bulk array > 200 must fail");
  });

  // 4. Provider & SSRF Tests
  console.log("\n4. Provider Adapter, LAB_ALLOW_MOCK & SSRF Tests:");
  await it("GiaProvider generates mock report when LAB_ALLOW_MOCK is true", async () => {
    const gia = new GiaProvider();
    const res = await gia.fetchByReportNumber("2225891234");
    assert.strictEqual(res.status, "SUCCESS");
    assert(res.isMock, "Mock result must strictly flag isMock = true");
    assert.strictEqual(res.data.erpMapped.report_no, "2225891234");
  });

  await it("GiaProvider rejects with 'Provider not configured' when mock is disabled and no credentials", async () => {
    const originalEnv = process.env.LAB_ALLOW_MOCK;
    try {
      process.env.LAB_ALLOW_MOCK = "false";
      const gia = new GiaProvider();
      const res = await gia.fetchByReportNumber("2225891234");
      assert.strictEqual(res.status, "ERROR");
      assert(res.error.includes("Provider not configured"), "Error must say Provider not configured");
    } finally {
      process.env.LAB_ALLOW_MOCK = originalEnv;
    }
  });

  await it("isMockAllowed requires explicit LAB_ALLOW_MOCK === 'true' (defaults to false regardless of NODE_ENV)", () => {
    const gia = new GiaProvider();
    const originalEnv = process.env.LAB_ALLOW_MOCK;
    try {
      delete process.env.LAB_ALLOW_MOCK;
      assert.strictEqual(gia.isMockAllowed(), false, "Must be false when LAB_ALLOW_MOCK is omitted");

      process.env.LAB_ALLOW_MOCK = "false";
      assert.strictEqual(gia.isMockAllowed(), false, "Must be false when LAB_ALLOW_MOCK is 'false'");

      process.env.LAB_ALLOW_MOCK = "true";
      assert.strictEqual(gia.isMockAllowed(), true, "Must be true only when LAB_ALLOW_MOCK is 'true'");
    } finally {
      process.env.LAB_ALLOW_MOCK = originalEnv;
    }
  });

  await it("SSRF validation fails safely when LAB_ALLOWED_DOMAINS is empty", () => {
    const gia = new GiaProvider();
    assert.throws(
      () => gia.validateSsrfUrl("https://malicious-domain.com/api", []),
      /No allowed lab domains configured/i
    );
  });

  await it("IgiProvider acts as disabled stub and reports not configured", async () => {
    const igi = new IgiProvider();
    assert.strictEqual(igi.isConfigured(), false, "IGI must report not configured");
    const res = await igi.fetchByReportNumber("123456789");
    assert.strictEqual(res.status, "ERROR");
    assert(res.error.includes("not configured"), "Error must indicate not configured");
  });

  // Official GIA Report Results API Sample Tests (from gialaboratory.github.io docs)
  await it("GiaProvider correctly maps official GIA Emerald Cut Dossier sample to normalized ERP model", () => {
    const gia = new GiaProvider();
    const officialDocSample = {
      data: {
        getReport: {
          report_date: "September 01, 2019",
          report_date_iso: "2019-09-01",
          report_number: "2141438171",
          report_type: "Diamond Dossier",
          report_type_code: "DD",
          industry_disclosures: {
            disclosed_source: {
              name: "South Africa",
              code: "COO0001",
            },
          },
          assets: [
            {
              asset_type_code: "REPORT_FACSIMILE_PDF",
              asset_type_description: "Report PDF",
              link: "https://api.gia.edu/v1/assets/facsimile/2141438171.pdf",
            },
            {
              asset_type_code: "CLARITY_DIAGRAM",
              asset_type_description: "Clarity Diagram",
              link: "https://api.gia.edu/v1/assets/plots/2141438171.png",
            },
            {
              asset_type_code: "PROPORTIONS_DIAGRAM",
              asset_type_description: "Proportions Diagram",
              link: "https://api.gia.edu/v1/assets/proportions/2141438171.png",
            },
          ],
          results: {
            shape_and_cutting_style: "Emerald Cut",
            measurements: "5.29 x 3.88 x 2.61 mm",
            carat_weight: "0.51 carat",
            color_grade: "E",
            clarity_grade: "VS2",
            cut_grade: null,
            polish: "Very Good",
            symmetry: "Good",
            fluorescence: "None",
            clarity_characteristics: "Cloud, Needle",
            inscriptions: "GIA 2141438171",
            report_comments: "Pinpoints are not shown.",
            proportions: {
              depth_pct: "67.2",
              table_pct: "63",
              crown_angle: "34.0",
              crown_height: "14.0",
              pavilion_angle: "41.0",
              pavilion_depth: "43.0",
              star_length: "50",
              lower_half: "80",
              girdle: "Slightly Thick to Thick",
              culet: "Very Small",
            },
          },
        },
      },
    };

    const res = gia.parseGiaResponse("2141438171", officialDocSample);
    assert.strictEqual(res.status, "SUCCESS");
    assert.strictEqual(res.isMock, false, "Live GIA response must have isMock = false");
    assert.strictEqual(res.data.reportNumber, "2141438171");
    assert.strictEqual(res.data.reportDate, "2019-09-01");
    assert.strictEqual(res.data.origin, "South Africa");

    // ERP Mapped values
    const m = res.data.erpMapped;
    assert.strictEqual(m.shape, "EMERALD");
    assert.strictEqual(m.carat, 0.51);
    assert.strictEqual(m.color, "E");
    assert.strictEqual(m.clarity, "VS2");
    assert.strictEqual(m.cut, "");
    assert.strictEqual(m.polish, "VG");
    assert.strictEqual(m.symmentry, "GD");
    assert.strictEqual(m.f_intensity, "NONE");
    assert.strictEqual(m.mesurment, "5.29 x 3.88 x 2.61");
    assert.strictEqual(m.table_pc, 63);
    assert.strictEqual(m.depth_pc, 67.2);
    assert.strictEqual(m.gridle, "Slightly Thick to Thick");

    // Assets
    assert.strictEqual(res.data.pdfReportUrl, "https://api.gia.edu/v1/assets/facsimile/2141438171.pdf");
    assert.strictEqual(res.data.plotImageUrl, "https://api.gia.edu/v1/assets/plots/2141438171.png");

    // Characteristics
    assert(res.data.keyToSymbols.includes("Cloud"));
    assert(res.data.keyToSymbols.includes("Needle"));
    assert(res.data.inscriptions.includes("GIA 2141438171"));
  });

  await it("GiaProvider correctly maps official GIA Round Brilliant sample with proportions", () => {
    const gia = new GiaProvider();
    const roundDocSample = {
      data: {
        getReport: {
          report_date: "September 13, 2021",
          report_date_iso: "2021-09-13",
          report_number: "1216809516",
          report_type: "Diamond Grading Report",
          report_type_code: "DGR",
          assets: [
            {
              asset_type_code: "REPORT_FACSIMILE_PDF",
              asset_type_description: "Report PDF",
              link: "https://api.gia.edu/v1/assets/facsimile/1216809516.pdf",
            },
            {
              asset_type_code: "CLARITY_DIAGRAM",
              asset_type_description: "Clarity Diagram",
              link: "https://api.gia.edu/v1/assets/plots/1216809516.png",
            },
          ],
          results: {
            shape_and_cutting_style: "Round Brilliant",
            measurements: "6.45 - 6.49 x 3.98 mm",
            carat_weight: "1.02 carat",
            color_grade: "D",
            clarity_grade: "VVS1",
            cut_grade: "Excellent",
            polish: "Excellent",
            symmetry: "Excellent",
            fluorescence: "None",
            clarity_characteristics: "Pinpoint, Feather",
            inscriptions: "GIA 1216809516",
            report_comments: "Additional pinpoints are not shown.",
            proportions: {
              depth_pct: "61.5",
              table_pct: "57.0",
              crown_angle: "34.5",
              crown_height: "15.0",
              pavilion_angle: "40.8",
              pavilion_depth: "43.0",
              star_length: "50",
              lower_half: "80",
              girdle: "Medium to Slightly Thick, Faceted",
              culet: "None",
            },
          },
        },
      },
    };

    const res = gia.parseGiaResponse("1216809516", roundDocSample);
    assert.strictEqual(res.status, "SUCCESS");
    const m = res.data.erpMapped;
    assert.strictEqual(m.shape, "ROUND");
    assert.strictEqual(m.carat, 1.02);
    assert.strictEqual(m.color, "D");
    assert.strictEqual(m.clarity, "VVS1");
    assert.strictEqual(m.cut, "EX");
    assert.strictEqual(m.polish, "EX");
    assert.strictEqual(m.symmentry, "EX");
    assert.strictEqual(m.mesurment, "6.45 - 6.49 x 3.98");
    assert.strictEqual(m.table_pc, 57);
    assert.strictEqual(m.depth_pc, 61.5);
    assert.strictEqual(res.data.pdfReportUrl, "https://api.gia.edu/v1/assets/facsimile/1216809516.pdf");
    assert.strictEqual(res.data.plotImageUrl, "https://api.gia.edu/v1/assets/plots/1216809516.png");
  });

  await it("GiaProvider handles official GIA NOT_FOUND response gracefully", () => {
    const gia = new GiaProvider();
    const notFoundSample = {
      data: {
        getReport: null,
      },
      errors: [
        {
          message: "Report not found",
          locations: [{ line: 2, column: 3 }],
          path: ["getReport"],
        },
      ],
    };

    const res = gia.parseGiaResponse("9999999999", notFoundSample);
    assert.strictEqual(res.status, "NOT_FOUND");
    assert.strictEqual(res.data, null);
    assert(res.error.includes("not found"), "Error must mention not found");
  });

  await it("GiaProvider handles GIA GraphQL authentication / error responses", () => {
    const gia = new GiaProvider();
    const errorSample = {
      errors: [
        {
          message: "Unauthorized: Invalid API key",
        },
      ],
    };

    const res = gia.parseGiaResponse("2141438171", errorSample);
    assert.strictEqual(res.status, "ERROR");
    assert(res.error.includes("Unauthorized"), "Error must preserve GraphQL error message");
  });

  await it("GiaProvider supports live fetch with mockTransport and sets Authorization header", async () => {
    const gia = new GiaProvider();
    let capturedHeader = null;
    let capturedEndpoint = null;

    const res = await gia.fetchByReportNumber("2141438171", {
      credential: { apiKey: "test_secret_api_key_xyz", baseUrl: "https://api.gia.edu/v1/graphql" },
      mockTransport: async ({ endpoint, apiKey }) => {
        capturedHeader = apiKey;
        capturedEndpoint = endpoint;
        return {
          data: {
            getReport: {
              report_number: "2141438171",
              report_date: "2023-01-01",
              results: {
                shape_and_cutting_style: "Round Brilliant",
                carat_weight: "0.90 ct",
                color_grade: "F",
                clarity_grade: "VS1",
              },
            },
          },
        };
      },
    });

    assert.strictEqual(res.status, "SUCCESS");
    assert.strictEqual(capturedHeader, "test_secret_api_key_xyz");
    assert.strictEqual(capturedEndpoint, "https://api.gia.edu/v1/graphql");
    assert.strictEqual(res.data.erpMapped.shape, "ROUND");
    assert.strictEqual(res.data.erpMapped.carat, 0.9);
    assert.strictEqual(res.data.erpMapped.color, "F");
    assert.strictEqual(res.data.erpMapped.clarity, "VS1");
    assert.strictEqual(res.isMock, false);
  });

  // 5. Permission Registry & Access Control Tests
  console.log("\n5. Permission Registry & Access Control Tests:");
  await it("verifies lab.fetch, lab.fetch.bulk, and lab.manage exist in registry", () => {
    const keys = PAGE_ENTRIES.map((p) => p.key);
    assert(keys.includes("lab.fetch"), "lab.fetch must be in PAGE_ENTRIES");
    assert(keys.includes("lab.fetch.bulk"), "lab.fetch.bulk must be in PAGE_ENTRIES");
    assert(keys.includes("lab.manage"), "lab.manage must be in PAGE_ENTRIES");
  });

  await it("hasPagePermission grants or denies lab permissions accurately", () => {
    const userPerms = ["lab.fetch", "transaction.inward"];
    assert.strictEqual(hasPagePermission(userPerms, "lab.fetch"), true);
    assert.strictEqual(hasPagePermission(userPerms, "lab.manage"), false, "User without lab.manage should be denied");
    assert.strictEqual(hasPagePermission(["all"], "lab.manage"), true, "Super admin with 'all' should be granted");
  });

  await it("API prefix route resolver correctly maps lab endpoints to permissions", () => {
    const { getApiPermission } = require("../permissionHelper.js");

    const p1 = getApiPermission("/api/lab/fetch");
    assert.strictEqual(p1, "lab.fetch");

    const p2 = getApiPermission("/api/lab/fetch-bulk");
    assert.strictEqual(p2, "lab.fetch.bulk");

    const p3 = getApiPermission("/api/lab/providers/status");
    assert.strictEqual(p3, "lab.manage");
  });

  await it("requireApplyPermission requires BOTH 'transaction.stone_update' AND 'lab.fetch' (sirf lab.fetch returns 403)", async () => {
    const { requireApplyPermission } = require("../routes/lab/labRoutes.js");

    const runMiddleware = async (perms, roll = null) => {
      let code = 200;
      let body = null;
      let nextCalled = false;
      const req = { user: { permissions: perms, company: 1, id: 1, roll } };
      const res = {
        status: (c) => { code = c; return res; },
        json: (b) => { body = b; return res; },
      };
      const next = () => { nextCalled = true; };
      await requireApplyPermission(req, res, next);
      return { code, body, nextCalled };
    };

    // Case 1: User with ONLY lab.fetch -> must return 403
    const onlyFetch = await runMiddleware(["lab.fetch"]);
    assert.strictEqual(onlyFetch.code, 403, "User with only lab.fetch must be blocked with 403");
    assert.strictEqual(onlyFetch.nextCalled, false);

    // Case 2: User with ONLY transaction.stone_update -> must return 403
    const onlyStoneUpdate = await runMiddleware(["transaction.stone_update"]);
    assert.strictEqual(onlyStoneUpdate.code, 403, "User with only transaction.stone_update must be blocked with 403");
    assert.strictEqual(onlyStoneUpdate.nextCalled, false);

    // Case 3: User with BOTH transaction.stone_update AND lab.fetch -> allowed
    const both = await runMiddleware(["transaction.stone_update", "lab.fetch"]);
    assert.strictEqual(both.code, 200);
    assert.strictEqual(both.nextCalled, true, "User with both permissions must pass");

    // Case 4: Superadmin with 'all' -> allowed
    const admin = await runMiddleware(["all"]);
    assert.strictEqual(admin.code, 200);
    assert.strictEqual(admin.nextCalled, true, "Superadmin with 'all' must pass");
  });

  // 6. Real DB Tenant Isolation Test with Manual SUCCESS Row Insertion & Cleanup
  console.log("\n6. Real DB Tenant Isolation Integration Tests (with Cleanup):");
  await it("tenant isolation: manual SUCCESS row inserted for Company 901 is NOT visible to Company 902", async () => {
    const testCompany1 = 901;
    const testCompany2 = 902;
    const testRepNo = "TEST-REAL-DB-777888";

    // Clean any previous test residue
    await queryAsync("DELETE FROM lab_certificate_cache WHERE report_number = ?", [testRepNo]);

    const sampleNormalized = {
      reportNumber: testRepNo,
      lab: "GIA",
      carat: 2.05,
      shape: "ROUND",
      color: "D",
      clarity: "IF",
      cut: "EX",
      polish: "EX",
      symmetry: "EX",
      fluorescence: { intensity: "NONE", color: null },
      proportions: { tablePercent: 57, depthPercent: 61.5 },
      isMock: false,
    };

    // 1. Manually insert genuine SUCCESS row for Company 901
    await queryAsync(
      `INSERT INTO lab_certificate_cache (
        company_id, lab, report_number, status,
        normalized_json, raw_json, pdf_url, plot_url,
        fetched_at, expires_at
      ) VALUES (?, 'GIA', ?, 'SUCCESS', ?, NULL, 'https://test.gia.edu/cert.pdf', NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [testCompany1, testRepNo, JSON.stringify(sampleNormalized)]
    );

    // 2. Query cache for Company 901: must be found!
    const c1Found = await labCacheRepo.getCachedCertificate(testCompany1, "GIA", testRepNo);
    assert(c1Found, "Company 901 must find its own inserted cache row");
    assert.strictEqual(c1Found.status, "SUCCESS");
    assert.strictEqual(c1Found.normalized.carat, 2.05);

    // 3. Query cache for Company 902: must be NULL! (Tenant isolation)
    const c2Found = await labCacheRepo.getCachedCertificate(testCompany2, "GIA", testRepNo);
    assert.strictEqual(c2Found, null, "Company 902 must NEVER receive Company 901 cached certificate!");

    // 4. Cleanup test rows
    await queryAsync("DELETE FROM lab_certificate_cache WHERE report_number = ?", [testRepNo]);
    const afterClean = await queryAsync("SELECT id FROM lab_certificate_cache WHERE report_number = ?", [testRepNo]);
    assert.strictEqual(afterClean.length, 0, "Test rows must be completely cleaned up");
  });

  // 7. Provider Test Connection & Rate Limiting Tests
  console.log("\n7. Provider Test Connection & Service Integration Tests:");
  await it("testProviderConnection returns active status 'MOCK' for GIA in dev", async () => {
    const res = await labService.testProviderConnection({
      companyId: 9999, // Unconfigured tenant to verify simulation mode fallback
      lab: "GIA",
    });
    assert.strictEqual(res.status, true);
    assert.strictEqual(res.testStatus, "MOCK", "testStatus must strictly be MOCK in mock mode");
    assert.strictEqual(res.isMock, true, "isMock flag must be true in mock mode");
    assert(res.latencyMs >= 0);
  });

  await it("testProviderConnection fails cleanly for IGI (disabled stub)", async () => {
    const res = await labService.testProviderConnection({
      companyId: 1,
      lab: "IGI",
    });
    assert.strictEqual(res.status, false);
    assert(res.message.includes("not configured"), "Must indicate IGI not configured");
  });

  // 8. Dedicated Stone Audit Integration, Guards & Selective Apply Tests
  console.log("\n8. Dedicated Stone Audit Integration, Guards & Selective Apply Tests:");
  await it("validateSaveCredential rejects baseUrl outside LAB_ALLOWED_DOMAINS (SSRF protection)", () => {
    const { validateSaveCredential } = require("../validators/lab/labValidation.js");
    const badRes = validateSaveCredential({
      lab: "GIA",
      apiKey: "test_key",
      baseUrl: "https://evil-attacker-site.com/api",
    });
    assert.strictEqual(badRes.isValid, false, "Must reject unwhitelisted baseUrl");
    assert(badRes.error.includes("LAB_ALLOWED_DOMAINS") || badRes.error.includes("No allowed lab domains"), "Error must mention allowlist");
  });

  await it("validateApplyLabData maps fields to fixed server-side whitelist and rejects unknown fields (400)", () => {
    const { validateApplyLabData } = require("../validators/lab/labValidation.js");

    // Case A: Valid allowed fields
    const valid = validateApplyLabData({
      productId: 101,
      lab: "GIA",
      reportNumber: "2185123456",
      fields: ["shape", "color", "clarity", "cut", "polish", "symmetry", "measurements"],
    });
    assert.strictEqual(valid.isValid, true);
    assert(valid.data.fields.includes("shape"));
    assert(valid.data.fields.includes("symmetry"));

    // Case B: Unknown field -> must be rejected with 400
    const unknown = validateApplyLabData({
      productId: 101,
      lab: "GIA",
      reportNumber: "2185123456",
      fields: ["shape", "unknown_field_hacker", "color"],
    });
    assert.strictEqual(unknown.isValid, false, "Unknown field must be rejected");
    assert.strictEqual(unknown.statusCode, 400);
    assert(unknown.error.includes("Unknown or immutable field") && unknown.error.includes("unknown_field_hacker"));

    // Case C: Identification fields (report_no, lab) -> must be rejected with 400 (immutable identification fields)
    const identField = validateApplyLabData({
      productId: 101,
      lab: "GIA",
      reportNumber: "2185123456",
      fields: ["shape", "report_no", "color"],
    });
    assert.strictEqual(identField.isValid, false, "Identification field report_no must be rejected from apply fields");
    assert.strictEqual(identField.statusCode, 400);
    assert(identField.error.includes("immutable field") || identField.error.includes("identification fields"));

    const labField = validateApplyLabData({
      productId: 101,
      lab: "GIA",
      reportNumber: "2185123456",
      fields: ["shape", "lab", "color"],
    });
    assert.strictEqual(labField.isValid, false, "Identification field lab must be rejected from apply fields");
    assert.strictEqual(labField.statusCode, 400);
  });

  await it("applyLabDataToStone rejects cross-tenant modification", async () => {
    const res = await labService.applyLabDataToStone({
      productId: 77,
      labData: { reportNumber: "1234567890", isMock: true },
      companyId: 99999, // Wrong company
      userCtx: { username: "Attacker" },
    });
    assert.strictEqual(res.status, false, "Must reject cross-tenant stone update");
    assert.strictEqual(res.statusCode, 404);
    assert(res.message.includes("not found") || res.message.includes("tenant"));
  });

  await it("enforces sold, memo, hold guards, report_no mismatch check, and selective apply", async () => {
    // 1. Insert dedicated temporary test stone
    const insRes = await queryAsync(
      `INSERT INTO dai_product (company, user, sku, lab, date, sold_pcs, memo_pcs, hold)
       VALUES (1, 1, 'TEST-ADVANCED-STONE', 'NONE', '2026-10-21', 0, 0, 0)`
    );
    const testStoneId = insRes.insertId;

    await queryAsync(
      `INSERT INTO dai_product_value (product_id, report_no, shape, color, clarity, cut, polish, symmentry)
       VALUES (?, 'STORED-REPORT-555', 'ROUND', 'J', 'I1', 'GOOD', 'GOOD', 'GOOD')`,
      [testStoneId]
    );

    try {
      // Test A: Report Number Mismatch Guard
      const mismatchRes = await labService.applyLabDataToStone({
        productId: testStoneId,
        lab: "GIA",
        reportNumber: "DIFFERENT-REPORT-999",
        companyId: 1,
        userCtx: { username: "Admin" },
      });
      assert.strictEqual(mismatchRes.status, false);
      assert.strictEqual(mismatchRes.statusCode, 400);
      assert(mismatchRes.message.includes("Report number mismatch"), "Must reject mismatched report number");

      // Test B: Sold State Guard
      await queryAsync("UPDATE dai_product SET sold_pcs = 1 WHERE id = ?", [testStoneId]);
      const soldRes = await labService.applyLabDataToStone({
        productId: testStoneId,
        lab: "GIA",
        reportNumber: "STORED-REPORT-555",
        companyId: 1,
        userCtx: { username: "Admin" },
      });
      assert.strictEqual(soldRes.status, false);
      assert.strictEqual(soldRes.stoneStatus, "SOLD");
      assert(soldRes.message.includes("SOLD"), "Must block sold stones");

      // Test C: Memo State Guard
      await queryAsync("UPDATE dai_product SET sold_pcs = 0, memo_pcs = 1 WHERE id = ?", [testStoneId]);
      const memoRes = await labService.applyLabDataToStone({
        productId: testStoneId,
        lab: "GIA",
        reportNumber: "STORED-REPORT-555",
        companyId: 1,
        userCtx: { username: "Admin" },
      });
      assert.strictEqual(memoRes.status, false);
      assert.strictEqual(memoRes.stoneStatus, "MEMO");
      assert(memoRes.message.includes("OUT ON MEMO"), "Must block memo stones");

      // Test D: Hold State Guard
      await queryAsync("UPDATE dai_product SET memo_pcs = 0, hold = 1 WHERE id = ?", [testStoneId]);
      const holdRes = await labService.applyLabDataToStone({
        productId: testStoneId,
        lab: "GIA",
        reportNumber: "STORED-REPORT-555",
        companyId: 1,
        userCtx: { username: "Admin" },
      });
      assert.strictEqual(holdRes.status, false);
      assert.strictEqual(holdRes.stoneStatus, "HOLD");
      assert(holdRes.message.includes("ON HOLD"), "Must block stones on hold");

      // Reset guards for selective apply
      await queryAsync("UPDATE dai_product SET hold = 0 WHERE id = ?", [testStoneId]);

      // Test E: Mock Safety (Zero DB Write)
      const mockCert = {
        reportNumber: "STORED-REPORT-555",
        lab: "GIA",
        isMock: true,
        erpMapped: {
          report_no: "STORED-REPORT-555",
          shape: "OVAL",
          color: "E",
          clarity: "VS1",
          cut: "EX",
        },
      };

      const mockRes = await labService.applyLabDataToStone({
        productId: testStoneId,
        labData: mockCert,
        companyId: 1,
        userCtx: { username: "Admin" },
      });

      assert.strictEqual(mockRes.status, true);
      assert.strictEqual(mockRes.previewOnly, true);
      assert.strictEqual(mockRes.isMock, true);

      // Verify ZERO writes occurred on mock
      const valAfterMock = await queryAsync("SELECT color, clarity, shape FROM dai_product_value WHERE product_id = ?", [testStoneId]);
      assert.strictEqual(valAfterMock[0].color, "J", "Color must remain 'J' after mock preview");
      assert.strictEqual(valAfterMock[0].shape, "ROUND", "Shape must remain 'ROUND' after mock preview");

      // Test F: Selective Apply (Genuine Non-Mock: only 'color' and 'clarity')
      const genuineCert = {
        reportNumber: "STORED-REPORT-555",
        lab: "GIA",
        isMock: false,
        erpMapped: {
          report_no: "STORED-REPORT-555",
          shape: "OVAL",
          color: "D",
          clarity: "IF",
          cut: "EX",
          polish: "EX",
        },
      };

      const selectiveRes = await labService.applyLabDataToStone({
        productId: testStoneId,
        reportNumber: "STORED-REPORT-555",
        labData: genuineCert,
        fields: ["color", "clarity"], // ONLY color and clarity selected
        companyId: 1,
        userCtx: { username: "Admin" },
      });

      assert.strictEqual(selectiveRes.status, true);
      assert.strictEqual(selectiveRes.previewOnly, false);

      // Check DB values: color & clarity must be updated; shape & cut must NOT be updated!
      const valAfterSelective = await queryAsync(
        "SELECT color, clarity, shape, cut FROM dai_product_value WHERE product_id = ?",
        [testStoneId]
      );
      assert.strictEqual(valAfterSelective[0].color, "D", "Color must be updated to 'D'");
      assert.strictEqual(valAfterSelective[0].clarity, "IF", "Clarity must be updated to 'IF'");
      assert.strictEqual(valAfterSelective[0].shape, "ROUND", "Shape must remain 'ROUND' (unselected)");
      assert.strictEqual(valAfterSelective[0].cut, "GOOD", "Cut must remain 'GOOD' (unselected)");

      // Check audit log
      const auditLog = await queryAsync("SELECT action_type, description FROM dai_activity_log WHERE record_id = ?", [String(testStoneId)]);
      assert.strictEqual(auditLog.length, 1);
      assert.strictEqual(auditLog[0].action_type, "CERT_VERIFIED");
    } finally {
      // Complete cleanup
      await queryAsync("DELETE FROM dai_product WHERE id = ?", [testStoneId]);
      await queryAsync("DELETE FROM dai_product_value WHERE product_id = ?", [testStoneId]);
      await queryAsync("DELETE FROM dai_activity_log WHERE record_id = ?", [String(testStoneId)]);

      const cleanP = await queryAsync("SELECT id FROM dai_product WHERE id = ?", [testStoneId]);
      const cleanV = await queryAsync("SELECT pid FROM dai_product_value WHERE product_id = ?", [testStoneId]);
      const cleanA = await queryAsync("SELECT id FROM dai_activity_log WHERE record_id = ?", [String(testStoneId)]);
      assert.strictEqual(cleanP.length, 0);
      assert.strictEqual(cleanV.length, 0);
      assert.strictEqual(cleanA.length, 0);
    }
  });

  // 9. Bulk Fetch Dry-Run & Daily Cap Tests
  console.log("\n9. Bulk Fetch Dry-Run & Daily Cap Tests:");
  await it("fetchBulkCertificates dryRun calculates estimated live lookups and remaining cap", async () => {
    const bulkRes = await labService.fetchBulkCertificates({
      items: [
        { lab: "GIA", reportNumber: "1111111111" },
        { lab: "GIA", reportNumber: "2222222222" },
      ],
      companyId: 1,
      userId: 1,
      dryRun: true,
    });

    assert.strictEqual(bulkRes.status, true);
    assert.strictEqual(bulkRes.dryRun, true);
    assert.strictEqual(bulkRes.total, 2);
    assert.strictEqual(typeof bulkRes.estimatedLiveLookups, "number");
    assert.strictEqual(typeof bulkRes.dailyCap, "number");
    assert(bulkRes.dailyCap >= 500);
    assert.strictEqual(typeof bulkRes.dailyLookupsRemaining, "number");
    assert.strictEqual(bulkRes.items.length, 2);
  });

  console.log("\n=======================================================");
  console.log(`TOTAL: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error("FATAL TEST SUITE ERROR:", e);
  process.exit(1);
});
