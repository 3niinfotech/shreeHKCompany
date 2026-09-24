import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryExportActions(options) {
  const { exportLoading, submitExport } = useInventoryActions(options);
  return { exportLoading, submitExport };
}
