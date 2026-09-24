import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryChangePriceActions(options) {
  const { changePriceLoading, submitChangePrice } = useInventoryActions(options);
  return { changePriceLoading, submitChangePrice };
}
