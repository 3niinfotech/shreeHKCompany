const helper = require("../helper.js");

const DONUT_COLORS = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#1e40af", "#e5566e", "#26b99a"];

const resolveCompanyId = (source) => {
  if (source && typeof source === "object") {
    if (source.companyId != null && Number(source.companyId) > 0) return Number(source.companyId);
    if (source.user && source.user.companyId != null && Number(source.user.companyId) > 0) return Number(source.user.companyId);
    if (source.headers && source.headers["x-company-id"] != null && Number(source.headers["x-company-id"]) > 0) {
      return Number(source.headers["x-company-id"]);
    }
  }
  const n = Number(source);
  return n > 0 ? n : 0;
};

const toAgg = (row = {}) => ({
  pcs: Number(row.pcs) || 0,
  carat: Number(row.carat) || 0,
  amount: Number(row.amount) || 0,
  count: Number(row.count) || 0,
});

const parseProductIds = (products) =>
  String(products || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

async function getProductAmountMap(ids) {
  const uniqueIds = [...new Set(ids)];
  const map = new Map();
  if (!uniqueIds.length) return map;
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = await helper.query(
    `SELECT id, amount FROM dai_product WHERE id IN (${placeholders})`,
    uniqueIds
  );
  for (const row of rows) {
    map.set(String(row.id), Number(row.amount) || 0);
  }
  return map;
}

function sumAmounts(ids, amountMap) {
  return ids.reduce((sum, id) => sum + (amountMap.get(String(id)) || 0), 0);
}

async function mapDuePaymentRows(rows) {
  const allIds = rows.flatMap((row) => parseProductIds(row.products));
  const amountMap = await getProductAmountMap(allIds);
  return rows.map((row) => {
    const ids = [...new Set(parseProductIds(row.products))];
    let total = Number(row.final_amount) || 0;
    if (ids.length) {
      total = sumAmounts(ids, amountMap) || total;
    }
    return {
      party: row.party_name || row.party,
      entry: row.entryno,
      total,
      paid: Number(row.paid_amount) || 0,
      balance: Number(row.due_amount) || 0,
    };
  });
}

/**
 * Aggregate pcs/carat/amount/count for dai_product rows.
 */
async function aggregateProducts(companyId, extraWhere = "") {
  const sql = `
    SELECT
      COALESCE(SUM(p.polish_pcs), 0) AS pcs,
      COALESCE(SUM(p.polish_carat), 0) AS carat,
      COALESCE(SUM(p.amount), 0) AS amount,
      COUNT(p.id) AS count
    FROM dai_product p
    WHERE p.company = ?
    ${extraWhere}
  `;
  const rows = await helper.query(sql, [companyId]);
  return toAgg(rows[0]);
}

const ON_HAND_BASE = `
  AND p.visibility = 1
  AND p.polish_carat <> 0
  AND (p.outward = '' OR p.outward IS NULL)
  AND (p.box_id = '' OR p.box_id IS NULL)
  AND (p.parcel_id = '' OR p.parcel_id IS NULL)
`;

const GIA_LAB = ` AND p.lab = 'GIA' `;
const NON_GIA_LAB = ` AND (p.lab = '' OR p.lab IS NULL) `;

async function getWidgetCounts(companyId) {
  const [
    onHand,
    onHandGia,
    onHandNonGia,
    lab,
    memo,
    memoGia,
    memoNonGia,
    saleExport,
    saleGia,
    saleNonGia,
    hold,
    box,
    parcel,
    pair,
    purchase,
    saleExportLedger,
  ] = await Promise.all([
    aggregateProducts(companyId, ON_HAND_BASE),
    aggregateProducts(companyId, `${ON_HAND_BASE} ${GIA_LAB}`),
    aggregateProducts(companyId, `${ON_HAND_BASE} ${NON_GIA_LAB}`),
    aggregateProducts(companyId, ` AND (p.lab = '' OR p.lab IS NULL) AND p.outward = 'lab' `),
    aggregateProducts(
      companyId,
      ` AND p.visibility = 1 AND p.polish_carat <> 0
        AND (p.box_id = '' OR p.box_id IS NULL)
        AND (p.parcel_id = '' OR p.parcel_id IS NULL)
        AND (p.outward = 'memo' OR p.outward = 'consign') `
    ),
    aggregateProducts(
      companyId,
      ` AND p.visibility = 1 AND p.polish_carat <> 0
        AND (p.box_id = '' OR p.box_id IS NULL)
        AND (p.parcel_id = '' OR p.parcel_id IS NULL)
        AND (p.outward = 'memo' OR p.outward = 'consign') ${GIA_LAB}`
    ),
    aggregateProducts(
      companyId,
      ` AND p.visibility = 1 AND p.polish_carat <> 0
        AND (p.box_id = '' OR p.box_id IS NULL)
        AND (p.parcel_id = '' OR p.parcel_id IS NULL)
        AND (p.outward = 'memo' OR p.outward = 'consign') ${NON_GIA_LAB}`
    ),
    aggregateProducts(companyId, ` AND (p.outward = 'sale' OR p.outward = 'export') `),
    aggregateProducts(companyId, ` AND (p.outward = 'sale' OR p.outward = 'export') ${GIA_LAB}`),
    aggregateProducts(companyId, ` AND (p.outward = 'sale' OR p.outward = 'export') ${NON_GIA_LAB}`),
    aggregateProducts(companyId, `${ON_HAND_BASE} AND p.hold = 1`),
    aggregateProducts(
      companyId,
      ` AND p.visibility = 1 AND p.box_id <> '' AND p.box_id IS NOT NULL `
    ),
    aggregateProducts(
      companyId,
      ` AND p.visibility = 1 AND p.parcel_id <> '' AND p.parcel_id IS NOT NULL `
    ),
    aggregateProducts(
      companyId,
      ` AND p.visibility = 1 AND p.pair <> '' AND p.pair IS NOT NULL `
    ),
    getPurchaseSummary(companyId),
    getSaleExportSummary(companyId),
  ]);

  return {
    onHand,
    onHandGia,
    onHandNonGia,
    lab,
    memo,
    memoGia,
    memoNonGia,
    saleExport,
    saleGia,
    saleNonGia,
    hold,
    box,
    parcel,
    pair,
    purchase,
    saleExportLedger,
  };
}

/**
 * Sale/export totals from the outward ledger (one row per invoice), which is
 * the same source the dashboard trend series uses. dai_product.amount cannot be
 * used here: it holds the inward cost, and sold rows include retired
 * (visibility = 0) and box/parcel container duplicates.
 */
async function getSaleExportSummary(companyId) {
  const sql = `
    SELECT
      COUNT(o.id) AS count,
      COALESCE(SUM(o.final_amount), 0) AS amount
    FROM dai_outward o
    WHERE o.company = ?
      AND (o.type = 'sale' OR o.type = 'export')
  `;
  const rows = await helper.query(sql, [companyId]);
  const row = rows[0] || {};
  return {
    pcs: 0,
    carat: 0,
    amount: Number(row.amount) || 0,
    count: Number(row.count) || 0,
  };
}

async function getPurchaseSummary(companyId) {
  const sql = `
    SELECT
      COUNT(i.id) AS count,
      COALESCE(SUM(i.final_amount), 0) AS amount
    FROM dai_inward i
    WHERE i.company = ?
      AND i.inward_type = 'purchase'
  `;
  const rows = await helper.query(sql, [companyId]);
  const row = rows[0] || {};
  return {
    pcs: 0,
    carat: 0,
    amount: Number(row.amount) || 0,
    count: Number(row.count) || 0,
  };
}

function toDonutGroups(rows, totalFallback = 0) {
  const items = (rows || []).map((r) => ({
    label: String(r.k || r.label || "Other").trim() || "Other",
    count: Number(r.n || r.count) || 0,
  }));
  const total = items.reduce((s, i) => s + i.count, 0) || totalFallback || 1;
  return items.slice(0, 5).map((item, index) => ({
    label: item.label,
    count: item.count,
    percentage: Math.round((item.count / total) * 100),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));
}

async function getOnHandBreakdowns(companyId) {
  const baseJoin = `
    FROM dai_product p
    JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ?
      AND p.visibility = 1
      AND p.polish_carat <> 0
      AND (p.outward = '' OR p.outward IS NULL)
      AND (p.box_id = '' OR p.box_id IS NULL)
      AND (p.parcel_id = '' OR p.parcel_id IS NULL)
  `;

  const [shapeRows, colorRows, clarityRows, typeRows, totalRow] = await Promise.all([
    helper.query(
      `SELECT pv.shape AS k, COUNT(*) AS n ${baseJoin} GROUP BY pv.shape ORDER BY n DESC LIMIT 8`,
      [companyId]
    ),
    helper.query(
      `SELECT pv.color AS k, COUNT(*) AS n ${baseJoin} GROUP BY pv.color ORDER BY n DESC LIMIT 8`,
      [companyId]
    ),
    helper.query(
      `SELECT pv.clarity AS k, COUNT(*) AS n ${baseJoin} GROUP BY pv.clarity ORDER BY n DESC LIMIT 8`,
      [companyId]
    ),
    helper.query(
      `SELECT
        CASE
          WHEN p.hold = 1 THEN 'HOLD'
          WHEN p.pair <> '' AND p.pair IS NOT NULL THEN 'PAIR'
          WHEN p.box_id <> '' AND p.box_id IS NOT NULL THEN 'BOX'
          WHEN p.parcel_id <> '' AND p.parcel_id IS NOT NULL THEN 'PARCEL'
          ELSE 'SINGLE'
        END AS k,
        COUNT(*) AS n
      ${baseJoin}
      GROUP BY k
      ORDER BY n DESC`,
      [companyId]
    ),
    helper.query(`SELECT COUNT(p.id) AS total ${baseJoin}`, [companyId]),
  ]);

  const total = Number(totalRow[0]?.total) || 0;

  return {
    total,
    byShape: toDonutGroups(shapeRows, total),
    byColor: toDonutGroups(colorRows, total),
    byClarity: toDonutGroups(clarityRows, total),
    byType: toDonutGroups(typeRows, total),
    totals: await aggregateProducts(companyId, ON_HAND_BASE),
  };
}

async function getDueSalePayments(companyId, userId, isAdmin) {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const ndate = end.toISOString().slice(0, 10);

  let sql = `
    SELECT o.id, o.entryno, o.party, o.final_amount, o.paid_amount, o.due_amount, o.products, p.name AS party_name
    FROM dai_outward o
    LEFT JOIN dai_party p ON o.party = p.id
    WHERE o.duedate IS NOT NULL
      AND o.duedate <= ?
      AND o.due_amount <> 0
      AND (o.type = 'sale' OR o.type = 'export')
      AND (o.status = 'on_sale' OR o.status = 'on_export')
      AND o.products <> ''
      AND o.company = ?
  `;
  const params = [ndate, companyId];

  if (!isAdmin && userId) {
    sql += " AND o.user = ?";
    params.push(userId);
  }

  sql += " ORDER BY o.entryno LIMIT 20";

  const rows = await helper.query(sql, params);
  return mapDuePaymentRows(rows);
}

async function getDuePurchasePayments(companyId, userId, isAdmin) {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const ndate = end.toISOString().slice(0, 10);

  let sql = `
    SELECT i.id, i.entryno, i.party, i.final_amount, i.paid_amount, i.due_amount, i.products, p.name AS party_name
    FROM dai_inward i
    LEFT JOIN dai_party p ON i.party = p.id
    WHERE i.duedate IS NOT NULL
      AND i.duedate <= ?
      AND i.due_amount <> 0
      AND (LOWER(i.inward_type) = 'purchase')
      AND (i.deleted = 0 OR i.deleted IS NULL)
      AND i.company = ?
  `;
  const params = [ndate, companyId];

  if (!isAdmin && userId) {
    sql += " AND i.user = ?";
    params.push(userId);
  }

  sql += " ORDER BY i.entryno DESC LIMIT 20";

  const rows = await helper.query(sql, params);
  return mapDuePaymentRows(rows);
}

async function getRecentTransactions(companyId, limit = 5) {
  const sql = `
    (
      SELECT 'Sale Invoice' AS type, o.invoiceno AS ref, p.name AS party,
             o.date AS txn_date, o.final_amount AS amount, o.status AS status, o.type AS txn_type
      FROM dai_outward o
      LEFT JOIN dai_party p ON o.party = p.id
      WHERE o.company = ? AND (o.type = 'sale' OR o.type = 'export')
    )
    UNION ALL
    (
      SELECT 'Purchase' AS type, i.invoiceno AS ref, p.name AS party,
             i.date AS txn_date, i.final_amount AS amount, i.inward_type AS status, i.inward_type AS txn_type
      FROM dai_inward i
      LEFT JOIN dai_party p ON i.party = p.id
      WHERE i.company = ? AND i.inward_type = 'purchase'
        AND (i.deleted = 0 OR i.deleted IS NULL)
    )
    ORDER BY txn_date DESC
    LIMIT ?
  `;
  const rows = await helper.query(sql, [companyId, companyId, limit]);
  return (rows || []).map((row) => ({
    type: row.type || "Transaction",
    ref: row.ref || "-",
    party: row.party || "-",
    date: row.txn_date,
    amount: Number(row.amount) || 0,
    status: row.status || row.txn_type || "Active",
  }));
}

async function getTopParties(companyId, limit = 5) {
  const sql = `
    SELECT p.name, COALESCE(SUM(o.final_amount), 0) AS amount
    FROM dai_outward o
    LEFT JOIN dai_party p ON o.party = p.id
    WHERE o.company = ?
      AND (o.type = 'sale' OR o.type = 'export')
    GROUP BY o.party, p.name
    ORDER BY amount DESC
    LIMIT ?
  `;
  const rows = await helper.query(sql, [companyId, limit]);
  return (rows || []).map((r) => ({
    name: r.name || "Unknown",
    amount: Number(r.amount) || 0,
  }));
}

async function getDashboardSummary(req) {
  const companyId = resolveCompanyId(req);
  const userId = req.user?.user_id;
  const isAdmin = Number(req.user?.roll) === 1;

  const [widgets, breakdowns, duePayments, purchaseDuePayments, recentTransactions, topParties] =
    await Promise.all([
      getWidgetCounts(companyId),
      getOnHandBreakdowns(companyId),
      getDueSalePayments(companyId, userId, isAdmin),
      getDuePurchasePayments(companyId, userId, isAdmin),
      getRecentTransactions(companyId, 5),
      getTopParties(companyId, 5),
    ]);

  const memoPercent =
    widgets.onHand.pcs > 0
      ? ((widgets.memo.pcs / widgets.onHand.pcs) * 100).toFixed(2)
      : "0.00";

  return {
    widgets,
    memoPercent,
    breakdowns,
    duePayments,
    purchaseDuePayments,
    recentTransactions,
    topParties,
  };
}

async function getInventorySummary(req) {
  const companyId = resolveCompanyId(req);
  const [widgets, breakdowns] = await Promise.all([
    getWidgetCounts(companyId),
    getOnHandBreakdowns(companyId),
  ]);

  return {
    totals: breakdowns.totals,
    totalItems: breakdowns.total,
    byType: breakdowns.byType,
    byShape: breakdowns.byShape,
    byColor: breakdowns.byColor,
    byClarity: breakdowns.byClarity,
    widgets: {
      onHand: widgets.onHand,
      hold: widgets.hold,
      box: widgets.box,
      parcel: widgets.parcel,
      pair: widgets.pair,
      lab: widgets.lab,
      memo: widgets.memo,
      saleExport: widgets.saleExport,
      saleExportLedger: widgets.saleExportLedger,
      purchase: widgets.purchase,
    },
  };
}

module.exports = {
  resolveCompanyId,
  getDashboardSummary,
  getInventorySummary,
  getWidgetCounts,
  getOnHandBreakdowns,
};
