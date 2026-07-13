/**
 * Flat diamond/inventory row for activity history before/after display.
 * Merges dai_product + dai_product_value (record / values).
 */
function buildFullProductAuditSnapshot(row, extra = {}) {
  if (!row) return null;

  const pv =
    row.record && typeof row.record === "object"
      ? row.record
      : row.values && typeof row.values === "object"
        ? row.values
        : {};

  const snap = {
    sku: row.sku,
    lab: row.lab,
    shape: pv.shape,
    polish_carat: row.polish_carat,
    polish_pcs: row.polish_pcs,
    color: pv.color,
    clarity: pv.clarity,
    cut: pv.cut,
    polish: pv.polish,
    symmentry: pv.symmentry,
    f_intensity: pv.f_intensity,
    intensity: pv.intensity,
    overtone: pv.overtone,
    size: pv.size,
    price: row.price,
    amount: row.amount,
    sell_price: row.sell_price,
    sell_amount: row.sell_amount,
    rap_price: row.rap_price,
    cost: row.cost,
    mesurment: pv.mesurment,
    table_pc: pv.table_pc,
    depth_pc: pv.depth_pc,
    gridle: pv.gridle,
    report_no: pv.report_no,
    bgm: pv.bgm,
    eyeclean: pv.eyeclean,
    package: pv.package,
    remark: row.remark,
    outward: row.outward,
    hold: row.hold,
    inward: row.inward,
    location: row.location,
    main_group: row.main_group,
    sub_group: row.sub_group,
    group_type: row.group_type,
    category: row.category,
    pair: row.pair,
    visibility: row.visibility,
    party: extra.party ?? null,
    invoice: extra.invoice ?? extra.invoiceno ?? null,
    reference: extra.reference ?? null,
    invoicedate: extra.invoicedate ?? null,
    sale_type: extra.sale_type ?? null,
    split_from: extra.split_from ?? null,
  };

  const out = {};
  Object.entries(snap).forEach(([k, v]) => {
    if (v != null && v !== "") out[k] = v;
  });
  Object.entries(extra).forEach(([k, v]) => {
    if (v != null && v !== "" && out[k] == null) out[k] = v;
  });

  return Object.keys(out).length ? out : null;
}

module.exports = { buildFullProductAuditSnapshot };
