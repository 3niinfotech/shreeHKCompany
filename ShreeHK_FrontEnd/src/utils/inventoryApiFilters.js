const STOCK_TYPE_MAP = {
  SINGLE: "single",
  BOX: "box",
  PARCEL: "parcel",
};

const GROUP_TYPE_MAP = {
  Single: "single",
  single: "single",
  Box: "box",
  box: "box",
  Parcel: "parcel",
  parcel: "parcel",
  Pair: "pair",
  pair: "pair",
};

const OUT_STOCK_VALUE_MAP = {
  "GIA - Out Memo": "GIA-OutMemo",
  "GIA - On Hold": "GIA-OnHold",
  "NON-GIA - Memo": "Non-GIA-OutMemo",
  "NON-GIA - On Hold": "Non-GIA-OnHold",
  "ALL STOCK - Memo": "AllStock-OutMemo",
  "ALL STOCK - On Hold": "AllStock-OnHold",
  Lab: "Lab",
};

const AVAILABLE_VALUE_MAP = {
  GIA: "GIA",
  "NON-GIA": "Non-GIA",
  "ALL STOCK": "All Stock",
  "ON HAND GIA": "On Hand GIA",
  "ON HAND NON-GIA": "On Hand Non-GIA",
  "ON HANHD STOCK": "On Hand Stock",
  "ON HAND STOCK": "On Hand Stock",
};

const toArrayIfPresent = (value) => {
  if (Array.isArray(value)) return value.filter((v) => v != null && v !== "");
  if (value == null || value === "") return undefined;
  return [value];
};

const mapGroupTypes = (typeValue) => {
  const parsed = toArrayIfPresent(typeValue);
  if (!parsed?.length) return { types: undefined, pair: false };

  const types = [];
  let pair = false;
  parsed.forEach((value) => {
    const mapped = GROUP_TYPE_MAP[value] || String(value).toLowerCase();
    if (mapped === "pair") pair = true;
    else types.push(mapped);
  });

  return {
    types: types.length ? types : undefined,
    pair,
  };
};

/**
 * Maps My Inventory page filters to GET /product/inventory query params.
 */
export function buildInventoryApiFilters({
  compactValues = {},
  advancedValues = {},
  searchText = "",
  caratFrom = "",
  caratTo = "",
} = {}) {
  const filters = {};
  const trimmedSearch = String(searchText ?? "").trim();

  if (trimmedSearch) filters.searchInput = trimmedSearch;

  if (compactValues.inStock) {
    filters.available = AVAILABLE_VALUE_MAP[compactValues.inStock] || compactValues.inStock;
  }
  if (compactValues.outStock) {
    filters.outstock = OUT_STOCK_VALUE_MAP[compactValues.outStock] || compactValues.outStock;
  }
  if (compactValues.stoneTypeFw) {
    filters.diamond = compactValues.stoneTypeFw;
    filters.form_type = compactValues.stoneTypeFw === "F" ? "fancy" : "white";
  }

  const labValues = toArrayIfPresent(compactValues.lab);
  if (labValues?.length) filters.lab = labValues;

  const { types: groupTypes, pair: pairFromType } = mapGroupTypes(compactValues.type);
  if (groupTypes?.length) filters.type = groupTypes;
  if (pairFromType || compactValues.pair) filters.pair = "pair";

  const categoryValues = toArrayIfPresent(compactValues.category);
  if (categoryValues?.length) filters.category = categoryValues;

  const advancedMappings = {
    shape: advancedValues.shape,
    clarity: advancedValues.clarity,
    color: advancedValues.color,
    intensity: advancedValues.intensity,
    overtone: advancedValues.overtone,
    f_intensity: advancedValues.fluorescence,
    package: advancedValues.package,
    location: advancedValues.location,
    main_group: advancedValues.group,
    sub_group: advancedValues.subGroup,
  };
  Object.entries(advancedMappings).forEach(([key, value]) => {
    const parsed = toArrayIfPresent(value);
    if (parsed?.length) filters[key] = parsed;
  });

  if (caratFrom !== "") filters.clfrom = caratFrom;
  if (caratTo !== "") filters.clto = caratTo;

  return filters;
}

/**
 * Maps On Hand / Barcode toolbar filters to GET /product/inventory query params.
 */
export function buildOnHandApiFilters({
  stockChecks = [],
  fwRadio = "F",
  searchInput = "",
  extraFilters = {},
} = {}) {
  const filters = {
    available: "On Hand Stock",
    ...extraFilters,
  };

  if (fwRadio) filters.diamond = fwRadio;
  const trimmed = String(searchInput ?? "").trim();
  if (trimmed) filters.searchInput = trimmed;

  const checks = (Array.isArray(stockChecks) ? stockChecks : []).filter((c) => c && c !== "All");
  if (!checks.length) return filters;

  const types = [];
  checks.forEach((c) => {
    const mapped = STOCK_TYPE_MAP[c];
    if (mapped) types.push(mapped);
    if (c === "HOLD") filters.hold = true;
    if (c === "NON") filters.nm = true;
    if (c === "PAIR") filters.pair = "pair";
  });
  if (types.length) filters.type = types;

  return filters;
}

/** API row (snake_case) — used by OnHandStock / Barcode columns */
export function mapInventoryRowSnake(item, index = 0, offset = 1, limit = 100) {
  return {
    ...item,
    id: item.id,
    key: item.id,
    no: (offset - 1) * limit + index + 1,
  };
}

/** API row → camelCase for Box / Parcel / SingleToBox tables */
export function mapInventoryRowCamel(item) {
  return {
    id: item.id,
    key: item.id,
    mfgCode: item.mfg_code,
    sku: item.sku,
    lab: item.lab,
    certificate: item.report_no,
    shape: item.shape,
    pcs: item.polish_pcs,
    carat: item.polish_carat,
    type: item.group_type,
    color: item.main_color,
    clarity: item.clarity,
    cost: item.cost,
    rapPrice: item.rap_price,
    price: item.price,
    amount: item.amount,
    loc: item.location,
    remark: item.remark,
    reportNo: item.report_no,
    size: item.size,
    fluo: item.f_intensity,
    cut: item.cut,
    polish: item.polish,
    symm: item.symmentry,
    table: item.table_pc,
    depth: item.depth_pc,
    measurement: item.mesurment,
    girdle: item.gridle,
    intensity: item.intensity,
    overtone: item.overtone,
    colorDetail: item.color,
    bgm: item.bgm,
    eyeclean: item.eyeclean,
    pair: item.pair,
    hold: item.hold === 1 || item.hold === true,
    outward: item.outward ?? "",
    rapnetUpload: item.rapnet_upload,
    siteUpload: item.site_upload,
  };
}
