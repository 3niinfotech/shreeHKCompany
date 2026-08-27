/** Venya legacy invoice layout — sale/purchase use PHP-style template; memo uses approvalMemoTemplate.js */

import {
  APPROVAL_MEMO_STYLES,
  buildApprovalMemoBody,
  buildApprovalMemoPrintDocument,
  isApprovalMemoDocument,
} from "./approvalMemoTemplate.js";
import { INVOICE_A4_STYLES } from "./invoiceA4.js";
import { buildCompanyLogoHtml, resolveCompanyLogoUrl } from "./companyLogo.js";

export const VENYA_BLUE = "#4991b1";
export const VENYA_PINK = "#cc3399";

const VENYA_COMPANY = {
  name: "SHREE INTERNATIONAL (HK) LTD.",
  addressLines: [
    "Unit-201, 2/F, Chevalier House,",
    "45-51 Chatham Road South,",
    "Tsim Sha Tsui, Kowloon, Hong Kong.",
    "Tel:(+852) 2366-6047",
    "E-Mail:shreeintlhk@gmail.com",
    "Web:www.shreehk.com",
    "Skype ID:shreeintl.hk",
    "Rapnet ID: 91552",
  ],
};

const DEFAULT_DISCLAIMER =
  "The diamonds herein invoiced have been purchased/ sourced from legitimate sources not involved in funding conflict and in compliance with United Nation resolutions.The seller hereby guarantees that these diamonds are conflict free, based on personal knowledge and/or written guarantee provided by the supplier of these diamonds. The diamonds herein invoiced have been manufactured in compliance with internationally recognized ‘best practice’ principles and expressly avoided the use of any form of child labour. We confirm the diamonds supplied on this invoice are natural and untreated. (No HPHT / No CVD)";

const BOC_BANK = {
  acName: "SHREE INTERNATIONAL (HK) LTD.",
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

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/** Port of venya/dai/Helper.php num2words */
export function num2words(num, includeCurrency = true) {
  const ZERO = "Zero";
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

  if (n === 0) return includeCurrency ? "Zero Dollars Only" : ZERO;

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

  s = toTitleCase(s);

  if (!includeCurrency) return s;

  s += " Dollars";
  const centsNum = Number(cents);
  if (centsNum > 0) {
    if (centsNum > 10 && centsNum <= 19) {
      s += ` and ${toTitleCase(lowName[centsNum])} Cents`;
    } else {
      const pence = Number(cents[1]);
      const dimes = Number(cents[0]);
      const centsStr = `${tys[dimes]} ${lowName[pence]}`.replace(/\s+/g, " ").trim();
      s += ` and ${toTitleCase(centsStr)} Cents`;
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

function buildCompanyBlock(company = {}) {
  const name = company.companyName || company.name || company.company_name || VENYA_COMPANY.name;

  const address = company.companyAddress || company.address || company.addressLine1 || company.address_line1 || "";
  const city = company.companyCity || company.city || "";
  const state = company.companyState || company.state || "";
  const pincode = company.companyPincode || company.pincode || company.pin || company.zip || "";
  const country = company.companyCountry || company.country || "";
  const number = company.companyNumber || company.number || company.tel || company.phone || company.contact || "";
  const email = company.companyEmail || company.email || company.email_id || "";
  const website = company.companyWebsite || company.website || company.web || "";
  const skype = company.companySkypeId || company.companySkype || company.skype || company.skype_id || company.skypeId || "";
  const rapnet = company.companyRapnetId || company.rapnetId || company.rapnet_id || company.rapnet || "";
  const tax = company.taxId || company.tax_id || company.gst || "";

  const cityStateParts = [city, state].filter(Boolean).join(", ");
  const cityStatePin = cityStateParts && pincode ? `${cityStateParts} - ${pincode}` : (cityStateParts || pincode || "");

  let lines = [];

  if (address || cityStatePin || number || email || website || rapnet) {
    lines = [
      address,
      cityStatePin,
      country,
      tax ? `Tax ID: ${tax}` : "",
      number ? `Tel: ${number}` : "",
      email ? `E-Mail: ${email}` : "",
      website ? `Web: ${website}` : "",
      skype ? `Skype ID: ${skype}` : "",
      rapnet ? `Rapnet ID: ${rapnet}` : "",
    ].filter(Boolean);
  } else if (Array.isArray(company.addressLines) && company.addressLines.length > 0) {
    lines = company.addressLines;
  } else {
    lines = VENYA_COMPANY.addressLines;
  }

  const nameHtml = (name && !lines[0]?.includes(name)) ? `<p style="font-size:15px;margin:0px;"><b>${escapeHtml(name)}</b></p>` : "";
  const linesHtml = lines.map((l) => `<p style="font-size:13px;margin:0px;">${escapeHtml(l)}</p>`).join("");
  return `${nameHtml}${linesHtml}`;
}

function buildLogoCell(company = {}) {
  const logo = company.companyLogo || company.logoUrl || company.logo;
  const name = company.companyName || company.name || VENYA_COMPANY.name;
  return `<td style="width:30%;color:#444444;">${buildCompanyLogoHtml({
    logoUrl: resolveCompanyLogoUrl(logo),
    companyName: name,
    imgStyle: "max-height:70px;max-width:200px;object-fit:contain;display:block;margin:0 auto;",
  })}</td>`;
}

function buildPartyBlock(party = {}, variant = "invoice") {
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

function getColumnWidths(variant) {
  if (variant === "purchase") {
    return { no: "5%", sku: "12%", desc: "47%", pcs: "4%", carat: "8%", price: "11%", amount: "13%" };
  }
  if (variant === "memo") {
    return { no: "5%", sku: "15%", desc: "42%", pcs: "6%", carat: "8%", price: "11%", amount: "13%" };
  }
  return { no: "5%", sku: "15%", desc: "43%", pcs: "5%", carat: "8%", price: "11%", amount: "13%" };
}

function buildTableHeader(variant) {
  const w = getColumnWidths(variant);

  return `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_PINK};text-align:center;font-size:12px;margin-top:10px;">
    <tr>
      <th style="width:${w.no};text-align:center;padding:4px;">No.</th>
      <th style="width:${w.sku};text-align:center;padding:4px;">SKU</th>
      <th style="width:${w.desc};text-align:center;padding:4px;">Description</th>
      <th style="width:${w.pcs};text-align:center;padding:4px;">PCS</th>
      <th style="width:${w.carat};text-align:center;padding:4px;">Carats</th>
      <th style="width:${w.price};text-align:center;padding:4px;">Price(US$)</th>
      <th style="width:${w.amount};text-align:center;padding:4px;">Amount(US$)</th>
    </tr>
  </table>`;
}

function buildBankBlock(bankFlags, company = {}) {
  const flags = { ...bankFlags };
  if (!flags.boc && !flags.citi && !flags.dbs && !flags.sc && !flags.boc_sksm && !flags.citi_sksm) {
    flags.boc = true;
  }

  if (!flags.boc) return "";

  const acName = company.acName || company.name || BOC_BANK.acName;
  const bankName = company.bankName || BOC_BANK.bankName;
  const accountNo = company.accountNo || BOC_BANK.accountNo;
  const bankCode = company.bankCode || BOC_BANK.bankCode;
  const branchCode = company.branchCode || BOC_BANK.branchCode;
  const swiftCode = company.swiftCode || BOC_BANK.swiftCode;

  return `<td style="width:33.33%;max-width:33.33%;text-align:left;">
    <table style="width:100%;font-size:10px;">
      <tr><td style="width:8%;color:#000;font-size:10px;">[&nbsp;&nbsp;&nbsp;]</td><td style="width:20%;color:${VENYA_BLUE};">A/c. Name</td><td style="width:72%;">${escapeHtml(acName)}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Bank Name</td><td style="width:72%;">${escapeHtml(bankName)}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Account No</td><td style="width:72%;">${accountNo}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Bank Code</td><td style="width:72%;">${escapeHtml(bankCode)}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Branch Code</td><td style="width:72%;">${escapeHtml(branchCode)}</td></tr>
      <tr><td style="width:8%;">&nbsp;</td><td style="width:20%;color:${VENYA_BLUE};">Swift Code</td><td style="width:72%;">${escapeHtml(swiftCode)}</td></tr>
    </table>
  </td>`;
}

function buildInvoiceFooter(data) {
  const docType = String(data.docType || data.type || "").toLowerCase();
  const showExportNote = docType !== "export";
  const noteLoc = (data.company?.country?.toLowerCase().includes("hong kong") || data.company?.name?.toLowerCase().includes("hk") || data.company?.name?.toLowerCase().includes("shree"))
    ? "Hong Kong."
    : "Bangkok, Thailand.";

  return `
    <p style="font-size:10px;">${escapeHtml(data.disclaimer || DEFAULT_DISCLAIMER)}</p>
    ${showExportNote ? `<p style="color:${VENYA_PINK};font-size:10px;padding:0;margin:0;padding-top:2px;"><b>NOTE : </b> All diamonds are sold &amp; delivered in ${noteLoc}</p>` : ""}`;
}

function buildMemoFooter(data) {
  const companyName = data.company?.companyName || data.company?.name || data.company?.company_name || VENYA_COMPANY.name;
  const approvalNo = escapeHtml(data.invoiceNo || data.approvalNo || "");

  return `
    <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;border-top:1px dashed #000;padding-top:10px; margin:20px 0px">
      <tr>
        <td style="width:50%;text-align:left;">
          <p style="font-size:15px;margin:0 0 2px;padding:10px 0px;color:${VENYA_PINK}">Approval No. &nbsp;&nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${approvalNo}</b></p>
        </td>
        <td style="width:50%;">
          <p style="text-align:right;font-size:14px;margin:0 0 2px;padding:10px 0px;color:${VENYA_PINK}">Receive the above goods as per condition overleaf.</p>
        </td>
      </tr>
    </table>
    <br><br>
    <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;">
      <tr>
        <td style="width:30%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:40px;color:${VENYA_PINK}"><b>Issued By :</b></p>
          <hr style="width:100%;height:1px;">
          <p style="margin:0 0 2px;padding-bottom:10px;font-size:12px">For <b>${escapeHtml(companyName)}</b></p>
        </td>
        <td style="width:5%;"></td>
        <td style="width:30%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:40px;color:${VENYA_PINK}"><b>Delivery  By :</b></p>
          <hr style="width:100%;height:1px;">
          <p style="margin:0 0 2px;padding-bottom:10px;font-size:12px">For <b>${escapeHtml(companyName)}</b></p>
        </td>
        <td style="width:5%;"></td>
        <td style="width:30%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:40px;color:${VENYA_PINK}"><b>Accepted  By :</b></p>
          <hr style="width:100%;height:1px;">
          <p style="margin:0 0 2px;padding-bottom:10px;">Signature &amp; Chop</p>
        </td>
      </tr>
    </table>
    <table cellspacing="0" style="width:100%;font-size:12px;text-transform:uppercase;">
      <tr>
        <td style="width:26%;"></td>
        <td style="width:5%;"></td>
        <td style="width:38%;text-align:left;">
          <b>ACKNOWLEDGEMENT OF ENTRUSTMENT</b>
        </td>
        <td style="width:5%;"></td>
        <td style="width:30%;text-align:left;">
          <span style="color:${VENYA_PINK}">APPROVAL NO. &nbsp;&nbsp;<b style="color:${VENYA_BLUE};">${approvalNo}</b></span>
        </td>
      </tr>
    </table>
    <p style="text-align:center;font-size:12px;margin:20px 0px;">We hereby entrust you the overleaf goods for negotiation of Sale / Manufacturing / inspection on approval basis with the following condition.</p>
    <p style="font-size:10px;line-height:1.3;margin:0;text-align:justify;">The goods described and value as below are delivered to you for examination and inspection only and remain our property subject to our order and shall be returned to us on demand. Such merchandise until returned to us and actually received, are at your risk from all hazards. No right or power is given to you to sell, pledge, hypothecate or otherwise dispose of this merchandise regardless of prior transaction. A sale of this merchandise can only be effected and title will pass only, if as and when we the said owner shall agree to such sale and a bill of sale rendered thereof. These goods may only be sold with the companies permission and have to be returned immediately at our first request. furthermore, the undersigned declares to have his/her own insurance Policy which covers the total value of the goods appearing on this page.</p>`;
}

export const VENYA_MAX_ROWS = 10;

function buildSummaryRows(totalPcs, totalCarat, grandTotal, maxRows = VENYA_MAX_ROWS, variant = "invoice") {
  const w = getColumnWidths(variant);
  const avgPrice = totalCarat > 0 ? grandTotal / totalCarat : 0;
  let rows = `<tr>
    <td style="width:${w.no};text-align:center;padding:4px;">1</td>
    <td style="width:${w.sku};text-align:left;padding:4px;font-size:10px;"></td>
    <td style="width:${w.desc};text-align:left;padding:4px;">Cut and Polish Diamond</td>
    <td style="width:${w.pcs};text-align:right;padding:4px;">${totalPcs}</td>
    <td style="width:${w.carat};text-align:right;padding:4px;">${fmtCarat(totalCarat)}</td>
    <td style="width:${w.price};text-align:right;padding:4px;">${fmtMoney(avgPrice)}</td>
    <td style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(grandTotal)}</td>
  </tr>`;

  for (let i = 2; i <= 14; i++) {
    rows += `<tr>
      <td style="width:${w.no};text-align:center;padding:4px;">${i}</td>
      <td style="width:${w.sku};text-align:left;padding:4px;"></td>
      <td style="width:${w.desc};text-align:left;padding:4px;"></td>
      <td style="width:${w.pcs};text-align:right;padding:4px;"></td>
      <td style="width:${w.carat};text-align:right;padding:4px;"></td>
      <td style="width:${w.price};text-align:right;padding:4px;"></td>
      <td style="width:${w.amount};text-align:right;padding:4px;"></td>
    </tr>`;
  }
  return rows;
}

export function buildVenyaInvoiceBody(invoiceData, options = {}) {
  const { includeCustomerCopy = true } = options;
  const variant = resolveVariant(invoiceData);
  const lineItems = (invoiceData.lineItems || []).map((row) =>
    typeof row.description === "string" ? row : buildLineItem(row)
  );

  if (lineItems.length >= 11) {
    const originalInvoice = buildInvoicePage(invoiceData, "(ORIGINAL COPY)", { isSummary: true });
    const originalPackingList = buildPackingListPage(invoiceData);
    if (!includeCustomerCopy) {
      return `${originalInvoice}${originalPackingList}`;
    }
    const customerInvoice = buildInvoicePage(invoiceData, "(CUSTOMER COPY)", { isSummary: true });
    const customerPackingList = buildPackingListPage(invoiceData);
    return `${originalInvoice}${originalPackingList}${customerInvoice}${customerPackingList}`;
  }

  const original = buildInvoicePage(invoiceData, "(ORIGINAL COPY)", { isSummary: false });
  if (!includeCustomerCopy || variant === "purchase") return original;
  const customer = buildInvoicePage(invoiceData, "(CUSTOMER COPY)", { isSummary: false });
  return `${original}${customer}`;
}

function buildChunkLineRows(lineItems, startIndex, minRows = VENYA_MAX_ROWS, variant = "purchase", shippingCharge = 0) {
  const w = getColumnWidths(variant);

  let rows = "";
  for (let i = 1; i <= minRows; i += 1) {
    const row = lineItems[i - 1];
    const itemNo = startIndex + i;
    if (row) {
      rows += `<tr>
        <td style="width:${w.no};text-align:center;padding:4px;">${itemNo}</td>
        <td style="width:${w.sku};text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.sku)}</td>
        <td style="width:${w.desc};text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.description)}</td>
        <td style="width:${w.pcs};text-align:right;padding:4px;">${row.pcs}</td>
        <td style="width:${w.carat};text-align:right;padding:4px;">${fmtCarat(row.carat)}</td>
        <td style="width:${w.price};text-align:right;padding:4px;">${fmtMoney(row.price)}</td>
        <td style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(row.amount)}</td>
      </tr>`;
    } else if (i === 11 && shippingCharge) {
      rows += `<tr>
        <td style="width:${w.no};text-align:center;padding:4px;">${itemNo}</td>
        <td style="width:${w.sku};text-align:left;padding:4px;"></td>
        <td style="width:${w.desc};text-align:left;padding:4px;"></td>
        <td style="width:${w.pcs};text-align:right;padding:4px;"></td>
        <td style="width:${w.carat};text-align:right;padding:4px;"></td>
        <td style="width:${w.price};text-align:right;padding:4px;">Shipping</td>
        <td style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(shippingCharge)}</td>
      </tr>`;
    } else {
      rows += `<tr>
        <td style="width:${w.no};text-align:center;padding:4px;">${itemNo}</td>
        <td style="width:${w.sku};text-align:left;padding:4px;"></td>
        <td style="width:${w.desc};text-align:left;padding:4px;"></td>
        <td style="width:${w.pcs};text-align:right;padding:4px;"></td>
        <td style="width:${w.carat};text-align:right;padding:4px;"></td>
        <td style="width:${w.price};text-align:right;padding:4px;"></td>
        <td style="width:${w.amount};text-align:right;padding:4px;"></td>
      </tr>`;
    }
  }

  return rows;
}

function buildInvoicePage(data, copyLabel, { isSummary = false } = {}) {
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
  const terms = data.terms ?? 0;
  const companyName = data.company?.companyName || data.company?.name || data.company?.company_name || VENYA_COMPANY.name;

  const w = getColumnWidths(variant);

  if (isSummary) {
    const rowsHtml = buildSummaryRows(totalPcs, totalCarat, grandTotal, 10, variant);
    const totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
      <tr>
        <th style="width:${w.no};"></th>
        <th style="width:${w.sku};"></th>
        <th style="width:${w.desc};text-align:right;padding:4px;">Total</th>
        <th style="width:${w.pcs};text-align:right;padding:4px;">${totalPcs}</th>
        <th style="width:${w.carat};text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
        <th style="width:${w.price};text-align:right;padding:4px;">US$</th>
        <th style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(grandTotal)}</th>
      </tr>
      <tr>
        <td colspan="7" style="width:100%;text-align:left;font-size:12px;padding:3px;text-transform:capitalize;color:#000">
          <b style="color:${VENYA_PINK}">In Word : </b> ${escapeHtml(num2words(grandTotal))} Only
        </td>
      </tr>
    </table>`;

    const paymentSection = variant === "memo"
      ? buildMemoFooter(data)
      : `<table cellspacing="0" style="width:100%;text-align:left;font-size:13px;margin-top:10px;">
      <tr>
        <td style="width:50%;text-align:left;">
          ${data.shippingName ? `<table style="width:100%;"><tr><td style="width:30%;">Shipping </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.shippingName)}</td><td style="width:10%;"></td></tr></table>` : ""}
          ${data.originOf ? `<table style="width:100%;"><tr><td style="width:30%;">Origin Of </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.originOf)}</td><td style="width:10%;"></td></tr></table>` : ""}
          ${data.manufactureOrigin ? `<table style="width:100%;"><tr><td style="width:30%;">Manuf. Origin </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.manufactureOrigin)}</td><td style="width:10%;"></td></tr></table>` : ""}
          ${data.cif ? `<table style="width:100%;"><tr><td style="width:30%;">C.I.F </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.cif)}</td><td style="width:10%;"></td></tr></table>` : ""}
        </td>
        <td style="width:50%;">
          <table style="width:100%;"><tr><td style="width:30%;">Payment Terms</td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(terms)}</td><td style="width:10%;">Days</td></tr></table>
          <table style="width:100%;"><tr><td style="width:20%;">Due Date</td><td style="width:80%;border-bottom:1px dotted #000;text-align:center;">${dueDate}</td></tr></table>
          <table style="width:100%;"><tr><td style="width:32%;">Received Amount</td><td style="width:58%;border-bottom:1px dotted #000;text-align:center;">${fmtMoney(data.paidAmount ?? 0)}</td><td style="width:10%;">US$</td></tr></table>
          <table style="width:100%;"><tr><td style="width:30%;">Remain Amount</td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${fmtMoney(data.dueAmount ?? (grandTotal - Number(data.paidAmount || 0)))}</td><td style="width:10%;">US$</td></tr></table>
          <table style="width:100%;"><tr><td style="width:100%;text-align:right;padding-top:10px;">Part Payment Allowed </td></tr></table>
        </td>
      </tr>
    </table>
    <p style="padding:0;margin:0;color:#ccc">----------------------------------------------------------------------------------------------------------------------------------------------------</p>
    <table cellspacing="0" style="width:100%;text-align:left;font-size:9px;margin-top:10px;">
      <tr><td colspan="3"><p style="margin:0 0 2px;padding-bottom:5px;color:${VENYA_PINK}"><b>Payment Detail:</b></p></td></tr>
      <tr>${buildBankBlock(data.bankFlags || {}, data.company)}</tr>
    </table>
    <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;">
      <tr>
        <td style="width:35%;text-align:left;">
          <p style="margin:0 0 2px;padding-bottom:30px;color:${VENYA_PINK}">For <b>${escapeHtml(companyName)}</b></p>
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
    ${buildInvoiceFooter(data)}`;

    return `<div class="venya-invoice-page" style="font-size:12pt;page-break-after:always;">
      <table cellspacing="0" style="width:100%;text-align:center;font-size:12px;">
        <tr>
          ${buildLogoCell(data.company || {})}
          <td style="width:39%;text-align:center;">
            <span style="color:${VENYA_BLUE};font-size:18px;">${centerTitle}</span>
            <br><span style="font-size:10px;width:100%;margin-top:5px;">${copyLabel}</span>
          </td>
          <td style="width:31%;text-align:left;">${buildCompanyBlock(data.company)}</td>
        </tr>
      </table>
      <hr style="width:100%;height:1px;color:#ccc;margin:3px 0px 5px 0px;">
      <table cellspacing="0" style="width:100%;text-align:left;font-size:12px;">
        <tr>
          ${buildPartyBlock(data.party || {}, variant)}
          <td style="width:10%;"></td>
          ${buildMetaRight(data, variant)}
        </tr>
      </table>
      ${buildTableHeader(variant)}
      <table cellspacing="0" border="1" cellpadding="5" style="width:100%;table-layout:fixed;border-collapse:collapse;text-align:center;font-size:10pt;">
        ${rowsHtml}
      </table>
      ${totalsSection}
      ${paymentSection}
    </div>`;
  }

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
          totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
            <tr>
              <th style="width:${w.no};"></th>
              <th style="width:${w.sku};"></th>
              <th style="width:${w.desc};text-align:right;padding:4px;">Total (Before VAT)</th>
              <th style="width:${w.pcs};text-align:right;padding:4px;">${totalPcs}</th>
              <th style="width:${w.carat};text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
              <th style="width:${w.price};text-align:right;padding:4px;">US$</th>
              <th style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(subTotal)}</th>
            </tr>
            ${vatAmount > 0 ? `<tr>
              <th style="width:${w.no};"></th>
              <th style="width:${w.sku};"></th>
              <th style="width:${w.desc};text-align:right;padding:4px;">VAT (${data.vatPercent ?? 7}%)</th>
              <th style="width:${w.pcs};"></th>
              <th style="width:${w.carat};"></th>
              <th style="width:${w.price};text-align:right;padding:4px;">US$</th>
              <th style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(vatAmount)}</th>
            </tr>` : ""}
            <tr>
              <th style="width:${w.no};"></th>
              <th style="width:${w.sku};"></th>
              <th style="width:${w.desc};text-align:right;padding:4px;">Grand Total</th>
              <th style="width:${w.pcs};"></th>
              <th style="width:${w.carat};"></th>
              <th style="width:${w.price};text-align:right;padding:4px;">US$</th>
              <th style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(grandTotal)}</th>
            </tr>
            <tr>
              <td colspan="7" style="width:100%;text-align:left;font-size:12px;padding:3px;text-transform:capitalize;color:#000">
                <b style="color:${VENYA_PINK}">In Word : </b> ${escapeHtml(num2words(grandTotal))} Only
              </td>
            </tr>
          </table>`;
        } else if (variant === "memo") {
          totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
            <tr>
              <th style="width:${w.no};"></th>
              <th style="width:${w.sku};"></th>
              <th style="width:${w.desc};text-align:right;padding:4px;">Total</th>
              <th style="width:${w.pcs};text-align:right;padding:4px;">${fmtMoney(totalPcs, 0)}</th>
              <th style="width:${w.carat};text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
              <th style="width:${w.price};text-align:right;padding:4px;">US$</th>
              <th style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(totalAmount)}</th>
            </tr>
          </table>`;
        } else {
          totalsSection = `<table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
            <tr>
              <th style="width:${w.no};"></th>
              <th style="width:${w.sku};"></th>
              <th style="width:${w.desc};text-align:right;padding:4px;">Total</th>
              <th style="width:${w.pcs};text-align:right;padding:4px;">${totalPcs}</th>
              <th style="width:${w.carat};text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
              <th style="width:${w.price};text-align:right;padding:4px;">US$</th>
              <th style="width:${w.amount};text-align:right;padding:4px;">${fmtMoney(totalAmount)}</th>
            </tr>
          </table>`;
        }
      }

      const paymentSection = isLastPage
        ? (variant === "invoice"
          ? `<table cellspacing="0" style="width:100%;text-align:left;font-size:13px;margin-top:10px;">
            <tr>
              <td style="width:50%;text-align:left;">
                ${data.shippingName ? `<table style="width:100%;"><tr><td style="width:30%;">Shipping </td><td style="width:60%;border-bottom:1px dotted #000;text-align:center;">${escapeHtml(data.shippingName)}</td><td style="width:10%;"></td></tr></table>` : ""}
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
            <tr>${buildBankBlock(data.bankFlags || {}, data.company)}</tr>
          </table>
          <table cellspacing="0" style="width:100%;text-align:left;font-size:14px;">
            <tr>
              <td style="width:35%;text-align:left;">
                <p style="margin:0 0 2px;padding-bottom:30px;color:${VENYA_PINK}">For <b>${escapeHtml(companyName)}</b></p>
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
            <td style="width:31%;text-align:left;">${buildCompanyBlock(data.company)}</td>
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

function buildPackingListPage(data) {
  const lineItems = (data.lineItems || []).map((row) =>
    typeof row.description === "string" ? row : buildLineItem(row)
  );

  let totalPcs = 0;
  let totalCarat = 0;
  let totalAmount = 0;
  lineItems.forEach((row) => {
    totalPcs += Number(row.pcs || 0);
    totalCarat += Number(row.carat || 0);
    totalAmount += Number(row.amount || 0);
  });

  const grandTotal = Number(data.totals?.finalAmount ?? data.finalAmount ?? totalAmount);

  let rowsHtml = "";
  lineItems.forEach((row, i) => {
    rowsHtml += `<tr>
      <td style="width:5%;text-align:center;padding:4px;">${i + 1}</td>
      <td style="width:15%;text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.sku)}</td>
      <td style="width:43%;text-align:left;padding:4px;font-size:10px;">${escapeHtml(row.description)}</td>
      <td style="width:5%;text-align:right;padding:4px;">${row.pcs}</td>
      <td style="width:8%;text-align:right;padding:4px;">${fmtCarat(row.carat)}</td>
      <td style="width:11%;text-align:right;padding:4px;">${fmtMoney(row.price)}</td>
      <td style="width:13%;text-align:right;padding:4px;">${fmtMoney(row.amount)}</td>
    </tr>`;
  });

  return `<div class="venya-invoice-page" style="font-size:12pt;page-break-after:always;">
    <table cellspacing="0" style="width:100%;text-align:center;font-size:12px;">
      <tr>
        ${buildLogoCell(data.company || {})}
        <td style="width:39%;text-align:center;">
          <span style="color:${VENYA_BLUE};font-size:18px;">Packing List</span>
        </td>
        <td style="width:31%;text-align:left;">${buildCompanyBlock(data.company)}</td>
      </tr>
    </table>
    <hr style="width:100%;height:1px;color:#ccc">
    <br>
    <table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_PINK};text-align:center;font-size:10pt;">
      <tr>
        <th style="width:5%;text-align:center;padding:4px;">No.</th>
        <th style="width:15%;text-align:center;padding:4px;">SKU</th>
        <th style="width:43%;text-align:center;padding:4px;">Description</th>
        <th style="width:5%;text-align:center;padding:4px;">PCS</th>
        <th style="width:8%;text-align:center;padding:4px;">Carats</th>
        <th style="width:11%;text-align:center;padding:4px;">Price(US$)</th>
        <th style="width:13%;text-align:center;padding:4px;">Amount(US$)</th>
      </tr>
    </table>
    <table cellspacing="0" border="1" cellpadding="5" style="width:100%;table-layout:fixed;border-collapse:collapse;text-align:center;font-size:10pt;">
      ${rowsHtml}
    </table>
    <table cellspacing="0" border="1" cellpadding="5" style="border-collapse:collapse;width:100%;table-layout:fixed;border:solid 1px black;color:${VENYA_BLUE};text-align:center;font-size:10pt;">
      <tr>
        <th style="width:5%;"></th>
        <th style="width:15%;"></th>
        <th style="width:43%;text-align:right;padding:4px;">Total</th>
        <th style="width:5%;text-align:right;padding:4px;">${totalPcs}</th>
        <th style="width:8%;text-align:right;padding:4px;">${fmtCarat(totalCarat)}</th>
        <th style="width:11%;text-align:right;padding:4px;">US$</th>
        <th style="width:13%;text-align:right;padding:4px;">${fmtMoney(grandTotal)}</th>
      </tr>
    </table>
  </div>`;
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
  .venya-invoice-page {
    padding: 8mm 0mm 6mm 0mm;
    box-sizing: border-box;
  }
  .venya-invoice-page:last-child { page-break-after: auto; }
  ${APPROVAL_MEMO_STYLES}
`;

export function buildVenyaInvoicePrintDocument(invoiceData) {
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

