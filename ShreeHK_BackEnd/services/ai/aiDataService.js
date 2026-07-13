const helper = require("../../helper.js");

const ON_HAND_BASE = (companyId) => `
  FROM dai_product p
  JOIN dai_product_value pv ON p.id = pv.product_id
  WHERE p.company = ?
    AND p.visibility = 1
    AND p.polish_carat <> 0
    AND (p.outward = '' OR p.outward IS NULL)
    AND (p.box_id = '' OR p.box_id IS NULL)
    AND (p.parcel_id = '' OR p.parcel_id IS NULL)
`;

const INVENTORY_SELECT = `
  SELECT
    p.id, p.sku, pv.shape, p.polish_carat, pv.color, pv.clarity,
    p.price, p.cost, p.amount, p.hold, p.barcode, p.outward, p.lab
`;

async function getStockAlertContext() {
  const cid = helper.resolveCompanyId();
  const base = ON_HAND_BASE(cid);
  const [countRows, holdRows, shapeRows, clarityRows, sampleRows] = await Promise.all([
    helper.query(`SELECT COUNT(p.id) AS total ${base}`, [cid]),
    helper.query(`SELECT COUNT(p.id) AS holdCount ${base} AND p.hold = 1`, [cid]),
    helper.query(
      `SELECT pv.shape AS k, COUNT(*) AS n ${base} GROUP BY pv.shape ORDER BY n DESC LIMIT 8`,
      [cid]
    ),
    helper.query(
      `SELECT pv.clarity AS k, COUNT(*) AS n ${base} GROUP BY pv.clarity ORDER BY n DESC LIMIT 8`,
      [cid]
    ),
    helper.query(
      `${INVENTORY_SELECT} ${base} ORDER BY p.amount DESC LIMIT 10`,
      [cid]
    ),
  ]);

  const toMap = (rows) =>
    Object.fromEntries((rows || []).map((r) => [r.k || "?", Number(r.n) || 0]));

  return {
    total: countRows[0]?.total || 0,
    onHold: holdRows[0]?.holdCount || 0,
    shapes: toMap(shapeRows),
    clarities: toMap(clarityRows),
    samples: (sampleRows || []).map((r) => ({
      sku: r.sku,
      sh: r.shape,
      ct: r.polish_carat,
      cl: r.color,
      clr: r.clarity,
      pr: r.price,
    })),
  };
}

async function getInventorySnapshot(limit = 40) {
  const cid = helper.resolveCompanyId();
  const base = ON_HAND_BASE(cid);
  const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 40);
  const sql = `${INVENTORY_SELECT} ${base} ORDER BY p.sku LIMIT ?`;
  const rows = await helper.query(sql, [cid, safeLimit]);

  const countSql = `SELECT COUNT(p.id) AS total ${base}`;
  const countRows = await helper.query(countSql, [cid]);
  const total = countRows[0]?.total || rows.length;

  const byShape = {};
  const byClarity = {};
  for (const row of rows) {
    const shape = row.shape || "Unknown";
    const clarity = row.clarity || "Unknown";
    byShape[shape] = (byShape[shape] || 0) + 1;
    byClarity[clarity] = (byClarity[clarity] || 0) + 1;
  }

  const slimRows = rows.slice(0, 20).map((r) => ({
    sku: r.sku,
    shape: r.shape,
    carat: r.polish_carat,
    color: r.color,
    clarity: r.clarity,
    price: r.price,
  }));

  return {
    totalInDb: total,
    sampledCount: slimRows.length,
    aggregates: { byShape, byClarity },
    items: slimRows,
  };
}

async function getSalesLast30Days() {
  const sql = `
    SELECT
      o.id, o.entryno, o.type, o.invoiceno, p.name AS party_name,
      o.date, o.final_amount, o.paid_amount, o.due_amount, o.status
    FROM dai_outward o
    LEFT JOIN dai_party p ON o.party = p.id
    WHERE o.type IN ('sale', 'export')
      AND o.status IN ('on_sale', 'on_export', 'sold', 'exported')
      AND o.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ORDER BY o.date DESC
    LIMIT 20
  `;
  return helper.query(sql);
}

async function getPartyPurchaseHistory(partyId) {
  if (!partyId) return { party: null, sales: [] };

  const partySql = `SELECT id, name, address, contact_number FROM dai_party WHERE id = ? LIMIT 1`;
  const partyRows = await helper.query(partySql, [partyId]);
  const party = partyRows[0] || null;

  const salesSql = `
    SELECT
      o.id, o.entryno, o.invoiceno, o.type, o.date,
      o.final_amount, o.paid_amount, o.due_amount, o.status
    FROM dai_outward o
    WHERE o.party = ?
      AND o.type IN ('sale', 'export', 'memo')
    ORDER BY o.date DESC
    LIMIT 8
  `;
  const sales = await helper.query(salesSql, [partyId]);

  return { party, sales };
}

async function lookupProductByBarcode(barcodeData) {
  const raw = String(barcodeData || "").trim();
  if (!raw) return [];

  const cid = helper.resolveCompanyId();
  const sql = `
    SELECT
      p.id, p.sku, p.barcode, pv.shape, p.polish_carat, pv.color, pv.clarity,
      p.price, p.cost, p.amount, p.hold, p.lab
    FROM dai_product p
    JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ?
      AND p.visibility = 1
      AND (p.barcode = ? OR p.sku = ? OR p.barcode LIKE ? OR p.sku LIKE ?)
    LIMIT 5
  `;
  const like = `%${raw}%`;
  return helper.query(sql, [cid, raw, raw, like, like]);
}

async function getInventoryContextSummary() {
  return getStockAlertContext();
}

module.exports = {
  getStockAlertContext,
  getInventorySnapshot,
  getSalesLast30Days,
  getPartyPurchaseHistory,
  lookupProductByBarcode,
  getInventoryContextSummary,
};
