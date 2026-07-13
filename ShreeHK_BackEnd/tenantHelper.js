const connection = require("./connection.js");
const { isSuperAdminRoll } = require("./permissionHelper.js");

const META_ONLY_PREFIXES = [
  "/user/",
  "/session/",
  "/portal/",
  "/admin/tenant-company",
  "/admin/activity-log",
  "/role-",
  "/permission-registry",
  "/admin-user",
  "/config/",
  "/health",
];

const metaQuery = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, values, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const dbExistsCache = new Map();

const databaseExists = async (dbName) => {
  const name = String(dbName || "").trim();
  if (!name) return false;
  if (dbExistsCache.has(name)) return dbExistsCache.get(name);

  const rows = await metaQuery(
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1",
    [name]
  );
  const exists = Boolean(rows?.length);
  dbExistsCache.set(name, exists);
  return exists;
};

const parseCompanyJson = (raw) => {
  if (raw == null || raw === "" || raw === "null") return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);

  if (typeof raw === "number" && raw > 0) return [raw];

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      let parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          if (parsed.includes(",")) {
            return parsed.split(",").map((v) => Number(v.trim())).filter(Boolean);
          }
          const n = Number(parsed);
          return n ? [n] : [];
        }
      }
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
      if (typeof parsed === "number" && parsed > 0) return [parsed];
    } catch {
      if (trimmed.includes(",")) {
        return trimmed.split(",").map((v) => Number(v.trim())).filter(Boolean);
      }
      const n = Number(trimmed);
      return n ? [n] : [];
    }
  }

  return [];
};

const userCanAccessCompany = async (rollId, companyId) => {
  if (!companyId) return false;
  const allowed = await getRollCompanyIds(rollId);
  return allowed.includes(Number(companyId));
};

const resolveYearDbName = async (yearId, preferredDbName = null) => {
  if (preferredDbName && await databaseExists(preferredDbName)) {
    return preferredDbName;
  }
  if (!yearId) return connection.META_DB;

  const rows = await metaQuery(
    "SELECT db_name FROM company_year WHERE id = ? LIMIT 1",
    [yearId]
  );
  if (rows?.length && rows[0].db_name && await databaseExists(rows[0].db_name)) {
    return rows[0].db_name;
  }

  const byYear = await metaQuery(
    "SELECT db_name FROM company_year WHERE year = ? OR id = ? ORDER BY id DESC LIMIT 1",
    [String(yearId), yearId]
  );
  if (byYear?.length && byYear[0].db_name && await databaseExists(byYear[0].db_name)) {
    return byYear[0].db_name;
  }

  return connection.META_DB;
};

const getRollCompanyIds = async (rollId) => {
  const roll = Number(rollId);
  if (!roll) return [];

  if (isSuperAdminRoll(roll)) {
    const rows = await metaQuery("SELECT id FROM company ORDER BY id");
    return rows.map((r) => r.id);
  }

  const rows = await metaQuery("SELECT company FROM roll WHERE id = ? LIMIT 1", [roll]);
  if (!rows?.length) return [];

  const allowed = parseCompanyJson(rows[0].company);
  if (allowed.length) return allowed;

  // Legacy roles may have permissions but empty company — allow all companies in meta DB
  const allCompanies = await metaQuery("SELECT id FROM company ORDER BY id");
  return allCompanies.map((r) => r.id);
};

function isMetaOnlyPath(path) {
  const p = path || "";
  return META_ONLY_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function getTenantScope(req) {
  return {
    companyId: Number(req.companyId ?? req.user?.companyId) || 0,
    yearId: Number(req.yearId ?? req.user?.yearId) || null,
    dbName: req.dbName ?? req.user?.dbName ?? connection.META_DB,
    db: req.db ?? connection.getActivePool(),
  };
}

function buildUserContext(req) {
  const scope = getTenantScope(req);
  return {
    companyId: scope.companyId || 1,
    userId: req.user?.user_id,
    user_id: req.user?.user_id,
    username: req.user?.username,
    yearId: scope.yearId,
    dbName: scope.dbName,
  };
}

module.exports = {
  metaQuery,
  parseCompanyJson,
  databaseExists,
  userCanAccessCompany,
  resolveYearDbName,
  getRollCompanyIds,
  isMetaOnlyPath,
  getTenantScope,
  buildUserContext,
};
