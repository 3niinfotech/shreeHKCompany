const helper = require("../../helper.js");

const SENSITIVE_COL = /password|^pass$|_pass$|token|otp|refresh|secret|jwt|hash/i;
const LIST_KEYWORDS = /\b(sab|all|saare|sare|poora|pura|list|show|details|detail|batao|dikhao|dekhao|every)\b/i;
const COUNT_KEYWORDS = /\b(kitne|kitna|how many|count|total|number of)\b/i;

const buildOnHandWhere = () => `
  ${buildOnHandCompanyClause()}
  AND p.visibility = 1
  AND p.polish_carat <> 0
  AND (p.outward = '' OR p.outward IS NULL)
  AND (p.box_id = '' OR p.box_id IS NULL)
  AND (p.parcel_id = '' OR p.parcel_id IS NULL)
`;

const buildOnHandCompanyClause = () => `p.company = ${helper.resolveCompanyId()}`;

const TABLE_KEYWORDS = {
  user: ["user", "users", "registered", "register", "admin", "login", "email", "username"],
  roll: ["role", "roll", "permission", "access"],
  dai_party: ["party", "parties", "customer", "company", "client", "buyer", "vendor"],
  dai_product: ["product", "sku", "barcode", "stone", "diamond", "inventory", "stock", "carat"],
  dai_product_value: ["shape", "color", "clarity", "cut", "polish"],
  dai_outward: ["order", "orders", "sale", "sales", "outward", "export", "invoice", "sold", "memo"],
  dai_inward: ["inward", "purchase", "buying", "import"],
  dai_lab: ["lab", "certificate", "igi", "hrd"],
  dai_origin: ["origin", "country"],
  dai_shipping: ["shipping", "ship"],
  dai_balance: ["balance", "cash", "bank", "credit"],
  dai_currencyrate: ["currency", "rate", "usd", "hkd", "exchange"],
  dai_history: ["history", "log", "audit"],
  dai_gia: ["gia"],
  dai_incrementid: ["increment", "entryno", "entry number"],
  dai_category: ["category"],
  dai_rapnetprice: ["rapnet", "rap price"],
};

const MAX_RECORDS = 200;
const TRIM_RECORDS = 20;
const MAX_CONTEXT_CHARS = 50000;

let tablesCache = null;
let columnsCache = {};

function normalizeMessage(message) {
  return String(message || "").toLowerCase();
}

function wantsBroadFetch(message) {
  const q = normalizeMessage(message);
  return LIST_KEYWORDS.test(q) || COUNT_KEYWORDS.test(q) || q.length < 12;
}

async function discoverTables() {
  if (tablesCache) return tablesCache;
  const dbName = process.env.DB_NAME || "shreehkweb_snj2024";
  const rows = await helper.query(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [dbName]
  );
  tablesCache = (rows || []).map((r) => r.name);
  return tablesCache;
}

async function getTableColumns(tableName) {
  if (columnsCache[tableName]) return columnsCache[tableName];
  const dbName = process.env.DB_NAME || "shreehkweb_snj2024";
  const rows = await helper.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [dbName, tableName]
  );
  const cols = (rows || []).map((r) => r.name).filter((c) => !SENSITIVE_COL.test(c));
  columnsCache[tableName] = cols;
  return cols;
}

function scoreTable(tableName, message) {
  const q = normalizeMessage(message);
  const keywords = TABLE_KEYWORDS[tableName] || [];
  let score = 0;
  for (const kw of keywords) {
    if (q.includes(kw)) score += 2;
  }
  if (q.includes(tableName.replace(/^dai_/, ""))) score += 1;
  return score;
}

function pickTables(allTables, message) {
  const scored = allTables
    .map((t) => ({ table: t, score: scoreTable(t, message) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) return scored.map((x) => x.table);

  if (wantsBroadFetch(message)) {
    return allTables.filter((t) =>
      ["user", "roll", "dai_party", "dai_product", "dai_outward", "dai_inward", "dai_balance"].includes(t)
    );
  }

  return ["dai_product", "dai_party", "dai_outward", "user"];
}

async function countTable(tableName) {
  try {
    const rows = await helper.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
    return Number(rows[0]?.total) || 0;
  } catch {
    return null;
  }
}

async function fetchTableRows(tableName, limit = MAX_RECORDS) {
  const columns = await getTableColumns(tableName);
  if (!columns.length) return [];
  const colList = columns.map((c) => `\`${c}\``).join(", ");
  return helper.query(`SELECT ${colList} FROM \`${tableName}\` LIMIT ?`, [limit]);
}

async function fetchInventoryOnHand(limit = MAX_RECORDS) {
  const [countRows, rows] = await Promise.all([
    helper.query(
      `SELECT COUNT(p.id) AS total, SUM(CASE WHEN p.hold = 1 THEN 1 ELSE 0 END) AS on_hold
       FROM dai_product p
       JOIN dai_product_value pv ON p.id = pv.product_id
       WHERE ${buildOnHandWhere()}`
    ),
    helper.query(
      `SELECT p.id, p.sku, p.barcode, pv.shape, p.polish_carat, pv.color, pv.clarity,
              p.price, p.cost, p.amount, p.hold, p.lab, p.outward
       FROM dai_product p
       JOIN dai_product_value pv ON p.id = pv.product_id
       WHERE ${buildOnHandWhere()}
       ORDER BY p.id DESC
       LIMIT ?`,
      [limit]
    ),
  ]);
  return {
    entity: "inventory_on_hand",
    total: Number(countRows[0]?.total) || 0,
    on_hold: Number(countRows[0]?.on_hold) || 0,
    records: rows || [],
  };
}

async function fetchRecentOrders(limit = 50) {
  const rows = await helper.query(
    `SELECT o.id, o.entryno, o.type, o.invoiceno, o.date, o.final_amount,
            o.paid_amount, o.due_amount, o.status, p.name AS party_name
     FROM dai_outward o
     LEFT JOIN dai_party p ON o.party = p.id
     ORDER BY o.date DESC, o.id DESC
     LIMIT ?`,
    [limit]
  );
  const countRows = await helper.query(`SELECT COUNT(*) AS total FROM dai_outward`);
  return {
    entity: "recent_orders",
    total: Number(countRows[0]?.total) || 0,
    records: rows || [],
  };
}

async function fetchUsers(limit = MAX_RECORDS) {
  const countRows = await helper.query(`SELECT COUNT(*) AS total FROM user`);
  const rows = await helper.query(
    `SELECT user_id, user_name, user_email, first_name, last_name, mobile, roll, profile_image
     FROM user
     ORDER BY user_id DESC
     LIMIT ?`,
    [limit]
  );
  return {
    entity: "users",
    total: Number(countRows[0]?.total) || 0,
    records: rows || [],
  };
}

function trimContext(context) {
  let json = JSON.stringify(context);
  if (json.length <= MAX_CONTEXT_CHARS) return context;

  const trimmed = {
    ...context,
    _note: "Data trimmed — showing first 20 records per section. Use counts for totals.",
    table_counts: context.table_counts,
    entities: {},
    tables: {},
  };

  for (const [key, val] of Object.entries(context.entities || {})) {
    trimmed.entities[key] = {
      ...val,
      records: (val.records || []).slice(0, TRIM_RECORDS),
      total: val.total,
    };
  }
  for (const [key, val] of Object.entries(context.tables || {})) {
    trimmed.tables[key] = {
      total: val.total,
      records: (val.records || []).slice(0, TRIM_RECORDS),
    };
  }

  if (JSON.stringify(trimmed).length > MAX_CONTEXT_CHARS) {
    trimmed.tables = {};
    trimmed.entities = Object.fromEntries(
      Object.entries(trimmed.entities).map(([k, v]) => [
        k,
        { total: v.total, on_hold: v.on_hold, record_count: (v.records || []).length },
      ])
    );
  }

  return trimmed;
}

/**
 * Fetch real-time DB context for AI chat based on user message.
 * @param {string} message
 */
async function buildBrainContext(message) {
  const q = normalizeMessage(message);
  const allTables = await discoverTables();

  const table_counts = {};
  await Promise.all(
    allTables.map(async (t) => {
      table_counts[t] = await countTable(t);
    })
  );

  const context = {
    fetched_at: new Date().toISOString(),
    database: process.env.DB_NAME || "shreehkweb_snj2024",
    table_counts,
    entities: {},
    tables: {},
  };

  const inventoryAsked = /inventory|stock|on.?hand|stone|diamond|sku|barcode|hold/.test(q);
  const userAsked = /user|registered|register|admin|email|login|naam|name/.test(q);
  const orderAsked = /order|sale|outward|export|invoice|sold|recent/.test(q);

  if (inventoryAsked || wantsBroadFetch(message)) {
    context.entities.inventory_on_hand = await fetchInventoryOnHand(
      inventoryAsked ? MAX_RECORDS : 50
    );
  }

  if (userAsked || wantsBroadFetch(message)) {
    context.entities.users = await fetchUsers(userAsked ? MAX_RECORDS : 30);
  }

  if (orderAsked || wantsBroadFetch(message)) {
    context.entities.recent_orders = await fetchRecentOrders(orderAsked ? 100 : 30);
  }

  const picked = pickTables(allTables, message);
  for (const tableName of picked) {
    if (["dai_product", "dai_product_value"].includes(tableName) && context.entities.inventory_on_hand) {
      continue;
    }
    if (tableName === "user" && context.entities.users) continue;
    if (tableName === "dai_outward" && context.entities.recent_orders) continue;

    const total = table_counts[tableName];
    const records = await fetchTableRows(tableName, MAX_RECORDS);
    context.tables[tableName] = { total, records };
  }

  return trimContext(context);
}

module.exports = { buildBrainContext, discoverTables };
