import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { postProductHold } from "../api/services/holdService";
import {
  postInventoryExport,
  postIExport as postInventoryIExport,
  postInventoryMail,
  postChangePrice,
  postLabelPrint,
  postLabelA4Print,
} from "../api/services/productService";
import {
  toastApiSuccess,
  toastApiError,
  toastWarning,
  pickApiMessage,
} from "../utils/toastNotify";
const downloadFileBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const normalizePriceEntry = (values = {}) => ({
  cost: hasValue(values.cost) ? String(values.cost) : "",
  price: hasValue(values.price) ? String(values.price) : "",
  rap_price: hasValue(values.rap_price) ? String(values.rap_price) : "",
});

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

/**
 * Unified Inventory Actions Hook
 * Consolidates Hold, Change Price, Export, IExport, Mail, Label, and LabelA4.
 */
export function useInventoryActions({ onSuccess } = {}) {
  const queryClient = useQueryClient();

  // Loading states
  const [holdLoading, setHoldLoading] = useState(false);
  const [holdModal, setHoldModal] = useState({ open: false, actionKey: "hold", selectedIds: [] });
  const [changePriceLoading, setChangePriceLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [iExportLoading, setIExportLoading] = useState(false);
  const [mailLoading, setMailLoading] = useState(false);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelA4Loading, setLabelA4Loading] = useState(false);

  // 1. HOLD ACTIONS
  const openHoldModal = useCallback((selectedIds = []) => {
    setHoldModal({ open: true, actionKey: "hold", selectedIds });
  }, []);

  const closeHoldModal = useCallback(() => {
    setHoldModal({ open: false, actionKey: "hold", selectedIds: [] });
  }, []);

  const submitHoldModal = useCallback(
    async (values) => {
      if (!holdModal.selectedIds.length) return;
      setHoldLoading(true);
      try {
        const result = await postProductHold({
          ids: holdModal.selectedIds.map((id) => Number(id)),
          status: 1,
          description: values.description || "",
        });
        if (result?.status) {
          toastApiSuccess(result);
          closeHoldModal();
          queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
          onSuccess?.();
        } else {
          toastApiError({ response: { data: result } });
        }
      } catch (err) {
        toastApiError(err);
      } finally {
        setHoldLoading(false);
      }
    },
    [holdModal.selectedIds, closeHoldModal, queryClient, onSuccess]
  );

  const handleHoldAction = useCallback(
    async (key, selectedIds = []) => {
      if (!selectedIds.length) {
        toastWarning("Please select at least one item");
        return true;
      }
      if (key === "hold") {
        openHoldModal(selectedIds);
        return true;
      }
      if (key === "unHold" || key === "unhold") {
        setHoldLoading(true);
        try {
          const result = await postProductHold({
            ids: selectedIds.map((id) => Number(id)),
            status: 0,
            description: "",
          });
          if (result?.status) {
            toastApiSuccess(result);
            queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
            onSuccess?.();
          } else {
            toastApiError({ response: { data: result } });
          }
        } catch (err) {
          toastApiError(err);
        } finally {
          setHoldLoading(false);
        }
        return true;
      }
      return false;
    },
    [openHoldModal, queryClient, onSuccess]
  );

  const runDirectUnhold = useCallback(
    async (selectedIds = [], description = "") => {
      if (!selectedIds.length) return;
      setHoldLoading(true);
      try {
        const result = await postProductHold({
          ids: selectedIds.map((id) => Number(id)),
          status: 0,
          description,
        });
        if (result?.status) {
          toastApiSuccess(result);
          queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
          onSuccess?.();
        } else {
          toastApiError({ response: { data: result } });
        }
      } catch (err) {
        toastApiError(err);
      } finally {
        setHoldLoading(false);
      }
    },
    [queryClient, onSuccess]
  );

  // 2. CHANGE PRICE
  const submitChangePrice = useCallback(
    async (selectedIds = [], values = {}) => {
      if (!selectedIds.length) return false;

      const entry = normalizePriceEntry(values);
      if (!entry.cost && !entry.price && !entry.rap_price) return false;

      const product = {};
      selectedIds.forEach((id) => {
        product[id] = { ...entry };
      });

      setChangePriceLoading(true);
      try {
        const result = await postChangePrice({
          fn: "updatePrice",
          product,
        });
        if (result?.status) {
          toastApiSuccess(result);
          queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
          onSuccess?.();
          return true;
        }
        toastApiError({ response: { data: result } });
        return false;
      } catch (error) {
        toastApiError(error);
        return false;
      } finally {
        setChangePriceLoading(false);
      }
    },
    [onSuccess, queryClient]
  );

  // 3. EXPORT
  const submitExport = useCallback(
    async (selectedIds = [], values = {}, allRows = []) => {
      if (!selectedIds.length) {
        toastWarning("Please select at least one item to export");
        return false;
      }

      setExportLoading(true);
      try {
        const result = await postInventoryExport({
          ids: selectedIds,
          sheetName: values.sheetName || "Export",
        });

        if (result && !(result instanceof Blob) && result.status === false) {
          toastApiError({ response: { data: result } });
          return false;
        }

        const blob =
          result instanceof Blob
            ? result
            : new Blob([result], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });

        const defaultFilename = `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
        downloadFileBlob(blob, defaultFilename);
        onSuccess?.();
        return true;
      } catch (error) {
        const msg = await parseBlobError(error);
        if (msg) toastApiError({ response: { data: { message: msg } } });
        else toastApiError(error);
        return false;
      } finally {
        setExportLoading(false);
      }
    },
    [onSuccess]
  );

  // 4. IEXPORT
  const submitIExport = useCallback(
    async (selectedIds = [], values = {}, allRows = []) => {
      if (!selectedIds.length) {
        toastWarning("Please select at least one item to export");
        return false;
      }

      setIExportLoading(true);
      try {
        const result = await postInventoryIExport({
          ids: selectedIds,
          sheetName: values.sheetName || "Export",
        });

        if (result && !(result instanceof Blob) && result.status === false) {
          toastApiError({ response: { data: result } });
          return false;
        }

        const blob =
          result instanceof Blob
            ? result
            : new Blob([result], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });

        const defaultFilename = `iexport-${new Date().toISOString().slice(0, 10)}.xlsx`;
        downloadFileBlob(blob, defaultFilename);
        onSuccess?.();
        return true;
      } catch (error) {
        const msg = await parseBlobError(error);
        if (msg) toastApiError({ response: { data: { message: msg } } });
        else toastApiError(error);
        return false;
      } finally {
        setIExportLoading(false);
      }
    },
    [onSuccess]
  );

  // 5. MAIL
  const submitMail = useCallback(
    async (selectedIds = [], values = {}) => {
      const ids = (selectedIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (!ids.length) {
        toastWarning("Please select at least one diamond");
        return false;
      }

      const email = String(values.toEmail || values.email || "").trim();
      const subject = String(values.subject || "Stone Proposal").trim() || "Stone Proposal";
      const content =
        String(values.message || values.content || "").trim() ||
        "Heres your information for required stone. Review your required stone and get started using our stone.";

      if (!email) {
        toastWarning("To Email Address is required");
        return false;
      }
      if (!EMAIL_PATTERN.test(email)) {
        toastWarning("Invalid email address");
        return false;
      }

      setMailLoading(true);
      try {
        const result = await postInventoryMail({
          ids,
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
        setMailLoading(false);
      }
    },
    [onSuccess]
  );

  // 6. LABEL PRINT
  const printLabel = useCallback(
    async (selectedIds = [], values = {}, options = {}) => {
      if (!selectedIds.length) return false;

      const diaPair = values.dia_pair ?? options.diaPair ?? "";

      setLabelLoading(true);
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
        setLabelLoading(false);
      }
    },
    [onSuccess]
  );

  // 7. LABEL A4 PRINT
  const printLabelA4 = useCallback(
    async (selectedIds = [], values = {}, options = {}) => {
      if (!selectedIds.length) return false;

      const diaPair = values.dia_pair ?? options.diaPair ?? "";

      setLabelA4Loading(true);
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
        setLabelA4Loading(false);
      }
    },
    [onSuccess]
  );

  // 8. UNIFIED DISPATCHER
  const triggerAction = useCallback(
    async (actionType, selectedStones = [], values = {}, options = {}) => {
      switch (actionType) {
        case "HOLD":
          return handleHoldAction("hold", selectedStones);
        case "UNHOLD":
          return handleHoldAction("unHold", selectedStones);
        case "CHANGE_PRICE":
          return submitChangePrice(selectedStones, values);
        case "EXPORT":
          return submitExport(selectedStones, values, options.allRows);
        case "IEXPORT":
          return submitIExport(selectedStones, values, options.allRows);
        case "MAIL":
          return submitMail(selectedStones, values);
        case "LABEL":
          return printLabel(selectedStones, values, options);
        case "LABEL_A4":
          return printLabelA4(selectedStones, values, options);
        default:
          toastWarning(`Unknown action type: ${actionType}`);
          return false;
      }
    },
    [
      handleHoldAction,
      submitChangePrice,
      submitExport,
      submitIExport,
      submitMail,
      printLabel,
      printLabelA4,
    ]
  );

  return {
    // Hold
    holdModal,
    holdLoading,
    openHoldModal,
    closeHoldModal,
    submitHoldModal,
    handleHoldAction,
    runDirectUnhold,

    // Change Price
    changePriceLoading,
    submitChangePrice,

    // Export
    exportLoading,
    submitExport,

    // IExport
    iExportLoading,
    submitIExport,

    // Mail
    mailLoading,
    submitMail,

    // Label
    labelLoading,
    printLabel,

    // Label A4
    labelA4Loading,
    printLabelA4,

    // Unified Dispatcher
    triggerAction,
  };
}

export default useInventoryActions;
