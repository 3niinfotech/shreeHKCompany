import { useInventoryActions } from "./useInventoryActions";

export default function useInventoryHoldActions(options) {
  const {
    holdModal,
    holdLoading,
    openHoldModal,
    closeHoldModal,
    submitHoldModal,
    handleHoldAction,
    runDirectUnhold,
  } = useInventoryActions(options);

  return {
    holdModal,
    holdLoading,
    openHoldModal,
    closeHoldModal,
    submitHoldModal,
    handleHoldAction,
    runDirectUnhold,
  };
}
