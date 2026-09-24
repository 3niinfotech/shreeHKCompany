import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(relativeTime);

/**
 * Activity log stores created_at via UTC_TIMESTAMP.
 * MySQL often returns "YYYY-MM-DD HH:mm:ss[.SSS]" without a timezone —
 * treat that as UTC, then show the user's local exact date + time.
 */
export function parseActivityAt(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return dayjs(val);
  const raw = String(val).trim();
  if (!raw) return null;
  if (/Z$/i.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) return dayjs(raw);
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  return dayjs.utc(normalized).local();
}

export function formatActivityDate(val) {
  const d = parseActivityAt(val);
  return d?.isValid() ? d.format("DD-MM-YYYY") : "—";
}

export function formatActivityTime(val) {
  const d = parseActivityAt(val);
  return d?.isValid() ? d.format("hh:mm:ss A") : "—";
}

export function formatActivityDateTime(val) {
  const d = parseActivityAt(val);
  return d?.isValid() ? d.format("DD-MM-YYYY hh:mm:ss A") : "—";
}

export function formatActivityRelativeTime(val) {
  const d = parseActivityAt(val);
  return d?.isValid() ? d.fromNow() : "—";
}

export function formatActivityIso(val) {
  const d = parseActivityAt(val);
  return d?.isValid() ? d.toISOString() : "";
}

/** Human-readable labels for audit field keys */
const FIELD_LABELS = {
  sku: "SKU",
  party: "Party",
  other_party: "Other Party",
  amount: "Amount",
  sell_price: "Sell Price",
  sell_amount: "Sell Amount",
  price: "Price",
  cost: "Cost",
  p_carat: "P.Carat (Polish)",
  r_carat: "R.Carat (Rough)",
  polish_carat: "Polish Carat",
  rought_carat: "Rough Carat",
  p_pcs: "P.Pcs (Polish)",
  r_pcs: "R.Pcs (Rough)",
  polish_pcs: "Polish Pcs",
  rought_pcs: "Rough Pcs",
  mfg_code: "MFG Code",
  mfg: "MFG Code",
  d_no: "D. No",
  dno: "D. No",
  description: "Description",
  type: "Type",
  date: "Date",
  invoicedate: "Invoice Date",
  invoiceno: "Invoice No",
  invoice_no: "Invoice No",
  invoice: "Invoice",
  reference: "Reference",
  entryno: "Entry No",
  entry_no: "Entry No",
  terms: "Terms (Days)",
  duedate: "Due Date",
  due_date: "Due Date",
  total_pcs: "Total Pcs",
  total_carat: "Total Carat",
  total_amount: "Total Amount",
  book: "Book",
  cheque: "Cheque",
  name: "Name",
  username: "Username",
  user_name: "User Name",
  outward: "Outward",
  hold: "Hold",
  group_type: "Group Type",
  loc: "Location",
  location: "Location",
  main_group: "Main Group",
  sub_group: "Sub Group",
  visibility: "Visibility",
  final_amount: "Final Amount",
  paid_amount: "Paid Amount",
  due_amount: "Due Amount",
  narretion: "Narration",
  sale_type: "Sale Type",
  split_from: "Split From",
  email: "Email",
  mobile: "Mobile",
  phone: "Phone",
  address: "Address",
  city: "City",
  country: "Country",
  remark: "Remark",
  status: "Status",
  company: "Company",
  roll: "Role",
  permissions: "Permissions",
  loginAt: "Login At",
  loginDate: "Login Date",
  loginTime: "Login Time",
  deleteId: "Delete ID",
  contact_number: "Contact Number",
  contact_person: "Contact Person",
  code: "Code",
  value: "Value",
  currency: "Currency",
  inward_id: "Inward ID",
  inward_type: "Inward Type",
  lab: "Lab",
  shape: "Shape",
  color: "Color",
  main_color: "Color",
  clarity: "Clarity",
  cut: "Cut",
  polish: "Polish Grade",
  symmentry: "Symmetry",
  f_intensity: "Fluorescence",
  intensity: "Intensity",
  overtone: "Overtone",
  measurements: "Measurements",
  measurement: "Measurements",
  mesurment: "Measurements",
  table_pc: "Table %",
  depth_pc: "Depth %",
  gridle: "Girdle",
  report_no: "Report No",
  reportno: "Report No",
  bgm: "BGM",
  eyeclean: "Eye Clean",
  rap_price: "Rap Price",
  pair: "Pair",
  category: "Category",
  skus: "SKUs",
  items: "Line Items",
  products: "Products",
};

const PRIORITY_FIELDS = [
  "sku", "mfg_code", "d_no", "p_carat", "r_carat", "polish_carat", "rought_carat",
  "p_pcs", "r_pcs", "polish_pcs", "rought_pcs", "cost", "price", "amount",
  "color", "clarity", "shape", "lab", "report_no", "measurements", "loc", "location",
  "cut", "polish", "symmentry", "f_intensity", "sell_price", "sell_amount", "rap_price",
  "table_pc", "depth_pc", "remark", "outward", "hold", "party", "name", "username",
  "invoiceno", "invoice_no", "reference", "entry_no", "entryno", "terms", "due_date",
  "total_pcs", "total_carat", "total_amount", "date", "inward_type", "items", "products",
];

/** Keys that are API/meta — not user-entered form data */
const NOISE_KEYS = new Set([
  "requestPath", "requestMethod", "requestQuery", "payload", "pageContext",
  "path", "search", "pageLabel", "eventType", "target", "label", "meta",
  "timestamp", "statusCode", "queryParams",
]);

const CONTAINER_KEYS = new Set([
  "product", "values", "payload", "record", "Data", "data", "pageContext",
  "requestPath", "requestMethod", "requestQuery", "queryParams", "statusCode",
]);

const SENSITIVE_KEYS = new Set(["pass", "password", "token", "oldPassword", "newPassword"]);

const UI_ACTIONS = new Set([
  "UI_CLICK", "UI_FILTER", "UI_MODAL_OPEN", "UI_MODAL_CLOSE", "UI_TAB", "UI_ACTION", "VIEW",
]);

const MUTATION_ACTIONS = new Set([
  "CREATE", "UPDATE", "DELETE", "STOCK_IN", "STOCK_OUT", "MEMO_CREATE", "MEMO_RETURN",
  "TRANSFER", "EXPORT", "PRINT",
]);

export function formatActionTypeLabel(actionType) {
  const map = {
    CREATE: "Add",
    UPDATE: "Edit",
    DELETE: "Delete",
    LOGIN: "Login",
    LOGOUT: "Logout",
    LOGIN_FAILED: "Failed login",
    VIEW: "Visit",
    STOCK_IN: "Purchase",
    STOCK_OUT: "Sale",
    MEMO_CREATE: "Memo Out",
    MEMO_RETURN: "Memo Return",
    TRANSFER: "Transfer",
    EXPORT: "Export",
    PRINT: "Print",
    ATTEMPTED: "Attempted",
    API_READ: "Read",
  };
  if (map[actionType]) return map[actionType];
  if (String(actionType).startsWith("UI_")) return "Action";
  return actionType || "—";
}

export function getModulePageLabel(record) {
  // Prefer business module for mutations so stale page labels (e.g. Dashboard)
  // cannot override Company / Stock / etc.
  const action = String(record?.actionType || "").toUpperCase();
  const isMutation = action && !action.startsWith("UI_") && action !== "VIEW" && action !== "API_READ";
  if (isMutation && record?.moduleName) return record.moduleName;

  const { pageMeta } = extractBusinessData(record);
  if (pageMeta?.label) return pageMeta.label;
  if (record?.moduleName) return record.moduleName;
  if (pageMeta?.path) return pageMeta.path;
  return "—";
}

export function formatFieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  if (String(key).startsWith("attr_")) {
    const inner = String(key).slice(5);
    return FIELD_LABELS[inner] || formatFieldLabel(inner);
  }
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFieldValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    if (Array.isArray(value)) {
      if (value.length === 0) return "—";
      return value
        .map((item) => {
          if (item == null || item === "") return "—";
          if (typeof item === "object") {
            const identifier =
              item.sku ||
              item.name ||
              item.username ||
              item.invoiceno ||
              item.invoice ||
              item.title ||
              item.label ||
              item.reference ||
              item.id;
            if (identifier) {
              const extra = item.weight || item.rate || item.carat || item.price || item.qty || item.amount;
              return extra != null ? `${identifier} (${extra})` : String(identifier);
            }
            const pairs = Object.entries(item)
              .filter(([k, v]) => v != null && v !== "" && !NOISE_KEYS.has(k) && !SENSITIVE_KEYS.has(k))
              .slice(0, 3)
              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
            return pairs.length ? pairs.join(", ") : JSON.stringify(item);
          }
          return String(item);
        })
        .join(", ");
    }

    const identifier =
      value.sku ||
      value.name ||
      value.username ||
      value.invoiceno ||
      value.invoice ||
      value.title ||
      value.label ||
      value.reference;
    if (identifier) {
      const extra = value.weight || value.rate || value.carat || value.price || value.qty || value.amount;
      return extra != null ? `${identifier} (${extra})` : String(identifier);
    }

    const pairs = Object.entries(value)
      .filter(([k, v]) => v != null && v !== "" && !NOISE_KEYS.has(k) && !SENSITIVE_KEYS.has(k))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    return pairs.length ? pairs.join(", ") : JSON.stringify(value);
  }

  return String(value);
}

export function omitNoise(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (NOISE_KEYS.has(k) || SENSITIVE_KEYS.has(k) || CONTAINER_KEYS.has(k)) return;
    if (v == null || v === "") return;
    out[k] = v;
  });
  return out;
}

function mergeFlatFields(target, source, prefix = "") {
  if (!source || typeof source !== "object" || Array.isArray(source)) return;
  Object.entries(source).forEach(([k, v]) => {
    if (SENSITIVE_KEYS.has(k) || NOISE_KEYS.has(k) || CONTAINER_KEYS.has(k)) return;
    if (v == null || v === "") return;
    const key = prefix ? `${prefix}_${k}` : k;
    target[key] = v;
  });
}

/** Flatten nested API / DB audit shapes into one object of user fields */
function flattenBusinessObject(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (Array.isArray(raw)) {
    return raw.length ? { items: raw.map((x) => formatFieldValue(x)).join(", ") } : null;
  }

  const result = {};

  if (raw.product && typeof raw.product === "object" && !Array.isArray(raw.product)) {
    mergeFlatFields(result, raw.product);
  }
  if (raw.values && typeof raw.values === "object" && !Array.isArray(raw.values)) {
    mergeFlatFields(result, raw.values);
  }
  if (raw.record && typeof raw.record === "object" && !Array.isArray(raw.record)) {
    mergeFlatFields(result, raw.record);
  }

  ["payload", "record", "Data", "data"].forEach((key) => {
    const nested = raw[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      mergeFlatFields(result, nested);
    }
  });

  mergeFlatFields(result, raw);

  CONTAINER_KEYS.forEach((k) => {
    delete result[k];
  });

  return Object.keys(result).length ? result : null;
}

function extractPageMeta(source) {
  if (!source || typeof source !== "object") return null;
  if (source.pageContext && typeof source.pageContext === "object") {
    return source.pageContext;
  }
  if (source.path) {
    return {
      path: source.path,
      label: source.pageLabel || source.label || null,
      search: source.search || null,
    };
  }
  return null;
}

/** Pull the actual business record from audit JSON shapes */
export function extractBusinessData(record) {
  const nv = record?.newValue;
  const ov = record?.oldValue;
  const actionType = record?.actionType || record?.action_type || "";

  let apiMeta = null;
  let pageMeta = null;
  let uiMeta = null;
  let before = null;
  let after = null;

  if (nv && typeof nv === "object") {
    if (nv.requestPath) {
      apiMeta = {
        method: nv.requestMethod || "POST",
        path: nv.requestPath,
        query: nv.requestQuery || null,
      };
    }
    pageMeta = extractPageMeta(nv);
    if (nv.eventType) {
      uiMeta = { eventType: nv.eventType, label: nv.label, target: nv.target, meta: nv.meta };
    }
    after = flattenBusinessObject(nv);
  }

  if (ov && typeof ov === "object") {
    pageMeta = pageMeta || extractPageMeta(ov);
    before = flattenBusinessObject(ov);
    if (before && !Object.keys(before).length) before = null;
  } else if (ov != null && ov !== "") {
    before = ov;
  }

  return { before, after, apiMeta, pageMeta, uiMeta, actionType };
}

function sortFieldEntries(obj) {
  if (!obj || typeof obj !== "object") return [];
  const entries = Object.entries(obj);
  entries.sort((a, b) => {
    const ai = PRIORITY_FIELDS.indexOf(a[0]);
    const bi = PRIORITY_FIELDS.indexOf(b[0]);
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    return a[0].localeCompare(b[0]);
  });
  return entries;
}

export function getPageVisitFields(record) {
  const { pageMeta } = extractBusinessData(record);
  const nv = record?.newValue;
  const fields = [];
  const label = pageMeta?.label || record?.moduleName;
  const path = pageMeta?.path || nv?.path || record?.recordReference;
  const search = pageMeta?.search || nv?.search;

  if (label) fields.push({ key: "page", label: "Page Name", value: label });
  if (path) fields.push({ key: "path", label: "URL Path", value: path });
  if (search) fields.push({ key: "search", label: "Query String", value: search });
  return fields;
}

export function getUiActionFields(record) {
  const { pageMeta, uiMeta } = extractBusinessData(record);
  const fields = [];

  if (pageMeta?.label) fields.push({ key: "page", label: "Page", value: pageMeta.label });
  else if (pageMeta?.path) fields.push({ key: "path", label: "Page Path", value: pageMeta.path });
  if (pageMeta?.search) fields.push({ key: "search", label: "Query", value: pageMeta.search });

  if (uiMeta?.eventType) fields.push({ key: "event", label: "Event Type", value: uiMeta.eventType });
  if (uiMeta?.label) fields.push({ key: "action", label: "Action / Label", value: uiMeta.label });
  if (uiMeta?.target) fields.push({ key: "target", label: "Target", value: uiMeta.target });
  if (uiMeta?.meta != null) {
    fields.push({ key: "details", label: "Details", value: formatFieldValue(uiMeta.meta) });
  }

  return fields;
}

/** All user-entered fields as { label, value, key }[] */
export function getUserDataFields(record) {
  const { before, after, actionType } = extractBusinessData(record);

  if (actionType === "DELETE") {
    return sortFieldEntries(before || {}).map(([key, value]) => ({
      key,
      label: formatFieldLabel(key),
      value: formatFieldValue(value),
    }));
  }

  if (actionType === "CREATE" || actionType === "STOCK_IN" || actionType === "MEMO_CREATE") {
    return sortFieldEntries(after || {}).map(([key, value]) => ({
      key,
      label: formatFieldLabel(key),
      value: formatFieldValue(value),
    }));
  }

  const changes = getChangedFieldRows(before, after, record?.changedFields || []);
  if (changes.length) {
    return changes.map((r) => ({
      key: r.key,
      label: r.label,
      value: `${r.before} → ${r.after}`,
      isChange: true,
    }));
  }

  return sortFieldEntries(after || before || {}).map(([key, value]) => ({
    key,
    label: formatFieldLabel(key),
    value: formatFieldValue(value),
  }));
}

export function isBlank(val) {
  return val === null || val === undefined || (typeof val === "string" && val.trim() === "");
}

export function areValuesEqual(a, b) {
  if (isBlank(a) && isBlank(b)) return true;
  if (isBlank(a) !== isBlank(b)) return false;
  if (a === b) return true;

  if (typeof a === "number" && typeof b === "string" && b.trim() !== "" && !Number.isNaN(Number(b))) {
    if (Number(a) === Number(b)) return true;
  }
  if (typeof b === "number" && typeof a === "string" && a.trim() !== "" && !Number.isNaN(Number(a))) {
    if (Number(a) === Number(b)) return true;
  }

  if (typeof a === "string" && typeof b === "string") {
    if (a.trim() === b.trim()) return true;
  }

  const isBoolLike = (v) => v === true || v === false || v === 0 || v === 1 || v === "0" || v === "1" || v === "true" || v === "false";
  if (isBoolLike(a) && isBoolLike(b) && (typeof a === "boolean" || typeof b === "boolean")) {
    const toBool = (v) => v === true || v === 1 || v === "1" || v === "true";
    return toBool(a) === toBool(b);
  }

  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

export function getChangedFieldRows(before, after, changedFields = []) {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
    ...changedFields,
  ]);
  const rows = [];
  keys.forEach((key) => {
    if (NOISE_KEYS.has(key) || SENSITIVE_KEYS.has(key) || CONTAINER_KEYS.has(key)) return;
    const oldVal = before?.[key];
    const newVal = after?.[key];
    if (areValuesEqual(oldVal, newVal)) return;
    rows.push({
      key,
      label: formatFieldLabel(key),
      before: formatFieldValue(oldVal),
      after: formatFieldValue(newVal),
      changed: true,
    });
  });
  rows.sort((a, b) => {
    const ai = PRIORITY_FIELDS.indexOf(a.key);
    const bi = PRIORITY_FIELDS.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return rows;
}

/** Full inventory row — all fields in before/after columns */
export function getFullBeforeAfterRows(before, after, changedFields = []) {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
    ...changedFields,
  ]);
  const rows = [];
  keys.forEach((key) => {
    if (NOISE_KEYS.has(key) || SENSITIVE_KEYS.has(key) || CONTAINER_KEYS.has(key)) return;
    const oldVal = before?.[key];
    const newVal = after?.[key];
    if (isBlank(oldVal) && isBlank(newVal)) return;
    const changed =
      changedFields.includes(key) ||
      !areValuesEqual(oldVal, newVal);
    rows.push({
      key,
      label: formatFieldLabel(key),
      before: formatFieldValue(oldVal),
      after: formatFieldValue(newVal),
      changed,
    });
  });
  rows.sort((a, b) => {
    const ai = PRIORITY_FIELDS.indexOf(a.key);
    const bi = PRIORITY_FIELDS.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return rows;
}

/** One-line summary for timeline / table */
export function buildEntrySummary(record) {
  if (record?.description && typeof record.description === "string" && record.description.trim()) {
    return record.description.trim();
  }
  return buildActivityNarrative(record) || null;
}

/** Plain-language story: who did what */
export function buildActivityNarrative(record) {
  if (record?.description && typeof record.description === "string" && record.description.trim()) {
    return record.description.trim();
  }
  const user = record?.userName || "User";
  const role = record?.userRole ? ` (${record.userRole})` : "";
  const { actionType, before, after } = extractBusinessData(record);
  const mod = record?.moduleName || "Record";
  const ref = record?.recordReference;

  if (actionType === "LOGIN") return `${user}${role} logged in`;
  if (actionType === "LOGOUT") return `${user}${role} logged out`;
  if (actionType === "LOGIN_FAILED") {
    const reason = record?.newValue?.reason;
    return reason
      ? `${user}${role} failed to log in — ${reason}`
      : `${user}${role} failed to log in`;
  }

  const verbMap = {
    CREATE: "added new",
    STOCK_IN: "stocked in",
    UPDATE: "updated",
    DELETE: "deleted",
    MEMO_CREATE: "created memo for",
    MEMO_RETURN: "returned memo for",
    STOCK_OUT: "sold / stock out",
    TRANSFER: "transferred",
    EXPORT: "exported",
    PRINT: "printed",
  };

  const verb = verbMap[actionType] || "changed";
  let text = `${user}${role} ${verb} ${mod}`;
  if (ref) text += ` — ${ref}`;

  const changes = getChangedFieldRows(before, after, record?.changedFields || []);
  if (changes.length) {
    const names = changes.slice(0, 4).map((r) => r.label).join(", ");
    text += changes.length > 4 ? `. Changed: ${names} +${changes.length - 4} more` : `. Changed: ${names}`;
  } else if (after && !before) {
    const top = sortFieldEntries(after).slice(0, 3).map(([k, v]) => `${formatFieldLabel(k)}: ${formatFieldValue(v)}`);
    if (top.length) text += `. ${top.join(" | ")}`;
  } else if (before && !after) {
    text += ". Record removed";
  }

  return text;
}

export function getActionTone(actionType) {
  if (actionType === "CREATE" || actionType === "STOCK_IN") return "add";
  if (actionType === "STOCK_OUT") return "sale";
  if (actionType === "DELETE") return "delete";
  if (actionType === "MEMO_CREATE" || actionType === "MEMO_RETURN") return "memo";
  if (actionType === "UPDATE" || actionType === "TRANSFER") return "edit";
  if (actionType === "LOGIN") return "login";
  if (actionType === "LOGOUT") return "logout";
  if (actionType === "LOGIN_FAILED") return "failed";
  return "default";
}

/** Changes to show in detail — only what changed, or snapshot for add/delete */
export function getDisplayChanges(record) {
  const changed = Array.isArray(record?.changedFields) ? record.changedFields : [];
  const { before, after } = extractBusinessData(record);
  const diff = getChangedFieldRows(before, after, changed);

  if (diff.length) {
    return { mode: "changes", items: diff };
  }

  if (before && after) {
    const all = getFullBeforeAfterRows(before, after, changed).filter((r) => r.changed);
    if (all.length) return { mode: "changes", items: all };
    return { mode: "compare", items: getFullBeforeAfterRows(before, after, changed).slice(0, 12) };
  }

  if (after && !before) {
    return {
      mode: "added",
      items: sortFieldEntries(after).map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        after: formatFieldValue(value),
      })),
    };
  }

  if (before && !after) {
    return {
      mode: "removed",
      items: sortFieldEntries(before).map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        before: formatFieldValue(value),
      })),
    };
  }

  return { mode: "empty", items: [] };
}

/** Single-table rows: same shape for add / edit / delete */
export function getUnifiedTableRows(record, maxRows = 10) {
  const { mode, items } = getDisplayChanges(record);

  let rows = [];
  if (mode === "changes" || mode === "compare") {
    rows = items.map((item) => ({
      key: item.key,
      label: item.label,
      before: item.before || "—",
      after: item.after || "—",
    }));
  } else if (mode === "added") {
    rows = items.map((item) => ({
      key: item.key,
      label: item.label,
      before: "—",
      after: item.after || "—",
    }));
  } else if (mode === "removed") {
    rows = items.map((item) => ({
      key: item.key,
      label: item.label,
      before: item.before || "—",
      after: "—",
    }));
  }

  return {
    mode,
    rows: rows.slice(0, maxRows),
    total: rows.length,
    hasMore: rows.length > maxRows,
  };
}

export function getActionHeadline(actionType) {
  const map = {
    CREATE: "New record added",
    STOCK_IN: "Stock added",
    UPDATE: "Record updated",
    DELETE: "Record deleted",
    MEMO_CREATE: "Memo created",
    MEMO_RETURN: "Memo returned",
    STOCK_OUT: "Sale / stock out",
    TRANSFER: "Transfer",
    EXPORT: "Export",
    PRINT: "Print",
    LOGIN: "User logged in",
    LOGOUT: "User logged out",
    LOGIN_FAILED: "Login failed",
  };
  return map[actionType] || formatActionTypeLabel(actionType);
}

export function isUiOrViewAction(actionType) {
  return UI_ACTIONS.has(actionType);
}

export function isViewAction(actionType) {
  return actionType === "VIEW";
}

export function isUiAction(actionType) {
  return String(actionType || "").startsWith("UI_");
}

export function isMutationAction(actionType) {
  return MUTATION_ACTIONS.has(actionType) || actionType === "UPDATE";
}

export function getRecordPage(record) {
  const { pageMeta } = extractBusinessData(record);
  if (!pageMeta?.path) return "—";
  return pageMeta.label ? `${pageMeta.label}` : pageMeta.path;
}

export function getRecordApi(record) {
  const nv = record?.newValue;
  if (nv?.requestPath) {
    const q = nv.requestQuery ? `?${nv.requestQuery}` : "";
    return `${nv.requestMethod || "POST"} ${nv.requestPath}${q}`;
  }
  return record?.actionType === "VIEW" ? "PAGE VISIT" : "—";
}

export function getTableDataSummary(record) {
  return buildEntrySummary(record) || record?.description || "—";
}

export { sortFieldEntries, NOISE_KEYS };
