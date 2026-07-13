const jwt = require("jsonwebtoken");
const { isPublicApiPath } = require("../permissionHelper.js");
const { fetchRowById, fetchRowByField } = require("../services/auditMutationHelper.js");
const { findRule, resolveIdSource } = require("../config/auditSnapshotRegistry.js");
const { setAuditContext } = require("./auditContext.js");

const SECRET_KEY = process.env.JWT_SECRET || "NitechDigitalServices";

const SKIP_PREFIXES = [
  "/admin/activity-log",
  "/health",
  "/uploads/",
  "/user/login",
];

function shouldSkip(method, path) {
  if (isPublicApiPath(path)) return true;
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return true;
  if (method === "GET") return true;
  return false;
}

function decodeUserId(req) {
  if (req.user?.user_id) return req.user.user_id;
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = req.user || decoded;
    return decoded.user_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Loads DB row before mutation handlers run so auditHttpLogger can log before/after.
 */
function auditPreSnapshot(req, res, next) {
  const method = req.method;
  const path = (req.path || req.url.split("?")[0] || "").trim();

  if (shouldSkip(method, path)) return next();

  const rule = findRule(method, path);
  if (!rule) return next();

  decodeUserId(req);

  let idSource = rule.idSource;
  if (idSource === "jwt.user_id") {
    if (!req.user?.user_id) return next();
  }

  Promise.resolve()
    .then(async () => {
      let recordId = resolveIdSource(idSource, req);
      const idColumn = rule.idColumn || "id";

      if (!recordId && rule.fallbackSource) {
        const fallbackVal = resolveIdSource(rule.fallbackSource, req);
        if (fallbackVal) {
          const row = await fetchRowByField(rule.table, rule.fallbackField || idColumn, fallbackVal);
          if (row) {
            setAuditContext({ preSnapshot: row, preSnapshotRule: rule });
          }
          return;
        }
      }

      if (!recordId) return;

      const row = await fetchRowById(rule.table, recordId, idColumn);
      if (row) {
        setAuditContext({ preSnapshot: row, preSnapshotRule: rule });
      }
    })
    .catch((err) => console.error("auditPreSnapshot:", err.message))
    .finally(() => next());
}

module.exports = { auditPreSnapshot };
