try { require("dotenv").config(); } catch (e) { }
const { AsyncLocalStorage } = require("async_hooks");
const mysql = require("mysql");

const tenantStorage = new AsyncLocalStorage();
const poolCache = new Map();
const poolLastUsed = new WeakMap();
const MAX_POOLS = 30;
const POOL_IDLE_EVICT_MS = 5 * 60 * 1000;

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || "3306",
};

const META_DB = process.env.DB_NAME || "shreehkweb_snj2024";

function createPool(database) {
  // perf: pool size via env; default 10 matches prior behavior
  const connectionLimit = Math.max(1, Number(process.env.DB_CONNECTION_LIMIT) || 10);
  return mysql.createPool({
    ...dbConfig,
    database,
    connectionLimit,
  });
}

function touchPool(pool) {
  if (pool) poolLastUsed.set(pool, Date.now());
  return pool;
}

function getMetaPool() {
  // perf: one cache key for meta DB (same object as getPoolForDb(META_DB))
  if (!poolCache.has(META_DB)) {
    poolCache.set(META_DB, createPool(META_DB));
  }
  return touchPool(poolCache.get(META_DB));
}

/** mysql@2.18.1: all connections free and none acquiring (safe to end). */
function isPoolIdle(pool) {
  if (!pool || pool._closed) return false;
  const all = pool._allConnections;
  const free = pool._freeConnections;
  const acquiring = pool._acquiringConnections;
  if (!Array.isArray(all) || !Array.isArray(free)) return false;
  if (Array.isArray(acquiring) && acquiring.length > 0) return false;
  return free.length === all.length;
}

function getPoolForDb(dbName) {
  const key = dbName || META_DB;
  // Same pool object as getMetaPool() when targeting meta database
  if (key === META_DB) return getMetaPool();

  if (!poolCache.has(key)) {
    if (poolCache.size >= MAX_POOLS) {
      // perf: evict oldest non-meta idle+stale pool; never meta / never this request's pool
      const store = getTenantStore();
      const activeKey = store?.dbName || null;
      const activePool = store?.pool || null;
      const now = Date.now();

      let evictKey = null;
      for (const k of poolCache.keys()) {
        if (k === META_DB) continue;
        if (activeKey && k === activeKey) continue;
        const candidate = poolCache.get(k);
        if (activePool && candidate === activePool) continue;
        // mysql@2.18.1 pool.end() does NOT wait for in-use conns — only end idle pools
        if (!isPoolIdle(candidate)) continue;
        const lastUsed = poolLastUsed.get(candidate) || 0;
        if (now - lastUsed <= POOL_IDLE_EVICT_MS) continue;
        evictKey = k;
        break;
      }
      // If none qualify, skip eviction (temporary excess over MAX_POOLS is allowed)
      if (evictKey) {
        const old = poolCache.get(evictKey);
        poolCache.delete(evictKey);
        if (old && typeof old.end === "function") {
          old.end(() => { });
        }
      }
    }
    poolCache.set(key, createPool(key));
  }
  return touchPool(poolCache.get(key));
}

function getActivePool() {
  const store = tenantStorage.getStore();
  if (store?.pool) return touchPool(store.pool);
  return getMetaPool();
}

function runWithTenant(ctx, fn) {
  return tenantStorage.run(ctx, fn);
}

function getTenantStore() {
  return tenantStorage.getStore() || null;
}

const connection = {
  META_DB,
  getMetaPool,
  getPoolForDb,
  getActivePool,
  runWithTenant,
  getTenantStore,

  query(sql, values, cb) {
    const pool = getActivePool();
    if (typeof values === "function") {
      return pool.query(sql, values);
    }
    return pool.query(sql, values, cb);
  },

  escape(val) {
    return getActivePool().escape(val);
  },

  getConnection(cb) {
    return getActivePool().getConnection(cb);
  },
};

getMetaPool().getConnection((err, conn) => {
  if (err) {
    console.error("Error connecting to MySQL (meta): ", err);
    return;
  }
  console.log(`Connected to MySQL (meta: ${META_DB})`);
  conn.release();
});

module.exports = connection;
