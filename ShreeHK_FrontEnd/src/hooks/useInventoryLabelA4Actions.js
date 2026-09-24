import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryLabelA4Actions(options) {
  const { labelA4Loading, printLabelA4 } = useInventoryActions(options);
  return { labelA4Loading, printLabelA4 };
}
