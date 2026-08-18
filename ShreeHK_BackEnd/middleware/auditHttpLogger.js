const { PAGE_BY_KEY } = require("../config/permissionRegistry.js");
const { getApiPermission, isPublicApiPath } = require("../permissionHelper.js");
const { getAuditContext, wasAuditLogged, markAuditLogged } = require("./auditContext.js");
const { logActivity, diffFields, safeJson } = require("../services/auditService.js");

const LOGGED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE", "GET"]);

const SKIP_PATH_PREFIXES = [
  "/admin/activity-log/track-ui",
  "/admin/activity-log/track",
  "/admin/activity-log",
  "/health",
  "/user/login",
  "/user/logout",
  "/session/keepalive",
  "/uploads/",
];

/** High-frequency GET endpoints — skip to avoid flooding the audit table */
const NOISY_GET_PREFIXES = [
  "/notification",
  "/session/",
  "/health",
  "/admin/activity-log",
  "/uploads/",
  "/dashboard/summary",
  "/dashboard/trends",
  "/common/getIncrement",
  "/product/inventory",
  "/config/",
];

const SKIP_BODY_KEYS = new Set(["pass", "password", "token", "oldPassword", "newPassword"]);

function sanitizeBody(body) {
  if (!body || typeof body !== "object") return body ?? null;
  try {
    return JSON.parse(
      JSON.stringify(body, (key, val) => {
        if (SKIP_BODY_KEYS.has(key)) return "[REDACTED]";
        return val;
      }),
    );
  } catch {
    return { _note: "unserializable body" };
  }
}

function shouldSkipRequest(method, path) {
  if (isPublicApiPath(path)) return true;
  if (SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (method === "GET" && NOISY_GET_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return false;
}

function inferActionType(method, path, body) {
  if (method === "GET") return "API_READ";
  const p = String(path || "").toLowerCase();
  if (method === "DELETE") return "DELETE";
  if (p.includes("export") || p.includes("i-export")) return "EXPORT";
  if (p.includes("print") || p.includes("label")) return "PRINT";
  if (p.includes("download")) return "EXPORT";

  const rawId = body?.id ?? body?.deleteId ?? body?.user_id;
  const numId = Number(rawId);
  if (method === "DELETE" || (Number.isFinite(numId) && numId > 0 && /delete|remove/i.test(p))) {
    return "DELETE";
  }
  if (method === "POST" && (rawId === 0 || rawId === "0" || rawId == null)) {
    return "CREATE";
  }
  return "UPDATE";
}

function resolveModuleLabel(path) {
  const pageKey = getApiPermission(path);
  if (pageKey && PAGE_BY_KEY[pageKey]) return PAGE_BY_KEY[pageKey].label;
  const seg = String(path || "")
    .split("/")
    .filter(Boolean)[0];
  return seg ? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Application";
}

function extractRecordReference(body, path, queryString) {
  if (body && typeof body === "object") {
    const ref =
      body.sku ||
      body.name ||
      body.username ||
      body.user_name ||
      body.invoiceno ||
      body.invoice ||
      body.reference ||
      body.deleteId ||
      body.id;
    if (ref != null && ref !== "") return ref;
  }
  if (queryString) {
    const params = new URLSearchParams(queryString);
    return params.get("deleteId") || params.get("id") || null;
  }
  return path;
}

function buildFallbackDescription(ctx, method, path, actionType, moduleName, body) {
  const who = ctx.userRole ? `${ctx.userName} (${ctx.userRole})` : ctx.userName;
  const ref = extractRecordReference(body, path);
  const refText = ref ? ` — ${ref}` : "";
  if (actionType === "API_READ") {
    return `${who} called GET ${path} [${moduleName}]${refText}`;
  }
  return `${who} ${actionType} via ${method} ${path} [${moduleName}]${refText}`;
}

/**
 * Logs authenticated API calls not already captured by explicit logAuditInTx / logActivity.
 */
function auditHttpLogger(req, res, next) {
  const method = req.method;
  if (!LOGGED_METHODS.has(method)) return next();

  const path = (req.path || req.url.split("?")[0] || "").trim();
  if (shouldSkipRequest(method, path)) return next();

  // Capture ALS store now — wasAuditLogged() alone can miss after await / finish.
  const ctxRef = getAuditContext();
  if (ctxRef) {
    ctxRef.req = req;
    ctxRef.res = res;
  }

  res.on("finish", () => {
    if (req._auditLogged || res._auditLogged || res.locals?._auditLogged || ctxRef?.auditLogged || wasAuditLogged(req, res)) return;
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    req._auditLogged = true;
    res._auditLogged = true;
    if (res.locals) res.locals._auditLogged = true;
    markAuditLogged(res);

    const ctx = ctxRef || getAuditContext() || {};
    if (!ctx.userId) return;

    const body = sanitizeBody(req.body);
    const queryString = req.url?.includes("?") ? req.url.split("?")[1] : null;
    const actionType = inferActionType(method, path, body);
    const moduleName = resolveModuleLabel(path);
    const recordReference = extractRecordReference(body, path, queryString);
    const pagePath = req.headers["x-audit-page-path"];
    const pageLabel = req.headers["x-audit-page-label"];
    const pageSearch = req.headers["x-audit-page-search"];
    const preSnapshot = ctx.preSnapshot ? safeJson(ctx.preSnapshot) : null;

    const pageContext = pagePath
      ? {
        path: String(pagePath).slice(0, 255),
        label: pageLabel ? String(pageLabel).slice(0, 100) : null,
        search: pageSearch ? String(pageSearch).slice(0, 255) : null,
      }
      : null;

    const businessPayload = method === "GET" ? null : safeJson(body);
    let oldValue = null;
    let newValue = null;

    if (actionType === "DELETE" && preSnapshot) {
      oldValue = { record: preSnapshot, pageContext };
      newValue = pageContext ? { pageContext } : null;
    } else if (actionType === "UPDATE" && preSnapshot && businessPayload) {
      oldValue = { record: preSnapshot, pageContext };
      newValue = { record: { ...preSnapshot, ...businessPayload }, pageContext };
    } else if (actionType === "CREATE" && businessPayload) {
      newValue = { record: businessPayload, pageContext };
    } else {
      newValue = {
        record: businessPayload,
        requestPath: path,
        requestMethod: method,
        requestQuery: queryString,
        queryParams: method === "GET" && queryString ? Object.fromEntries(new URLSearchParams(queryString)) : null,
        pageContext,
        statusCode: res.statusCode,
      };
      if (preSnapshot) oldValue = { record: preSnapshot, pageContext };
    }

    const oldRecord = oldValue?.record || (preSnapshot && !oldValue?.pageContext ? preSnapshot : null);
    const newRecord = newValue?.record || businessPayload;

    const changedFields =
      oldRecord && newRecord && actionType === "UPDATE"
        ? diffFields(oldRecord, newRecord)
        : null;

    logActivity({
      actionType,
      moduleName,
      recordId: body?.id ?? body?.deleteId ?? preSnapshot?.id ?? preSnapshot?.user_id ?? null,
      recordReference: recordReference != null ? String(recordReference) : path,
      oldValue,
      newValue,
      changedFields,
      description: buildFallbackDescription(
        ctx,
        method,
        path,
        actionType,
        moduleName,
        body,
      ),
    }).catch((err) => console.error("auditHttpLogger:", err.message));
  });

  next();
}

module.exports = { auditHttpLogger };
