const { AsyncLocalStorage } = require("async_hooks");
const { getRoleNameByRollId } = require("./auditRoleResolver.js");

const auditStorage = new AsyncLocalStorage();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = String(forwarded).split(",")[0].trim();
    if (ip) return ip;
  }
  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

const buildAuditContextFromReq = (req, overrides = {}) => ({
  userId: overrides.userId ?? req.user?.user_id ?? null,
  userName:
    overrides.userName ??
    req.user?.username ??
    req.user?.user_name ??
    "SYSTEM",
  userRoleId: overrides.userRoleId ?? req.user?.roll ?? null,
  userRole: overrides.userRole ?? req.user?.role_name ?? "",
  companyId:
    overrides.companyId ??
    req.companyId ??
    req.user?.companyId ??
    1,
  ipAddress: overrides.ipAddress ?? getClientIp(req),
  userAgent: String(overrides.userAgent ?? req.headers["user-agent"] ?? "").slice(0, 512),
});

/** Run handler with audit context (call after authenticateToken when req.user exists). */
const runWithAuditContext = (req, overrides, fn) => {
  const ctx = buildAuditContextFromReq(req, overrides);
  return auditStorage.run(ctx, fn);
};

/** Express middleware — attaches ALS context for authenticated requests. */
const attachAuditContext = (req, res, next) => {
  const ctx = { ...buildAuditContextFromReq(req), auditLogged: false };
  auditStorage.run(ctx, () => next());
};

/** Refresh context after JWT auth / tenant — keeps user + company accurate for audit rows. */
const refreshAuditContextFromReq = async (req) => {
  const current = auditStorage.getStore();
  if (!current) return;

  const roleName = req.user?.roll
    ? await getRoleNameByRollId(req.user.roll)
    : current.userRole || "";

  Object.assign(current, {
    userId: req.user?.user_id ?? current.userId ?? null,
    userName: req.user?.username ?? current.userName ?? "Unknown",
    userRoleId: req.user?.roll ?? current.userRoleId ?? null,
    userRole: roleName || current.userRole || "",
    companyId: req.companyId ?? req.user?.companyId ?? current.companyId ?? 1,
    ipAddress: getClientIp(req),
    userAgent: String(req.headers["user-agent"] ?? current.userAgent ?? "").slice(0, 512),
    requestPath: String(req.path || req.url?.split("?")[0] || "").slice(0, 255),
    requestMethod: req.method || "GET",
    pagePath: req.headers["x-audit-page-path"]
      ? String(req.headers["x-audit-page-path"]).slice(0, 255)
      : current.pagePath ?? null,
    pageLabel: req.headers["x-audit-page-label"]
      ? String(req.headers["x-audit-page-label"]).slice(0, 100)
      : current.pageLabel ?? null,
  });
};

const markAuditLogged = () => {
  const current = auditStorage.getStore();
  if (current) current.auditLogged = true;
};

const wasAuditLogged = () => Boolean(auditStorage.getStore()?.auditLogged);

const getAuditContext = () => auditStorage.getStore() || null;

const setAuditContext = (partial) => {
  const current = auditStorage.getStore();
  if (!current) return;
  Object.assign(current, partial);
};

module.exports = {
  auditStorage,
  attachAuditContext,
  buildAuditContextFromReq,
  runWithAuditContext,
  getAuditContext,
  setAuditContext,
  refreshAuditContextFromReq,
  markAuditLogged,
  wasAuditLogged,
  getClientIp,
};
