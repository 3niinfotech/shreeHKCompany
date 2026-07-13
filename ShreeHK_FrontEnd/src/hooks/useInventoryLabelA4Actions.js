import { useCallback, useState } from "react";
import { postLabelA4Print } from "../api/services/productService";
import { pickApiMessage, toastApiError } from "../utils/apiToast";

const parseBlobError = async (error) => {
  const blob = error?.response?.data;
  if (!(blob instanceof Blob)) {
    return pickApiMessage(error?.response?.data) || pickApiMessage(error);
  }
  try {
    const text = await blob.text();
    return pickApiMessage(JSON.parse(text));
  } catch {
    return null;
  }
};

export default function useInventoryLabelA4Actions({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);

  const printLabelA4 = useCallback(
    async (selectedIds = [], values = {}, options = {}) => {
      if (!selectedIds.length) return false;

      const diaPair = values.dia_pair ?? options.diaPair ?? "";

      setLoading(true);
      try {
        const blob = await postLabelA4Print({
          ids: selectedIds,
          type: values.labelType || "a4",
          copies: values.copies || 1,
          dia_pair: diaPair,
        });

        const url = window.URL.createObjectURL(
          blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" })
        );
        window.open(url, "_blank");
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        onSuccess?.();
        return true;
      } catch (error) {
        const msg = await parseBlobError(error);
        if (msg) toastApiError({ response: { data: { message: msg } } });
        else toastApiError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  return { labelA4Loading: loading, printLabelA4 };
}
