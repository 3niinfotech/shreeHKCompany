/**
 * Lab Certificate API Request Validation and Normalization
 */

const ALLOWED_LABS = new Set(["GIA", "IGI", "HRD"]);

/**
 * Validate and normalize single fetch report payload
 * @param {Object} body 
 */
function validateFetchReport(body = {}) {
  const rawLab = String(body.lab || "GIA").trim().toUpperCase();
  const rawReportNo = String(body.reportNumber || body.reportNo || body.rn || "").trim();
  const forceRefresh = Boolean(body.forceRefresh);

  if (!rawReportNo) {
    return {
      isValid: false,
      statusCode: 400,
      error: "reportNumber is required",
    };
  }

  if (!ALLOWED_LABS.has(rawLab)) {
    return {
      isValid: false,
      statusCode: 400,
      error: `Invalid lab "${rawLab}". Supported labs: ${Array.from(ALLOWED_LABS).join(", ")}`,
    };
  }

  // Format validations per laboratory
  if (rawLab === "GIA") {
    // GIA report numbers are numeric (usually 10 digits, historically 8-12 digits)
    const cleaned = rawReportNo.replace(/[^0-9]/g, "");
    if (!cleaned || cleaned.length < 6 || cleaned.length > 15) {
      return {
        isValid: false,
        statusCode: 400,
        error: "GIA report number must be a valid numeric identifier (typically 10 digits)",
      };
    }
  } else if (rawLab === "IGI") {
    // IGI report numbers are alphanumeric
    const cleaned = rawReportNo.replace(/[^a-zA-Z0-9]/g, "");
    if (!cleaned || cleaned.length < 5 || cleaned.length > 20) {
      return {
        isValid: false,
        statusCode: 400,
        error: "IGI report number must be a valid alphanumeric report identifier",
      };
    }
  }

  return {
    isValid: true,
    data: {
      lab: rawLab,
      reportNumber: rawReportNo,
      forceRefresh,
    },
  };
}

/**
 * Validate bulk fetch payload
 * @param {Object} body 
 */
function validateBulkFetch(body = {}) {
  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      isValid: false,
      statusCode: 400,
      error: "items array is required and must contain at least 1 item",
    };
  }

  if (rawItems.length > 200) {
    return {
      isValid: false,
      statusCode: 400,
      error: "Maximum 200 items allowed per bulk fetch request",
    };
  }

  const validItems = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== "object") continue;

    const repNo = String(item.reportNumber || item.reportNo || item.rn || "").trim();
    if (!repNo) continue;

    const lab = String(item.lab || "GIA").trim().toUpperCase();
    if (ALLOWED_LABS.has(lab)) {
      validItems.push({
        lab,
        reportNumber: repNo,
      });
    }
  }

  if (validItems.length === 0) {
    return {
      isValid: false,
      statusCode: 400,
      error: "No valid report items found in the payload",
    };
  }

  return {
    isValid: true,
    data: {
      items: validItems,
      dryRun: Boolean(body.dryRun),
    },
  };
}

/**
 * Validates target Base URL against configurable SSRF allowlist
 */
function validateLabBaseUrl(baseUrl) {
  if (!baseUrl) return { isValid: true };
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { isValid: false, error: "Invalid baseUrl format. Must be a valid HTTP/HTTPS URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { isValid: false, error: `Forbidden protocol '${parsed.protocol}'. Only HTTPS and HTTP are allowed.` };
  }

  const rawDomains = process.env.LAB_ALLOWED_DOMAINS || "";
  const allowed = rawDomains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);

  if (allowed.length === 0) {
    return {
      isValid: false,
      error: "No allowed lab domains configured in LAB_ALLOWED_DOMAINS. Custom baseUrl is rejected for security.",
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowed = allowed.some((d) => host === d || host.endsWith("." + d));

  if (!isAllowed) {
    return {
      isValid: false,
      error: `Base URL domain '${host}' is not in LAB_ALLOWED_DOMAINS allowlist (${allowed.join(", ")}).`,
    };
  }

  return { isValid: true };
}

/**
 * Validate credential update payload
 * @param {Object} body 
 */
function validateSaveCredential(body = {}) {
  const lab = String(body.lab || "").trim().toUpperCase();
  const apiKey = body.apiKey !== undefined ? String(body.apiKey).trim() : null;
  const apiSecret = body.apiSecret !== undefined && body.apiSecret !== null ? String(body.apiSecret).trim() : null;
  const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null;
  const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1;

  if (!lab || !ALLOWED_LABS.has(lab)) {
    return {
      isValid: false,
      statusCode: 400,
      error: `Invalid or missing lab provider. Allowed: ${Array.from(ALLOWED_LABS).join(", ")}`,
    };
  }

  if (baseUrl) {
    const urlValidation = validateLabBaseUrl(baseUrl);
    if (!urlValidation.isValid) {
      return {
        isValid: false,
        statusCode: 400,
        error: urlValidation.error,
      };
    }
  }

  return {
    isValid: true,
    data: {
      lab,
      apiKey,
      apiSecret,
      baseUrl,
      isActive,
    },
  };
}

const ALLOWED_APPLY_FIELDS = new Set([
  "shape",
  "color",
  "clarity",
  "cut",
  "polish",
  "symmetry",
  "symmentry",
  "symm",
  "fluorescence",
  "f_intensity",
  "flointensity",
  "table",
  "table_pc",
  "tablepercent",
  "tableper",
  "depth",
  "depth_pc",
  "depthpercent",
  "depthper",
  "measurement",
  "measurements",
  "mesurment",
  "girdle",
  "gridle",
]);

/**
 * Validate apply lab certificate data to stone payload
 * @param {Object} body 
 */
function validateApplyLabData(body = {}) {
  const productId = parseInt(body.productId, 10);
  if (!productId || productId <= 0) {
    return { isValid: false, statusCode: 400, error: "Valid productId is required" };
  }

  const rawLab = String(body.lab || body.labData?.lab || "GIA").trim().toUpperCase();
  if (!ALLOWED_LABS.has(rawLab)) {
    return {
      isValid: false,
      statusCode: 400,
      error: `Invalid lab provider "${rawLab}". Supported: ${Array.from(ALLOWED_LABS).join(", ")}`,
    };
  }

  const reportNumber = String(body.reportNumber || body.reportNo || body.labData?.reportNumber || "").trim();
  if (!reportNumber) {
    return { isValid: false, statusCode: 400, error: "reportNumber is required" };
  }

  let fields = null;
  if (body.fields !== undefined && body.fields !== null) {
    if (!Array.isArray(body.fields)) {
      return { isValid: false, statusCode: 400, error: "fields must be an array of field names" };
    }
    const validatedFields = [];
    for (const f of body.fields) {
      const rawField = String(f || "").trim();
      const cleanField = rawField.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!cleanField) continue;
      if (!ALLOWED_APPLY_FIELDS.has(cleanField)) {
        return {
          isValid: false,
          statusCode: 400,
          error: `Unknown or immutable field "${rawField}" in fields list. Allowed grading fields: shape, color, clarity, cut, polish, symmetry, fluorescence, table_pc, depth_pc, measurements, girdle (identification fields 'report_no' and 'lab' cannot be updated via apply)`,
        };
      }
      validatedFields.push(cleanField);
    }
    fields = validatedFields;
  }

  return {
    isValid: true,
    data: {
      productId,
      lab: rawLab,
      reportNumber,
      fields,
      labData: body.labData || null,
    },
  };
}

module.exports = {
  validateFetchReport,
  validateBulkFetch,
  validateSaveCredential,
  validateApplyLabData,
  validateLabBaseUrl,
};
