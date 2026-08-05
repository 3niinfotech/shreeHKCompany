/**
 * Customer & Transaction/Stock Tools Layer for AI Agent (Phase 3 Implementation)
 * Parameterized, Tenant-Isolated, Permission-Guarded Party & Transaction Tools.
 */

const helper = require("../../../helper.js");
const aiLogger = require("../utils/aiLogger.js");
const { logActivity } = require("../../auditService.js");

/**
 * Audit log helper for tool execution
 */
function auditToolCall(toolName, context, recordRef, description) {
  logActivity({
    actionType: "AI_TOOL_EXECUTION",
    moduleName: "AI_PARTY_TRANSACTION",
    recordReference: recordRef || toolName,
    status: "SUCCESS",
    userId: context.userId,
    userName: context.username || "AI Agent",
    userRoleId: context.roleId,
    description: `AI Tool [${toolName}] executed: ${description}`,
  }).catch(() => {});
}

/**
 * 1. getPartiesList
 */
async function getPartiesList(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;

  let sql = `
    SELECT id, name, code, party_type, country, contact_person, contact_number, email, address
    FROM dai_party
    WHERE company = ?
  `;
  const queryParams = [companyId];

  if (params.search) {
    const term = `%${String(params.search).trim()}%`;
    sql += " AND (name LIKE ? OR code LIKE ? OR country LIKE ? OR contact_person LIKE ?)";
    queryParams.push(term, term, term, term);
  }

  if (params.partyType) {
    sql += " AND party_type = ?";
    queryParams.push(String(params.partyType).trim());
  }

  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  const page = Math.max(Number(params.page) || 1, 1);
  const offset = (page - 1) * limit;

  sql += " ORDER BY name ASC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);

  const rows = await helper.query(sql, queryParams);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getPartiesList", context, "Parties", `Found ${rows.length} party records`);
  return {
    totalResults: rows.length,
    page,
    limit,
    executionTimeMs,
    parties: rows,
  };
}

/**
 * 2. getPartyById
 */
async function getPartyById(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const identifier = String(params.partyId || params.name || "").trim();

  if (!identifier) {
    throw new Error("Parameter 'partyId' or 'name' is required.");
  }

  const sql = `
    SELECT id, name, code, party_type, country, contact_person, contact_number, email, address
    FROM dai_party
    WHERE company = ? AND (id = ? OR name LIKE ?)
    LIMIT 1
  `;

  const rows = await helper.query(sql, [companyId, identifier, `%${identifier}%`]);
  const party = rows[0] || null;
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getPartyById", context, identifier, party ? "Party found" : "Party not found");
  return {
    found: Boolean(party),
    executionTimeMs,
    party,
  };
}

/**
 * 3. getPartyOutstanding
 */
async function getPartyOutstanding(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const partyId = Number(params.partyId);

  if (!partyId) {
    throw new Error("Parameter 'partyId' is required.");
  }

  // Receivables from Outward (Sales & Exports)
  const outwardSql = `
    SELECT id, entryno, invoiceno, date, duedate, type, status, final_amount, paid_amount, due_amount
    FROM dai_outward
    WHERE company = ? AND party = ? AND due_amount <> 0 AND (type = 'sale' OR type = 'export')
    ORDER BY duedate ASC
  `;

  // Payables from Inward (Purchases)
  const inwardSql = `
    SELECT id, entryno, invoiceno, date, inward_type, final_amount, paid_amount, due_amount
    FROM dai_inward
    WHERE company = ? AND party = ? AND due_amount <> 0 AND inward_type = 'purchase'
    ORDER BY date ASC
  `;

  const [outwardRows, inwardRows] = await Promise.all([
    helper.query(outwardSql, [companyId, partyId]),
    helper.query(inwardSql, [companyId, partyId]),
  ]);

  const totalReceivable = outwardRows.reduce((sum, r) => sum + (Number(r.due_amount) || 0), 0);
  const totalPayable = inwardRows.reduce((sum, r) => sum + (Number(r.due_amount) || 0), 0);
  const netBalance = totalReceivable - totalPayable;
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getPartyOutstanding", context, `Party_${partyId}`, `Receivable: $${totalReceivable}, Payable: $${totalPayable}`);
  return {
    partyId,
    totalReceivable,
    totalPayable,
    netBalance,
    openSalesInvoicesCount: outwardRows.length,
    openPurchaseInvoicesCount: inwardRows.length,
    openSalesInvoices: outwardRows,
    openPurchaseInvoices: inwardRows,
    executionTimeMs,
  };
}

/**
 * 4. getPartyTransactions
 */
async function getPartyTransactions(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const partyId = Number(params.partyId);
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

  if (!partyId) {
    throw new Error("Parameter 'partyId' is required.");
  }

  const sql = `
    (
      SELECT 'OUTWARD' AS dir, id, entryno AS ref, type AS txn_type, status, date AS txn_date, final_amount AS amount
      FROM dai_outward
      WHERE company = ? AND party = ?
    )
    UNION ALL
    (
      SELECT 'INWARD' AS dir, id, entryno AS ref, inward_type AS txn_type, inward_type AS status, date AS txn_date, final_amount AS amount
      FROM dai_inward
      WHERE company = ? AND party = ? AND (deleted = 0 OR deleted IS NULL)
    )
    ORDER BY txn_date DESC
    LIMIT ?
  `;

  const rows = await helper.query(sql, [companyId, partyId, companyId, partyId, limit]);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getPartyTransactions", context, `Party_${partyId}`, `Fetched ${rows.length} transaction records`);
  return {
    partyId,
    totalTransactions: rows.length,
    executionTimeMs,
    transactions: rows,
  };
}

/**
 * 5. getOutwardStock
 */
async function getOutwardStock(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;

  let sql = `
    SELECT o.id, o.entryno, o.invoiceno, o.party, p.name AS party_name, o.date, o.duedate, o.type, o.status,
           o.products, o.total_pcs, o.total_carat, o.final_amount, o.paid_amount, o.due_amount
    FROM dai_outward o
    LEFT JOIN dai_party p ON o.party = p.id
    WHERE o.company = ?
  `;
  const queryParams = [companyId];

  if (params.type) {
    sql += " AND o.type = ?";
    queryParams.push(String(params.type).trim());
  }

  if (params.status) {
    sql += " AND o.status = ?";
    queryParams.push(String(params.status).trim());
  }

  if (params.partyId) {
    sql += " AND o.party = ?";
    queryParams.push(Number(params.partyId));
  }

  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  sql += " ORDER BY o.id DESC LIMIT ?";
  queryParams.push(limit);

  const rows = await helper.query(sql, queryParams);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getOutwardStock", context, "Outward", `Fetched ${rows.length} outward records`);
  return {
    totalResults: rows.length,
    executionTimeMs,
    outwardRecords: rows,
  };
}

/**
 * 6. getInwardStock
 */
async function getInwardStock(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;

  let sql = `
    SELECT i.id, i.entryno, i.invoiceno, i.party, p.name AS party_name, i.date, i.inward_type,
           i.total_pcs, i.total_carat, i.final_amount, i.paid_amount, i.due_amount
    FROM dai_inward i
    LEFT JOIN dai_party p ON i.party = p.id
    WHERE i.company = ? AND (i.deleted = 0 OR i.deleted IS NULL)
  `;
  const queryParams = [companyId];

  if (params.inwardType) {
    sql += " AND i.inward_type = ?";
    queryParams.push(String(params.inwardType).trim());
  }

  if (params.partyId) {
    sql += " AND i.party = ?";
    queryParams.push(Number(params.partyId));
  }

  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  sql += " ORDER BY i.id DESC LIMIT ?";
  queryParams.push(limit);

  const rows = await helper.query(sql, queryParams);
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getInwardStock", context, "Inward", `Fetched ${rows.length} inward records`);
  return {
    totalResults: rows.length,
    executionTimeMs,
    inwardRecords: rows,
  };
}

/**
 * 7. getTransactionDetails
 */
async function getTransactionDetails(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;
  const txnType = String(params.transactionType || "outward").toLowerCase();
  const identifier = String(params.id || params.entryNo || "").trim();

  if (!identifier) {
    throw new Error("Parameter 'id' or 'entryNo' is required.");
  }

  let header = null;
  let lineItems = [];

  if (txnType === "inward") {
    const headerRows = await helper.query(
      `SELECT i.*, p.name AS party_name FROM dai_inward i LEFT JOIN dai_party p ON i.party = p.id WHERE i.company = ? AND (i.id = ? OR i.entryno = ?) LIMIT 1`,
      [companyId, identifier, identifier]
    );
    header = headerRows[0] || null;
    if (header) {
      lineItems = await helper.query(
        `SELECT p.id, p.sku, p.polish_pcs AS pcs, p.polish_carat AS carat, p.amount, p.rate, pv.shape, pv.color, pv.clarity
         FROM dai_product p
         LEFT JOIN dai_product_value pv ON p.id = pv.product_id
         WHERE p.company = ? AND p.inward_id = ?`,
        [companyId, header.id]
      );
    }
  } else {
    const headerRows = await helper.query(
      `SELECT o.*, p.name AS party_name FROM dai_outward o LEFT JOIN dai_party p ON o.party = p.id WHERE o.company = ? AND (o.id = ? OR o.entryno = ?) LIMIT 1`,
      [companyId, identifier, identifier]
    );
    header = headerRows[0] || null;
    if (header && header.products) {
      const ids = String(header.products).split(",").map((i) => i.trim()).filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        lineItems = await helper.query(
          `SELECT p.id, p.sku, p.polish_pcs AS pcs, p.polish_carat AS carat, p.amount, p.rate, pv.shape, pv.color, pv.clarity
           FROM dai_product p
           LEFT JOIN dai_product_value pv ON p.id = pv.product_id
           WHERE p.company = ? AND p.id IN (${placeholders})`,
          [companyId, ...ids]
        );
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;
  auditToolCall("getTransactionDetails", context, identifier, header ? "Transaction details found" : "Not found");

  return {
    transactionType: txnType,
    found: Boolean(header),
    executionTimeMs,
    header,
    lineItemsCount: lineItems.length,
    lineItems,
  };
}

/**
 * 8. getOutstandingSummary
 */
async function getOutstandingSummary(params = {}, context = {}) {
  const startTime = Date.now();
  const companyId = Number(context.companyId) || 1;

  const outwardSql = `
    SELECT COALESCE(SUM(due_amount), 0) AS total_receivable, COUNT(id) AS open_sales_count
    FROM dai_outward
    WHERE company = ? AND due_amount <> 0 AND (type = 'sale' OR type = 'export')
  `;

  const inwardSql = `
    SELECT COALESCE(SUM(due_amount), 0) AS total_payable, COUNT(id) AS open_purchases_count
    FROM dai_inward
    WHERE company = ? AND due_amount <> 0 AND inward_type = 'purchase' AND (deleted = 0 OR deleted IS NULL)
  `;

  const [outwardRes, inwardRes] = await Promise.all([
    helper.query(outwardSql, [companyId]),
    helper.query(inwardSql, [companyId]),
  ]);

  const totalReceivable = Number(outwardRes[0]?.total_receivable) || 0;
  const totalPayable = Number(inwardRes[0]?.total_payable) || 0;
  const executionTimeMs = Date.now() - startTime;

  auditToolCall("getOutstandingSummary", context, "CompanyOutstanding", `Receivable: $${totalReceivable}, Payable: $${totalPayable}`);
  return {
    totalReceivable,
    totalPayable,
    netPosition: totalReceivable - totalPayable,
    openSalesInvoicesCount: Number(outwardRes[0]?.open_sales_count) || 0,
    openPurchaseInvoicesCount: Number(inwardRes[0]?.open_purchases_count) || 0,
    executionTimeMs,
  };
}

module.exports = {
  getPartiesList,
  getPartyById,
  getPartyOutstanding,
  getPartyTransactions,
  getOutwardStock,
  getInwardStock,
  getTransactionDetails,
  getOutstandingSummary,
};
