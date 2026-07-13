/**
 * Navigation helpers for inventory SKU actions (modal, quick links).
 */
export const buildStoneHistoryUrl = (sku) =>
  `/report/stone-history?sku=${encodeURIComponent(sku || "")}`;

export const buildTransferHistoryUrl = (sku) =>
  `/report/stone-tranfer-history?sku=${encodeURIComponent(sku || "")}`;

export const buildStoneUpdateUrl = (sku) =>
  `/transaction/stone-update?skuupdate=${encodeURIComponent(sku || "")}`;

export const handleInventorySkuAction = (actionType, skuData, navigate, onClose) => {
  const sku = skuData?.sku;
  if (!sku) return;

  onClose?.();

  if (actionType === "history") {
    navigate(buildStoneHistoryUrl(sku));
    return;
  }
  if (actionType === "transfer") {
    navigate(buildTransferHistoryUrl(sku));
    return;
  }
  if (actionType === "update") {
    navigate(buildStoneUpdateUrl(sku));
  }
};
