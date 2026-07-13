const connection = require("../connection.js");
const {
  userCanAccessCompany,
  resolveYearDbName,
  isMetaOnlyPath,
} = require("../tenantHelper.js");
const { setAuditContext } = require("./auditContext.js");

const attachTenantContext = async (req, res, next) => {
  try {
    const companyId = Number(req.user?.companyId) || 0;
    const yearId = req.user?.yearId != null ? Number(req.user.yearId) : null;
    const path = req.path || req.url?.split("?")[0] || "";

    req.companyId = companyId || null;
    req.yearId = yearId;
    req.dbName = req.user?.dbName || null;

    if (!companyId) {
      return connection.runWithTenant({ pool: connection.getMetaPool() }, () => next());
    }

    const allowed = await userCanAccessCompany(req.user.roll, companyId);
    if (!allowed) {
      return res.status(403).json({
        status: false,
        message: "Access denied for this company.",
      });
    }

    let dbName = await resolveYearDbName(yearId, req.user?.dbName || null);
    if (!dbName) {
      dbName = connection.META_DB;
    }

    const useMeta = isMetaOnlyPath(path);
    const pool = useMeta ? connection.getMetaPool() : connection.getPoolForDb(dbName);

    req.dbName = dbName;
    req.db = pool;

    setAuditContext({
      companyId: companyId || req.user?.companyId || 1,
    });

    connection.runWithTenant(
      { pool, companyId, yearId, dbName },
      () => next()
    );
  } catch (err) {
    console.error("attachTenantContext:", err);
    return res.status(500).json({
      status: false,
      message: "Tenant context failed.",
    });
  }
};

module.exports = { attachTenantContext };
