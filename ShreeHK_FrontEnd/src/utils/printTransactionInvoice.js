import { buildVenyaInvoicePrintDocument } from "./venyaInvoiceTemplate";
import {
  buildGiaMemoConsignmentPrintDocument,
  isGiaMemoConsignmentDocument,
} from "./giaMemoConsignmentTemplate";
import {
  buildSaleInvoicePrintDocument,
  isSaleInvoiceDocument,
} from "./saleInvoiceTemplate";

export function buildInvoicePrintDocument(invoiceData) {
  if (isGiaMemoConsignmentDocument(invoiceData)) {
    return buildGiaMemoConsignmentPrintDocument(invoiceData);
  }
  if (isSaleInvoiceDocument(invoiceData)) {
    return buildSaleInvoicePrintDocument(invoiceData);
  }
  return buildVenyaInvoicePrintDocument(invoiceData);
}

export function printTransactionInvoice(invoiceData) {
  if (!invoiceData) return false;

  const html = buildInvoicePrintDocument(invoiceData);
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("title", "Invoice print");
  // Full A4 off-screen frame — 0×0 hidden iframes can rasterize text in Save-as-PDF output
  printFrame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!frameDoc) {
    printFrame.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => printFrame.remove(), 250);
  };

  const triggerPrint = () => {
    window.setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } finally {
        cleanup();
      }
    }, 150);
  };

  if (printFrame.contentWindow?.document?.readyState === "complete") {
    triggerPrint();
  } else {
    printFrame.onload = triggerPrint;
  }

  return true;
}

export default printTransactionInvoice;
