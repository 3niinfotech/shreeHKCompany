try { require("dotenv").config(); } catch (e) {}
const { AsyncLocalStorage } = require("async_hooks");
const mysql = require("mysql");

const tenantStorage = new AsyncLocalStorage();
const poolCache = new Map();
const MAX_POOLS = 30;

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || "3306",
};

const META_DB = process.env.DB_NAME || "shreehkweb_snj2024";

function createPool(database) {
  return mysql.createPool({
    ...dbConfig,
    database,
    connectionLimit: 10,
  });
}

function getMetaPool() {
  if (!poolCache.has("__meta__")) {
    poolCache.set("__meta__", createPool(META_DB));
  }
  return poolCache.get("__meta__");
}

function getPoolForDb(dbName) {
  const key = dbName || META_DB;
  if (!poolCache.has(key)) {
    if (poolCache.size >= MAX_POOLS) {
      const firstKey = poolCache.keys().next().value;
      if (firstKey && firstKey !== "__meta__") {
        const old = poolCache.get(firstKey);
        old?.end?.(() => {});
        poolCache.delete(firstKey);
      }
    }
    poolCache.set(key, createPool(key));
  }
  return poolCache.get(key);
}

function getActivePool() {
  const store = tenantStorage.getStore();
  if (store?.pool) return store.pool;
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
