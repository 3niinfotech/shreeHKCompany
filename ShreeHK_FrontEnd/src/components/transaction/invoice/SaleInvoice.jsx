import React from "react";
import { APPROVAL_MEMO_COLORS } from "../../../utils/approvalMemoTemplate";
import { num2words } from "../../../utils/venyaInvoiceTemplate";
import { resolveCompanyLogoUrl } from "../../../utils/companyLogo";
import "../../../assets/scss/components/transaction/saleInvoice.scss";

export const VENYA_SENDER = {
  name: "Venya Gems Co., Ltd.",
  lines: [
    "Wang Lee Building 297, 4th Floor, Unit C",
    "Surawong Road, Suriyawong, Bangrak,",
    "Bangkok 10500 — Head Office",
    "Tax ID: 0105549064633",
    "Tel (Office): +66-81-8254296",
  ],
};

export const BOC_BANK = {
  acName: "Venya Gems Co., Ltd.",
  bankName: "BANK OF CHINA (HONG KONG) LIMITED",
  accountNo: "012 791 20084524 (USD)<br>012 791 20084511 (HKD)",
  bankCode: "012",
  branchCode: "791",
  swiftCode: "BKCHHKHHXXX",
};

export const DEFAULT_DISCLAIMER =
  "The diamonds herein invoiced have been (sourced) purchase from legitimate sources not involved in the funding of conflict, in compliance with United Nations resolutions and corresponding national laws (where the invoice is generated). The seller hereby guarantees that these diamonds are conflict free and confirms adherence to the WCD SoW. The diamonds herein invoiced are neither recycled nor sourced from artisanally mined and it is exclusive of natural diamond, free from any synthetic or treated diamonds.";

export const SALE_MAX_ROWS = 9;

export const fmtDisplayDate = (value) => {
  if (!value || value === "—") return "—";
  const str = String(value);
  const iso = str.length >= 10 ? str.slice(0, 10) : str;
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}-${m}-${y}`;
  return str;
};

export const fmtMoney = (value, digits = 2) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtCarats = (value) => fmtMoney(value, 3);

export const normalizeLineItems = (lineItems = []) =>
  lineItems.map((row, index) => ({
    no: index + 1,
    sku: row.sku && row.sku !== "—" ? row.sku : "",
    description:
      row.description ||
      [row.shape, row.main_color || row.color, row.clarity, row.size].filter(Boolean).join(" ") ||
      "",
    pcs: row.pcs ?? "",
    carats: row.carat ?? row.carats ?? "",
    price: row.price ?? "",
    amount: row.amount ?? "",
  }));

export const buildTableRows = (lineItems, maxRows) => {
  const rows = normalizeLineItems(lineItems);
  let totalPcs = 0;
  let totalCarat = 0;
  let totalAmount = 0;

  const bodyRows = [];
  for (let i = 1; i <= maxRows; i += 1) {
    const row = rows[i - 1];
    if (row) {
      totalPcs += Number(row.pcs || 0);
      totalCarat += Number(row.carats || 0);
      totalAmount += Number(row.amount || 0);
      bodyRows.push(row);
    } else {
      bodyRows.push({ no: i, sku: "", description: "", pcs: "", carats: "", price: "", amount: "" });
    }
  }

  return { bodyRows, totalPcs, totalCarat, totalAmount };
};

export const resolvePageTitle = (data) => {
  const docType = String(data.docType || data.type || "").toLowerCase();
  if (docType === "sale" || docType === "export") return "Invoice";
  return data.invoiceTitle || "Invoice";
};

export const resolveInvoiceNoLabel = (data) => {
  const docType = String(data.docType || data.type || "").toLowerCase();
  return docType === "sale" || docType === "export" ? "Invoice No." : "Consignment No.";
};

export const shouldShowBocBank = (bankFlags = {}) => {
  const flags = { ...bankFlags };
  if (!flags.boc && !flags.citi && !flags.dbs && !flags.sc && !flags.boc_sksm && !flags.citi_sksm) {
    flags.boc = true;
  }
  return Boolean(flags.boc);
};

const SenderLine = ({ line }) => {
  if (line.startsWith("Tax ID:")) {
    return (
      <>
        <span style={{ color: APPROVAL_MEMO_COLORS.pink, fontWeight: 700 }}>Tax ID:</span>{" "}
        {line.slice(7).trim()}
        <br />
      </>
    );
  }
  if (line.startsWith("Tel (Office):")) {
    return (
      <>
        <span style={{ color: APPROVAL_MEMO_COLORS.pink, fontWeight: 700 }}>Tel (Office):</span>{" "}
        {line.slice(13).trim()}
        <br />
      </>
    );
  }
  return (
    <>
      {line}
      <br />
    </>
  );
};

const BuyerBlock = ({ party = {} }) => (
  <>
    <strong>To: {party.name || "—"}</strong>
    <br />
    {party.address ? (
      <>
        {party.address},<br />
      </>
    ) : null}
    {[party.pincode, party.country].filter(Boolean).join(", ") ? (
      <>
        {[party.pincode, party.country].filter(Boolean).join(", ")}
        <br />
      </>
    ) : null}
    {party.contactPerson ? (
      <>
        {party.contactPerson}
        <br />
      </>
    ) : null}
    {party.contact ? (
      <>
        <span style={{ color: APPROVAL_MEMO_COLORS.pink, fontWeight: 700 }}>Tel:</span> {party.contact}
      </>
    ) : null}
    {party.fax ? (
      <>
        {" "}
        &nbsp;&nbsp;
        <span style={{ color: APPROVAL_MEMO_COLORS.pink, fontWeight: 700 }}>Fax:</span> {party.fax}
      </>
    ) : null}
  </>
);

const SenderBlock = () => (
  <>
    <strong>{VENYA_SENDER.name}</strong>
    <br />
    {VENYA_SENDER.lines.map((line) => (
      <SenderLine key={line} line={line} />
    ))}
  </>
);

const PaymentField = ({ label, value, unit = "" }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="sale-field">
      <span className="lbl">{label}</span>
      <span className="val">{String(value)}</span>
      {unit ? <span className="unit">{unit}</span> : <span className="unit" />}
    </div>
  );
};

const BankBlock = () => (
  <table>
    <tbody>
      <tr>
        <td style={{ width: "8%" }}>[&nbsp;&nbsp;&nbsp;]</td>
        <td className="key">
          A/c. Name
        </td>
        <td>{BOC_BANK.acName}</td>
      </tr>
      <tr>
        <td />
        <td className="key">
          Bank Name
        </td>
        <td>{BOC_BANK.bankName}</td>
      </tr>
      <tr>
        <td />
        <td className="key">
          Account No
        </td>
        <td dangerouslySetInnerHTML={{ __html: BOC_BANK.accountNo }} />
      </tr>
      <tr>
        <td />
        <td className="key">
          Bank Code
        </td>
        <td>{BOC_BANK.bankCode}</td>
      </tr>
      <tr>
        <td />
        <td className="key">
          Branch Code
        </td>
        <td>{BOC_BANK.branchCode}</td>
      </tr>
      <tr>
        <td />
        <td className="key">
          Swift Code
        </td>
        <td>{BOC_BANK.swiftCode}</td>
      </tr>
    </tbody>
  </table>
);

const SalePaymentSection = ({ data, isSaleOrExport, dueDate, terms }) => {
  const showBank = shouldShowBocBank(data.bankFlags);
  const docType = String(data.docType || data.type || "").toLowerCase();
  const showExportNote = docType !== "export";

  const leftFields = [
    { label: "Shipping By", value: data.shippingName },
    { label: "Origin Of", value: data.originOf },
    { label: "Manuf. Origin", value: data.manufactureOrigin },
    { label: "C.I.F", value: data.cif },
  ].filter((field) => field.value || field.value === 0);

  const rightFields = [
    { label: "Payment Terms", value: terms, unit: "Days" },
    { label: "Due Date", value: dueDate },
    ...(isSaleOrExport
      ? [{ label: "Received Amount", value: fmtMoney(data.paidAmount ?? 0), unit: "US$" }]
      : []),
    ...(isSaleOrExport && Number(data.dueAmount) > 0
      ? [{ label: "Remain Amount", value: fmtMoney(data.dueAmount), unit: "US$" }]
      : []),
  ].filter((field) => field.value || field.value === 0);

  const showPaymentGrid = leftFields.length > 0 || rightFields.length > 0;

  return (
    <>
      {showPaymentGrid ? (
        <div className="sale-payment">
          <div className="sale-payment-grid">
            <div className="sale-payment-col">
              {leftFields.map((field) => (
                <PaymentField key={field.label} {...field} />
              ))}
            </div>
            <div className="sale-payment-col">
              {rightFields.map((field) => (
                <PaymentField key={field.label} {...field} />
              ))}
              <div className="sale-part-pay">Part Payment Allowed</div>
            </div>
          </div>
        </div>
      ) : null}
      {showBank ? (
        <>
          <hr className="sale-divider" />
          <div className="sale-bank">
            <p className="sale-bank-title">Payment Detail:</p>
            <BankBlock />
          </div>
        </>
      ) : null}
      <div className="sale-signatures">
        <div className="sale-sig">
          <div className="for">
            For <strong>{BOC_BANK.acName}</strong>
          </div>
          <div className="line" />
          <div className="cap">(Authorised Signature)</div>
        </div>
        <div className="sale-sig">
          <div className="for">
            <strong>Confirmed By :</strong>
          </div>
          <div className="line" />
          <div className="cap">(Chop &amp; Buyer&apos;s Signature)</div>
        </div>
      </div>
      <div className="sale-disclaimer">
        <p>{data.disclaimer || DEFAULT_DISCLAIMER}</p>
        {showExportNote ? (
          <p className="note">
            <b>NOTE : </b> All diamonds are sold &amp; delivered in Bangkok, Thailand.
          </p>
        ) : null}
      </div>
    </>
  );
};

export const SaleInvoicePage = ({ data, copyLabel = "(ORIGINAL COPY)" }) => {
  const docType = String(data.docType || data.type || "").toLowerCase();
  const isSaleOrExport = docType === "sale" || docType === "export";
  const lineItems = data.lineItems || [];
  const { bodyRows, totalPcs, totalCarat, totalAmount } = buildTableRows(lineItems, SALE_MAX_ROWS);

  const grandTotal = Number(data.totals?.finalAmount ?? data.finalAmount ?? totalAmount);
  const vatAmount = Number(data.vatAmount ?? 0);
  const subTotal = vatAmount > 0 ? grandTotal - vatAmount : totalAmount;
  const dueDate = fmtDisplayDate(data.dueDate || data.date);
  const terms = data.terms ?? "";

  const invoiceNo = data.invoiceNo || "—";
  const referenceNo = data.reference || "—";
  const pageTitle = resolvePageTitle(data);
  const invoiceNoLabel = resolveInvoiceNoLabel(data);

  return (
    <div className="sheet sale-invoice-sheet am-page-break">
      <div className="sale-invoice-top">
        <div className="header">
          <div className="brand">
            {resolveCompanyLogoUrl(data.company?.logoUrl || data.company?.logo) ? (
              <img
                className="logo"
                src={resolveCompanyLogoUrl(data.company?.logoUrl || data.company?.logo)}
                alt={data.company?.name || "Company logo"}
                style={{ maxHeight: 56, maxWidth: 140, objectFit: "contain", display: "block" }}
              />
            ) : (
              <div className="logo">{(data.company?.name || "V").charAt(0).toUpperCase()}</div>
            )}
            <div>
              <div className="brand-name">
                {(data.company?.name || "VENYA").split(/\s+/)[0].toUpperCase()}
              </div>
              <div className="brand-sub">{data.company?.tagline || "GEMS CO., LTD."}</div>
            </div>
          </div>
          <div className="memo-title">
            <h1>{pageTitle}</h1>
            <span>{copyLabel}</span>
          </div>
        </div>

        <div className="company-block">
          <div className="col">
            <BuyerBlock party={data.party} />
          </div>
          <div className="col right">
            <SenderBlock />
          </div>
        </div>

        <div className="meta-strip">
          <div className="field">
            <label>Date</label>
            <div className="val">{fmtDisplayDate(data.date)}</div>
          </div>
          <div className="field">
            <label>Reference No.</label>
            <div className="val">{referenceNo}</div>
          </div>
          <div className="field">
            <label>{invoiceNoLabel}</label>
            <div className="val">{invoiceNo}</div>
          </div>
        </div>
      </div>

      <div className="sale-invoice-grow">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>SKU</th>
                <th>Description</th>
                <th>Pcs</th>
                <th>Carats</th>
                <th>Price (US$)</th>
                <th>Amount (US$)</th>
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row) => (
                <tr key={row.no}>
                  <td>{row.no}</td>
                  <td>{row.sku}</td>
                  <td>{row.description}</td>
                  <td>{row.pcs !== "" ? row.pcs : ""}</td>
                  <td>{row.carats !== "" && row.carats != null ? fmtCarats(row.carats) : ""}</td>
                  <td>{row.price !== "" && row.price != null ? fmtMoney(row.price) : ""}</td>
                  <td className="amt">
                    {row.amount !== "" && row.amount != null ? fmtMoney(row.amount) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td />
                <td className="sale-total-label">Total (Before VAT)</td>
                <td>{totalPcs}</td>
                <td>{fmtCarats(totalCarat)}</td>
                <td>US$</td>
                <td className="sale-total-amt">{fmtMoney(subTotal)}</td>
              </tr>
              {vatAmount > 0 ? (
                <tr>
                  <td />
                  <td />
                  <td className="sale-total-label">VAT ({data.vatPercent ?? 7}%)</td>
                  <td />
                  <td />
                  <td>US$</td>
                  <td className="sale-total-amt">{fmtMoney(vatAmount)}</td>
                </tr>
              ) : null}
              <tr>
                <td />
                <td />
                <td className="sale-total-label">Grand Total</td>
                <td />
                <td />
                <td>US$</td>
                <td className="sale-total-amt">{fmtMoney(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="sale-in-word">
          <b>in Word :</b> {num2words(grandTotal)} Only
        </div>
      </div>

      <div className="sale-invoice-bottom">
        <SalePaymentSection
          data={data}
          isSaleOrExport={isSaleOrExport}
          dueDate={dueDate}
          terms={terms}
        />
      </div>
    </div>
  );
};

const SaleInvoice = ({ includeCustomerCopy = true, ...data }) => (
  <div className="approval-memo-root">
    <SaleInvoicePage data={data} copyLabel="(ORIGINAL COPY)" />
    {includeCustomerCopy ? <SaleInvoicePage data={data} copyLabel="(CUSTOMER COPY)" /> : null}
  </div>
);

export default SaleInvoice;
