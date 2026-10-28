const connection = require("./connection.js");
const { isSuperAdminRoll } = require("./permissionHelper.js");

const META_ONLY_PREFIXES = [
  "/user/",
  "/session/",
  "/portal/",
  "/admin/tenant-company",
  "/admin/branch",
  "/admin/activity-log",
  "/getAdminManageUser",
  "/admin-manage-user",
  "/manage-user/",
  "/getLoginAllUsers",
  "/addNewUser",
  "/deleteUser",
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
  const headerCompanyId = req.headers ? Number(req.headers["x-company-id"] || req.headers["x-company-id"]) : 0;
  const companyId = Number(req.companyId ?? req.user?.companyId ?? (headerCompanyId > 0 ? headerCompanyId : 0)) || 0;
  return {
    companyId: companyId > 0 ? companyId : 0,
    yearId: Number(req.yearId ?? req.user?.yearId ?? (req.headers ? req.headers["x-year-id"] : null)) || null,
    dbName: req.dbName ?? req.user?.dbName ?? connection.META_DB,
    db: req.db ?? connection.getActivePool(),
  };
}

function buildUserContext(req) {
  const scope = getTenantScope(req);
  const headerBranchId = req.headers ? Number(req.headers["x-branch-id"] || 0) : 0;
  return {
    companyId: scope.companyId || 0,
    branchId: Number(req.user?.branchId ?? headerBranchId) || 0,
    userId: req.user?.user_id,
    user_id: req.user?.user_id,
    username: req.user?.username,
    yearId: scope.yearId,
    dbName: scope.dbName,
    isSuperAdmin: isSuperAdminRoll(req.user?.roll) || req.user?.type === "admin" || Boolean(req.user?.is_admin),
  };
}

async function getCompanyIdsByBranchId(branchId) {
  const bid = Number(branchId) || 0;
  if (!bid) return [];
  try {
    const rows = await metaQuery(
      `SELECT id FROM company WHERE branch_id = ? ORDER BY id ASC`,
      [bid]
    );
    return (rows || []).map((r) => Number(r.id)).filter((id) => id > 0);
  } catch {
    return [];
  }
}

/**
 * All tenant company ids under the same branch as the session company.
 * HK login → [ShreeHK International, KG, ...] so stock/lists can include every company in branch.
 */
async function getBranchCompanyIds(sessionCompanyId) {
  const sid = Number(sessionCompanyId) || 0;
  if (!sid) return [];
  try {
    const sessionRows = await metaQuery(
      `SELECT branch_id FROM company WHERE id = ? LIMIT 1`,
      [sid]
    );
    const branchId =
      sessionRows?.[0]?.branch_id != null ? Number(sessionRows[0].branch_id) : null;
    if (!branchId) return [sid];
    const ids = await getCompanyIdsByBranchId(branchId);
    return ids.length ? ids : [sid];
  } catch {
    return [sid];
  }
}

/**
 * Resolve company id list for inventory / transaction lists.
 * Prefer session company → branch siblings; else branch-only session; else fallbackId.
 */
async function resolveListCompanyIds(userContext = {}, fallbackId = 1) {
  const sessionId = Number(userContext.companyId) || 0;
  if (sessionId > 0) {
    const ids = await getBranchCompanyIds(sessionId);
    return ids.length ? ids : [sessionId];
  }
  const branchId = Number(userContext.branchId) || 0;
  if (branchId > 0) {
    const ids = await getCompanyIdsByBranchId(branchId);
    if (ids.length) return ids;
  }
  const fb = Number(fallbackId) || 1;
  return fb > 0 ? [fb] : [1];
}

/**
 * Resolve operating company for sale/memo/lab/purchase actions.
 * Must be same branch as session company and allowed by roll.
 */
async function resolveOperatingCompanyId(req, requestedCompanyId) {
  const sessionCompanyId = Number(buildUserContext(req).companyId) || 0;
  const requested = Number(requestedCompanyId) || 0;
  const targetId = requested || sessionCompanyId;
  if (!targetId) {
    const err = new Error("Company is required");
    err.statusCode = 400;
    throw err;
  }

  const allowed = await userCanAccessCompany(req.user?.roll, targetId);
  if (!allowed) {
    const err = new Error("Selected company is not allowed for this user");
    err.statusCode = 403;
    throw err;
  }

  if (!sessionCompanyId || targetId === sessionCompanyId) {
    return targetId;
  }

  try {
    const rows = await metaQuery(
      `SELECT c.id AS company_id, c.branch_id, s.branch_id AS session_branch_id
       FROM company c
       JOIN company s ON s.id = ?
       WHERE c.id = ?
       LIMIT 1`,
      [sessionCompanyId, targetId]
    );
    if (!rows.length) {
      const err = new Error("Selected company not found");
      err.statusCode = 404;
      throw err;
    }
    const sessionBranch = rows[0].session_branch_id != null ? Number(rows[0].session_branch_id) : null;
    const targetBranch = rows[0].branch_id != null ? Number(rows[0].branch_id) : null;
    if (sessionBranch && targetBranch && sessionBranch !== targetBranch) {
      const err = new Error("Selected company must belong to the same branch");
      err.statusCode = 400;
      throw err;
    }
  } catch (err) {
    if (err.statusCode) throw err;
    // branch_id column missing — fall back to allow if roll-access already passed
  }

  return targetId;
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
  getBranchCompanyIds,
  getCompanyIdsByBranchId,
  resolveListCompanyIds,
  resolveOperatingCompanyId,
};
