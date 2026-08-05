/**
 * AI Context Builder Service
 * Assembles user identity, tenant context (company/year), role permissions, and active UI context.
 */

const aiLogger = require("../utils/aiLogger.js");

function buildRequestContext(req) {
  const user = req.user || {};
  const headers = req.headers || {};

  const context = {
    userId: user.user_id ?? user.id ?? null,
    username: user.username || "Guest",
    roleId: user.roll ?? user.userroll ?? user.role_id ?? null,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    companyId: user.companyId || req.companyId || 1,
    yearId: user.yearId || req.yearId || null,
    dbName: user.dbName || req.dbName || null,
    currentPagePath: headers["x-audit-page-path"] || headers["x-page-path"] || "/",
    currentPageLabel: headers["x-audit-page-label"] || "ERP Dashboard",
    timestamp: new Date().toISOString(),
  };

  aiLogger.debug("ContextBuilder", "Assembled request context", {
    userId: context.userId,
    companyId: context.companyId,
    roleId: context.roleId,
    page: context.currentPagePath,
  });

  return context;
}

module.exports = { buildRequestContext };
