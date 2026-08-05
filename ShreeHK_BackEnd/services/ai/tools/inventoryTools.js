/**
 * Inventory Tools Layer for AI Agent (Phase 2 Implementation)
 * Parameterized, Tenant-Isolated, Permission-Guarded Inventory Tools.
 */

const helper = require("../../../helper.js");
const inventorySummaryService = require("../../inventorySummaryService.js");
const aiLogger = require("../utils/aiLogger.js");
const { logActivity } = require("../../auditService.js");

/**
 * Mask sensitive cost price fields if user is not Super Admin (roleId !== 1)
 */
function sanitizeStoneFields(stone, context) {
  if (!stone) return stone;
  const isSuperAdmin = Number(context.roleId) === 1;
  const cleaned = { ...stone };
  if (!isSuperAdmin) {
    delete cleaned.cost_price;
    delete cleaned.cost_rate;
    delete cleaned.purchase_price;
    delete cleaned.cost_amount;
  }
  return cleaned;
}

function sanitizeStonesList(stones = [], context) {
  return stones.map((s) => sanitizeStoneFields(s, context));
}

/**
 * Audit log helper for tool execution
 */
function auditToolCall(toolName, context, recordRef, description) {
  logActivity({
    actionType: "AI_TOOL_EXECUTION",
    moduleName: "AI_INVENTORY",
    recordReference: recordRef || toolName,
    status: "SUCCESS",
    userId: context.userId,
    userName: context.username || "AI Agent",
    userRoleId: context.roleId,
    description: `AI Tool [${toolName}] executed: ${description}`,
  }).catch(() => {});
}

/**
 * 1. searchInventory
 */
async function searchInventory(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;

  let sql = `
    SELECT
      p.id, p.sku, p.polish_pcs AS pcs, p.polish_carat AS carat, p.amount, p.rate,
      p.cost_price, p.outward, p.hold, p.site_upload, p.rapnet_upload, p.lab,
      pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmetry, pv.fluorescence,
      pv.report_no, pv.depth, pv.table_per, pv.measurements
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ?
  `;

  const queryParams = [companyId];

  if (params.sku) {
    sql += " AND p.sku = ?";
    queryParams.push(String(params.sku).trim());
  }
  if (params.shape) {
    sql += " AND pv.shape = ?";
    queryParams.push(String(params.shape).trim());
  }
  if (params.color) {
    sql += " AND pv.color = ?";
    queryParams.push(String(params.color).trim());
  }
  if (params.clarity) {
    sql += " AND pv.clarity = ?";
    queryParams.push(String(params.clarity).trim());
  }
  if (params.lab) {
    sql += " AND p.lab = ?";
    queryParams.push(String(params.lab).trim());
  }
  if (params.minCarat != null && !isNaN(Number(params.minCarat))) {
    sql += " AND p.polish_carat >= ?";
    queryParams.push(Number(params.minCarat));
  }
  if (params.maxCarat != null && !isNaN(Number(params.maxCarat))) {
    sql += " AND p.polish_carat <= ?";
    queryParams.push(Number(params.maxCarat));
  }
  if (params.minPrice != null && !isNaN(Number(params.minPrice))) {
    sql += " AND p.rate >= ?";
    queryParams.push(Number(params.minPrice));
  }
  if (params.maxPrice != null && !isNaN(Number(params.maxPrice))) {
    sql += " AND p.rate <= ?";
    queryParams.push(Number(params.maxPrice));
  }

  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  const page = Math.max(Number(params.page) || 1, 1);
  const offset = (page - 1) * limit;

  sql += " ORDER BY p.id DESC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);

  const rows = await helper.query(sql, queryParams);
  const sanitized = sanitizeStonesList(rows, context);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("searchInventory", context, "Search", `Found ${sanitized.length} stones`);
  return {
    totalResults: sanitized.length,
    page,
    limit,
    executionTimeMs,
    stones: sanitized,
  };
}

/**
 * 2. getStoneById
 */
async function getStoneById(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const identifier = String(params.sku || params.id || "").trim();

  if (!identifier) {
    throw new Error("Parameter 'sku' or 'id' is required.");
  }

  const sql = `
    SELECT
      p.id, p.sku, p.polish_pcs AS pcs, p.polish_carat AS carat, p.amount, p.rate,
      p.cost_price, p.outward, p.hold, p.site_upload, p.rapnet_upload, p.lab,
      pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmetry, pv.fluorescence,
      pv.report_no, pv.depth, pv.table_per, pv.measurements
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ? AND (p.sku = ? OR p.id = ?)
    LIMIT 1
  `;

  const rows = await helper.query(sql, [companyId, identifier, identifier]);
  const stone = rows[0] ? sanitizeStoneFields(rows[0], context) : null;
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getStoneById", context, identifier, stone ? "Stone found" : "Stone not found");
  return {
    found: Boolean(stone),
    executionTimeMs,
    stone,
  };
}

/**
 * 3. getInventorySummary
 */
async function getInventorySummary(params = {}, context = {}) {
  const startTime = Date.now();
  const reqMock = { user: { companyId: context.companyId } };
  const summary = await inventorySummaryService.getInventorySummary(reqMock);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getInventorySummary", context, "Summary", "Fetched inventory summary breakdown");
  return {
    executionTimeMs,
    summary,
  };
}

/**
 * 4. getStoneHistory
 */
async function getStoneHistory(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const sku = String(params.sku || "").trim();

  if (!sku) {
    throw new Error("Parameter 'sku' is required for getStoneHistory.");
  }

  const sql = `
    SELECT id, sku, date, action, party, detail, user
    FROM dai_history
    WHERE company = ? AND sku = ?
    ORDER BY id DESC
    LIMIT 50
  `;

  const rows = await helper.query(sql, [companyId, sku]);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getStoneHistory", context, sku, `Fetched ${rows.length} history records`);
  return {
    sku,
    totalHistoryEntries: rows.length,
    executionTimeMs,
    history: rows,
  };
}

/**
 * 5. getInventoryStatistics
 */
async function getInventoryStatistics(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const widgetCounts = await inventorySummaryService.getWidgetCounts(companyId);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getInventoryStatistics", context, "Stats", "Fetched inventory widget statistics");
  return {
    executionTimeMs,
    statistics: widgetCounts,
  };
}

/**
 * Common Helper for Filtered Status Queries
 */
async function queryStonesByStatus(extraWhere, queryParams = [], limit = 50, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;

  const sql = `
    SELECT
      p.id, p.sku, p.polish_pcs AS pcs, p.polish_carat AS carat, p.amount, p.rate,
      p.cost_price, p.outward, p.hold, p.lab,
      pv.shape, pv.color, pv.clarity
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ? ${extraWhere}
    ORDER BY p.id DESC
    LIMIT ?
  `;

  const rows = await helper.query(sql, [companyId, ...queryParams, Math.min(limit, 100)]);
  const sanitized = sanitizeStonesList(rows, context);
  const executionTimeMs = Date.now() - startTime;

  return {
    totalResults: sanitized.length,
    executionTimeMs,
    stones: sanitized,
  };
}

/**
 * 6. getAvailableStones
 */
async function getAvailableStones(params = {}, context = {}) {
  const limit = Number(params.limit) || 50;
  const extraWhere = `
    AND p.visibility = 1
    AND p.polish_carat <> 0
    AND (p.outward = '' OR p.outward IS NULL)
    AND (p.box_id = '' OR p.box_id IS NULL)
    AND (p.parcel_id = '' OR p.parcel_id IS NULL)
  `;
  const result = await queryStonesByStatus(extraWhere, [], limit, context);
  auditToolCall("getAvailableStones", context, "Available", `Fetched ${result.totalResults} available stones`);
  return result;
}

/**
 * 7. getHoldStones
 */
async function getHoldStones(params = {}, context = {}) {
  const limit = Number(params.limit) || 50;
  const result = await queryStonesByStatus("AND p.hold = 1", [], limit, context);
  auditToolCall("getHoldStones", context, "Hold", `Fetched ${result.totalResults} hold stones`);
  return result;
}

/**
 * 8. getMemoStones
 */
async function getMemoStones(params = {}, context = {}) {
  const limit = Number(params.limit) || 50;
  const extraWhere = "AND (p.outward = 'memo' OR p.outward = 'consign')";
  const result = await queryStonesByStatus(extraWhere, [], limit, context);
  auditToolCall("getMemoStones", context, "Memo", `Fetched ${result.totalResults} memo/consign stones`);
  return result;
}

/**
 * 9. getLabStones
 */
async function getLabStones(params = {}, context = {}) {
  const limit = Number(params.limit) || 50;
  const result = await queryStonesByStatus("AND p.outward = 'lab'", [], limit, context);
  auditToolCall("getLabStones", context, "Lab", `Fetched ${result.totalResults} lab stones`);
  return result;
}

/**
 * 10. getSoldStones
 */
async function getSoldStones(params = {}, context = {}) {
  const limit = Number(params.limit) || 50;
  const extraWhere = "AND (p.outward = 'sale' OR p.outward = 'export')";
  const result = await queryStonesByStatus(extraWhere, [], limit, context);
  auditToolCall("getSoldStones", context, "Sold", `Fetched ${result.totalResults} sold/export stones`);
  return result;
}

/**
 * 11. getExportStones
 */
async function getExportStones(params = {}, context = {}) {
  const limit = Number(params.limit) || 50;
  const result = await queryStonesByStatus("AND p.outward = 'export'", [], limit, context);
  auditToolCall("getExportStones", context, "Export", `Fetched ${result.totalResults} export stones`);
  return result;
}

module.exports = {
  searchInventory,
  getStoneById,
  getInventorySummary,
  getStoneHistory,
  getInventoryStatistics,
  getAvailableStones,
  getHoldStones,
  getMemoStones,
  getLabStones,
  getSoldStones,
  getExportStones,
};
