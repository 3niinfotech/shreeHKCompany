/**
 * Sale / Export invoice — uses legacy Venya HTML invoice template.
 */

import {
  buildVenyaInvoiceBody,
  buildVenyaInvoicePrintDocument,
} from "./venyaInvoiceTemplate.js";

export { SALE_INVOICE_STYLES, SALE_INVOICE_EXTRA_STYLES } from "./saleInvoiceStyles.js";

export function buildSaleInvoicePage(data, copyLabel = "(ORIGINAL COPY)") {
  return buildVenyaInvoiceBody(data, { includeCustomerCopy: copyLabel.includes("CUSTOMER") });
}

export function buildSaleInvoiceBody(data, options = {}) {
  return buildVenyaInvoiceBody(data, options);
}

export function buildSaleInvoicePrintDocument(data) {
  return buildVenyaInvoicePrintDocument(data);
}

export function isSaleInvoiceDocument(data) {
  const type = String(data?.docType || data?.type || "").toLowerCase();
  const title = String(data?.invoiceTitle || "").toLowerCase();
  if (type === "memo" || type === "consign") return false;
  return type === "sale" || type === "export" || title.includes("sale") || title.includes("export");
}

export default buildSaleInvoiceBody;

