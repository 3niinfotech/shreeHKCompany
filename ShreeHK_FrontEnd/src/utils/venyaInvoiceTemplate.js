/** Venya legacy invoice layout — sale/purchase use PHP-style template; memo uses approvalMemoTemplate.js */

import {
  APPROVAL_MEMO_STYLES,
  buildApprovalMemoBody,
  buildApprovalMemoPrintDocument,
  isApprovalMemoDocument,
} from "./approvalMemoTemplate.js";
import {
  buildSaleInvoiceBody,
  buildSaleInvoicePrintDocument,
  isSaleInvoiceDocument,
} from "./saleInvoiceTemplate.js";
import { INVOICE_A4_STYLES } from "./invoiceA4.js";
import { buildCompanyLogoHtml, resolveCompanyLogoUrl } from "./companyLogo.js";

export const VENYA_BLUE = "#4991b1";
export const VENYA_PINK = "#cc3399";

const VENYA_COMPANY = {
  name: "Venya Gems Co., Ltd.",
  addressLines: [
    "Wang Lee Building 297,4th Floor,Unit C",
    "Surawong Road, Suriyawong, Bangrak, Bangkok 10500",
    "Head Office",
    "Tax ID: 0 1 0 5 5 4 9 0 6 4 6 3 3",
    "Tel No. (Office): +66-81-8254296",
  ],
};

const DEFAULT_DISCLAIMER =
  "The diamonds herein invoiced have been (sourced) purchase from legitimate sources not involved in the funding of conflict, in compliance with United Nations resolutions and corresponding national laws (where the invoice is generated). The seller hereby guarantees that these diamonds are conflict free and confirms adherence to the WCD SoW. The diamonds herein invoiced are neither recycled nor sourced from artisanally mined and it is exclusive of natural diamond, free from any synthetic or treated diamonds.";

const BOC_BANK = {
  acName: "Venya Gems Co., Ltd.",
  bankName: "BANK OF CHINA (HONG KONG) LIMITED",
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

const fmtDate = (value) => {
  if (!value) return "";
  const str = String(value);
  const iso = str.length >= 10 ? str.slice(0, 10) : str;
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}-${m}-${y}`;
  return str;
};

const fmtMoney = (value, digits = 2) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const fmtCarat = (value) => fmtMoney(value, 3);

/** Port of venya/dai/Helper.php num2words */
export function num2words(num, includeCurrency = true) {
  const ZERO = "zero";
  const MINUS = "minus";
  const lowName = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tys = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const groupName = ["", "hundred", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion"];
  const divisor = [100, 10, 1000, 1000, 1000, 1000, 1000, 1000];

  let clean = String(num).replace(/,/g, "");
  clean = Number(clean).toFixed(2);
  const cents = clean.slice(-2);
  let n = Math.floor(Number(clean));

  if (n === 0) return includeCurrency ? "zero dollars only" : ZERO;

  let s = "";
  const negative = n < 0;
  if (negative) n = -n;

  for (let i = 0; n > 0; i++) {
    let remdr = n % divisor[i];
    n = Math.floor(n / divisor[i]);

    if (i === 1 && n >= 1 && n <= 5 && remdr > 0) {
      remdr = n * 10;
      n = 0;
    }
    if (remdr === 0) continue;

    let t = "";
    if (remdr < 20) {
      t = lowName[remdr];
    } else if (remdr < 100) {
      const units = remdr % 10;
      const tens = Math.floor(remdr / 10);
      t = tys[tens];
      if (units) t += `-${lowName[units]}`;
    } else {
      t = num2words(remdr, false);
    }
    s = `${t} ${groupName[i]} ${s}`.trim();
  }

  s = s.trim();
  if (negative) s = `${MINUS} ${s}`;

  if (!includeCurrency) return s;

  s += " dollars";
  const centsNum = Number(cents);
  if (centsNum > 0) {
    if (centsNum > 10 && centsNum <= 19) {
      s += ` and ${lowName[centsNum]} cents`;
    } else {
      const pence = Number(cents[1]);
      const dimes = Number(cents[0]);
      s += ` and ${tys[dimes]} ${lowName[pence]} cents`.replace(/\s+/g, " ").trim();
    }
  }
  return s;
}

function resolveVariant(data) {
  const type = String(data.docType || data.type || "").toLowerCase();
  const inwardType = String(data.inwardType || "").toLowerCase();
  const title = String(data.invoiceTitle || "").toLowerCase();

  if (type === "memo" || type === "consign" || title.includes("memo")) return "memo";
  if (inwardType === "purchase" || inwardType === "import" || title.includes("purchase")) return "purchase";
  return "invoice";
}

function buildDescription(row) {
  const color = row.main_color || row.color || "";
  const parts = [row.shape, color, row.clarity, row.size].filter(Boolean).join(" ");
  const lab = row.report_no ? ` GIA : ${row.report_no}` : row.lab ? ` ${row.lab} : ${row.report_no || ""}`.trim() : "";
  return `${parts}${lab}`.trim() || "—";
}

function buildLineItem(row) {
  const price = Number(row.sell_price || row.price || 0);
  const amount = Number(row.sell_amount || row.amount || 0);
  return {
    sku: row.sku || row.mfg_code || "",
    description: buildDescription(row),
    pcs: Number(row.pcs ?? row.polish_pcs ?? 0),
    carat: Number(row.carat ?? row.polish_carat ?? 0),
    price,
    amount,
  };
}

function buildCompanyBlock() {
  const lines = VENYA_COMPANY.addressLines
    .map((line) => `<p style="font-size:13px;margin:0 0 2px;">${escapeHtml(line)}</p>`)
    .join("");
  return `<p style="font-size:15px;margin:0 0 2px;"><b>${VENYA_COMPANY.name}</b></p>${lines}`;
}

function buildLogoCell(company = {}) {
  return `<td style="width:30%;color:#444444;">${buildCompanyLogoHtml({
    logoUrl: resolveCompanyLogoUrl(company.logoUrl || company.logo),
    companyName: company.name || "",
    imgStyle: "max-height:70px;max-width:200px;object-fit:contain;display:block;margin:0 auto;",
  })}</td>`;
}

function buildPartyBlock(party, variant) {
  const prefix = variant === "purchase" ? "From." : "To.";
  const nameStyle = variant === "memo" ? `color:${VENYA_PINK}` : `color:${VENYA_BLUE}`;

  return `<td style="width:60%;text-align:left;">
    <p style="margin:0 0 2px;padding-bottom:2px;${nameStyle}"><b>${prefix} ${escapeHtml(party.name || "—")}</b></p>
    ${party.address ? `<p style="margin:0 0 2px;padding-bottom:2px;">${escapeHtml(party.address)},</p>` : ""}
    <p style="margin:0 0 2px;padding-bottom:2px;">${party.pincode ? `${escapeHtml(party.pincode)}, ` : ""}${escapeHtml(party.country || "")}</p>
    ${party.contactPerson ? `<p style="margin:0 0 2px;padding-bottom:2px;">${escapeHtml(party.contactPerson)}</p>` : ""}
    <p style="margin:0 0 2px;">
      ${party.contact ? `<b style="color:${VENYA_PINK}">Tel:</b> ${escapeHtml(party.contact)} &nbsp;&nbsp;` : ""}
      ${party.fax ? `<b style="color:${VENYA_PINK}">Fax:</b> ${escapeHtml(party.fax)}` : ""}
    </p>
  </td>`;
}

function buildMetaRight(data, variant) {
  const date = fmtDate(data.date);
  const ref = escapeHtml(data.reference || "");
  const invNo = escapeHtml(data.invoiceNo || "");

  if (variant === "memo") {
    return `<td style="width:30%;text-align:left;">
      <p style="font-size:16px;margin:0 0 2px;padding-bottom:10px;height:30px;">Date. &nbsp;&nbsp;&nbsp;${date}</p>
      <p style="font-size:16px;margin:0 0 2px;padding-bottom:10px;color:${VENYA_PINK}">Approval No. &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${invNo}</b></p>
      <p style="font-size:16px;margin:0 0 2px;padding-bottom:10px;color:${VENYA_PINK}">Reference No. &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};font-size:12px;">${ref}</b></p>
    </td>`;
  }

  if (variant === "purchase") {
    const inwardType = String(data.inwardType || "").toLowerCase();
    const isPurchase = inwardType === "purchase" || inwardType === "import";
    const dateLabel = isPurchase ? "Purchase Date:" : "In Memo Date:";
    const noLabel = isPurchase ? "Invoice No.:" : "In Memo No.:";
    return `<td style="width:30%;text-align:left;font-size:13px;">
      <p style="font-size:13px;margin:0 0 2px;padding-bottom:10px;height:30px;">${dateLabel} &nbsp;&nbsp;&nbsp;${date}</p>
      <p style="font-size:13px;margin:0 0 2px;padding-bottom:10px;color:${VENYA_PINK}">Reference No.: &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${ref}</b></p>
      <p style="font-size:13px;margin:0 0 2px;color:${VENYA_PINK}">${noLabel} &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${invNo}</b></p>
    </td>`;
  }

  const docType = String(data.docType || data.type || "").toLowerCase();
  const isInvoice = docType === "sale" || docType === "export";
  const titleNo = isInvoice ? "Invoice No." : "Consignment No.";

  return `<td style="width:30%;text-align:left;font-size:13px;">
    <p style="font-size:13px;margin:0 0 2px;padding-bottom:10px;height:30px;">Date. &nbsp;&nbsp;&nbsp;${date}</p>
    <p style="font-size:13px;margin:0 0 2px;padding-bottom:10px;color:${VENYA_PINK}">Reference No. &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${ref}</b></p>
    <p style="font-size:13px;margin:0 0 2px;color:${VENYA_PINK}">${titleNo} &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${invNo}</b></p>
  </td>`;
}

function buildTableHeader(variant) {
  const descWidth = variant === "purchase" ? "47%" : variant === "memo" ? "42%" : "43%";
  const skuWidth = variant === "purchase" ? "12%" : "15%";
  const pcsWidth = variant === "memo" ? "6%" : variant === "purchase" ? "4%" : "5%";

  return `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;border:solid 1px black;color:${VENYA_PINK};text-align:center;font-size:12px;margin-top:10px;">
    <tr>
      <th style="width:5%;text-align:center;padding:4px;">No.</th>
      <th style="width:${skuWidth};text-align:center;padding:4px;">SKU</th>
      <th style="width:${descWidth};text-align:center;padding:4px;">Description</th>
      <th style="width:${pcsWidth};text-align:center;padding:4px;">PCS</th>
      <th style="width:8%;text-align:center;padding:4px;">Carats</th>
      <th style="width:11%;text-align:center;padding:4px;">Price(US$)</th>
      <th style="width:13%;text-align:center;padding:4px;">Amount(US$)</th>
    </tr>
  </table>`;
}

function buildLineRows(lineItems, maxRows, variant, shippingCharge = 0) {
  const descWidth = variant === "purchase" ? "47%" : variant === "memo" ? "42%" : "43%";
  const skuWidth = variant === "purchase" ? "12%" : "15%";
  const pcsWidth = variant === "memo" ? "6%" : variant === "purchase" ? "4%" : "5%";

  let rows = "";
  let totalPcs = 0;
  let totalCarat = 0;
  let totalAmount = 0;

  for (let i = 1; i <= maxRows; i += 1) {
    const row = lineItems[i - 1];
    if (row) {
      totalPcs += row.pcs;
      totalCarat += row.carat;
      totalAmount += row.amount;
      rows += `<tr>
        <td style="width:5%;text-align:center;padding:4px;">${i}</td>
        <td style="width:${skuWidth};text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.sku)}</td>
        <td style="width:${descWidth};text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.description)}</td>
        <td style="width:${pcsWidth};text-align:right;padding:4px;">${row.pcs}</td>
        <td style="width:8%;text-align:right;padding:4px;">${fmtCarat(row.carat)}</td>
        <td style="width:11%;text-align:right;padding:4px;">${fmtMoney(row.price)}</td>
        <td style="width:13%;text-align:right;padding:4px;">${fmtMoney(row.amount)}</td>
      </tr>`;
    } else if (i === 11 && shippingCharge) {
      rows += `<tr>
        <td style="width:5%;text-align:center;padding:4px;">${i}</td>
        <td style="width:${skuWidth};text-align:left;padding:4px;"></td>
        <td style="width:${descWidth};text-align:left;padding:4px;"></td>
        <td style="width:${pcsWidth};text-align:right;padding:4px;"></td>
        <td style="width:8%;text-align:right;padding:4px;"></td>
        <td style="width:11%;text-align:right;padding:4px;">Shipping</td>
        <td style="width:13%;text-align:right;padding:4px;">${fmtMoney(shippingCharge)}</td>
      </tr>`;
      totalAmount += Number(shippingCharge);
    } else {
      rows += `<tr>
        <td style="width:5%;text-align:center;padding:4px;">${i}</td>
        <td style="width:${skuWidth};text-align:left;padding:4px;"></td>
        <td style="width:${descWidth};text-align:left;padding:4px;"></td>
        <td style="width:${pcsWidth};text-align:right;padding:4px;"></td>
        <td style="width:8%;text-align:right;padding:4px;"></td>
        <td style="width:11%;text-align:right;padding:4px;"></td>
        <td style="width:13%;text-align:right;padding:4px;"></td>
      </tr>`;
    }
  }

  return { rows, totalPcs, totalCarat, totalAmount };
}

function buildBankBlock(bankFlags) {
  const flags = { ...bankFlags };
  if (!flags.boc && !flags.citi && !flags.dbs && !flags.sc && !flags.boc_sksm && !flags.citi_sksm) {
    flags.boc = true;
  }

  if (!flags.boc) return "";

  const b = BOC_BANK;
  return `<td style="width:33.33%;max-width:33.33%;text-align:left;">
    <table style="width:100%;font-size:10px;">
      <tr><td style="width:8%;color:#000;font-size:10px;">[&nbsp;&nbsp;&nbsp;]</td><td style="width:20%;color:${VENYA_BLUE};">A/c. Name</td><td style="width:72%;">${escapeHtml(b.acName)}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Bank Name</td><td style="width:72%;">${escapeHtml(b.bankName)}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Account No</td><td style="width:72%;">${b.accountNo}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Bank Code</td><td style="width:72%;">${b.bankCode}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Branch Code</td><td style="width:72%;">${b.branchCode}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Swift Code</td><td style="width:72%;">${b.swiftCode}</td></tr>
    </table>
  </td>`;
}

function buildInvoiceFooter(data) {
  const docType = String(data.docType || data.type || "").toLowerCase();
  const showExportNote = docType !== "export";
  return `
    <p style="font-size:10px;">${escapeHtml(data.disclaimer || DEFAULT_DISCLAIMER)}</p>
    ${showExportNote ? `<p style="color:${VENYA_PINK};font-size:10px;padding:0;margin:0;padding-top:2px;"><b>NOTE : </b> All diamonds are sold &amp; delivered in Bangkok, Thailand.</p>` : ""}`;
}

function buildMemoFooter(data) {
  return `
    <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;border-top:1px dashed #000;padding-top:10px;">
      <tr>
        <td style="width:50%;text-align:left;">
          <p style="font-size:15px;margin:0 0 2px;padding-bottom:10px;color:${VENYA_PINK}">Approval No. &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${escapeHtml(data.invoiceNo || "")}</b></p>
        </td>
        <td style="width:50%;">
          <p style="text-align:right;font-size:14px;margin:0 0 2px;color:${VENYA_PINK}">Receive the above goods as per condition overleaf.</p>
        </td>
      </tr>
    </table>
    <br><br>
    <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;">
      <tr>
        <td style="width:30%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:40px;color:${VENYA_PINK}"><b>Issued By :</b></p>
          <hr style="width:100%;height:1px;">
          <p style="margin:0 0 2px;padding-bottom:10px;font-size:12px">For <b>${escapeHtml(BOC_BANK.acName)}</b></p>
        </td>
        <td style="width:5%;"></td>
        <td style="width:30%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:40px;color:${VENYA_PINK}"><b>Delivery  By :</b></p>
          <hr style="width:100%;height:1px;">
          <p style="margin:0 0 2px;padding-bottom:10px;font-size:12px">For <b>${escapeHtml(BOC_BANK.acName)}</b></p>
        </td>
        <td style="width:5%;"></td>
        <td style="width:30%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:40px;color:${VENYA_PINK}"><b>Accepted  By :</b></p>
          <hr style="width:100%;height:1px;">
          <p style="margin:0 0 2px;padding-bottom:10px;">Signature &amp; Chop</p>
        </td>
    </table>`;
}

export const VENYA_MAX_ROWS = 20;

function buildChunkLineRows(lineItems, startIndex, minRows = VENYA_MAX_ROWS, variant = "purchase", shippingCharge = 0) {
  const descWidth = variant === "purchase" ? "47%" : variant === "memo" ? "42%" : "43%";
  const skuWidth = variant === "purchase" ? "12%" : "15%";
  const pcsWidth = variant === "memo" ? "6%" : variant === "purchase" ? "4%" : "5%";

  let rows = "";
  for (let i = 1; i <= minRows; i += 1) {
    const row = lineItems[i - 1];
    const itemNo = startIndex + i;
    if (row) {
      rows += `<tr>
        <td style="width:5%;text-align:center;padding:4px;">${itemNo}</td>
        <td style="width:${skuWidth};text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.sku)}</td>
        <td style="width:${descWidth};text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.description)}</td>
        <td style="width:${pcsWidth};text-align:right;padding:4px;">${row.pcs}</td>
        <td style="width:8%;text-align:right;padding:4px;">${fmtCarat(row.carat)}</td>
        <td style="width:11%;text-align:right;padding:4px;">${fmtMoney(row.price)}</td>
        <td style="width:13%;text-align:right;padding:4px;">${fmtMoney(row.amount)}</td>
      </tr>`;
    } else if (i === 11 && shippingCharge) {
      rows += `<tr>
        <td style="width:5%;text-align:center;padding:4px;">${itemNo}</td>
        <td style="width:${skuWidth};text-align:left;padding:4px;"></td>
        <td style="width:${descWidth};text-align:left;padding:4px;"></td>
        <td style="width:${pcsWidth};text-align:right;padding:4px;"></td>
        <td style="width:8%;text-align:right;padding:4px;"></td>
        <td style="width:11%;text-align:right;padding:4px;">Shipping</td>
        <td style="width:13%;text-align:right;padding:4px;">${fmtMoney(shippingCharge)}</td>
      </tr>`;
    } else {
      rows += `<tr>
        <td style="width:5%;text-align:center;padding:4px;">${itemNo}</td>
        <td style="width:${skuWidth};text-align:left;padding:4px;"></td>
        <td style="width:${descWidth};text-align:left;padding:4px;"></td>
        <td style="width:${pcsWidth};text-align:right;padding:4px;"></td>
        <td style="width:8%;text-align:right;padding:4px;"></td>
        <td style="width:11%;text-align:right;padding:4px;"></td>
        <td style="width:13%;text-align:right;padding:4px;"></td>
      </tr>`;
    }
  }

  return rows;
}

function buildInvoicePage(data, copyLabel) {
  const variant = resolveVariant(data);
  const docType = String(data.docType || data.type || "").toLowerCase();
  const isSaleOrExport = docType === "sale" || docType === "export";

  let centerTitle = "Invoice";
  if (variant === "memo") centerTitle = "Approval Memo";
  else if (variant === "purchase") {
    const inwardType = String(data.inwardType || "").toLowerCase();
    centerTitle = inwardType === "purchase" || inwardType === "import" ? "Purchase Note" : "Good Receive Note";
  } else if (!isSaleOrExport) centerTitle = "Consignment";

  const lineItems = (data.lineItems || []).map((row) =>
    typeof row.description === "string" ? row : buildLineItem(row),
  );

  let totalPcs = 0;
  let totalCarat = 0;
  let totalAmount = 0;
  lineItems.forEach((row) => {
    totalPcs += Number(row.pcs || 0);
    totalCarat += Number(row.carat || 0);
    totalAmount += Number(row.amount || 0);
  });
  if (data.shippingCharge) {
    totalAmount += Number(data.shippingCharge);
  }

  const grandTotal = Number(data.totals?.finalAmount ?? data.finalAmount ?? totalAmount);
  const vatAmount = Number(data.vatAmount ?? 0);
  const subTotal = vatAmount > 0 ? grandTotal - vatAmount : totalAmount;
  const dueDate = fmtDate(data.dueDate || data.date);
  const terms = data.terms ?? "";

  const chunks = [];
  if (lineItems.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < lineItems.length; i += VENYA_MAX_ROWS) {
      chunks.push(lineItems.slice(i, i + VENYA_MAX_ROWS));
    }
  }

  const totalPages = chunks.length;

  return chunks
    .map((chunk, pageIndex) => {
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * VENYA_MAX_ROWS;
      const rowsHtml = buildChunkLineRows(
        chunk,
        startIndex,
        VENYA_MAX_ROWS,
        variant,
        isLastPage ? data.shippingCharge : 0,
      );

      const currentCopyLabel =
        totalPages > 1
          ? `${copyLabel} (Page ${pageIndex + 1} of ${totalPages})`
          : copyLabel;

      let totalsSection = "";
      if (isLastPage) {
        if (variant === "invoice") {
          totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
            <tr>
              <th style="width:5%;"></th><th style="width:15%;"></th>
              <th style="width:43%;text-align:right;padding:4px;">Total (Before VAT)</th>
              <th style="width:5%;text-align:right;padding:4px;">${totalPcs}</th>
              <th style="width:8%;text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
              <th style="width:11%;text-align:right;padding:4px;">US$</th>
              <th style="width:13%;text-align:right;padding:4px;">${fmtMoney(subTotal)}</th>
            </tr>
            ${vatAmount > 0 ? `<tr>
              <th></th><th></th>
              <th style="text-align:right;padding:4px;">VAT (${data.vatPercent ?? 7}%)</th>
              <th></th><th></th><th style="text-align:right;padding:4px;">US$</th>
              <th style="text-align:right;padding:4px;">${fmtMoney(vatAmount)}</th>
            </tr>` : ""}
            <tr>
              <th></th><th></th>
              <th style="text-align:right;padding:4px;">Grand Total</th>
              <th></th><th></th><th style="text-align:right;padding:4px;">US$</th>
              <th style="text-align:right;padding:4px;">${fmtMoney(grandTotal)}</th>
            </tr>
            <tr>
              <td colspan="7" style="width:100%;text-align:left;font-size:12px;padding:3px;text-transform:capitalize;color:#000">
                <b style="color:${VENYA_PINK}">in Word : </b> ${escapeHtml(num2words(grandTotal))} Only
              </td>
            </tr>
          </table>`;
        } else if (variant === "memo") {
          totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
            <tr>
              <th style="width:5%;"></th><th style="width:15%;"></th>
              <th style="width:42%;text-align:right;padding:4px;">Total</th>
              <th style="width:6%;text-align:right;padding:4px;">${fmtMoney(totalPcs, 0)}</th>
              <th style="width:8%;text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
              <th style="width:11%;text-align:right;padding:4px;">US$</th>
              <th style="width:13%;text-align:right;padding:4px;">${fmtMoney(totalAmount)}</th>
            </tr>
          </table>`;
        } else {
          totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
            <tr>
              <th style="width:5%;"></th><th style="width:12%;"></th>
              <th style="width:47%;text-align:right;padding:4px;">Total</th>
              <th style="width:4%;text-align:right;padding:4px;">${totalPcs}</th>
              <th style="width:8%;text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
              <th style="width:11%;text-align:right;padding:4px;">US$</th>
              <th style="width:13%;text-align:right;padding:4px;">${fmtMoney(totalAmount)}</th>
            </tr>
          </table>`;
        }
      }

      const paymentSection = isLastPage
        ? (variant === "invoice"
            ? `<table cellspacing="0" style="width:100%;text-align:left;font-size:13px;margin-top:10px;">
            <tr>
              <td style="width:50%;text-align:left;">
                ${data.shippingName ? `<table style="width:100%;"><tr><td style="width:30%;">Shipping By </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.shippingName)}</td><td style="width:10%;"></td></tr></table>` : ""}
                ${data.originOf ? `<table style="width:100%;"><tr><td style="width:30%;">Origin Of </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.originOf)}</td><td style="width:10%;"></td></tr></table>` : ""}
                ${data.manufactureOrigin ? `<table style="width:100%;"><tr><td style="width:30%;">Manuf. Origin </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.manufactureOrigin)}</td><td style="width:10%;"></td></tr></table>` : ""}
                ${data.cif ? `<table style="width:100%;"><tr><td style="width:30%;">C.I.F </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.cif)}</td><td style="width:10%;"></td></tr></table>` : ""}
              </td>
              <td style="width:50%;">
                <table style="width:100%;"><tr><td style="width:30%;">Payment Terms</td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(terms)}</td><td style="width:10%;">Days</td></tr></table>
                <table style="width:100%;"><tr><td style="width:20%;">Due Date</td><td style="width:80%;border-bottom:1px dotted #000;text-align:center;">${dueDate}</td></tr></table>
                ${isSaleOrExport ? `<table style="width:100%;"><tr><td style="width:32%;">Received Amount</td><td style="width:58%;border-bottom:1px dotted #000;text-align:center;">${fmtMoney(data.paidAmount ?? 0)}</td><td style="width:10%;">US$</td></tr></table>` : ""}
                ${isSaleOrExport && Number(data.dueAmount) > 0 ? `<table style="width:100%;"><tr><td style="width:30%;">Remain Amount</td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${fmtMoney(data.dueAmount)}</td><td style="width:10%;">US$</td></tr></table>` : ""}
                <table style="width:100%;"><tr><td style="width:100%;text-align:right;padding-top:10px;">Part Payment Allowed </td></tr></table>
              </td>
            </tr>
          </table>
          <p style="padding:0;margin:0;color:#ccc">-----------------------------------------------------------------------------------------------------------------------------------------------</p>
          <table cellspacing="0" style="width:100%;text-align:left;font-size:9px;margin-top:10px;">
            <tr><td colspan="3"><p style="margin:0 0 2px;padding-bottom:5px;color:${VENYA_PINK}"><b>Payment Detail:</b></p></td></tr>
            <tr>${buildBankBlock(data.bankFlags || {})}</tr>
          </table>
          <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;">
            <tr>
              <td style="width:35%;text-align:left;">
                <p style="margin:0 0 2px;padding-bottom:30px;color:${VENYA_PINK}">For <b>${escapeHtml(BOC_BANK.acName)}</b></p>
                <hr style="width:100%;height:1px;">
                <p style="margin:0 0 2px;padding-bottom:10px;">(Authorised Signature)</p>
              </td>
              <td style="width:35%;"></td>
              <td style="width:30%;text-align:left;">
                <p style="margin:0 0 2px;padding-bottom:30px;color:${VENYA_PINK}"><b>Confirmed By :</b></p>
                <hr style="width:100%;height:1px;">
                <p style="margin:0 0 2px;padding-bottom:10px;">(Chop &amp; Buyer's Signature)</p>
              </td>
            </tr>
          </table>
          ${buildInvoiceFooter(data)}`
            : buildMemoFooter(data))
        : `<div style="text-align:right;padding:10px 15px;font-style:italic;color:#777;font-size:11px;">
            Continued on Page ${pageIndex + 2}...
          </div>`;

      const copyLine =
        variant === "purchase"
          ? ""
          : `<br><span style="font-size:10px;width:100%;margin-top:5px;">${currentCopyLabel}</span>`;

      return `<div class="venya-invoice-page" style="font-size:12pt;page-break-after:always;">
        <table cellspacing="0" style="width:100%;text-align:center;font-size:12px;">
          <tr>
            ${buildLogoCell(data.company || {})}
            <td style="width:39%;text-align:center;">
              <span style="color:${VENYA_BLUE};font-size:18px;">${centerTitle}</span>
              ${copyLine}
            </td>
            <td style="width:31%;text-align:left;">${buildCompanyBlock()}</td>
          </tr>
        </table>
        <hr style="width:100%;height:1px;color:#ccc">
        <table cellspacing="0" style="width:100%;text-align:left;font-size:12px;">
          <tr>
            ${buildPartyBlock(data.party || {}, variant)}
            <td style="width:10%;"></td>
            ${buildMetaRight(data, variant)}
          </tr>
        </table>
        ${buildTableHeader(variant)}
        <table cellspacing="0" border="1" cellpadding="5" style="width:100%;border-collapse:collapse;text-align:center;font-size:10pt;">
          ${rowsHtml}
        </table>
        ${totalsSection}
        ${variant === "memo" ? "<br>" : ""}
        ${paymentSection}
      </div>`;
    })
    .join("");
}

function lineItemsLength(data) {
  return Math.max((data.lineItems || []).length, 8);
}

export function buildVenyaInvoiceBody(invoiceData, options = {}) {
  if (isApprovalMemoDocument(invoiceData)) {
    return buildApprovalMemoBody(invoiceData, options);
  }
  if (isSaleInvoiceDocument(invoiceData)) {
    return buildSaleInvoiceBody(invoiceData, options);
  }
  const { includeCustomerCopy = true } = options;
  const original = buildInvoicePage(invoiceData, "(ORIGINAL COPY)");
  if (!includeCustomerCopy || resolveVariant(invoiceData) === "purchase") return original;
  const customer = buildInvoicePage(invoiceData, "(CUSTOMER COPY)");
  return `${original}${customer}`;
}

export const VENYA_PRINT_STYLES = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: #fff; color: #000;
    font-family: Arial, Helvetica, sans-serif; font-size: 12pt;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  table { vertical-align: top; border-collapse: collapse; }
  tr { vertical-align: top; }
  td { vertical-align: top; }
  .venya-invoice-page:last-child { page-break-after: auto; }
  ${APPROVAL_MEMO_STYLES}
`;

export function buildVenyaInvoicePrintDocument(invoiceData) {
  if (isApprovalMemoDocument(invoiceData)) {
    return buildApprovalMemoPrintDocument(invoiceData);
  }
  if (isSaleInvoiceDocument(invoiceData)) {
    return buildSaleInvoicePrintDocument(invoiceData);
  }
  const body = buildVenyaInvoiceBody(invoiceData, { includeCustomerCopy: true });
  const title = `${escapeHtml(invoiceData.invoiceTitle || "Invoice")} — ${escapeHtml(invoiceData.invoiceNo || "")}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${INVOICE_A4_STYLES}${VENYA_PRINT_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

export default buildVenyaInvoicePrintDocument;
