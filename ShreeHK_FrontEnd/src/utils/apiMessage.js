const API_MESSAGE_KEYS = ["message", "Message", "error", "Error"];

function toSafeString(val) {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val).trim();
  if (typeof val === "object") {
    if (typeof val.message === "string") return val.message.trim();
    if (typeof val.error === "string") return val.error.trim();
    try {
      return JSON.stringify(val);
    } catch {
      return "";
    }
  }
  return "";
}

/** Extract user-facing text from API JSON body or error payload */
export function pickApiMessage(source) {
  if (source == null) return null;
  if (typeof source === "string") {
    const trimmed = source.trim();
    return trimmed || null;
  }
  if (typeof source !== "object") return null;

  for (const key of API_MESSAGE_KEYS) {
    const value = source[key];
    const safe = toSafeString(value);
    if (safe) return safe;
  }
  return null;
}

export function getApiSuccessMessage(data) {
  return pickApiMessage(data);
}

export function getApiErrorMessage(error) {
  return (
    pickApiMessage(error?.response?.data) ||
    pickApiMessage(error?.data) ||
    pickApiMessage(error)
  );
}
