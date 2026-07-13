import { cssVar } from "../../theme";

/**
 * Action themes aligned with inventoryFilterPanel action tile colors.
 * accent = OK button / header accent; border/bg match action grid tiles.
 */
export const INVENTORY_ACTION_THEME = {
  onMemo: { label: "On Memo", accent: cssVar("color-warning"), border: cssVar("color-badge-warning-border"), bg: cssVar("color-warning-light") },
  unHold: { label: "Un Hold", accent: cssVar("color-success-dark"), border: cssVar("color-badge-success-border"), bg: cssVar("color-success-light") },
  sale: { label: "Sale", accent: cssVar("color-success-dark"), border: cssVar("color-badge-success-border"), bg: cssVar("color-alert-success-bg") },
  sell: { label: "Sell Diamond", accent: cssVar("color-success-dark"), border: cssVar("color-badge-success-border"), bg: cssVar("color-alert-success-bg") },
  changePrice: { label: "Change Price", accent: cssVar("color-info-dark"), border: cssVar("color-badge-info-border"), bg: cssVar("color-info-light") },
  labelA4: { label: "Label A4", accent: cssVar("color-badge-info-text"), border: cssVar("color-badge-info-border"), bg: cssVar("color-badge-info-bg") },
  label: { label: "Label", accent: cssVar("color-entity-other-text"), border: cssVar("color-badge-info-border"), bg: cssVar("color-entity-other-bg") },
  iExport: { label: "I.Export", accent: cssVar("color-primary-dark"), border: cssVar("color-badge-success-border"), bg: cssVar("color-primary-pale") },
  export: { label: "Export", accent: cssVar("color-info"), border: cssVar("color-badge-info-border"), bg: cssVar("color-info-light") },
  hold: { label: "Hold", accent: cssVar("color-warning-dark"), border: cssVar("color-badge-warning-border"), bg: cssVar("color-alert-warning-bg") },
  mail: { label: "Mail", accent: cssVar("color-error-dark"), border: cssVar("color-badge-error-border"), bg: cssVar("color-error-light") },
  memo: { label: "Memo Diamond", accent: cssVar("color-warning"), border: cssVar("color-badge-warning-border"), bg: cssVar("color-warning-light") },
  consignment: { label: "Consignment Diamond", accent: cssVar("color-entity-other-text"), border: cssVar("color-badge-info-border"), bg: cssVar("color-entity-other-bg") },
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
    { name: "cost", label: "New Cost", type: "number", span: 8 },
    { name: "price", label: "New Price", type: "number", span: 8 },
    { name: "rap_price", label: "New Rap Price", type: "number", span: 8 },
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
    { name: "remarks", label: "Description", type: "textarea", span: 24 },
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
  consignment: "consignment",
};

export const resolveActionVariant = (actionKey) => VARIANT_ALIASES[actionKey] || actionKey;

export const getActionTheme = (actionKey) => {
  const variant = resolveActionVariant(actionKey);
  return INVENTORY_ACTION_THEME[variant] || {
    label: actionKey,
    accent: cssVar("color-alert-info-text"),
    border: cssVar("color-badge-info-border"),
    bg: cssVar("color-alert-info-bg"),
  };
};

export const getActionFields = (actionKey) => {
  const variant = resolveActionVariant(actionKey);
  return INVENTORY_ACTION_FIELDS[variant] || [
    { name: "remarks", label: "Remarks", type: "textarea", span: 24 },
  ];
};
