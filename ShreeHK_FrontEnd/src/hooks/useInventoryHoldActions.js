import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { postProductHold } from "../api/services/holdService";
import { toastApiSuccess, toastApiError } from "../utils/apiToast";

/** Shared hold / un-hold flow for inventory pages (PHP Puthold). */
export default function useInventoryHoldActions({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  const [holdModal, setHoldModal] = useState({ open: false, actionKey: null });
  const [loading, setLoading] = useState(false);

  const openHoldModal = useCallback((actionKey, selectedIds) => {
    if (!selectedIds?.length) return;
    setHoldModal({ open: true, actionKey, selectedIds });
  }, []);

  const closeHoldModal = useCallback(() => {
    setHoldModal({ open: false, actionKey: null, selectedIds: [] });
  }, []);

  const submitHoldModal = useCallback(
    async (values, actionKey) => {
      const key = actionKey || holdModal.actionKey;
      const ids = holdModal.selectedIds || [];
      if (!ids.length) return;

      const isHold = key === "hold";
      const description =
        values?.remarks ||
        values?.reason ||
        values?.holdReason ||
        "";

      const payload = {
        ids: ids.map((id) => Number(id)),
        status: isHold ? 1 : 0,
        description,
      };

      if (isHold && values?.holdUntil) {
        payload.date = values.holdUntil;
      }

      setLoading(true);
      try {
        const result = await postProductHold(payload);
        if (result?.status) {
          toastApiSuccess(result);
          queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
          onSuccess?.();
          closeHoldModal();
        } else {
          toastApiError({ response: { data: result } });
        }
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoading(false);
      }
    },
    [holdModal, queryClient, onSuccess, closeHoldModal]
  );

  const handleHoldAction = useCallback(
    (key, selectedIds) => {
      if (key === "hold" || key === "unHold") {
        openHoldModal(key, selectedIds);
        return true;
      }
      return false;
    },
    [openHoldModal]
  );

  const runDirectUnhold = useCallback(
    async (selectedIds, description = "") => {
      if (!selectedIds?.length) return;
      setLoading(true);
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
        setLoading(false);
      }
    },
    [queryClient, onSuccess]
  );

  return {
    holdModal,
    holdLoading: loading,
    openHoldModal,
    closeHoldModal,
    submitHoldModal,
    handleHoldAction,
    runDirectUnhold,
  };
}
