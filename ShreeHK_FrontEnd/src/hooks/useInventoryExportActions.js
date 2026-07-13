import { useCallback, useState } from "react";
import { postInventoryExport } from "../api/services/productService";
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

const triggerFileDownload = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

export default function useInventoryExportActions({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);

  const submitExport = useCallback(
    async (selectedIds = [], values = {}) => {
      if (!selectedIds.length) return false;

      const fileName =
        String(values.fileName || "Defult_Stock_List").trim() || "Defult_Stock_List";
      const sheetName = String(values.sheetName || "Stock List").trim() || "Stock List";

      setLoading(true);
      try {
        const { blob, fileName: downloadName } = await postInventoryExport({
          ids: selectedIds,
          fileName,
          sheetName,
        });
        triggerFileDownload(blob, downloadName);
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

  return { exportLoading: loading, submitExport };
}
