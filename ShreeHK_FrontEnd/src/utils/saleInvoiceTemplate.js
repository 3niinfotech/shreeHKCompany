/**
 * Sale / Export invoice — print + legacy HTML exports.
 * UI: components/transaction/invoice/SaleInvoice.jsx
 * Styles: assets/scss/components/transaction/saleInvoice.scss
 */

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import SaleInvoice, { SaleInvoicePage } from "../components/transaction/invoice/SaleInvoice.jsx";
import { APPROVAL_MEMO_STYLES } from "./approvalMemoTemplate.js";
import { INVOICE_A4_STYLES } from "./invoiceA4.js";
import { SALE_INVOICE_STYLES } from "./saleInvoiceStyles.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export { SALE_INVOICE_STYLES, SALE_INVOICE_EXTRA_STYLES } from "./saleInvoiceStyles.js";

export function buildSaleInvoicePage(data, copyLabel = "(ORIGINAL COPY)") {
  return renderToStaticMarkup(createElement(SaleInvoicePage, { data, copyLabel }));
}

export function buildSaleInvoiceBody(data, options = {}) {
  const { includeCustomerCopy = true } = options;
  return renderToStaticMarkup(createElement(SaleInvoice, { ...data, includeCustomerCopy }));
}

export function buildSaleInvoicePrintDocument(data) {
  const body = buildSaleInvoiceBody(data, { includeCustomerCopy: true });
  const title = `${escapeHtml(data.invoiceTitle || "Invoice")} — ${escapeHtml(data.invoiceNo || "")}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: #fff; }
    ${INVOICE_A4_STYLES}
    ${APPROVAL_MEMO_STYLES}
    ${SALE_INVOICE_STYLES}
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function isSaleInvoiceDocument(data) {
  const type = String(data?.docType || data?.type || "").toLowerCase();
  const title = String(data?.invoiceTitle || "").toLowerCase();
  if (type === "memo" || type === "consign") return false;
  return type === "sale" || type === "export" || title.includes("sale") || title.includes("export");
}

export default buildSaleInvoiceBody;
