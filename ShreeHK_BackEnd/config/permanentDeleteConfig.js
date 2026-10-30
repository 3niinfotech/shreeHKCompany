/**
 * permanentDeleteConfig.js
 * Central registry of tables affected by a Company or Branch permanent delete.
 *
 * dbScope:
 *   'meta'   - lives in META_DB (the main/shared DB)
 *   'tenant' - lives in every company_year DB (db_name column)
 *   'both'   - may exist in either; service checks information_schema at runtime
 *
 * deleteType:
 *   'direct'               - DELETE FROM <table> WHERE <companyColumn> = ?
 *   'subquery'             - DELETE FROM <table> WHERE <parentJoinColumn> IN
 *                              (SELECT id FROM <parentTable> WHERE <companyColumn> = ?)
 *   'gia_special'          - deletes only SKUs that do NOT exist in dai_product of any OTHER company
 *   'transfer_special'     - deletes where from_company_id = ? OR to_company_id = ?
 *   'transfer_item_special'- deletes items belonging to transfer where from_company_id = ? OR to_company_id = ?
 *
 * deleteOrder controls the execution sequence (lower = executed earlier).
 * Child tables must always be deleted before parent tables.
 */

/** Tables that live in tenant DBs (company_year.db_name), keyed by company column */
const TENANT_TABLES = [
  // -- Inventory / Product ----------------------------------------------------
  { table: "dai_history",               moduleLabel: "Inventory/History",    dbScope: "tenant", deleteType: "subquery", parentTable: "dai_product", parentJoinColumn: "product_id", companyColumn: "company", deleteOrder: 1 },
  { table: "dai_gia",                   moduleLabel: "Inventory/GIA",        dbScope: "tenant", deleteType: "gia_special", companyColumn: null, deleteOrder: 2 },
  { table: "dai_product",               moduleLabel: "Inventory/Product",    dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 3 },

  // -- Stock / Inward / Outward -----------------------------------------------
  { table: "dai_inward_item",           moduleLabel: "Stock/InwardItem",     dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 4 },
  { table: "dai_outward_item",          moduleLabel: "Stock/OutwardItem",    dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 5 },
  { table: "dai_inward",                moduleLabel: "Stock/Inward",         dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 6 },
  { table: "dai_outward",               moduleLabel: "Stock/Outward",        dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 7 },

  // -- Invoice / Sale ---------------------------------------------------------
  { table: "dai_invoice_item",          moduleLabel: "Invoice/Item",         dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 8 },
  { table: "dai_invoice",               moduleLabel: "Invoice",              dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 9 },

  // -- Purchase ---------------------------------------------------------------
  { table: "dai_purchase_item",         moduleLabel: "Purchase/Item",        dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 10 },
  { table: "dai_purchase",              moduleLabel: "Purchase",             dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 11 },

  // -- Memo -------------------------------------------------------------------
  { table: "dai_memo_item",             moduleLabel: "Memo/Item",            dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 12 },
  { table: "dai_memo",                  moduleLabel: "Memo",                 dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 13 },
  { table: "dai_inmemo_item",           moduleLabel: "InMemo/Item",          dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 14 },
  { table: "dai_inmemo",                moduleLabel: "InMemo",               dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 15 },
  { table: "dai_outmemo_item",          moduleLabel: "OutMemo/Item",         dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 16 },
  { table: "dai_outmemo",               moduleLabel: "OutMemo",              dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 17 },

  // -- Consignment ------------------------------------------------------------
  { table: "dai_consign_item",          moduleLabel: "Consign/Item",         dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 18 },
  { table: "dai_consign",               moduleLabel: "Consign",              dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 19 },

  // -- Lab --------------------------------------------------------------------
  { table: "lab_certificate_cache",     moduleLabel: "Lab/CertCache",        dbScope: "tenant", deleteType: "direct", companyColumn: "company_id", deleteOrder: 20 },
  { table: "lab_fetch_log",             moduleLabel: "Lab/FetchLog",         dbScope: "tenant", deleteType: "direct", companyColumn: "company_id", deleteOrder: 21 },
  { table: "lab_provider_credential",   moduleLabel: "Lab/Credential",       dbScope: "tenant", deleteType: "direct", companyColumn: "company_id", deleteOrder: 22 },

  // -- Inter-Company Transfer -------------------------------------------------
  { table: "dai_company_transfer_item", moduleLabel: "Transfer/Item",        dbScope: "tenant", deleteType: "transfer_item_special", companyColumn: "company", deleteOrder: 23 },
  { table: "dai_company_transfer",      moduleLabel: "Transfer",             dbScope: "tenant", deleteType: "transfer_special",      companyColumn: "company", deleteOrder: 24 },

  // -- Accounting / Ledger ----------------------------------------------------
  { table: "dai_ledger_entry",          moduleLabel: "Accounting/Ledger",    dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 25 },
  { table: "dai_journal",               moduleLabel: "Accounting/Journal",   dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 26 },
  { table: "dai_payment",               moduleLabel: "Accounting/Payment",   dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 27 },
  { table: "dai_receipt",               moduleLabel: "Accounting/Receipt",   dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 28 },
  { table: "dai_partywisetransaction",  moduleLabel: "Accounting/PartyWise",  dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 29 },
  { table: "dai_expanse",               moduleLabel: "Accounting/Expense",   dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 30 },
  { table: "dai_advance",               moduleLabel: "Accounting/Advance",   dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 31 },

  // -- Increment ID -----------------------------------------------------------
  { table: "dai_incrementid",           moduleLabel: "Settings/IncrementId", dbScope: "tenant", deleteType: "direct", companyColumn: "company", deleteOrder: 32 },
];

/**
 * Tables that live in META_DB only.
 */
const META_TABLES = [
  // user_track: company column is VARCHAR(250) storing the company NAME string
  { table: "user_track",                moduleLabel: "Users/Track",          companyColumn: "company",    matchType: "name_string",  deleteOrder: 1 },
  // notification: company column is int
  { table: "notification",              moduleLabel: "Notifications",        companyColumn: "company",    matchType: "id_int",       deleteOrder: 2 },
  // quick notes
  { table: "dai_quick_notes",           moduleLabel: "QuickNotes",           companyColumn: "company_id", matchType: "id_int",       deleteOrder: 3 },
  // AI conversations
  { table: "dai_ai_conversation",        moduleLabel: "AI/Conversation",     companyColumn: "company_id", matchType: "id_int",       deleteOrder: 4 },
];

/**
 * Tables/data explicitly SKIPPED and why:
 *
 * - dai_activity_log         : Audit trail - must never be deleted (must preserve history)
 * - company_year             : No company_id column; defines shared fiscal periods for ALL companies
 * - branch_year              : Shared fiscal year -> branch linkage; not per-company
 * - dai_rapnetprice          : Global shared price sheet - no company column
 * - dai_rapnet_live_snapshot : Global shared data - no company column
 * - dai_bank                 : Never referenced in Node.js code; assumed legacy/unused
 * - dai_jewelry              : Legacy PHP table - unused
 * - dai_jewelry_products     : Legacy PHP table - unused
 * - sms_*                    : Legacy PHP SMS tables - unused
 * - dai_mail                 : Legacy PHP table - unused
 * - dai_errors               : Legacy PHP table - unused
 * - user                     : Users are global; deleting users is out of scope (clear company references only)
 * - roll                     : Roles handled by removeCompanyFromRolls (JSON array update, not delete)
 */

module.exports = { TENANT_TABLES, META_TABLES };

