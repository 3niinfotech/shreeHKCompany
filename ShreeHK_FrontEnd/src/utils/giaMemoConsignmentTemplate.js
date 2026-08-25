/**
 * GIA Memo / Consignment invoice — /transaction/gia-memo
 * Styles: src/assets/css/giaMemoInvoice.css
 */

import giaMemoInvoiceCss from "../assets/css/giaMemoInvoice.css?raw";
import { INVOICE_A4_STYLES } from "./invoiceA4.js";
import { num2words } from "./venyaInvoiceTemplate.js";
import { buildCompanyLogoHtml, resolveCompanyLogoUrl } from "./companyLogo.js";

export const GIA_MEMO_INVOICE_STYLES = giaMemoInvoiceCss;

const COLORS = { pink: "#d6298e", blue: "#2e6fad" };

const VENYA_SENDER = {
  name: "Venya Gems Co., Ltd.",
  lines: [
    "Wang Lee Building 297, 4th Floor, Unit C",
    "Surawong Road, Suriyawong, Bangrak,",
    "Bangkok 10500 — Head Office",
    "Tax ID: 0105549064633",
    "Tel (Office): +66-81-8254296",
  ],
};

const DEFAULT_LEGAL =
  "The diamonds herein invoiced have been (sourced) purchase from legitimate sources not involved in the funding of conflict, in compliance with United Nations resolutions and corresponding national laws (where the invoice is generated). The seller hereby guarantees that these diamonds are conflict free and confirms adherence to the WCD SoW. The diamonds herein invoiced are neither recycled nor sourced from artisanally mined and it is exclusive of natural diamond, free from any synthetic or treated diamonds.";

const BOC_BANK = {
  acName: "Venya Gems Co., Ltd.",
  bankName: "Bank of China (Hong Kong) Limited",
  accountNo: "012 791 20084524 (USD)<br>012 791 20084511 (HKD)",
  bankCode: "012",
  branchCode: "791",
  swiftCode: "BKCHHKHHXXX",
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDisplayDate = (value) => {
  if (!value || value === "—") return "—";
  const str = String(value);
  const iso = str.length >= 10 ? str.slice(0, 10) : str;
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}-${m}-${y}`;
  return str;
};

const fmtMoney = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtCarats = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const capitalizeWords = (text) =>
  String(text || "")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");

const normalizeLineItems = (lineItems = []) =>
  lineItems.map((row, index) => ({
    no: index + 1,
    sku: row.sku && row.sku !== "—" ? row.sku : "",
    description: row.description || [row.shape, row.color, row.clarity, row.size].filter(Boolean).join(" ") || "",
    pcs: row.pcs ?? "",
    carats: row.carat ?? row.carats ?? "",
    price: row.price ?? "",
    amount: row.amount ?? "",
  }));

const computeTotals = (rows) =>
  rows.reduce(
    (acc, row) => ({
      pcs: acc.pcs + Number(row.pcs || 0),
      carats: acc.carats + Number(row.carats || 0),
      amount: acc.amount + Number(row.amount || 0),
    }),
    { pcs: 0, carats: 0, amount: 0 },
  );

export function isGiaMemoConsignmentDocument(data) {
  const type = String(data?.docType || data?.type || "").toLowerCase();
  const title = String(data?.invoiceTitle || "").toLowerCase();
  return type === "lab" || type === "gia" || title.includes("gia");
}

function formatSenderLine(line) {
  if (line.startsWith("Tax ID:")) {
    return `<span style="color:${COLORS.pink};font-weight:700;">Tax ID:</span> ${escapeHtml(line.slice(7).trim())}<br>`;
  }
  if (line.startsWith("Tel (Office):")) {
    return `<span style="color:${COLORS.pink};font-weight:700;">Tel (Office):</span> ${escapeHtml(line.slice(13).trim())}<br>`;
  }
  return `${escapeHtml(line)}<br>`;
}

function buildBuyerBlock(party = {}) {
  const name = escapeHtml(party.name || "—");
  const address = party.address ? `${escapeHtml(party.address)}<br>` : "";
  const pinCountry = [party.pincode, party.country].filter(Boolean).map(escapeHtml).join(", ");
  const pinLine = pinCountry ? `${pinCountry}<br>` : "";
  const contactPerson = party.contactPerson ? `${escapeHtml(party.contactPerson)}<br>` : "";
  const tel = party.contact
    ? `<span style="color:${COLORS.pink};font-weight:700;">Tel:</span> ${escapeHtml(party.contact)}`
    : "";

  return `<strong>To: ${name}</strong>${address}${pinLine}${contactPerson}${tel}`;
}

function buildSenderBlock() {
  const lines = VENYA_SENDER.lines.map(formatSenderLine).join("");
  return `<strong>${escapeHtml(VENYA_SENDER.name)}</strong>${lines}`;
}

function buildTableRows(rows, minRows = 5) {
  const padded = [...rows];
  while (padded.length < minRows) {
    padded.push({ no: padded.length + 1, sku: "", description: "", pcs: "", carats: "", price: "", amount: "" });
  }

  return padded
    .map(
      (row) => `<tr>
      <td>${row.no}</td>
      <td>${escapeHtml(row.sku)}</td>
      <td>${escapeHtml(row.description)}</td>
      <td>${row.pcs !== "" ? escapeHtml(row.pcs) : ""}</td>
      <td>${row.carats !== "" && row.carats != null ? fmtCarats(row.carats) : ""}</td>
      <td>${row.price !== "" && row.price != null ? fmtMoney(row.price) : ""}</td>
      <td class="amt">${row.amount !== "" && row.amount != null ? fmtMoney(row.amount) : ""}</td>
    </tr>`,
    )
    .join("");
}

function buildPaymentDetail() {
  const b = BOC_BANK;
  return `<div class="payment-detail">
    <div class="title">Payment Detail</div>
    <div class="row"><span class="lbl">A/c. Name</span><span class="v">${escapeHtml(b.acName)}</span></div>
    <div class="row"><span class="lbl">Bank Name</span><span class="v">${escapeHtml(b.bankName)}</span></div>
    <div class="row"><span class="lbl">Account No</span><span class="v">${b.accountNo}</span></div>
    <div class="row"><span class="lbl">Bank Code</span><span class="v">${escapeHtml(b.bankCode)}</span></div>
    <div class="row"><span class="lbl">Branch Code</span><span class="v">${escapeHtml(b.branchCode)}</span></div>
    <div class="row"><span class="lbl">Swift Code</span><span class="v">${escapeHtml(b.swiftCode)}</span></div>
  </div>`;
}

export const GIA_MAX_ROWS = 20;

function buildGiaChunkTableRows(chunk, startIndex, minRows = GIA_MAX_ROWS) {
  const padded = [...chunk];
  while (padded.length < minRows) {
    padded.push({ no: startIndex + padded.length + 1, sku: "", description: "", pcs: "", carats: "", price: "", amount: "" });
  }

  return padded
    .map(
      (row, idx) => {
        const itemNo = row.no || (startIndex + idx + 1);
        return `<tr>
        <td>${itemNo}</td>
        <td>${escapeHtml(row.sku)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${row.pcs !== "" ? escapeHtml(row.pcs) : ""}</td>
        <td>${row.carats !== "" && row.carats != null ? fmtCarats(row.carats) : ""}</td>
        <td>${row.price !== "" && row.price != null ? fmtMoney(row.price) : ""}</td>
        <td class="amt">${row.amount !== "" && row.amount != null ? fmtMoney(row.amount) : ""}</td>
      </tr>`;
      },
    )
    .join("");
}

export function buildGiaMemoConsignmentPage(data, copyLabel = "(ORIGINAL COPY)") {
  const rows = normalizeLineItems(data.lineItems || []);
  const totals = computeTotals(rows);
  const subTotal = totals.amount;
  const vatAmount = Number(data.vatAmount ?? 0);
  const grandTotal = Number(data.totals?.finalAmount ?? data.finalAmount ?? subTotal + vatAmount);
  const consignmentNo = escapeHtml(data.invoiceNo || "—");
  const referenceNo = escapeHtml(data.reference || "—");
  const terms = escapeHtml(data.terms ?? "");
  const dueDate = escapeHtml(fmtDisplayDate(data.dueDate || data.date));
  const inWord = capitalizeWords(`${num2words(grandTotal)} Only`);
  const legal = escapeHtml(data.disclaimer || DEFAULT_LEGAL);

  const chunks = [];
  if (rows.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < rows.length; i += GIA_MAX_ROWS) {
      chunks.push(rows.slice(i, i + GIA_MAX_ROWS));
    }
  }

  const totalPages = chunks.length;

  return chunks
    .map((chunk, pageIndex) => {
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * GIA_MAX_ROWS;
      const currentCopyLabel =
        totalPages > 1
          ? `${escapeHtml(copyLabel)} (Page ${pageIndex + 1} of ${totalPages})`
          : escapeHtml(copyLabel);

      const tableBody = buildGiaChunkTableRows(chunk, startIndex, GIA_MAX_ROWS);

      const tfootContent = isLastPage
        ? `<tfoot>
            <tr>
              <td colspan="3" class="total-label">Total (Before VAT)</td>
              <td>${totals.pcs || "0"}</td>
              <td>${fmtCarats(totals.carats)}</td>
              <td>US$</td>
              <td>${fmtMoney(subTotal)}</td>
            </tr>
            <tr class="grand">
              <td colspan="5">Grand Total</td>
              <td>US$</td>
              <td>${fmtMoney(grandTotal)}</td>
            </tr>
          </tfoot>`
        : "";

      const footerSection = isLastPage
        ? `<div class="in-word"><span class="label">In Word:</span> ${escapeHtml(inWord)}</div>
          <div class="terms-block">
            <table>
              <tr><td>Payment Terms</td><td>${terms}</td></tr>
              <tr><td>Due Date</td><td>${dueDate}</td></tr>
              <tr><td></td><td>Part Payment Allowed</td></tr>
            </table>
          </div>
          <div class="pay-confirm">
            ${buildPaymentDetail()}
            <div class="confirm-col">
              <div class="title">Confirmed By :</div>
            </div>
          </div>
          <div class="signatures">
            <div class="sig">
              <div class="line"></div>
              <div class="label">For Venya Gems Co., Ltd. — (Authorised Signature)</div>
            </div>
            <div class="sig">
              <div class="line"></div>
              <div class="label">(Chop &amp; Buyer's Signature)</div>
            </div>
          </div>
          <div class="legal">
            ${legal}
            <div class="note">NOTE : All diamonds are sold &amp; delivered in Bangkok, Thailand.</div>
          </div>`
        : `<div style="text-align:right;padding:10px 15px;font-style:italic;color:#777;font-size:11px;">
            Continued on Page ${pageIndex + 2}...
          </div>
          <div style="height:40px;"></div>`;

      return `<div class="sheet gia-page-break">
        <div class="header">
          <div class="brand">
            ${buildCompanyLogoHtml({
              logo: data.company?.logo,
              logoUrl: resolveCompanyLogoUrl(data.company?.logoUrl || data.company?.logo),
              companyName: data.company?.name || "Venya",
              className: "logo",
              imgStyle: "max-height:56px;max-width:140px;object-fit:contain;display:block;",
            })}
            <div>
              <div class="brand-name">${escapeHtml((data.company?.name || "VENYA").split(/\s+/)[0].toUpperCase())}</div>
              <div class="brand-sub">${escapeHtml(data.company?.tagline || "GEMS CO., LTD.")}</div>
            </div>
          </div>
          <div class="memo-title">
            <h1>Consignment</h1>
            <span>${currentCopyLabel}</span>
          </div>
        </div>

        <div class="company-block">
          <div class="col">${buildBuyerBlock(data.party)}</div>
          <div class="col right">${buildSenderBlock()}</div>
        </div>

        <div class="meta-strip">
          <div class="field"><label>Date</label><div class="val blue">${escapeHtml(fmtDisplayDate(data.date))}</div></div>
          <div class="field"><label>Reference No.</label><div class="val">${referenceNo}</div></div>
          <div class="field"><label>Consignment No.</label><div class="val">${consignmentNo}</div></div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No.</th><th>SKU</th><th>Description</th>
                <th>Pcs</th><th>Carats</th><th>Price (US$)</th><th>Amount (US$)</th>
              </tr>
            </thead>
            <tbody>${tableBody}</tbody>
            ${tfootContent}
          </table>
        </div>

        ${footerSection}
      </div>`;
    })
    .join("");
}

export function buildGiaMemoConsignmentBody(data, options = {}) {
  const { includeCustomerCopy = true } = options;
  const original = buildGiaMemoConsignmentPage(data, "(ORIGINAL COPY)");
  if (!includeCustomerCopy) {
    return `<div class="gia-memo-invoice-root">${original}</div>`;
  }
  const customer = buildGiaMemoConsignmentPage(data, "(CUSTOMER COPY)");
  return `<div class="gia-memo-invoice-root">${original}${customer}</div>`;
}

export function buildGiaMemoConsignmentPrintDocument(data) {
  const body = buildGiaMemoConsignmentBody(data, { includeCustomerCopy: true });
  const title = `Consignment — ${escapeHtml(data.invoiceNo || "")}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: #fff; }
    ${INVOICE_A4_STYLES}
    ${GIA_MEMO_INVOICE_STYLES}
  </style>
</head>
<body>${body}</body>
</html>`;
}

export default buildGiaMemoConsignmentBody;
