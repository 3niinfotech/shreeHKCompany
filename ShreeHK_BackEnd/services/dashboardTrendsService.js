const helper = require("../helper.js");
const { resolveCompanyId, getWidgetCounts } = require("./inventorySummaryService.js");

const RANGE_CONFIG = {
  "1m": { days: 30, grain: "day" },
  "3m": { days: 90, grain: "day" },
  "6m": { days: 183, grain: "month" },
  "12m": { days: 365, grain: "month" },
};

const INFLOW_ACTIONS = [
  "purchase",
  "inward",
  "import",
  "memo_return",
  "consign_return",
  "sale_return",
  "export_return",
  "lab_return",
];

const OUTFLOW_ACTIONS = [
  "sale",
  "export",
  "memo",
  "consign",
  "lab",
  "purchase_return",
];

// Actions that raise / lower the carat balance held in each location
const LAB_IN_ACTIONS = ["lab"];
const LAB_OUT_ACTIONS = ["lab_return"];
const MEMO_IN_ACTIONS = ["memo", "consign"];
const MEMO_OUT_ACTIONS = ["memo_return", "consign_return"];

// Mirrors of the lab / memo widget product filters in inventorySummaryService
const LAB_PRODUCT_WHERE = ` AND (p.lab = '' OR p.lab IS NULL) `;
const MEMO_PRODUCT_WHERE = `
  AND p.visibility = 1
  AND (p.box_id = '' OR p.box_id IS NULL)
  AND (p.parcel_id = '' OR p.parcel_id IS NULL)
`;

const BALANCE_EPSILON = 0.05;

const toIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
};

const startOfUtcDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const addUtcDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const startOfUtcMonth = (date) => {
  const d = startOfUtcDay(date);
  d.setUTCDate(1);
  return d;
};

const addUtcMonths = (date, months) => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const formatIso = (date) => startOfUtcDay(date).toISOString().slice(0, 10);

const resolveRange = (raw) => {
  const key = RANGE_CONFIG[raw] ? raw : "1m";
  const { days, grain } = RANGE_CONFIG[key];
  const to = addUtcDays(startOfUtcDay(new Date()), 1);
  const from = addUtcDays(to, -days);
  return { key, days, grain, from, to };
};

const periodExpr = (grain, column) =>
  grain === "month"
    ? `DATE_FORMAT(${column}, '%Y-%m-01')`
    : `DATE(${column})`;

const buildPeriodKeys = (from, to, grain) => {
  const keys = [];
  if (grain === "month") {
    let cursor = startOfUtcMonth(from);
    const end = startOfUtcMonth(addUtcDays(to, -1));
    while (cursor.getTime() <= end.getTime()) {
      keys.push(formatIso(cursor));
      cursor = addUtcMonths(cursor, 1);
    }
    return keys;
  }
  let cursor = startOfUtcDay(from);
  const end = startOfUtcDay(addUtcDays(to, -1));
  while (cursor.getTime() <= end.getTime()) {
    keys.push(formatIso(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return keys;
};

const rowsToMap = (rows, keyField, valueField) => {
  const map = new Map();
  for (const row of rows || []) {
    const key = toIsoDate(row[keyField]);
    if (!key) continue;
    map.set(key, Number(row[valueField]) || 0);
  }
  return map;
};

const fillSeries = (keys, map, extraMaps = {}) =>
  keys.map((period) => {
    const point = { period, amount: Number(map.get(period)) || 0 };
    for (const [field, source] of Object.entries(extraMaps)) {
      point[field] = Number(source.get(period)) || 0;
    }
    return point;
  });

const changePct = (current, previous) => {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Number((((cur - prev) / prev) * 100).toFixed(1));
};

const compareWindow = async (companyId, from, to) => {
  const [saleRows, purchaseRows, memoRows] = await Promise.all([
    helper.query(
      `SELECT COALESCE(SUM(final_amount), 0) AS amount
       FROM dai_outward
       WHERE company = ?
         AND (type = 'sale' OR type = 'export')
         AND date >= ? AND date < ?`,
      [companyId, from, to]
    ),
    helper.query(
      `SELECT COALESCE(SUM(final_amount), 0) AS amount
       FROM dai_inward
       WHERE company = ?
         AND LOWER(inward_type) = 'purchase'
         AND (deleted = 0 OR deleted IS NULL)
         AND date >= ? AND date < ?`,
      [companyId, from, to]
    ),
    helper.query(
      `SELECT COALESCE(SUM(final_amount), 0) AS amount
       FROM dai_outward
       WHERE company = ?
         AND (type = 'memo' OR type = 'consign')
         AND date >= ? AND date < ?`,
      [companyId, from, to]
    ),
  ]);
  return {
    sale: Number(saleRows[0]?.amount) || 0,
    purchase: Number(purchaseRows[0]?.amount) || 0,
    memo: Number(memoRows[0]?.amount) || 0,
  };
};

const queryGroupedAmount = (sql, params) => helper.query(sql, params);

async function getFlowSeries(companyId, from, to, grain) {
  const bucket = periodExpr(grain, "date");
  const [saleRows, purchaseRows, memoRows] = await Promise.all([
    queryGroupedAmount(
      `SELECT ${bucket} AS period, COALESCE(SUM(final_amount), 0) AS amount
       FROM dai_outward
       WHERE company = ?
         AND (type = 'sale' OR type = 'export')
         AND date >= ? AND date < ?
       GROUP BY ${bucket}
       ORDER BY period`,
      [companyId, from, to]
    ),
    queryGroupedAmount(
      `SELECT ${bucket} AS period, COALESCE(SUM(final_amount), 0) AS amount
       FROM dai_inward
       WHERE company = ?
         AND LOWER(inward_type) = 'purchase'
         AND (deleted = 0 OR deleted IS NULL)
         AND date >= ? AND date < ?
       GROUP BY ${bucket}
       ORDER BY period`,
      [companyId, from, to]
    ),
    queryGroupedAmount(
      `SELECT ${bucket} AS period, COALESCE(SUM(final_amount), 0) AS amount
       FROM dai_outward
       WHERE company = ?
         AND (type = 'memo' OR type = 'consign')
         AND date >= ? AND date < ?
       GROUP BY ${bucket}
       ORDER BY period`,
      [companyId, from, to]
    ),
  ]);

  const keys = buildPeriodKeys(from, to, grain);
  const saleMap = rowsToMap(saleRows, "period", "amount");
  const purchaseMap = rowsToMap(purchaseRows, "period", "amount");
  const memoMap = rowsToMap(memoRows, "period", "amount");

  return keys.map((period) => ({
    period,
    sale: Number(saleMap.get(period)) || 0,
    purchase: Number(purchaseMap.get(period)) || 0,
    memo: Number(memoMap.get(period)) || 0,
  }));
}

async function getSaleSeries(companyId, from, to, grain) {
  const bucket = periodExpr(grain, "date");
  const rows = await helper.query(
    `SELECT ${bucket} AS period, COALESCE(SUM(final_amount), 0) AS amount
     FROM dai_outward
     WHERE company = ?
       AND (type = 'sale' OR type = 'export')
       AND date >= ? AND date < ?
     GROUP BY ${bucket}
     ORDER BY period`,
    [companyId, from, to]
  );
  return fillSeries(buildPeriodKeys(from, to, grain), rowsToMap(rows, "period", "amount"));
}

const actionList = (actions) => actions.map((action) => `'${action}'`).join(",");

/**
 * Per-period increase/decrease of a balance, from the stone history ledger.
 * `column` is the history column to sum: `amount` for value, `carat` for weight.
 */
async function getBalanceMovements(
  companyId,
  from,
  to,
  grain,
  column,
  increaseActions,
  decreaseActions,
  productWhere = ""
) {
  const bucket = periodExpr(grain, "h.date");
  return helper.query(
    `SELECT
       ${bucket} AS period,
       COALESCE(SUM(CASE WHEN h.action IN (${actionList(increaseActions)}) THEN COALESCE(h.${column}, 0) ELSE 0 END), 0) AS increase,
       COALESCE(SUM(CASE WHEN h.action IN (${actionList(decreaseActions)}) THEN COALESCE(h.${column}, 0) ELSE 0 END), 0) AS decrease
     FROM dai_history h
     INNER JOIN dai_product p ON p.id = h.product_id
     WHERE p.company = ?
       ${productWhere}
       AND h.action IN (${actionList([...increaseActions, ...decreaseActions])})
       AND h.date >= ? AND h.date < ?
     GROUP BY ${bucket}
     ORDER BY period`,
    [companyId, from, to]
  );
}

/**
 * Walk a balance backwards from today's real figure, undoing each period's net
 * movement. The newest point equals the anchor by construction, so it is not a
 * validation signal. The usable evidence is a balance that goes materially
 * negative on the way back: that proves the history is incomplete, and the
 * caller drops the series rather than plotting a clamped, invented line.
 */
function walkBalanceBackwards(anchor, keys, increaseMap, decreaseMap) {
  const values = new Array(keys.length);
  let running = Number(anchor) || 0;
  let minValue = running;

  for (let i = keys.length - 1; i >= 0; i -= 1) {
    const rounded = Number(running.toFixed(2));
    values[i] = rounded;
    if (rounded < minValue) minValue = rounded;
    running =
      running -
      (Number(increaseMap.get(keys[i])) || 0) +
      (Number(decreaseMap.get(keys[i])) || 0);
  }

  const tolerance = Math.abs(Number(anchor) || 0) * 0.01 + BALANCE_EPSILON;
  return {
    values: values.map((value) => Math.max(0, value)),
    trustworthy: minValue >= -tolerance,
  };
}

async function getStockValueSeries(companyId, from, to, grain, currentAmount) {
  let rows;
  try {
    rows = await getBalanceMovements(
      companyId,
      from,
      to,
      grain,
      "amount",
      INFLOW_ACTIONS,
      OUTFLOW_ACTIONS
    );
  } catch (error) {
    console.error("dashboard/trends stockValueSeries history query failed:", error.message);
    return { series: null, reconciled: false };
  }

  const hasMovement = rows.some(
    (row) => Number(row.increase) || Number(row.decrease)
  );
  if (!hasMovement) {
    return { series: null, reconciled: false };
  }

  const keys = buildPeriodKeys(from, to, grain);
  const { values, trustworthy } = walkBalanceBackwards(
    currentAmount,
    keys,
    rowsToMap(rows, "period", "increase"),
    rowsToMap(rows, "period", "decrease")
  );

  if (!trustworthy) {
    console.warn(
      "dashboard/trends stockValueSeries dropped: reconstructed value went negative"
    );
    return { series: null, reconciled: false };
  }

  return {
    series: keys.map((period, index) => ({ period, amount: values[index] })),
    reconciled: true,
  };
}

/**
 * Carat held in a location (lab, memo) over time, reconstructed backwards from
 * the current real widget carat using history rows that carry `carat`.
 * `productWhere` must mirror the widget's own product filter, otherwise the
 * movements and the anchor describe different populations and the walk drifts.
 */
async function getCaratBalanceSeries(
  companyId,
  from,
  to,
  grain,
  currentCarat,
  increaseActions,
  decreaseActions,
  label,
  productWhere = ""
) {
  let rows;
  try {
    rows = await getBalanceMovements(
      companyId,
      from,
      to,
      grain,
      "carat",
      increaseActions,
      decreaseActions,
      productWhere
    );
  } catch (error) {
    console.error(`dashboard/trends ${label} carat series query failed:`, error.message);
    return null;
  }

  const hasMovement = rows.some(
    (row) => Number(row.increase) || Number(row.decrease)
  );
  if (!hasMovement) return null;

  const keys = buildPeriodKeys(from, to, grain);
  const { values, trustworthy } = walkBalanceBackwards(
    currentCarat,
    keys,
    rowsToMap(rows, "period", "increase"),
    rowsToMap(rows, "period", "decrease")
  );

  if (!trustworthy) {
    console.warn(
      `dashboard/trends ${label} carat series dropped: reconstructed balance went negative`
    );
    return null;
  }

  return keys.map((period, index) => ({ period, carat: values[index] }));
}

async function getDashboardTrends(req) {
  const companyId = resolveCompanyId(req);
  const { key, days, grain, from, to } = resolveRange(req.query?.range);
  const previousFrom = addUtcDays(from, -days);

  const [widgets, flow, saleSeries, currentTotals, previousTotals] = await Promise.all([
    getWidgetCounts(companyId),
    getFlowSeries(companyId, from, to, grain),
    getSaleSeries(companyId, from, to, grain),
    compareWindow(companyId, from, to),
    compareWindow(companyId, previousFrom, from),
  ]);

  const [stock, labCaratSeries, memoCaratSeries] = await Promise.all([
    getStockValueSeries(companyId, from, to, grain, widgets.onHand?.amount),
    getCaratBalanceSeries(
      companyId,
      from,
      to,
      grain,
      widgets.lab?.carat,
      LAB_IN_ACTIONS,
      LAB_OUT_ACTIONS,
      "lab",
      LAB_PRODUCT_WHERE
    ),
    getCaratBalanceSeries(
      companyId,
      from,
      to,
      grain,
      widgets.memo?.carat,
      MEMO_IN_ACTIONS,
      MEMO_OUT_ACTIONS,
      "memo",
      MEMO_PRODUCT_WHERE
    ),
  ]);

  const caratChange = (series) =>
    series && series.length > 1
      ? changePct(series[series.length - 1].carat, series[0].carat)
      : null;

  return {
    range: key,
    grain,
    from: formatIso(from),
    to: formatIso(addUtcDays(to, -1)),
    flow,
    saleSeries,
    stockValueSeries: stock.series,
    stockValueReconciled: stock.reconciled,
    labCaratSeries,
    memoCaratSeries,
    compare: {
      sale: {
        current: currentTotals.sale,
        previous: previousTotals.sale,
        changePct: changePct(currentTotals.sale, previousTotals.sale),
      },
      purchase: {
        current: currentTotals.purchase,
        previous: previousTotals.purchase,
        changePct: changePct(currentTotals.purchase, previousTotals.purchase),
      },
      memo: {
        current: currentTotals.memo,
        previous: previousTotals.memo,
        changePct: changePct(currentTotals.memo, previousTotals.memo),
      },
      stock: {
        current: Number(widgets.onHand?.amount) || 0,
        previous: stock.series?.[0]?.amount ?? null,
        changePct:
          stock.series && stock.series.length > 1
            ? changePct(stock.series[stock.series.length - 1].amount, stock.series[0].amount)
            : null,
      },
      labCarat: {
        current: Number(widgets.lab?.carat) || 0,
        previous: labCaratSeries?.[0]?.carat ?? null,
        changePct: caratChange(labCaratSeries),
      },
      memoCarat: {
        current: Number(widgets.memo?.carat) || 0,
        previous: memoCaratSeries?.[0]?.carat ?? null,
        changePct: caratChange(memoCaratSeries),
      },
    },
  };
}

module.exports = {
  getDashboardTrends,
};
