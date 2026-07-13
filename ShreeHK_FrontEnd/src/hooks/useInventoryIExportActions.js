import { useCallback, useState } from "react";
import { postIExport } from "../api/services/productService";
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

export default function useInventoryIExportActions({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);

  const submitIExport = useCallback(
    async (selectedIds = [], values = {}) => {
      if (!selectedIds.length) return false;

      const fileName = String(values.fileName || "Import_Format").trim() || "Import_Format";
      const format = values.format === "csv" ? "csv" : "xlsx";

      setLoading(true);
      try {
        const { blob, fileName: downloadName } = await postIExport({
          ids: selectedIds,
          fileName,
          format,
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

  return { iExportLoading: loading, submitIExport };
}
