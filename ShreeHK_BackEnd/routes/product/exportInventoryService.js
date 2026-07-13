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
  return { headers, rows };
};

const buildXlsxBuffer = (headers, rows, sheetName) => {
  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const exportInventoryGrid = async ({ ids, sheetName = "Stock List" }) => {
  const products = await repository.getExportInventoryByIds(ids);
  if (!products.length) {
    const error = new Error("No product found for selected items");
    error.statusCode = 404;
    throw error;
  }

  const attributeMap = helper.getInventoryAttribute();
  const { headers, rows } = buildRows(attributeMap, products);

  return {
    buffer: buildXlsxBuffer(headers, rows, sheetName),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  };
};

module.exports = {
  exportInventoryGrid,
};
