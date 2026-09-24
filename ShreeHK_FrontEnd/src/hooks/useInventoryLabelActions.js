import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryLabelActions(options) {
  const { labelLoading, printLabel } = useInventoryActions(options);
  return { labelLoading, printLabel };
}
