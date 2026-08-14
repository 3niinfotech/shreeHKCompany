import { forwardRef, Suspense, lazy, useCallback, useImperativeHandle, useState } from "react";

const OnMemoModal = lazy(() => import("../../components/inventory/OnMemoModal"));
const InventoryCompareModal = lazy(() => import("../../components/inventory/InventoryCompareModal"));
const ReservationModal = lazy(() => import("../../components/inventory/ReservationModal"));
const AddToPackageModal = lazy(() => import("../../components/inventory/AddToPackageModal"));

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
    <Suspense fallback={null}>
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
    </Suspense>
  );
});

export default InventoryPageModals;
