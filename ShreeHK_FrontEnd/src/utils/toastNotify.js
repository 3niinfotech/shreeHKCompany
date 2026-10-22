import { createElement } from "react";
import { toast } from "sonner";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import {
  pickApiMessage,
  getApiSuccessMessage,
  getApiErrorMessage,
} from "./apiMessage";

export { pickApiMessage, getApiSuccessMessage, getApiErrorMessage };

const iconSize = 18;
const iconStroke = 2.25;

const baseClassNames = {
  toast: "shreehk-toast",
  title: "shreehk-toast__title",
  description: "shreehk-toast__description",
  closeButton: "shreehk-toast__close",
  icon: "shreehk-toast__icon",
  actionButton: "shreehk-toast__action",
  cancelButton: "shreehk-toast__cancel",
};

function withModifier(modifier) {
  return {
    ...baseClassNames,
    toast: `${baseClassNames.toast} shreehk-toast--${modifier}`,
    title: `${baseClassNames.title} shreehk-toast__title--${modifier}`,
    icon: `${baseClassNames.icon} shreehk-toast__icon--${modifier}`,
  };
}

export const toastClassNames = {
  base: baseClassNames,
  success: withModifier("success"),
  error: withModifier("error"),
  warning: withModifier("warning"),
  info: withModifier("info"),
  delete: withModifier("delete"),
};

function toastIcon(Icon) {
  return createElement(Icon, {
    size: iconSize,
    strokeWidth: iconStroke,
    "aria-hidden": true,
  });
}

const DEFAULT_DURATION = 4000;

function mergeOptions(classNames, icon, options = {}) {
  return {
    duration: DEFAULT_DURATION,
    ...options,
    classNames: {
      ...classNames,
      ...(options.classNames || {}),
    },
    icon: options.icon ?? icon,
  };
}

function toSafeMessage(message) {
  if (message == null || message === "") return "";
  if (typeof message === "string") return message;
  if (typeof message === "number" || typeof message === "boolean") return String(message);
  if (typeof message === "object") {
    if (typeof message.message === "string") return message.message;
    if (typeof message.error === "string") return message.error;
    try {
      return JSON.stringify(message);
    } catch {
      return "";
    }
  }
  return "";
}

/** Success / add / update — green */
export function toastSuccess(message, options) {
  const msg = toSafeMessage(message);
  if (!msg) return;
  return toast.success(msg, mergeOptions(toastClassNames.success, toastIcon(CircleCheck), options));
}

/** Error / failed — red */
export function toastError(message, options) {
  const msg = toSafeMessage(message);
  if (!msg) return;
  return toast.error(msg, mergeOptions(toastClassNames.error, toastIcon(CircleX), options));
}

/** Warning — yellow/orange */
export function toastWarning(message, options) {
  const msg = toSafeMessage(message);
  if (!msg) return;
  return toast.warning(msg, mergeOptions(toastClassNames.warning, toastIcon(TriangleAlert), options));
}

/** Info — theme blue/neutral */
export function toastInfo(message, options) {
  const msg = toSafeMessage(message);
  if (!msg) return;
  return toast.info(msg, mergeOptions(toastClassNames.info, toastIcon(Info), options));
}

/** Delete success — API message only; styled delete toast when present */
export function toastDeleted(data) {
  const message = pickApiMessage(data);
  if (!message) return;

  toast(message, {
    classNames: toastClassNames.delete,
    icon: toastIcon(CircleX),
    duration: DEFAULT_DURATION,
  });
}

/** API response success helper */
export function toastApiSuccess(data, options) {
  const msg = getApiSuccessMessage(data);
  if (msg) toastSuccess(msg, options);
  return msg;
}

/** API response error helper */
export function toastApiError(error, options) {
  const msg = getApiErrorMessage(error);
  if (msg) toastError(msg, options);
  return msg;
}
