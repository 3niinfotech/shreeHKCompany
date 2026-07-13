const helper = require("../../helper.js");

const PRICE_TABLE = "dai_rapnetprice";
const SNAPSHOT_TABLE = "dai_rapnet_live_snapshot";

const INTERVAL_MS = {
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
};

const LOOKBACK_MS = { ...INTERVAL_MS };

const SNAPSHOT_DDL = `
CREATE TABLE IF NOT EXISTS ${SNAPSHOT_TABLE} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recorded_at DATETIME NOT NULL,
  benchmark_price DECIMAL(14,4) NOT NULL,
  change_pct DECIMAL(10,4) NULL,
  daily_high DECIMAL(14,4) NULL,
  daily_low DECIMAL(14,4) NULL,
  shape VARCHAR(32) NULL,
  color VARCHAR(16) NULL,
  clarity VARCHAR(16) NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'poll',
  INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

let tableEnsured = false;

const ensureSnapshotTable = async () => {
  if (tableEnsured) return;
  await helper.query(SNAPSHOT_DDL);
  tableEnsured = true;
};

const norm = (v) => String(v || "").trim().toLowerCase();

const pickBenchmarkRow = (rows) => {
  if (!rows?.length) return null;

  const exact = rows.find((r) => {
    const shape = norm(r.shape);
    const color = norm(r.color);
    const clarity = norm(r.clarity);
    const low = Number(r.low_size);
    const high = Number(r.high_size);
    const carat = 1;
    return (
      shape === "round" &&
      color === "d" &&
      clarity === "vs1" &&
      !Number.isNaN(low) &&
      !Number.isNaN(high) &&
      low <= carat &&
      high >= carat
    );
  });
  if (exact) return exact;

  const roundRows = rows.filter((r) => norm(r.shape) === "round" && r.caratprice != null);
  if (!roundRows.length) return rows[0];

  const avg =
    roundRows.reduce((sum, r) => sum + Number(r.caratprice || 0), 0) / roundRows.length;
  return {
    shape: "round",
    color: "avg",
    clarity: "avg",
    caratprice: avg,
    low_size: null,
    high_size: null,
  };
};

const fetchPriceRows = () =>
  helper.query(`SELECT shape, color, clarity, low_size, high_size, caratprice, date FROM ${PRICE_TABLE}`);

const getBenchmarkFromTable = async () => {
  const rows = await fetchPriceRows();
  const row = pickBenchmarkRow(rows);
  if (!row || row.caratprice == null) return null;

  const price = Number(row.caratprice);
  if (Number.isNaN(price)) return null;

  return {
    price,
    shape: row.shape || null,
    color: row.color || null,
    clarity: row.clarity || null,
    sheetDate: row.date || null,
  };
};

const getLatestSnapshot = async () => {
  await ensureSnapshotTable();
  const rows = await helper.query(
    `SELECT * FROM ${SNAPSHOT_TABLE} ORDER BY recorded_at DESC, id DESC LIMIT 1`
  );
  return rows[0] || null;
};

const getDaySnapshots = async (dayStart) => {
  await ensureSnapshotTable();
  return helper.query(
    `SELECT benchmark_price FROM ${SNAPSHOT_TABLE}
     WHERE recorded_at >= ? AND recorded_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [dayStart, dayStart]
  );
};

const formatDateOnly = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
};

const computeChangePct = (current, previous) => {
  if (previous == null || previous === 0 || current == null) return null;
  return Number((((current - previous) / previous) * 100).toFixed(4));
};

const insertSnapshot = async (source = "poll") => {
  await ensureSnapshotTable();
  const benchmark = await getBenchmarkFromTable();
  if (!benchmark) return null;

  const now = new Date();
  const dayStart = formatDateOnly(now);
  const previous = await getLatestSnapshot();
  const changePct = computeChangePct(benchmark.price, previous?.benchmark_price);

  const dayRows = await getDaySnapshots(dayStart);
  const dayPrices = dayRows.map((r) => Number(r.benchmark_price)).filter((n) => !Number.isNaN(n));
  dayPrices.push(benchmark.price);

  const dailyHigh = dayPrices.length ? Math.max(...dayPrices) : benchmark.price;
  const dailyLow = dayPrices.length ? Math.min(...dayPrices) : benchmark.price;

  const recordedAt = now.toISOString().slice(0, 19).replace("T", " ");

  const result = await helper.query(
    `INSERT INTO ${SNAPSHOT_TABLE}
      (recorded_at, benchmark_price, change_pct, daily_high, daily_low, shape, color, clarity, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recordedAt,
      benchmark.price,
      changePct,
      dailyHigh,
      dailyLow,
      benchmark.shape,
      benchmark.color,
      benchmark.clarity,
      source,
    ]
  );

  return {
    id: result.insertId,
    recorded_at: recordedAt,
    benchmark_price: benchmark.price,
    change_pct: changePct,
    daily_high: dailyHigh,
    daily_low: dailyLow,
    shape: benchmark.shape,
    color: benchmark.color,
    clarity: benchmark.clarity,
    source,
  };
};

const deriveStatus = (recordedAt) => {
  if (!recordedAt) return "WAITING";
  const ts = new Date(recordedAt).getTime();
  if (Number.isNaN(ts)) return "WAITING";
  const ageMs = Date.now() - ts;
  if (ageMs <= 24 * 60 * 60 * 1000) return "LIVE";
  return "STALE";
};

const getLiveSummary = async () => {
  await ensureSnapshotTable();
  let snapshot = await getLatestSnapshot();

  if (!snapshot) {
    const benchmark = await getBenchmarkFromTable();
    if (benchmark) {
      snapshot = await insertSnapshot("poll");
    }
  }

  if (!snapshot) {
    return {
      status: "WAITING",
      connectionStatus: "disconnected",
      price: null,
      changePct: null,
      premiumDiscount: null,
      lastUpdated: null,
      dailyHigh: null,
      dailyLow: null,
      volume: null,
      benchmark: null,
    };
  }

  const status = deriveStatus(snapshot.recorded_at);
  const changePct =
    snapshot.change_pct != null ? Number(snapshot.change_pct) : null;

  return {
    status,
    connectionStatus: status === "WAITING" ? "disconnected" : "connected",
    price: Number(snapshot.benchmark_price),
    changePct,
    premiumDiscount: changePct,
    lastUpdated: snapshot.recorded_at,
    dailyHigh: snapshot.daily_high != null ? Number(snapshot.daily_high) : null,
    dailyLow: snapshot.daily_low != null ? Number(snapshot.daily_low) : null,
    volume: null,
    benchmark: {
      shape: snapshot.shape,
      color: snapshot.color,
      clarity: snapshot.clarity,
    },
  };
};

const bucketKey = (date, interval) => {
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return String(date);
  const bucketMs = INTERVAL_MS[interval] || INTERVAL_MS["1D"];
  return Math.floor(t / bucketMs);
};

const getHistory = async (interval = "1D") => {
  await ensureSnapshotTable();
  const lookback = LOOKBACK_MS[interval] || LOOKBACK_MS["1D"];
  const sinceDate = new Date(Date.now() - lookback);
  const since = sinceDate.toISOString().slice(0, 19).replace("T", " ");

  const rows = await helper.query(
    `SELECT recorded_at, benchmark_price FROM ${SNAPSHOT_TABLE}
     WHERE recorded_at >= ?
     ORDER BY recorded_at ASC`,
    [since]
  );

  if (!rows.length) {
    const benchmark = await getBenchmarkFromTable();
    if (benchmark) {
      const snap = await insertSnapshot("poll");
      if (snap) {
        rows.push({
          recorded_at: snap.recorded_at,
          benchmark_price: snap.benchmark_price,
        });
      }
    }
  }

  const buckets = new Map();
  rows.forEach((row) => {
    const key = bucketKey(row.recorded_at, interval);
    buckets.set(key, {
      time: Math.floor(new Date(row.recorded_at).getTime() / 1000),
      value: Number(row.benchmark_price),
    });
  });

  const points = [...buckets.values()].sort((a, b) => a.time - b.time);

  return { interval, points };
};

module.exports = {
  ensureSnapshotTable,
  insertSnapshot,
  getLiveSummary,
  getHistory,
  getBenchmarkFromTable,
  SNAPSHOT_TABLE,
};
