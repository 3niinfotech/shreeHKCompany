/**
 * Same tones as inventory table rowClassName (diamondInventoryTable.scss):
 * red  = memo / consign
 * green = lab outward / sale-like
 * blue  = has lab certificate
 * grey  = on hold
 */
export const INVENTORY_ROW_TONES = {
  red: { bg: "#fee2e2", text: "#991b1b", hover: "#fecaca", border: "#fca5a5" },
  green: { bg: "#dcfce7", text: "#14532d", hover: "#bbf7d0", border: "#86efac" },
  blue: { bg: "#e0f2fe", text: "#0369a1", hover: "#bae6fd", border: "#7dd3fc" },
  grey: { bg: "#f1f5f9", text: "#334155", hover: "#e2e8f0", border: "#cbd5e1" },
  white: { bg: "#ffffff", text: "#334155", hover: "#f8fafc", border: "#e2e8f0" },
};

const toneTheme = (label, tone) => ({
  label,
  accent: tone.text,
  border: tone.border,
  bg: tone.bg,
  hover: tone.hover,
  btnBg: tone.text,
  btnBorder: tone.text,
});

/**
 * Action themes = inventory row condition colors (same as action panel tiles).
 * accent/bg = modal header; btnBg = Submit button.
 */
export const INVENTORY_ACTION_THEME = {
  onMemo: toneTheme("On Memo", INVENTORY_ROW_TONES.red),
  memo: toneTheme("On Memo", INVENTORY_ROW_TONES.red),
  consignment: toneTheme("Consignment", INVENTORY_ROW_TONES.red),
  unHold: toneTheme("Un Hold", INVENTORY_ROW_TONES.grey),
  sale: toneTheme("Sale", INVENTORY_ROW_TONES.green),
  sell: toneTheme("Sell Diamond", INVENTORY_ROW_TONES.green),
  changePrice: toneTheme("Change Price", INVENTORY_ROW_TONES.blue),
  labelA4: toneTheme("Label A4", INVENTORY_ROW_TONES.green),
  label: toneTheme("Label", INVENTORY_ROW_TONES.green),
  iExport: toneTheme("I.Export", INVENTORY_ROW_TONES.blue),
  export: toneTheme("Export", INVENTORY_ROW_TONES.blue),
  hold: toneTheme("Hold", INVENTORY_ROW_TONES.grey),
  mail: toneTheme("Mail", INVENTORY_ROW_TONES.blue),
  addPackage: toneTheme("Add Package", INVENTORY_ROW_TONES.white),
  reservation: toneTheme("Reserve", INVENTORY_ROW_TONES.grey),
};

export const INVENTORY_ACTION_FIELDS = {
  onMemo: [
    { name: "party", label: "Party Name", type: "input", required: true, span: 12 },
    { name: "memoDate", label: "Memo Date", type: "date", required: true, span: 12 },
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ],
  memo: [
    { name: "party", label: "Party Name", type: "input", required: true, span: 12 },
    { name: "memoDate", label: "Memo Date", type: "date", required: true, span: 12 },
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ],
  unHold: [
    { name: "remarks", label: "Description", type: "textarea", span: 24 },
  ],
  sale: [
    { name: "buyer", label: "Buyer / Party", type: "input", required: true, span: 12 },
    { name: "saleDate", label: "Sale Date", type: "date", required: true, span: 12 },
    { name: "price", label: "Sale Price", type: "number", required: true, span: 12 },
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ],
  sell: [
    { name: "buyer", label: "Buyer / Party", type: "input", required: true, span: 12 },
    { name: "saleDate", label: "Sale Date", type: "date", required: true, span: 12 },
    { name: "price", label: "Sale Price", type: "number", required: true, span: 12 },
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ],
  changePrice: [
    { name: "cost", label: "New Cost", type: "number", span: 12 },
    { name: "price", label: "New Price", type: "number", span: 12 },
    { name: "rap_price", label: "New Rap Price", type: "number", span: 12 },
  ],
  labelA4: [
    { name: "labelType", label: "Label Type", type: "select", required: true, span: 12, options: [{ label: "A4 Standard", value: "a4" }, { label: "A4 Detailed", value: "a4d" }] },
    { name: "copies", label: "Copies", type: "number", required: true, span: 12 },
  ],
  label: [
    { name: "labelType", label: "Label Type", type: "select", required: true, span: 12, options: [{ label: "Small", value: "sm" }, { label: "Large", value: "lg" }] },
    { name: "copies", label: "Copies", type: "number", required: true, span: 12 },
  ],
  iExport: [
    { name: "fileName", label: "File Name", type: "input", required: true, span: 12 },
    { name: "format", label: "Format", type: "select", required: true, span: 12, options: [{ label: "Excel", value: "xlsx" }, { label: "CSV", value: "csv" }] },
  ],
  export: [
    { name: "fileName", label: "File Name", type: "input", required: true, span: 12 },
    { name: "sheetName", label: "Sheet Name", type: "input", span: 12 },
  ],
  hold: [
    { name: "holdUntil", label: "Hold Until", type: "date", span: 12 },
    { name: "remarks", label: "Description", type: "textarea", span: 12, rows: 1 },
  ],
  mail: [
    { name: "toEmail", label: "To Email", type: "input", required: true, span: 12 },
    { name: "subject", label: "Subject", type: "input", required: true, span: 12 },
    { name: "message", label: "Message", type: "textarea", required: true, span: 24 },
  ],
  consignment: [
    { name: "party", label: "Consignment Party", type: "input", required: true, span: 12 },
    { name: "startDate", label: "Start Date", type: "date", required: true, span: 12 },
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ],
};

const VARIANT_ALIASES = {
  onMemo: "onMemo",
  memo: "memo",
  unHold: "unHold",
  sale: "sale",
  sell: "sell",
  changePrice: "changePrice",
  labelA4: "labelA4",
  label: "label",
  iExport: "iExport",
  export: "export",
  hold: "hold",
  mail: "mail",
  addPackage: "addPackage",
  reservation: "reservation",
  consignment: "consignment",
};

export const resolveActionVariant = (actionKey) => VARIANT_ALIASES[actionKey] || actionKey;

export const getActionTheme = (actionKey) => {
  const variant = resolveActionVariant(actionKey);
  return INVENTORY_ACTION_THEME[variant] || toneTheme(actionKey, INVENTORY_ROW_TONES.blue);
};

export const getActionFields = (actionKey) => {
  const variant = resolveActionVariant(actionKey);
  return INVENTORY_ACTION_FIELDS[variant] || [
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ];
};
