const jwt = require("jsonwebtoken");
const {
  getMatchingApiPermissions,
  isPublicApiPath,
  hasPagePermission,
  getPermissionsForRoll,
  isSuperAdminRoll,
} = require("./permissionHelper.js");
const { isBlacklisted } = require("./middleware/tokenBlacklist.js");
const { attachTenantContext } = require("./middleware/tenantContext.js");
const { refreshAuditContextFromReq } = require("./middleware/auditContext.js");
const { logActivity } = require("./services/auditService.js");
const { touchUserPresence } = require("./services/userPresenceService.js");

const SECRET_KEY = process.env.JWT_SECRET || "NitechDigitalServices";

const logPermissionAttempt = (req, path, userPayload = {}) => {
  logActivity({
    actionType: "ATTEMPTED",
    moduleName: "API",
    recordReference: path || req.path,
    status: "ATTEMPTED",
    userId: userPayload.user_id ?? req.user?.user_id ?? null,
    userName: userPayload.username ?? req.user?.username ?? "Unknown",
    userRoleId: userPayload.roll ?? req.user?.roll ?? null,
    description: `Blocked access to ${path || req.path}`,
  }).catch(() => {});
};

const authenticateToken = (req, res, next) => {
  const token =
    req.header("Authorization") && req.header("Authorization").split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access",
      status: false,
    });
  }

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Forbidden access",
        status: false,
      });
    }
    if (isBlacklisted(user.jti)) {
      return res.status(401).json({
        message: "Token revoked",
        status: false,
      });
    }
    req.user = user;
    touchUserPresence(user.user_id);
    try {
      await refreshAuditContextFromReq(req);
    } catch (ctxErr) {
      console.error("refreshAuditContextFromReq:", ctxErr);
    }
    attachTenantContext(req, res, next);
  });
};

const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: false, message: "Not authenticated." });
  }
  if (!isSuperAdminRoll(req.user.roll)) {
    return res.status(403).json({ status: false, message: "Access denied. Super Admin only." });
  }
  next();
};

/**
 * Attach normalized permissions to req.user (uses short TTL cache).
 */
const loadUserPermissions = async (req, res, next) => {
  try {
    if (!req.user?.roll) {
      req.user.permissions = [];
      return next();
    }
    req.user.permissions = await getPermissionsForRoll(req.user.roll);
    next();
  } catch (err) {
    console.error("loadUserPermissions error:", err);
    return res.status(500).json({ status: false, message: "Failed to load permissions." });
  }
};

const requirePagePermission = (pageKey) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: false, message: "Not authenticated." });
    }
    if (isSuperAdminRoll(req.user.roll)) return next();

    const permissions =
      req.user.permissions || (await getPermissionsForRoll(req.user.roll));

    if (!hasPagePermission(permissions, pageKey)) {
      logPermissionAttempt(req, req.path);
      return res.status(403).json({
        status: false,
        code: "FORBIDDEN_PAGE",
        message: "You do not have permission to access this resource.",
      });
    }
    next();
  } catch (err) {
    console.error("requirePagePermission error:", err);
    return res.status(500).json({ status: false, message: "Permission check failed." });
  }
};

/**
 * Global API permission guard — runs before route handlers when mounted on app.
 */
const enforceApiPermission = async (req, res, next) => {
  const path = req.path || req.url.split("?")[0];

  if (isPublicApiPath(path)) return next();

  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, SECRET_KEY, (err, user) => (err ? reject(err) : resolve(user)));
    });

    if (isBlacklisted(decoded.jti)) {
      return res.status(401).json({
        status: false,
        message: "Token revoked",
      });
    }

    if (isSuperAdminRoll(decoded.roll)) return next();

    const requiredPages = getMatchingApiPermissions(path);
    if (!requiredPages.length) return next();

    const permissions = await getPermissionsForRoll(decoded.roll);
    const allowed = requiredPages.some((pageKey) => hasPagePermission(permissions, pageKey));
    if (!allowed) {
      logPermissionAttempt(req, path, decoded);
      return res.status(403).json({
        status: false,
        code: "FORBIDDEN_PAGE",
        message: "You do not have permission to access this API.",
      });
    }
    next();
  } catch {
    return next();
  }
};

module.exports = {
  authenticateToken,
  isSuperAdmin,
  loadUserPermissions,
  requirePagePermission,
  enforceApiPermission,
};
