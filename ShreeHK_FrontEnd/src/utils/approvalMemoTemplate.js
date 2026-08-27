/**
 * Approval Memo — exact layout/colors from Venya reference HTML.
 * Used by TransactionInvoice preview + print (memo / out-memo documents).
 */

import { buildCompanyLogoHtml, resolveCompanyLogoUrl } from "./companyLogo.js";

export const APPROVAL_MEMO_COLORS = {
  pink: "#d6298e",
  blue: "#2e6fad",
  blueLight: "#eaf2fa",
  ink: "#222",
  line: "#bcd2e8",
  paper: "#ffffff",
};

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

const DEFAULT_FOOTER_NOTE = "Receive the above goods as per condition overleaf.";

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

export const APPROVAL_MEMO_STYLES = `
  .approval-memo-root{
    --pink:#d6298e;
    --blue:#2e6fad;
    --blue-light:#eaf2fa;
    --ink:#222;
    --line:#bcd2e8;
    --paper:#ffffff;
    font-family:'Segoe UI', Tahoma, sans-serif;
    color:var(--ink);
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  .approval-memo-root *{box-sizing:border-box;}
  .approval-memo-root .sheet{
    width:210mm;
    min-height:297mm;
    max-width:100%;
    margin:0 auto;
    background:var(--paper);
    box-shadow:0 6px 24px rgba(0,0,0,.12);
    border:1px solid var(--line);
  }
  .approval-memo-root .header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    padding:28px 15px 18px;
    border-bottom:2px solid var(--line);
  }
  .approval-memo-root .brand{display:flex;align-items:center;gap:14px;}
  .approval-memo-root .logo{
    width:50px;height:50px;border-radius:50%;
    // background:var(--blue);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:700;font-size:20px;
    font-family:Georgia,serif;
    flex-shrink:0;
  }
  .approval-memo-root .brand-name{font-family:Georgia,serif;font-size:24px;letter-spacing:2px;color:var(--blue);font-weight:700;line-height:1;}
  .approval-memo-root .brand-sub{font-size:10px;letter-spacing:3px;color:var(--pink);font-weight:600;margin-top:4px;}
  .approval-memo-root .memo-title{text-align:right;}
  .approval-memo-root .memo-title h1{margin:0;font-family:Georgia,serif;font-size:24px;color:var(--blue);}
  .approval-memo-root .memo-title span{font-size:11px;color:#888;letter-spacing:1px;}
  .approval-memo-root .company-block{
    display:flex;justify-content:space-between;
    padding:20px 15px;
    font-size:12.5px;
    border-bottom:1px solid var(--line);
    gap:24px;
  }
  .approval-memo-root .company-block .col{line-height:1.55;flex:1;}
  .approval-memo-root .company-block .col strong{display:block;font-size:13px;color:var(--pink);margin-bottom:4px;}
  .approval-memo-root .company-block .right{text-align:right;}
  .approval-memo-root .company-block .right strong{color:var(--blue);}
  .approval-memo-root .meta-strip{
    display:flex;
    justify-content:space-between;
    padding: 5px 15px;
    border-bottom:1px solid var(--line);
    gap:16px;
  }
  .approval-memo-root .meta-strip .field{font-size:12.5px;
      display: flex;
    align-items: baseline;
    gap: 16px;
  }
  .approval-memo-root .meta-strip .field label{display:block;color:#888;font-size:12.5px;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;}
  .approval-memo-root .meta-strip .field .val{font-weight:600;color:var(--pink);font-size:12.5px;}
  .approval-memo-root .table-wrap{padding:15px 15px 0;}
  .approval-memo-root table{width:100%;border-collapse:collapse;}
  .approval-memo-root thead th {
    background: var(--blue-light);
    color: var(--blue);
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .5px;
    text-transform: uppercase;
    padding: 5px;
    border: 1px solid var(--line);
    text-align: center;
}
  .approval-memo-root thead th:nth-child(2),
  .approval-memo-root thead th:nth-child(3){text-align:left;}
  .approval-memo-root tbody td{
    padding: 3px;
    font-size:13px;
    text-align:center;
    border:1px solid var(--line);
  }
  .approval-memo-root tbody td:nth-child(2){text-align:left;color:#555;}
  .approval-memo-root tbody td:nth-child(3){text-align:left;}
  .approval-memo-root .amt{font-weight:600;color:var(--ink);}
  .approval-memo-root tfoot td{
    padding: 5px;
    font-size: 11.5px;
    font-weight: 600;
    border:1px solid var(--line);
    color:var(--pink);
    background:var(--blue-light);
    text-align:center;
  }
  .approval-memo-root tfoot td:nth-child(1){text-align:center;}
  .approval-memo-root .footer-note{
    display:flex;justify-content:space-between;align-items:center;
    padding:10px 15px;
    font-size:12px;
    border-bottom:1px dashed var(--line);
    gap:16px;
  }
  .approval{font-weight:700;color:var(--blue);white-space:nowrap;}
  .condition{color:var(--pink);font-style:italic;text-align:right;}
  .approval-memo-root .signatures{
    display:flex;
    justify-content:space-between;
    padding: 10px 15px 36px;
    gap:12px;
  }
  .approval-memo-root .sig{width:30%;text-align:center;}
  .approval-memo-root .sig .line{border-bottom:1px solid #999;height:44px;}
  .approval-memo-root .sig .label{margin-top:8px;font-size:11.5px;letter-spacing:1px;color:#888;text-transform:uppercase;}
  .approval-memo-root .sig .for{margin-top:2px;font-size:12px;color:var(--blue);font-weight:600;}
  .approval-memo-root .am-page-break{page-break-after:always;}
  .approval-memo-root .am-page-break:last-child{page-break-after:auto;}
  @media print{
    .approval-memo-root .sheet{box-shadow:none;border:none;width:210mm;min-height:297mm;}
  }
`;

function buildBuyerBlock(party = {}) {
  const name = escapeHtml(party.name || "—");
  const address = party.address ? `${escapeHtml(party.address)}<br>` : "";
  const pinCountry = [party.pincode, party.country].filter(Boolean).map(escapeHtml).join(", ");
  const pinLine = pinCountry ? `${pinCountry}<br>` : "";
  const contactPerson = party.contactPerson ? `${escapeHtml(party.contactPerson)}<br>` : "";
  const tel = party.contact
    ? `<span style="color:${APPROVAL_MEMO_COLORS.pink};font-weight:700;">Tel:</span> ${escapeHtml(party.contact)}`
    : "";

  return `<strong>To: ${name}</strong>
    ${address}${pinLine}${contactPerson}${tel}`;
}

function formatSenderLine(line) {
  if (line.startsWith("Tax ID:")) {
    return `<span style="color:${APPROVAL_MEMO_COLORS.pink};font-weight:700;">Tax ID:</span> ${escapeHtml(line.slice(7).trim())}<br>`;
  }
  if (line.startsWith("Tel (Office):")) {
    return `<span style="color:${APPROVAL_MEMO_COLORS.pink};font-weight:700;">Tel (Office):</span> ${escapeHtml(line.slice(13).trim())}<br>`;
  }
  return `${escapeHtml(line)}<br>`;
}

function buildSenderBlock() {
  const lines = VENYA_SENDER.lines.map(formatSenderLine).join("");
  return `<strong>${escapeHtml(VENYA_SENDER.name)}</strong>${lines}`;
}

export const MEMO_MAX_ROWS = 20;

function buildChunkTableRows(chunk, startIndex, minRows = MEMO_MAX_ROWS) {
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

export function buildApprovalMemoPage(data, copyLabel = "(ORIGINAL COPY)") {
  const rows = normalizeLineItems(data.lineItems || []);
  const totals = computeTotals(rows);
  const approvalNo = escapeHtml(data.invoiceNo || data.approvalNo || "—");
  const referenceNo = escapeHtml(data.reference || data.referenceNo || "—");
  const footerNote = escapeHtml(data.footerNote || DEFAULT_FOOTER_NOTE);

  const chunks = [];
  if (rows.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < rows.length; i += MEMO_MAX_ROWS) {
      chunks.push(rows.slice(i, i + MEMO_MAX_ROWS));
    }
  }

  const totalPages = chunks.length;

  return chunks
    .map((chunk, pageIndex) => {
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * MEMO_MAX_ROWS;
      const currentCopyLabel =
        totalPages > 1
          ? `${escapeHtml(copyLabel)} (Page ${pageIndex + 1} of ${totalPages})`
          : escapeHtml(copyLabel);

      const tableBody = buildChunkTableRows(chunk, startIndex, MEMO_MAX_ROWS);

      const tfootContent = isLastPage
        ? `<tfoot>
            <tr>
              <td>Total</td><td></td><td></td>
              <td>${totals.pcs || "0"}</td>
              <td>${fmtCarats(totals.carats)}</td>
              <td>US$</td>
              <td>${fmtMoney(totals.amount)}</td>
            </tr>
          </tfoot>`
        : "";

      const footerSection = isLastPage
        ? `<div class="footer-note">
            <div class="approval">Approval No. ${approvalNo}</div>
            <div class="condition">${footerNote}</div>
          </div>
          <div class="signatures">
            <div class="sig">
              <div class="line"></div>
              <div class="label">Issued By</div>
              <div class="for">For Venya Gems Co., Ltd.</div>
            </div>
            <div class="sig">
              <div class="line"></div>
              <div class="label">Delivery By</div>
              <div class="for">For Venya Gems Co., Ltd.</div>
            </div>
            <div class="sig">
              <div class="line"></div>
              <div class="label">Accepted By</div>
              <div class="for">Signature &amp; Chop</div>
            </div>
          </div>`
        : `<div style="text-align:right;padding:10px 15px;font-style:italic;color:#777;font-size:11px;">
            Continued on Page ${pageIndex + 2}...
          </div>
          <div style="height:40px;"></div>`;

      return `<div class="sheet am-page-break">
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
            <h1>Approval Memo</h1>
            <span>${currentCopyLabel}</span>
          </div>
        </div>

        <div class="company-block">
          <div class="col">${buildBuyerBlock(data.party)}</div>
          <div class="col right">${buildSenderBlock()}</div>
        </div>

        <div class="meta-strip">
          <div class="field"><label>Date</label><div class="val">${escapeHtml(fmtDisplayDate(data.date))}</div></div>
          <div class="field"><label>Approval No.</label><div class="val">${approvalNo}</div></div>
          <div class="field"><label>Reference No.</label><div class="val">${referenceNo}</div></div>
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

export function buildApprovalMemoBody(data, options = {}) {
  const { includeCustomerCopy = true } = options;
  const original = buildApprovalMemoPage(data, "(ORIGINAL COPY)");
  if (!includeCustomerCopy) {
    return `<div class="approval-memo-root">${original}</div>`;
  }
  const customer = buildApprovalMemoPage(data, "(CUSTOMER COPY)");
  return `<div class="approval-memo-root">${original}${customer}</div>`;
}

import { INVOICE_A4_STYLES } from "./invoiceA4.js";

export function buildApprovalMemoPrintDocument(data) {
  const body = buildApprovalMemoBody(data, { includeCustomerCopy: true });
  const title = `Approval Memo — ${escapeHtml(data.invoiceNo || "")}`;
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
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function isApprovalMemoDocument(data) {
  const type = String(data?.docType || data?.type || "").toLowerCase();
  const title = String(data?.invoiceTitle || "").toLowerCase();
  return type === "memo" || type === "consign" || title.includes("memo");
}

export default buildApprovalMemoBody;
