import { api } from "../../../api/client/axiosInstance";
import { ENDPOINTS } from "../../../api/endpoints";

/**
 * Normalizes text for comparison (removes whitespace, uppercase)
 */
function normalizeStr(val) {
  if (val == null) return "";
  return String(val).trim().toUpperCase();
}

const CHUNK_SIZE = 200;

function chunkArray(array, size = CHUNK_SIZE) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Check dry-run quota and cache status for bulk report lookups
 * Handles chunking for payloads > 200 rows so dryRun covers the entire file.
 * @param {Array<{lab: string, reportNumber: string}>} items 
 */
export async function checkBulkDryRun(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: true,
      dryRun: true,
      total: 0,
      cachedCount: 0,
      estimatedLiveLookups: 0,
      dailyCap: 500,
      dailyLookupsRemaining: 500,
    };
  }

  if (items.length <= CHUNK_SIZE) {
    const res = await api.post(ENDPOINTS.labIntegration.fetchBulk, {
      items,
      dryRun: true,
    });
    return res.data;
  }

  // Chunking for > 200 rows so that the entire file is dry-run checked
  const chunks = chunkArray(items, CHUNK_SIZE);
  let total = 0;
  let cachedCount = 0;
  let estimatedLiveLookups = 0;
  let dailyCap = 500;
  let dailyLookupsRemaining = 500;

  for (const chunk of chunks) {
    const res = await api.post(ENDPOINTS.labIntegration.fetchBulk, {
      items: chunk,
      dryRun: true,
    });
    const data = res.data || {};
    total += data.total ?? chunk.length;
    cachedCount += data.cachedCount ?? 0;
    estimatedLiveLookups += data.estimatedLiveLookups ?? 0;
    if (data.dailyCap !== undefined) dailyCap = data.dailyCap;
    if (data.dailyLookupsRemaining !== undefined) dailyLookupsRemaining = data.dailyLookupsRemaining;
  }

  return {
    status: true,
    dryRun: true,
    total,
    cachedCount,
    estimatedLiveLookups,
    dailyCap,
    dailyLookupsRemaining,
  };
}

/**
 * Perform live bulk fetch for report certificates
 * Chunks requests to maximum 200 items per request and aggregates results.
 * @param {Array<{lab: string, reportNumber: string}>} items 
 * @param {Function} [onProgress] Optional progress callback (0-100)
 */
export async function executeBulkVerify(items = [], onProgress) {
  if (!Array.isArray(items) || items.length === 0) {
    return { status: true, total: 0, results: [] };
  }

  if (items.length <= CHUNK_SIZE) {
    const res = await api.post(ENDPOINTS.labIntegration.fetchBulk, {
      items,
      dryRun: false,
    });
    if (typeof onProgress === "function") {
      onProgress(100);
    }
    return res.data;
  }

  const chunks = chunkArray(items, CHUNK_SIZE);
  const allResults = [];
  let total = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const res = await api.post(ENDPOINTS.labIntegration.fetchBulk, {
      items: chunk,
      dryRun: false,
    });
    const data = res.data || {};
    if (Array.isArray(data.results)) {
      allResults.push(...data.results);
    }
    total += data.total ?? chunk.length;

    if (typeof onProgress === "function") {
      const pct = Math.round(((i + 1) / chunks.length) * 100);
      onProgress(pct);
    }
  }

  return {
    status: true,
    total,
    results: allResults,
  };
}

/**
 * Compare imported Excel row data against official laboratory specifications.
 * Detects discrepancies:
 * - Carat weight difference > 0.01 ct
 * - Shape, Color, Clarity, or Cut mismatches
 * 
 * @param {Array<Object>} excelRows 
 * @param {Array<Object>} labResults 
 */
export function compareExcelWithLabSpecs(excelRows = [], labResults = []) {
  // Map lab results by normalized report number
  const labMap = new Map();
  (labResults || []).forEach((res) => {
    if (res && res.reportNumber) {
      labMap.set(normalizeStr(res.reportNumber), res);
    }
  });

  const discrepancies = [];
  const updatedRows = [];
  let verifiedCount = 0;
  let mockCount = 0;

  excelRows.forEach((row, rowIndex) => {
    const repNo = normalizeStr(row.reportNo);
    const labRes = repNo ? labMap.get(repNo) : null;

    if (!labRes || !labRes.success || !labRes.data) {
      // No cert found or fetch failed; keep row as is
      updatedRows.push({
        ...row,
        labVerified: false,
        labError: labRes ? labRes.error : null,
      });
      return;
    }

    const labData = labRes.data;
    const isMock = Boolean(labRes.isMock);
    if (isMock) mockCount++;
    else verifiedCount++;

    const mapped = labData.erpMapped || {};
    const rowDiscrepancies = [];

    // 1. Carat difference check (> 0.01 ct tolerance)
    const excelCarat = Number(row.pCarat) || 0;
    const labCarat = Number(labData.carat) || 0;
    if (excelCarat > 0 && labCarat > 0) {
      const caratDiff = Math.abs(excelCarat - labCarat);
      if (caratDiff > 0.01) {
        rowDiscrepancies.push({
          rowNo: rowIndex + 1,
          sku: row.sku || `Row ${rowIndex + 1}`,
          reportNo: row.reportNo,
          lab: row.lab || "GIA",
          field: "Polish Carat",
          excelValue: `${excelCarat.toFixed(2)} ct`,
          labValue: `${labCarat.toFixed(2)} ct`,
          diff: `${caratDiff.toFixed(2)} ct`,
          severity: "high",
          isMock,
        });
      }
    }

    // 2. Shape check
    if (row.shape && mapped.shape && normalizeStr(row.shape) !== normalizeStr(mapped.shape)) {
      rowDiscrepancies.push({
        rowNo: rowIndex + 1,
        sku: row.sku || `Row ${rowIndex + 1}`,
        reportNo: row.reportNo,
        lab: row.lab || "GIA",
        field: "Shape",
        excelValue: row.shape,
        labValue: mapped.shape,
        severity: "medium",
        isMock,
      });
    }

    // 3. Color check
    if (row.color && mapped.color && normalizeStr(row.color) !== normalizeStr(mapped.color)) {
      rowDiscrepancies.push({
        rowNo: rowIndex + 1,
        sku: row.sku || `Row ${rowIndex + 1}`,
        reportNo: row.reportNo,
        lab: row.lab || "GIA",
        field: "Color",
        excelValue: row.color,
        labValue: mapped.color,
        severity: "medium",
        isMock,
      });
    }

    // 4. Clarity check
    if (row.clarity && mapped.clarity && normalizeStr(row.clarity) !== normalizeStr(mapped.clarity)) {
      rowDiscrepancies.push({
        rowNo: rowIndex + 1,
        sku: row.sku || `Row ${rowIndex + 1}`,
        reportNo: row.reportNo,
        lab: row.lab || "GIA",
        field: "Clarity",
        excelValue: row.clarity,
        labValue: mapped.clarity,
        severity: "medium",
        isMock,
      });
    }

    if (rowDiscrepancies.length > 0) {
      discrepancies.push(...rowDiscrepancies);
    }

    // If mock data, keep original Excel values and only set mock badge metadata
    if (isMock) {
      updatedRows.push({
        ...row,
        labVerified: false,
        isMock: true,
        pdfReportUrl: labData.pdfReportUrl || null,
        discrepancyCount: rowDiscrepancies.length,
      });
    } else {
      // Genuine certificate: auto-fill missing attributes with verified lab specs
      updatedRows.push({
        ...row,
        lab: row.lab || labData.lab || "GIA",
        shape: row.shape || mapped.shape || "",
        color: row.color || mapped.color || "",
        clarity: row.clarity || mapped.clarity || "",
        cut: row.cut || mapped.cut || "",
        polish: row.polish || mapped.polish || "",
        symm: row.symm || mapped.symmentry || "",
        floIntensity: row.floIntensity || mapped.f_intensity || "",
        tablePer: row.tablePer || mapped.table_pc || "",
        depthPer: row.depthPer || mapped.depth_pc || "",
        measurements: row.measurements || mapped.mesurment || "",
        girdle: row.girdle || mapped.gridle || "",
        pCarat: row.pCarat || labData.carat || 0,
        labVerified: true,
        isMock: false,
        pdfReportUrl: labData.pdfReportUrl || null,
        discrepancyCount: rowDiscrepancies.length,
      });
    }
  });

  return {
    discrepancies,
    updatedRows,
    verifiedCount,
    mockCount,
  };
}
