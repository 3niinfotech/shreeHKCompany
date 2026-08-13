import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import OnMemoModal from "../../components/inventory/OnMemoModal";
import InventoryCompareModal from "../../components/inventory/InventoryCompareModal";
import ReservationModal from "../../components/inventory/ReservationModal";
import AddToPackageModal from "../../components/inventory/AddToPackageModal";

const EMPTY_ARRAY = [];

const InventoryPageModals = forwardRef(function InventoryPageModals(
  {
    selectedRows = EMPTY_ARRAY,
    selectedRowKeys = EMPTY_ARRAY,
    onMemoSubmit,
    onSaleSubmit,
    onConsignSubmit,
    onLabSubmit,
    onExportSubmit,
    onAfterPackageOrReservation,
  },
  ref,
) {
  const [stockAction, setStockAction] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);

  const closeStock = useCallback(() => setStockAction(null), []);

  useImperativeHandle(ref, () => ({
    openStock: (type) => setStockAction(type),
    openCompare: () => setCompareOpen(true),
    openReservation: () => setReservationOpen(true),
    openPackage: () => setPackageOpen(true),
  }), []);

  const handleStockSubmit = useCallback(async (payload) => {
    if (stockAction === "sell") await onSaleSubmit?.(payload);
    else if (stockAction === "consign") await onConsignSubmit?.(payload);
    else if (stockAction === "lab") await onLabSubmit?.(payload);
    else if (stockAction === "export") await onExportSubmit?.(payload);
    else await onMemoSubmit?.(payload);
    setStockAction(null);
  }, [stockAction, onMemoSubmit, onSaleSubmit, onConsignSubmit, onLabSubmit, onExportSubmit]);

  return (
    <>
      {stockAction ? (
        <OnMemoModal
          open
          onClose={closeStock}
          selectedRows={selectedRows}
          actionType={stockAction}
          onSubmit={handleStockSubmit}
        />
      ) : null}

      {compareOpen ? (
        <InventoryCompareModal
          open
          rows={selectedRows}
          onClose={() => setCompareOpen(false)}
        />
      ) : null}

      {reservationOpen ? (
        <ReservationModal
          open
          selectedIds={selectedRowKeys}
          onClose={() => setReservationOpen(false)}
          onSuccess={() => {
            setReservationOpen(false);
            onAfterPackageOrReservation?.();
          }}
        />
      ) : null}

      {packageOpen ? (
        <AddToPackageModal
          open
          onClose={() => setPackageOpen(false)}
          productIds={selectedRowKeys}
          onSuccess={() => {
            setPackageOpen(false);
            onAfterPackageOrReservation?.();
          }}
        />
      ) : null}
    </>
  );
});

export default InventoryPageModals;
