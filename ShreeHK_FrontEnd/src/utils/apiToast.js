import {
  pickApiMessage,
  getApiSuccessMessage,
  getApiErrorMessage,
} from "./apiMessage";
import { toastSuccess, toastError } from "./toastNotify";

export { pickApiMessage, getApiSuccessMessage, getApiErrorMessage };

export function toastApiSuccess(data, options) {
  const msg = getApiSuccessMessage(data);
  if (msg) toastSuccess(msg, options);
  return msg;
}

export function toastApiError(error, options) {
  const msg = getApiErrorMessage(error);
  if (msg) toastError(msg, options);
  return msg;
}
