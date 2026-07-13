const XLSX = require("xlsx");
const helper = require("../../helper.js");
const repository = require("./iExportRepository.js");

const formatCellValue = (value) => {
  if (value === null || value === undefined) return "";
  return value;
};

const buildRows = (attributeMap, products) => {
  const keys = Object.keys(attributeMap);
  const headers = keys.map((key) => attributeMap[key]);
  const rows = products.map((product) =>
    keys.map((key) => formatCellValue(product[key]))
  );
  return { keys, headers, rows };
};

const buildXlsxBuffer = (headers, rows) => {
  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const escapeCsvValue = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildCsvBuffer = (headers, rows) => {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  return Buffer.from(lines.join("\r\n"), "utf-8");
};

const exportInventoryFull = async ({ ids, format = "xlsx" }) => {
  const products = await repository.getExportInventoryByIds(ids);
  if (!products.length) {
    const error = new Error("No product found for selected items");
    error.statusCode = 404;
    throw error;
  }

  const attributeMap = await helper.getAttribute(1);
  const { headers, rows } = buildRows(attributeMap, products);

  if (format === "csv") {
    return {
      buffer: buildCsvBuffer(headers, rows),
      contentType: "text/csv; charset=utf-8",
      extension: "csv",
    };
  }

  return {
    buffer: buildXlsxBuffer(headers, rows),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  };
};

module.exports = {
  exportInventoryFull,
};
