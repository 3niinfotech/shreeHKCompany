const XLSX = require("xlsx");
const helper = require("../../helper.js");
const repository = require("./iExportRepository.js");
const { sendInventoryMail } = require("./mailSender.js");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const MAIL_TABLE_COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "lab", label: "LAB" },
  { key: "report_no", label: "REPORT" },
  { key: "shape", label: "SHAPE" },
  { key: "polish_pcs", label: "PCS" },
  { key: "polish_carat", label: "CARAT" },
  { key: "main_color", label: "COLOR" },
  { key: "clarity", label: "CLARITY" },
  { key: "price", label: "PRICE" },
  { key: "amount", label: "AMOUNT" },
];

const buildMailTableRows = (products) =>
  products
    .map((product) => {
      const cells = MAIL_TABLE_COLUMNS.map(
        (col) =>
          `<td style="border:1px solid #999;border-collapse:collapse;">${escapeHtml(
            product[col.key]
          )}</td>`
      ).join("");
      return `<tr style="border:1px solid #999;border-collapse:collapse;">${cells}</tr>`;
    })
    .join("");

const buildMailHtml = ({ content, products }) => {
  const headerCells = MAIL_TABLE_COLUMNS.map(
    (col) =>
      `<th style="border:1px solid #999;border-collapse:collapse;">${col.label}</th>`
  ).join("");

  return `<table style="background:#f1f1f1;width:100%;font-family:sans-serif;" cellpadding="20" border="0" cellspacing="0">
  <tr style="background:#ccc;width:100%;height:50px;text-align:center;">
    <td><img style="width:40%;" src="http://shreehk.com/skin/frontend/smartwave/porto/images/logo-shreehk.png" alt="Shreehk" /></td>
  </tr>
  <tr>
    <td style="background:#f1f1f1;width:100%;">
      <table style="width:100%;" border="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:20px;">
            <h3>Thanks for your contacting US.</h3>
            <p>${escapeHtml(content)}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;width:100%;padding:20px;text-align:center;">
            <table style="font-size:12px;border:1px solid #999;border-collapse:collapse;width:100%;" cellpadding="5" cellspacing="0">
              <tr style="border:1px solid #999;border-collapse:collapse;background:#666;color:#fff;">
                ${headerCells}
              </tr>
              ${buildMailTableRows(products)}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
};

const buildAttachmentBuffer = (products) => {
  const attributeMap = helper.getExportAttribute();
  const keys = Object.keys(attributeMap);
  const headers = keys.map((key) => attributeMap[key]);
  const rows = products.map((product) =>
    keys.map((key) => (product[key] == null ? "" : product[key]))
  );
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const buildAttachmentFilename = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `KalistJewels_${dd}-${mm}-${yyyy}.xlsx`;
};

const sendInventoryStoneMail = async ({ ids, email, subject, content }) => {
  const products = await repository.getExportInventoryByIds(ids);
  if (!products.length) {
    const error = new Error("No product found for selected items");
    error.statusCode = 404;
    throw error;
  }

  const html = buildMailHtml({ content, products });
  const attachmentBuffer = buildAttachmentBuffer(products);

  await sendInventoryMail({
    to: email,
    subject,
    html,
    attachments: [
      {
        filename: buildAttachmentFilename(),
        content: attachmentBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });

  return {
    ok: true,
    message: "Mail sent successfully",
  };
};

module.exports = {
  sendInventoryStoneMail,
};
