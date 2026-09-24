import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryMailActions(options) {
  const { mailLoading, submitMail } = useInventoryActions(options);
  return { mailLoading, submitMail };
}
