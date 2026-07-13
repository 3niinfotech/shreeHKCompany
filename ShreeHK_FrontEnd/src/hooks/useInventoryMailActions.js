import { useCallback, useState } from "react";
import { postInventoryMail } from "../api/services/productService";
import { toastApiSuccess, toastApiError } from "../utils/apiToast";

export default function useInventoryMailActions({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);

  const submitMail = useCallback(
    async (selectedIds = [], values = {}) => {
      if (!selectedIds.length) return false;

      const email = String(values.toEmail || values.email || "").trim();
      const subject = String(values.subject || "Stone Proposal").trim() || "Stone Proposal";
      const content =
        String(values.message || values.content || "").trim() ||
        "Heres your information for required stone. Review your required stone and get started using our stone.";

      if (!email) return false;

      setLoading(true);
      try {
        const result = await postInventoryMail({
          ids: selectedIds,
          email,
          subject,
          content,
        });
        if (result?.status) {
          toastApiSuccess(result);
          onSuccess?.();
          return true;
        }
        toastApiError({ response: { data: result } });
        return false;
      } catch (err) {
        toastApiError(err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  return { mailLoading: loading, submitMail };
}
