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
  printFrame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
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
