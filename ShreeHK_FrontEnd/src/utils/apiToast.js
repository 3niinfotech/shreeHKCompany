import { toast } from "sonner";

const API_MESSAGE_KEYS = ["message", "Message", "error", "Error"];

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
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return null;
}

export function getApiSuccessMessage(data) {
  return pickApiMessage(data);
}

export function getApiErrorMessage(error) {
  return pickApiMessage(error?.response?.data) || pickApiMessage(error?.data) || pickApiMessage(error);
}

export function toastApiSuccess(data, options) {
  const msg = getApiSuccessMessage(data);
  if (msg) toast.success(msg, options);
  return msg;
}

export function toastApiError(error, options) {
  const msg = getApiErrorMessage(error);
  if (msg) toast.error(msg, options);
  return msg;
}
