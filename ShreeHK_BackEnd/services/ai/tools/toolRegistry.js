/**
 * AI Tool Registry Core (Phase 1 Foundation)
 * Defines schema registration and tool execution routing.
 * (Actual SQL/database tool implementations will be added in Phase 3).
 */

const aiLogger = require("../utils/aiLogger.js");

const toolRegistry = new Map();

/**
 * Register a tool definition schema and implementation handler
 */
function registerTool(name, description, schema, handler) {
  toolRegistry.set(name, {
    name,
    description,
    schema,
    handler,
  });
  aiLogger.info("ToolRegistry", `Registered tool: ${name}`);
}

/**
 * Get all registered tool JSON schema definitions for prompt injection
 */
function getRegisteredToolSchemas() {
  const schemas = [];
  for (const [name, tool] of toolRegistry.entries()) {
    schemas.push({
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    });
  }
  return schemas;
}

/**
 * Execute a registered tool by name
 */
async function executeTool(toolName, params, context) {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    aiLogger.warn("ToolRegistry", `Tool not found: ${toolName}`);
    return {
      success: false,
      error: `Tool '${toolName}' is not registered in AI Tool Registry.`,
    };
  }

  try {
    aiLogger.info("ToolRegistry", `Executing tool: ${toolName}`, { params, userId: context.userId });
    const result = await tool.handler(params, context);
    return {
      success: true,
      toolName,
      data: result,
    };
  } catch (err) {
    aiLogger.error("ToolRegistry", `Execution failed for tool ${toolName}: ${err.message}`);
    return {
      success: false,
      toolName,
      error: err.message,
    };
  }
}

// Phase 1 System Diagnostic Tool Registration
registerTool(
  "system_ping",
  "Utility tool to check AI tool registry operational status",
  {
    type: "object",
    properties: {
      echo: { type: "string", description: "Test message string" },
    },
  },
  async (params) => {
    return {
      status: "ONLINE",
      message: params.echo || "AI Tool Registry Operational",
      timestamp: new Date().toISOString(),
    };
  }
);

// Phase 2 Inventory Tools Registration
const inventoryTools = require("./inventoryTools.js");

registerTool(
  "searchInventory",
  "Search diamond inventory with filters (shape, color, clarity, carat range, price range, lab, SKU)",
  {
    type: "object",
    properties: {
      sku: { type: "string", description: "SKU filter" },
      shape: { type: "string", description: "Shape filter (e.g. ROUND, PEAR, OVAL, CUSHION)" },
      color: { type: "string", description: "Color filter (e.g. D, E, F, G, H)" },
      clarity: { type: "string", description: "Clarity filter (e.g. IF, VVS1, VVS2, VS1, VS2)" },
      lab: { type: "string", description: "Lab filter (e.g. GIA, IGI, HRD)" },
      minCarat: { type: "number", description: "Minimum carat weight" },
      maxCarat: { type: "number", description: "Maximum carat weight" },
      minPrice: { type: "number", description: "Minimum rate per carat" },
      maxPrice: { type: "number", description: "Maximum rate per carat" },
      limit: { type: "number", description: "Results limit (max 100)" },
      page: { type: "number", description: "Page number" },
    },
  },
  inventoryTools.searchInventory
);

registerTool(
  "getStoneById",
  "Fetch exact diamond stock details by SKU or ID",
  {
    type: "object",
    properties: {
      sku: { type: "string", description: "Diamond SKU identifier" },
      id: { type: "string", description: "Diamond product ID" },
    },
  },
  inventoryTools.getStoneById
);

registerTool(
  "getInventorySummary",
  "Aggregate inventory totals, total carats, total count, total stock value, and category breakdowns",
  {
    type: "object",
    properties: {},
  },
  inventoryTools.getInventorySummary
);

registerTool(
  "getStoneHistory",
  "Fetch chronological movement and status audit history of a diamond stone",
  {
    type: "object",
    properties: {
      sku: { type: "string", description: "Diamond SKU identifier" },
    },
    required: ["sku"],
  },
  inventoryTools.getStoneHistory
);

registerTool(
  "getInventoryStatistics",
  "Fetch breakdown counts and carat aggregates for on-hand, hold, box, parcel, pair, and memo stock",
  {
    type: "object",
    properties: {},
  },
  inventoryTools.getInventoryStatistics
);

registerTool(
  "getAvailableStones",
  "Fetch available on-hand stock stones (not on memo, consign, sale, export, or lab)",
  {
    type: "object",
    properties: {
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  inventoryTools.getAvailableStones
);

registerTool(
  "getHoldStones",
  "Fetch stones currently on inventory hold (hold = 1)",
  {
    type: "object",
    properties: {
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  inventoryTools.getHoldStones
);

registerTool(
  "getMemoStones",
  "Fetch stones currently out on Memo or Consignment",
  {
    type: "object",
    properties: {
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  inventoryTools.getMemoStones
);

registerTool(
  "getLabStones",
  "Fetch stones currently submitted out at GIA or Lab",
  {
    type: "object",
    properties: {
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  inventoryTools.getLabStones
);

registerTool(
  "getSoldStones",
  "Fetch stones that have been marked as Sold or Exported",
  {
    type: "object",
    properties: {
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  inventoryTools.getSoldStones
);

registerTool(
  "getExportStones",
  "Fetch stones marked as Export outward status",
  {
    type: "object",
    properties: {
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  inventoryTools.getExportStones
);

// Phase 3 Party & Transaction Tools Registration
const partyTransactionTools = require("./partyTransactionTools.js");

registerTool(
  "getPartiesList",
  "Search customer and supplier business parties by name, code, party_type, or country",
  {
    type: "object",
    properties: {
      search: { type: "string", description: "Search keyword for party name, code, country, or contact person" },
      partyType: { type: "string", description: "Party type filter (e.g. Customer, Vendor, Both)" },
      limit: { type: "number", description: "Result limit (max 100)" },
      page: { type: "number", description: "Page number" },
    },
  },
  partyTransactionTools.getPartiesList
);

registerTool(
  "getPartyById",
  "Fetch detailed customer or vendor profile by party ID or name",
  {
    type: "object",
    properties: {
      partyId: { type: "string", description: "Party ID" },
      name: { type: "string", description: "Party name search" },
    },
  },
  partyTransactionTools.getPartyById
);

registerTool(
  "getPartyOutstanding",
  "Calculate accounts receivable/payable open balance and unpaid invoices for a party",
  {
    type: "object",
    properties: {
      partyId: { type: "number", description: "Party ID" },
    },
    required: ["partyId"],
  },
  partyTransactionTools.getPartyOutstanding
);

registerTool(
  "getPartyTransactions",
  "Fetch transaction statement history (sales, outward memos, inward purchases, payments) for a party",
  {
    type: "object",
    properties: {
      partyId: { type: "number", description: "Party ID" },
      limit: { type: "number", description: "Result limit (max 100)" },
    },
    required: ["partyId"],
  },
  partyTransactionTools.getPartyTransactions
);

registerTool(
  "getOutwardStock",
  "Query outward memo, consignment, sale, export, and lab stock transaction headers",
  {
    type: "object",
    properties: {
      type: { type: "string", description: "Outward type filter (e.g. memo, consign, sale, export, lab)" },
      status: { type: "string", description: "Status filter (e.g. on_memo, on_consign, on_sale, on_export, on_lab)" },
      partyId: { type: "number", description: "Filter by customer party ID" },
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  partyTransactionTools.getOutwardStock
);

registerTool(
  "getInwardStock",
  "Query inward import, purchase, in-memo, and in-consign stock transaction headers",
  {
    type: "object",
    properties: {
      inwardType: { type: "string", description: "Inward type filter (e.g. import, purchase, memo, consign)" },
      partyId: { type: "number", description: "Filter by vendor party ID" },
      limit: { type: "number", description: "Result limit (max 100)" },
    },
  },
  partyTransactionTools.getInwardStock
);

registerTool(
  "getTransactionDetails",
  "Fetch header and line-item stones for an inward or outward memo/invoice transaction",
  {
    type: "object",
    properties: {
      transactionType: { type: "string", description: "Type: 'inward' or 'outward'" },
      id: { type: "string", description: "Transaction ID" },
      entryNo: { type: "string", description: "Entry number / invoice number" },
    },
  },
  partyTransactionTools.getTransactionDetails
);

registerTool(
  "getOutstandingSummary",
  "Aggregate company-wide total accounts receivable and total accounts payable open positions",
  {
    type: "object",
    properties: {},
  },
  partyTransactionTools.getOutstandingSummary
);

// Phase 4 Analytics & Intelligence Tools Registration
const analyticsAiTools = require("./analyticsAiTools.js");

registerTool(
  "detectAnomalies",
  "Detect inventory price mismatches below cost, duplicate GIA/IGI report numbers, and unusual discounts",
  {
    type: "object",
    properties: {},
  },
  analyticsAiTools.detectAnomalies
);

registerTool(
  "forecastDemand",
  "Calculate historical monthly sales velocity per diamond shape and analyze current on-hand stock reorder needs",
  {
    type: "object",
    properties: {},
  },
  analyticsAiTools.forecastDemand
);

registerTool(
  "suggestPrice",
  "Calculate recommended selling price per carat based on purchase cost and historical actual sales for similar specifications",
  {
    type: "object",
    properties: {
      shape: { type: "string", description: "Diamond shape (e.g. ROUND, PEAR, OVAL)" },
      carat: { type: "number", description: "Carat weight" },
      color: { type: "string", description: "Color grade" },
      clarity: { type: "string", description: "Clarity grade" },
      purchasePrice: { type: "number", description: "Cost price per carat" },
    },
  },
  analyticsAiTools.suggestPrice
);

module.exports = {
  registerTool,
  getRegisteredToolSchemas,
  executeTool,
};



