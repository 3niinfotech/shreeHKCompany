import { useCallback, useState } from "react";
import { postLabelPrint } from "../api/services/productService";
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

export default function useInventoryLabelActions({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);

  const printLabel = useCallback(
    async (selectedIds = [], values = {}, options = {}) => {
      if (!selectedIds.length) return false;

      const diaPair = values.dia_pair ?? options.diaPair ?? "";

      setLoading(true);
      try {
        const blob = await postLabelPrint({
          ids: selectedIds,
          copies: values.copies || 1,
          dia_pair: diaPair,
          labelType: values.labelType,
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

  return { labelLoading: loading, printLabel };
}
