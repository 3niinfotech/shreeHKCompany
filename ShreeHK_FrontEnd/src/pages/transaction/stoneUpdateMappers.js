/** dai-product columns (POST /product/save body, excluding id + values) */
export const PRODUCT_FIELDS = [
  "mfg_code",
  "sku",
  "lab",
  "polish_pcs",
  "polish_carat",
  "main_color",
  "cost",
  "price",
  "amount",
  "location",
  "remark",
  "main_group",
  "sub_group",
  "in_house_clarity",
  "argyle_color",
  "mining",
  "origin",
  "is_uploadsite",
  "is_uploadrapnet",
  "hide",
  "group_type",
  "category",
];

/** dai-product_value columns (POST /product/save values object) */
export const VALUE_FIELDS = [
  "report_no",
  "shape",
  "clarity",
  "size",
  "f_intensity",
  "cut",
  "polish",
  "symmentry",
  "table_pc",
  "depth_pc",
  "mesurment",
  "gridle",
  "intensity",
  "overtone",
  "color",
  "package",
];

const emptyStr = (v) => (v == null ? "" : v);

export const mapApiToForm = (data) => {
  if (!data) return null;

  return {
    id: data.id ?? data.product_id,
    mfg_code: data.mfg_code ?? "",
    sku: data.sku ?? "",
    lab: data.lab ?? "GIA",
    polish_pcs: data.polish_pcs ?? 1,
    polish_carat: data.polish_carat ?? null,
    main_color: data.main_color ?? "",
    cost: data.cost ?? null,
    price: data.price ?? null,
    amount: data.amount ?? 0,
    location: data.location ?? "",
    remark: data.remark ?? "",
    main_group: data.main_group ?? "",
    sub_group: data.sub_group ?? "",
    in_house_clarity: data.in_house_clarity ?? "",
    argyle_color: data.argyle_color ?? "",
    mining: data.mining ?? "",
    origin: data.origin ?? "",
    report_no: data.report_no ?? "",
    shape: data.shape ?? "",
    clarity: data.clarity ?? "",
    size: data.size ?? "",
    f_intensity: data.f_intensity ?? "",
    cut: data.cut ?? "",
    polish: data.polish ?? "",
    symmentry: data.symmentry ?? "",
    table_pc: data.table_pc ?? null,
    depth_pc: data.depth_pc ?? null,
    mesurment: data.mesurment ?? "",
    gridle: data.gridle ?? "",
    intensity: data.intensity ?? "",
    overtone: data.overtone ?? "",
    color: data.color ?? "",
    package: data.package ?? "",
    group_type: data.group_type ?? "single",
    category: data.category != null && data.category !== "" ? Number(data.category) : undefined,
    is_uploadsite: !!(Number(data.is_uploadsite) || Number(data.site_upload)),
    is_uploadrapnet: !!(Number(data.is_uploadrapnet) || Number(data.rapnet_upload)),
    hide: Number(data.hide) === 1,
  };
};

/** Matches backend: { id, ...dai_product, values: { ...dai-product_value } } */
export const mapFormToApi = (formValues) => {
  const body = {};

  PRODUCT_FIELDS.forEach((key) => {
    if (key === "is_uploadsite" || key === "is_uploadrapnet" || key === "hide") return;
    if (formValues[key] !== undefined) {
      body[key] = formValues[key];
    }
  });

  body.is_uploadsite = formValues.is_uploadsite ? 1 : 0;
  body.is_uploadrapnet = formValues.is_uploadrapnet ? 1 : 0;
  body.hide = formValues.hide ? 1 : 0;
  body.category =
    formValues.category != null && formValues.category !== ""
      ? String(formValues.category)
      : "";

  const values = {};
  VALUE_FIELDS.forEach((key) => {
    values[key] = emptyStr(formValues[key]);
  });

  return {
    id: formValues.id,
    ...body,
    values,
  };
};
