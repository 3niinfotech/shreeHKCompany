import { useCallback, useState } from "react";
import { postIExport } from "../api/services/productService";
import { pickApiMessage, toastApiError } from "../utils/apiToast";
import { toastSuccess, toastWarning } from "../utils/toastNotify";
import { exportVenyaInventoryExcel } from "../utils/venyaInventoryExcelExport";

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
    async (selectedIds = [], values = {}, rows = []) => {
      const exportRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
      if (!exportRows.length && !selectedIds.length) {
        toastWarning("Please Select Item");
        return false;
      }

      setLoading(true);
      try {
        if (exportRows.length) {
          const count = await exportVenyaInventoryExcel({
            rows: exportRows,
            sheetName: String(values.sheetName || "Export").trim() || "Export",
          });
          toastSuccess(`Exported ${count} record(s)`);
          onSuccess?.();
          return true;
        }

        const fileName = String(values.fileName || "Import_Format").trim() || "Import_Format";
        const format = values.format === "csv" ? "csv" : "xlsx";
        const { blob, fileName: downloadName } = await postIExport({
          ids: selectedIds,
          fileName,
          format,
        });
        triggerFileDownload(blob, downloadName);
        onSuccess?.();
        return true;
      } catch (error) {
        if (error?.message === "Please Select Item") {
          toastWarning(error.message);
          return false;
        }
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
