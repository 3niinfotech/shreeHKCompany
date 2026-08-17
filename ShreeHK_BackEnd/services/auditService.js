const { getAuditContext, markAuditLogged } = require("../middleware/auditContext.js");
const { auditQuery } = require("./auditDb.js");

const SYSTEM_USER = {
  userId: null,
  userName: "SYSTEM",
  userRole: "SYSTEM",
  userRoleId: null,
};

const SKIP_FIELDS = new Set(["pass", "password", "token"]);

function safeJson(value) {
  if (value == null) return null;
  try {
    const clone = JSON.parse(JSON.stringify(value, (key, val) => {
      if (SKIP_FIELDS.has(key)) return "[REDACTED]";
      return val;
    }));
    return clone;
  } catch {
    return { _raw: String(value) };
  }
}

function diffFields(oldVal, newVal) {
  if (!oldVal || !newVal) return [];

  const flattenForDiff = (val) => {
    if (!val || typeof val !== "object") return val;
    if (val.record && typeof val.record === "object") return val.record;
    if (val.product && typeof val.product === "object") {
      const out = { ...val.product };
      if (val.values && typeof val.values === "object") {
        Object.entries(val.values).forEach(([k, v]) => {
          out[`attr_${k}`] = v;
        });
      }
      return out;
    }
    return val;
  };

  const aFlat = flattenForDiff(oldVal);
  const bFlat = flattenForDiff(newVal);
  const keys = new Set([...Object.keys(aFlat || {}), ...Object.keys(bFlat || {})]);
  const changed = [];
  keys.forEach((key) => {
    if (SKIP_FIELDS.has(key)) return;
    const a = aFlat[key];
    const b = bFlat[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(key);
  });
  return changed;
}

function buildDescription({
  userName,
  userRole,
  actionType,
  moduleName,
  recordReference,
  changedFields,
}) {
  const who = userRole ? `${userName} (${userRole})` : userName;
  const ref = recordReference ? ` #${recordReference}` : "";
  const mod = moduleName || "Record";

  switch (actionType) {
    case "CREATE":
      return `${who} created ${mod}${ref}`;
    case "VIEW":
      return `${who} visited ${recordReference || mod}`;
    case "DELETE":
      return `${who} deleted ${mod}${ref}`;
    case "UPDATE":
      if (changedFields?.length) {
        return `${who} updated ${mod}${ref}: ${changedFields.join(", ")}`;
      }
      return `${who} updated ${mod}${ref}`;
    case "LOGIN":
      return `${who} logged in`;
    case "LOGOUT":
      return `${who} logged out`;
    case "LOGIN_FAILED":
      return `${who} had a failed login attempt`;
    case "EXPORT":
      return `${who} exported ${mod}${ref}`;
    case "PRINT":
      return `${who} printed ${mod}${ref}`;
    case "TRANSFER":
      return `${who} transferred ${mod}${ref}`;
    case "STOCK_IN":
      return `${who} stock in ${mod}${ref}`;
    case "STOCK_OUT":
      return `${who} stock out ${mod}${ref}`;
    case "MEMO_CREATE":
      return `${who} created memo ${ref}`;
    case "MEMO_RETURN":
      return `${who} returned memo ${ref}`;
    case "ATTEMPTED":
      return `${who} attempted restricted action on ${mod}${ref}`;
    case "UI_CLICK":
      return `${who} clicked on ${mod}${ref}`;
    case "UI_FILTER":
      return `${who} changed filter on ${mod}${ref}`;
    case "UI_MODAL_OPEN":
      return `${who} opened modal on ${mod}${ref}`;
    case "UI_MODAL_CLOSE":
      return `${who} closed modal on ${mod}${ref}`;
    case "UI_TAB":
      return `${who} switched tab on ${mod}${ref}`;
    case "UI_ACTION":
      return `${who} UI action on ${mod}${ref}`;
    case "API_READ":
      return `${who} API GET ${mod}${ref}`;
    default:
      return `${who} performed ${actionType} on ${mod}${ref}`;
  }
}

async function logActivityTx(q, payload) {
  const ctxStore = getAuditContext();
  const ctx = ctxStore || {};
  const user = payload.system ? SYSTEM_USER : {
    userId: payload.userId ?? ctx.userId ?? null,
    userName: payload.userName ?? ctx.userName ?? "SYSTEM",
    userRole: payload.userRole ?? ctx.userRole ?? "",
    userRoleId: payload.userRoleId ?? ctx.userRoleId ?? null,
  };

  const enrichValue = (val) => {
    if (!val || typeof val !== "object") return safeJson(val);
    const clone = safeJson(val);
    if (!clone || typeof clone !== "object") return clone;
    if (!clone.requestPath && ctx.requestPath) {
      clone.requestPath = ctx.requestPath;
      clone.requestMethod = ctx.requestMethod || "POST";
    }
    if (!clone.pageContext && ctx.pagePath) {
      clone.pageContext = { path: ctx.pagePath, label: ctx.pageLabel || null };
    }
    return clone;
  };

  const oldValue = enrichValue(payload.oldValue);
  const newValue = enrichValue(payload.newValue);
  const changed =
    payload.changedFields ??
    (payload.actionType === "UPDATE" ? diffFields(oldValue, newValue) : null);

  const description =
    payload.description ||
    buildDescription({
      userName: user.userName,
      userRole: user.userRole,
      actionType: payload.actionType,
      moduleName: payload.moduleName,
      recordReference: payload.recordReference,
      changedFields: changed,
    });

  const sql = `
    INSERT INTO dai_activity_log (
      company_id, user_id, user_name, user_role, user_role_id,
      action_type, module_name, record_id, record_reference,
      old_value, new_value, changed_fields, description,
      ip_address, user_agent, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
  `;

  const values = [
    payload.companyId ?? ctx.companyId ?? 1,
    user.userId,
    user.userName,
    user.userRole,
    user.userRoleId,
    payload.actionType,
    payload.moduleName || "",
    payload.recordId != null ? String(payload.recordId) : null,
    payload.recordReference || null,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    changed?.length ? JSON.stringify(changed) : null,
    description,
    payload.ipAddress ?? ctx.ipAddress ?? null,
    payload.userAgent ?? ctx.userAgent ?? null,
    payload.status || "SUCCESS",
  ];

  try {
    await auditQuery(sql, values);
    if (ctxStore) ctxStore.auditLogged = true;
    markAuditLogged();
  } catch (err) {
    console.error("[AUDIT LOG ERROR] Failed to record activity log entry:", err?.message || err, {
      actionType: payload.actionType,
      moduleName: payload.moduleName,
      recordReference: payload.recordReference,
    });
  }
}

async function logActivity(payload) {
  await logActivityTx(null, payload);
}

async function auditedMutation({
  q,
  actionType,
  moduleName,
  recordId,
  recordReference,
  oldValue,
  mutateFn,
  loadNewValue,
  description,
  status,
}) {
  const exec = q || (async (sql, values) => {
    const helper = require("../helper.js");
    return helper.query(sql, values);
  });

  const result = await mutateFn(exec);
  const newValue =
    typeof loadNewValue === "function" ? await loadNewValue(result, exec) : loadNewValue;

  await logActivityTx(exec, {
    actionType,
    moduleName,
    recordId,
    recordReference,
    oldValue,
    newValue,
    description,
    status,
  });

  return result;
}

module.exports = {
  logActivity,
  logActivityTx,
  auditedMutation,
  buildDescription,
  diffFields,
  safeJson,
  SYSTEM_USER,
};
