const GiaProvider = require("./giaProvider.js");
const IgiProvider = require("./igiProvider.js");
const labCacheRepo = require("../../repositories/lab/labCacheRepository.js");
const labLogRepo = require("../../repositories/lab/labLogRepository.js");
const labCredRepo = require("../../repositories/lab/labCredentialRepository.js");
const { encryptSecret, decryptSecret } = require("./labCredentialVault.js");

// Instantiate singleton providers registry
const providers = {
  GIA: new GiaProvider(),
  IGI: new IgiProvider(),
};

/**
 * Get configured cache TTLs (in seconds)
 */
function getCacheTtls() {
  const successDays = parseInt(process.env.LAB_CACHE_TTL_DAYS, 10) || 30;
  const notFoundHours = parseInt(process.env.LAB_CACHE_NOT_FOUND_TTL_HOURS, 10) || 24;

  return {
    successTtlSeconds: successDays * 24 * 60 * 60,
    notFoundTtlSeconds: notFoundHours * 60 * 60,
  };
}

/**
 * Fetch a single lab certificate
 * Coordinates: Cache -> Provider Adapter -> Normalization -> Logging -> Safe Cache
 * 
 * @param {Object} params
 * @param {string} params.lab "GIA" | "IGI"
 * @param {string} params.reportNumber
 * @param {boolean} [params.forceRefresh=false]
 * @param {number} params.companyId
 * @param {number} [params.userId]
 */
async function fetchCertificate({
  lab = "GIA",
  reportNumber,
  forceRefresh = false,
  companyId,
  userId = null,
}) {
  const startTime = Date.now();
  const labUpper = String(lab || "GIA").toUpperCase();
  const repNum = String(reportNumber || "").trim();

  const provider = providers[labUpper];
  if (!provider) {
    return {
      status: false,
      statusCode: 400,
      message: `Unsupported lab provider "${lab}". Supported providers: ${Object.keys(providers).join(", ")}`,
    };
  }

  // 1. Check Cache (if not forceRefresh)
  if (!forceRefresh) {
    try {
      const cached = await labCacheRepo.getCachedCertificate(companyId, labUpper, repNum);
      if (cached && cached.normalized) {
        const duration = Date.now() - startTime;
        await labLogRepo.createFetchLog({
          companyId,
          userId,
          lab: labUpper,
          reportNumber: repNum,
          status: cached.status === "NOT_FOUND" ? "NOT_FOUND" : "SUCCESS",
          source: "cache",
          responseTimeMs: duration,
        });

        if (cached.status === "NOT_FOUND") {
          return {
            status: false,
            statusCode: 404,
            message: `Certificate report #${repNum} was not found on official ${labUpper} records (cached).`,
            source: "cache",
            isMock: false,
          };
        }

        return {
          status: true,
          statusCode: 200,
          data: cached.normalized,
          source: "cache",
          isMock: false,
        };
      }
    } catch (err) {
      // Non-blocking cache error; proceed to live fetch
      console.error("[LabService] Cache read error:", err.message);
    }
  }

  // 2. Fetch Tenant Provider Credentials
  let rawCred = null;
  try {
    rawCred = await labCredRepo.getProviderCredential(companyId, labUpper);
  } catch (credErr) {
    console.error("[LabService] Credential read error:", credErr.message);
  }

  const decryptedCredential = rawCred
    ? {
        apiKey: decryptSecret(rawCred.api_key_encrypted),
        apiSecret: decryptSecret(rawCred.api_secret_encrypted),
        baseUrl: rawCred.base_url,
        isActive: Boolean(rawCred.is_active),
      }
    : null;

  // Check daily live lookup cap if this is an external live lookup (cache hits & mocks are exempt)
  const isLiveLookup = provider.isConfigured(decryptedCredential);
  if (isLiveLookup) {
    const dailyCap = parseInt(process.env.LAB_DAILY_LOOKUP_CAP, 10) || 500;
    const liveLookupsToday = await labLogRepo.getDailyLiveLookupCount(companyId);
    if (liveLookupsToday >= dailyCap) {
      return {
        status: false,
        statusCode: 429,
        message: `Daily live certificate lookup cap of ${dailyCap} reached for your company. Please try again tomorrow or contact admin.`,
        dailyCapExceeded: true,
      };
    }
  }

  // 3. Fetch from Provider Adapter
  let result;
  try {
    result = await provider.fetchByReportNumber(repNum, {
      credential: decryptedCredential,
      timeoutMs: 10000,
      forceRefresh,
    });
  } catch (fetchErr) {
    result = {
      status: "ERROR",
      error: fetchErr.message || "Failed to reach lab provider service",
      isMock: false,
    };
  }

  const responseTimeMs = Date.now() - startTime;

  // 4. Log fetch outcome to lab_fetch_log
  const logSource = result.isMock ? "mock" : "live";
  await labLogRepo.createFetchLog({
    companyId,
    userId,
    lab: labUpper,
    reportNumber: repNum,
    status: result.status,
    source: logSource,
    responseTimeMs,
    errorMessage: result.error || null,
  });

  // 5. Handle Provider Result
  const { successTtlSeconds, notFoundTtlSeconds } = getCacheTtls();

  if (result.status === "SUCCESS" && result.data) {
    // STRICT RULE: Never cache mock results
    if (!result.isMock) {
      await labCacheRepo.setCachedCertificate({
        companyId,
        lab: labUpper,
        reportNumber: repNum,
        status: "SUCCESS",
        normalized: result.data,
        raw: result.raw,
        pdfUrl: result.data.pdfReportUrl,
        plotUrl: result.data.plotImageUrl,
        ttlSeconds: successTtlSeconds,
        isMock: false,
      });
    }

    return {
      status: true,
      statusCode: 200,
      data: result.data,
      source: logSource,
      isMock: Boolean(result.isMock),
    };
  }

  if (result.status === "NOT_FOUND") {
    // Cache NOT_FOUND for 1 day (if not mock)
    if (!result.isMock) {
      await labCacheRepo.setCachedCertificate({
        companyId,
        lab: labUpper,
        reportNumber: repNum,
        status: "NOT_FOUND",
        normalized: { reportNumber: repNum, notFound: true },
        ttlSeconds: notFoundTtlSeconds,
        isMock: false,
      });
    }

    return {
      status: false,
      statusCode: 404,
      message: `Report #${repNum} not found in ${labUpper} database.`,
      source: logSource,
      isMock: Boolean(result.isMock),
    };
  }

  // ERROR status is NEVER cached
  return {
    status: false,
    statusCode: 502,
    message: result.error || `Unable to fetch from ${labUpper} provider.`,
    source: logSource,
    isMock: Boolean(result.isMock),
  };
}

/**
 * Bulk fetch certificates with concurrency throttle (max 5 simultaneous requests).
 * @param {Object} params
 * @param {Array<{lab: string, reportNumber: string}>} params.items
 * @param {number} params.companyId
 * @param {number} [params.userId]
 * @param {boolean} [params.dryRun=false]
 */
async function fetchBulkCertificates({ items = [], companyId, userId = null, dryRun = false }) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: false,
      statusCode: 400,
      message: "No items provided for bulk certificate fetch.",
    };
  }

  const MAX_BULK_LIMIT = 200;
  const targetItems = items.slice(0, MAX_BULK_LIMIT);

  // Dry-run mode: inspect cache status and estimate live lookups without calling external providers
  if (dryRun) {
    const dailyCap = parseInt(process.env.LAB_DAILY_LOOKUP_CAP, 10) || 500;
    const liveLookupsToday = await labLogRepo.getDailyLiveLookupCount(companyId);

    const checkedItems = await Promise.all(
      targetItems.map(async (item) => {
        const cached = await labCacheRepo.getCachedCertificate(companyId, item.lab || "GIA", item.reportNumber);
        const isCached = Boolean(cached && cached.normalized);
        return {
          lab: item.lab || "GIA",
          reportNumber: item.reportNumber,
          cached: isCached,
          willLookupLive: !isCached,
        };
      })
    );

    const cachedCount = checkedItems.filter((i) => i.cached).length;
    const estimatedLiveLookups = checkedItems.length - cachedCount;

    return {
      status: true,
      statusCode: 200,
      dryRun: true,
      total: checkedItems.length,
      cachedCount,
      estimatedLiveLookups,
      dailyCap,
      dailyLookupsUsedToday: liveLookupsToday,
      dailyLookupsRemaining: Math.max(0, dailyCap - liveLookupsToday),
      items: checkedItems,
    };
  }

  const results = [];
  const CONCURRENCY = 5;

  // Process in chunks to prevent provider rate limits and resource starvation
  for (let i = 0; i < targetItems.length; i += CONCURRENCY) {
    const chunk = targetItems.slice(i, i + CONCURRENCY);
    const chunkPromises = chunk.map(async (item) => {
      try {
        const res = await fetchCertificate({
          lab: item.lab || "GIA",
          reportNumber: item.reportNumber,
          forceRefresh: false,
          companyId,
          userId,
        });

        return {
          lab: item.lab,
          reportNumber: item.reportNumber,
          success: res.status,
          data: res.data || null,
          error: res.status ? null : res.message,
          source: res.source,
          isMock: res.isMock,
        };
      } catch (err) {
        return {
          lab: item.lab,
          reportNumber: item.reportNumber,
          success: false,
          error: err.message,
        };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  return {
    status: true,
    statusCode: 200,
    total: results.length,
    successCount,
    failedCount,
    results,
  };
}

/**
 * Get status of all providers for the tenant
 */
async function getProviderStatuses(companyId) {
  const dbStatuses = await labCredRepo.getAllProviderStatuses(companyId);
  const dbStatusMap = (dbStatuses || []).reduce((acc, row) => {
    acc[row.lab.toUpperCase()] = row;
    return acc;
  }, {});

  const list = Object.keys(providers).map((key) => {
    const dbRow = dbStatusMap[key];
    const isGia = key === "GIA";
    const isConfigured = Boolean(dbRow?.is_configured);

    return {
      lab: key,
      isConfigured,
      isActive: isGia ? true : Boolean(dbRow?.is_active), // GIA is active in mock mode if no key
      mode: isConfigured ? "LIVE_API" : isGia ? "MOCK_MODE" : "DISABLED_STUB",
      lastTestedAt: dbRow?.last_tested_at || null,
      lastTestStatus: dbRow?.last_test_status || null,
      lastTestError: dbRow?.last_test_error || null,
    };
  });

  return {
    status: true,
    statusCode: 200,
    providers: list,
  };
}

/**
 * Save provider credentials with encryption
 */
async function saveProviderCredential({
  companyId,
  lab,
  apiKey,
  apiSecret = null,
  baseUrl = null,
  isActive = 1,
}) {
  const labUpper = String(lab || "").toUpperCase();
  if (!providers[labUpper]) {
    return {
      status: false,
      statusCode: 400,
      message: `Unknown lab provider "${lab}"`,
    };
  }

  const apiKeyEncrypted = apiKey ? encryptSecret(apiKey) : null;
  const apiSecretEncrypted = apiSecret ? encryptSecret(apiSecret) : null;

  await labCredRepo.saveProviderCredential({
    companyId,
    lab: labUpper,
    isActive,
    baseUrl,
    apiKeyEncrypted,
    apiSecretEncrypted,
  });

  return {
    status: true,
    statusCode: 200,
    message: `${labUpper} credentials saved securely.`,
  };
}

/**
 * Test live or mock connection to a provider and record test status
 */
async function testProviderConnection({ companyId, lab, reportNumber }) {
  const labUpper = String(lab || "").toUpperCase();
  const provider = providers[labUpper];
  if (!provider) {
    return {
      status: false,
      statusCode: 400,
      message: `Unknown lab provider "${lab}"`,
    };
  }

  const startTime = Date.now();
  let credRow = null;
  try {
    credRow = await labCredRepo.getProviderCredential(companyId, labUpper);
  } catch (e) {}

  const credential = credRow
    ? {
        apiKey: decryptSecret(credRow.api_key_encrypted),
        apiSecret: decryptSecret(credRow.api_secret_encrypted),
        baseUrl: credRow.base_url,
      }
    : null;

  if (labUpper === "IGI") {
    await labCredRepo.updateTestResult(companyId, labUpper, "FAILED", "IGI API provider is not configured");
    return {
      status: false,
      statusCode: 400,
      message: "IGI API provider is currently not configured or enabled.",
      latencyMs: Date.now() - startTime,
    };
  }

  // GIA
  const isConfigured = provider.isConfigured(credential);
  if (!isConfigured) {
    const isMock = provider.isMockAllowed();
    if (!isMock) {
      await labCredRepo.updateTestResult(companyId, labUpper, "FAILED", "Provider not configured. GIA live credentials required.");
      return {
        status: false,
        statusCode: 400,
        testStatus: "FAILED",
        message: "Provider not configured. GIA live credentials required.",
        isMock: false,
        latencyMs: Date.now() - startTime,
      };
    }

    await labCredRepo.updateTestResult(companyId, labUpper, "MOCK", null);
    return {
      status: true,
      statusCode: 200,
      testStatus: "MOCK",
      message: "GIA Mock connection active (LAB_ALLOW_MOCK=true - simulation mode)",
      isMock: true,
      latencyMs: Date.now() - startTime,
    };
  }

  // Live credentials configured
  try {
    const testRep = reportNumber || "2225891234";
    const res = await provider.fetchByReportNumber(testRep, { credential, timeoutMs: 5000 });
    const latencyMs = Date.now() - startTime;
    if (res.status === "SUCCESS") {
      await labCredRepo.updateTestResult(companyId, labUpper, "SUCCESS", null);
      return {
        status: true,
        statusCode: 200,
        testStatus: "SUCCESS",
        message: `${labUpper} connection test succeeded.`,
        isMock: false,
        latencyMs,
      };
    } else {
      await labCredRepo.updateTestResult(companyId, labUpper, "FAILED", res.error);
      return {
        status: false,
        statusCode: 502,
        testStatus: "FAILED",
        message: `${labUpper} connection test failed: ${res.error}`,
        isMock: false,
        latencyMs,
      };
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    await labCredRepo.updateTestResult(companyId, labUpper, "FAILED", err.message);
    return {
      status: false,
      statusCode: 502,
      testStatus: "FAILED",
      message: `${labUpper} connection test error: ${err.message}`,
      isMock: false,
      latencyMs,
    };
  }
}

/**
 * Apply lab grading data to stone in transaction with full audit snapshot.
 * STRICT ENFORCEMENTS:
 * 1. Blocks if stone is in SOLD, MEMO, or HOLD state.
 * 2. Rejects if stone has an existing report_no that mismatches incoming reportNumber.
 * 3. Supports selective field updates via `fields: [...]`.
 * 4. Zero DB mutations or audit logs if isMock is true (pure preview mode).
 */
async function applyLabDataToStone({
  productId,
  lab = "GIA",
  reportNumber,
  fields = null,
  labData = null,
  companyId,
  userCtx = {},
}) {
  if (!productId || !companyId) {
    return { status: false, statusCode: 400, message: "productId and companyId are required" };
  }

  const helper = require("../../helper.js");
  const { logAuditInTx } = require("../auditIntegration.js");
  const { buildFullProductAuditSnapshot } = require("../auditProductSnapshot.js");
  const { diffFields } = require("../auditService.js");
  const moment = require("moment");

  const pid = Number(productId);

  // 1. Fetch existing stone with strict tenant isolation
  const oldRows = await helper.query("SELECT * FROM dai_product WHERE id = ? AND company = ?", [pid, companyId]);
  if (!oldRows || oldRows.length === 0) {
    return { status: false, statusCode: 404, message: "Stone not found or unauthorized tenant access" };
  }
  const oldRow = oldRows[0];

  // 2. State Guard: Block if stone is SOLD, OUT ON MEMO, or ON HOLD
  const soldPcs = Number(oldRow.sold_pcs || 0);
  const soldCarat = Number(oldRow.sold_carat || 0);
  const memoPcs = Number(oldRow.memo_pcs || 0);
  const memoCarat = Number(oldRow.memo_carat || 0);
  const isHold = Number(oldRow.hold || 0) === 1;

  if (soldPcs > 0 || soldCarat > 0) {
    return {
      status: false,
      statusCode: 400,
      message: `Cannot apply lab data: Stone ${oldRow.sku || pid} is SOLD. Specifications of sold stones cannot be altered.`,
      stoneStatus: "SOLD",
    };
  }

  if (memoPcs > 0 || memoCarat > 0) {
    return {
      status: false,
      statusCode: 400,
      message: `Cannot apply lab data: Stone ${oldRow.sku || pid} is currently OUT ON MEMO. Return or convert memo before modifying specifications.`,
      stoneStatus: "MEMO",
    };
  }

  if (isHold) {
    return {
      status: false,
      statusCode: 400,
      message: `Cannot apply lab data: Stone ${oldRow.sku || pid} is currently ON HOLD. Release the hold before modifying specifications.`,
      stoneStatus: "HOLD",
    };
  }

  // 3. Fetch existing value record
  const oldValRows = await helper.query("SELECT * FROM dai_product_value WHERE product_id = ?", [pid]);
  const oldValRow = oldValRows[0] || {};
  const oldSnap = buildFullProductAuditSnapshot({ ...oldRow, record: oldValRow });

  // 4. Report Number Match Guard
  const incomingReportNo = String(reportNumber || labData?.reportNumber || labData?.erpMapped?.report_no || "").trim();
  const existingReportNo = String(oldValRow.report_no || "").trim();

  if (existingReportNo && incomingReportNo && existingReportNo.toLowerCase() !== incomingReportNo.toLowerCase()) {
    return {
      status: false,
      statusCode: 400,
      message: `Report number mismatch: Stone stored report #${existingReportNo} does not match incoming report #${incomingReportNo}. Cross-certificate overwrites are rejected.`,
      storedReportNo: existingReportNo,
      incomingReportNo,
    };
  }

  // 5. Resolve Lab Certificate Data
  let activeLabData = labData;
  if (!activeLabData) {
    const fetchRes = await fetchCertificate({
      lab: lab || "GIA",
      reportNumber: incomingReportNo || existingReportNo,
      companyId,
      userId: userCtx.userId,
    });
    if (!fetchRes.status) {
      return fetchRes;
    }
    activeLabData = {
      ...fetchRes.data,
      isMock: fetchRes.isMock,
      reportNumber: incomingReportNo || existingReportNo,
    };
  }

  const isMock = Boolean(activeLabData.isMock);
  const mapped = activeLabData.erpMapped || {};

  // 6. Selective Field Filtering (grading specifications only)
  const FIELD_ALIASES = {
    symmetry: "symmentry",
    symm: "symmentry",
    fluorescence: "f_intensity",
    flointensity: "f_intensity",
    table: "table_pc",
    tablepercent: "table_pc",
    tableper: "table_pc",
    depth: "depth_pc",
    depthpercent: "depth_pc",
    depthper: "depth_pc",
    measurement: "mesurment",
    measurements: "mesurment",
    girdle: "gridle",
  };

  const allValueFields = {
    shape: mapped.shape,
    color: mapped.color,
    clarity: mapped.clarity,
    cut: mapped.cut,
    polish: mapped.polish,
    symmentry: mapped.symmentry,
    f_intensity: mapped.f_intensity,
    table_pc: mapped.table_pc,
    depth_pc: mapped.depth_pc,
    mesurment: mapped.mesurment,
    gridle: mapped.gridle,
  };

  let selectedKeysSet = null;
  if (Array.isArray(fields) && fields.length > 0) {
    selectedKeysSet = new Set(
      fields.map((f) => {
        const lower = String(f).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        return FIELD_ALIASES[lower] || lower;
      })
    );
  }

  const valueFieldsMap = {};
  Object.entries(allValueFields).forEach(([col, val]) => {
    if (selectedKeysSet) {
      if (selectedKeysSet.has(col.toLowerCase())) {
        valueFieldsMap[col] = val;
      }
    } else {
      valueFieldsMap[col] = val;
    }
  });

  const previewVal = { ...oldValRow };
  Object.entries(valueFieldsMap).forEach(([col, val]) => {
    if (val !== undefined && val !== null) {
      previewVal[col] = val;
    }
  });

  const targetSnap = buildFullProductAuditSnapshot({
    ...oldRow,
    record: previewVal,
  });
  const changedFields = diffFields(oldSnap, targetSnap);

  // 7. STRICT RULE: Mock data produces preview diff only, NEVER writes to DB or activity logs
  if (isMock) {
    return {
      status: true,
      statusCode: 200,
      previewOnly: true,
      isMock: true,
      message: "Mock lab data preview generated (no changes written to database)",
      changedFields,
      data: targetSnap,
    };
  }

  // 8. Genuine Certificate Apply in Transaction (grading fields only)
  let updatedRecord = null;
  await helper.runInTransaction(async (q) => {
    // Update selected dai_product_value columns
    const valUpdates = [];
    const valParams = [];
    Object.entries(valueFieldsMap).forEach(([col, val]) => {
      if (val !== undefined && val !== null) {
        valUpdates.push(`${col} = ?`);
        valParams.push(val);
      }
    });

    if (valUpdates.length > 0) {
      valParams.push(pid);
      if (oldValRows.length > 0) {
        await q(`UPDATE dai_product_value SET ${valUpdates.join(", ")} WHERE product_id = ?`, valParams);
      } else {
        const activeCols = Object.keys(valueFieldsMap).filter((k) => valueFieldsMap[k] !== undefined && valueFieldsMap[k] !== null);
        const insCols = ["product_id", ...activeCols];
        const insVals = [pid, ...activeCols.map((k) => valueFieldsMap[k])];
        await q(`INSERT INTO dai_product_value (${insCols.join(", ")}) VALUES (${insCols.map(() => "?").join(", ")})`, insVals);
      }
    }

    // Fetch updated rows for snapshot
    const newRows = await q("SELECT * FROM dai_product WHERE id = ? AND company = ?", [pid, companyId]);
    const newValRows = await q("SELECT * FROM dai_product_value WHERE product_id = ?", [pid]);

    const newSnap = buildFullProductAuditSnapshot({ ...newRows[0], record: newValRows[0] });

    const dateStr = moment().format("YYYY-MM-DD");
    const actor = userCtx.username || "User";
    const repNo = incomingReportNo || existingReportNo;
    const labName = lab || activeLabData.lab || "GIA";
    const description = `Certificate verified via ${labName} report #${repNo} on ${dateStr} by ${actor} (${changedFields.length} field(s) updated)`;

    // Log audit trail in transaction
    await logAuditInTx(q, {
      actionType: "CERT_VERIFIED",
      moduleName: "Stone Update",
      recordId: String(pid),
      recordReference: newRows[0]?.sku || String(pid),
      oldValue: oldSnap,
      newValue: newSnap,
      changedFields,
      description,
    });

    updatedRecord = newSnap;
  });

  return {
    status: true,
    statusCode: 200,
    previewOnly: false,
    message: "Certificate verified and applied to stone successfully",
    isMock: false,
    changedFields,
    data: updatedRecord,
  };
}

module.exports = {
  fetchCertificate,
  fetchBulkCertificates,
  getProviderStatuses,
  saveProviderCredential,
  testProviderConnection,
  applyLabDataToStone,
};
