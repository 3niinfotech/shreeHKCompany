import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { postChangePrice } from "../api/services/productService";
import { toastApiSuccess, toastApiError } from "../utils/apiToast";

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const normalizeEntry = (values = {}) => ({
  cost: hasValue(values.cost) ? String(values.cost) : "",
  price: hasValue(values.price) ? String(values.price) : "",
  rap_price: hasValue(values.rap_price) ? String(values.rap_price) : "",
});

export default function useInventoryChangePriceActions({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const submitChangePrice = useCallback(
    async (selectedIds = [], values = {}) => {
      if (!selectedIds.length) return false;

      const entry = normalizeEntry(values);
      if (!entry.cost && !entry.price && !entry.rap_price) return false;

      const product = {};
      selectedIds.forEach((id) => {
        product[id] = { ...entry };
      });

      setLoading(true);
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
        setLoading(false);
      }
    },
    [onSuccess, queryClient]
  );

  return { changePriceLoading: loading, submitChangePrice };
}
