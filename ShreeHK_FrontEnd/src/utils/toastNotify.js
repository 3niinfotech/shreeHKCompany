import { createElement } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { pickApiMessage } from "./apiToast";

const deleteToastClassNames = {
  toast: "shreehk-toast shreehk-toast--delete",
  title: "shreehk-toast__title shreehk-toast__title--delete",
  icon: "shreehk-toast__icon shreehk-toast__icon--delete",
};

/** Delete success — API message only; styled delete toast when present */
export function toastDeleted(data) {
  const message = pickApiMessage(data);
  if (!message) return;

  toast(message, {
    classNames: deleteToastClassNames,
    icon: createElement(Trash2, {
      size: 18,
      strokeWidth: 2.25,
      "aria-hidden": true,
    }),
    duration: 4000,
  });
}
