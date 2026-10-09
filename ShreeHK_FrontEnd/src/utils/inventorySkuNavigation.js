/**
 * Navigation helpers for inventory SKU actions (modal, quick links).
 */
export const buildStoneHistoryUrl = (sku, companyId) => {
  const params = new URLSearchParams();
  if (sku) params.set("sku", String(sku));
  if (companyId != null && companyId !== "" && Number(companyId) > 0) {
    params.set("companyId", String(companyId));
  }
  const qs = params.toString();
  return qs ? `/report/stone-history?${qs}` : "/report/stone-history";
};

export const buildTransferHistoryUrl = (sku) =>
  `/report/stone-transfer-history?sku=${encodeURIComponent(sku || "")}`;

export const buildStoneUpdateUrl = (sku) =>
  `/transaction/stone-update?skuupdate=${encodeURIComponent(sku || "")}`;

export const handleInventorySkuAction = (actionType, skuData, navigate, onClose) => {
  const sku = skuData?.sku;
  if (!sku) return;

  onClose?.();

  if (actionType === "history") {
    navigate(
      buildStoneHistoryUrl(
        sku,
        skuData?.company ?? skuData?.company_id ?? skuData?.companyId
      )
    );
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
