import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryIExportActions(options) {
  const { iExportLoading, submitIExport } = useInventoryActions(options);
  return { iExportLoading, submitIExport };
}
