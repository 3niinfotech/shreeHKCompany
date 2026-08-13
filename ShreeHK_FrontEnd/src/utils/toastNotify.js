import { createElement } from "react";
import { toast } from "sonner";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { pickApiMessage } from "./apiMessage";

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

/** Success / add / update — green */
export function toastSuccess(message, options) {
  if (message == null || message === "") return;
  return toast.success(String(message), mergeOptions(toastClassNames.success, toastIcon(CircleCheck), options));
}

/** Error / failed — red */
export function toastError(message, options) {
  if (message == null || message === "") return;
  return toast.error(String(message), mergeOptions(toastClassNames.error, toastIcon(CircleX), options));
}

/** Warning — yellow/orange */
export function toastWarning(message, options) {
  if (message == null || message === "") return;
  return toast.warning(String(message), mergeOptions(toastClassNames.warning, toastIcon(TriangleAlert), options));
}

/** Info — theme blue/neutral */
export function toastInfo(message, options) {
  if (message == null || message === "") return;
  return toast.info(String(message), mergeOptions(toastClassNames.info, toastIcon(Info), options));
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
