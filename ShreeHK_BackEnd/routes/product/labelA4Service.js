const repository = require("./labelA4Repository.js");
const { generateBarcodeSvgDataUrl } = require("./labelA4Barcode.js");
const { buildA4BulkHtml } = require("./labelA4Template.js");
const { renderPdf } = require("./labelStickerPdf.js");

const hasBarcode = (value) => value !== undefined && value !== null && value !== "" && value !== 0 && value !== "0";

const expandByCopies = (products, copies) => {
  const count = Math.max(1, parseInt(copies, 10) || 1);
  if (count === 1) return products;
  const expanded = [];
  products.forEach((product) => {
    for (let index = 0; index < count; index += 1) {
      expanded.push(product);
    }
  });
  return expanded;
};

const getProductsDetail = async (ids, diaPair = "") => {
  const numericIds = ids
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!numericIds.length) return [];

  const rows = await repository.getProductsByIds(numericIds);
  const products = [];

  for (const row of rows) {
    const product = { ...row };

    if (product.pair && diaPair === "pair") {
      product.pair_data = await repository.loadDataBySku(product.pair);
    }

    let barcode = product.barcode;
    if (!hasBarcode(barcode)) {
      barcode = await repository.saveNewBarcode(product.id);
      product.barcode = barcode;
    }

    product.barcodeDataUrl = generateBarcodeSvgDataUrl(barcode);
    products.push(product);
  }

  return products;
};

const printLabelA4 = async ({ ids, type = "a4", diaPair = "", copies = 1 }) => {
  if (!ids?.length) {
    const error = new Error("Please Select Item");
    error.statusCode = 400;
    throw error;
  }

  if (type !== "a4") {
    const error = new Error("Unsupported label type");
    error.statusCode = 400;
    throw error;
  }

  const products = await getProductsDetail(ids, diaPair);
  if (!products.length) {
    const error = new Error("No product found for selected items");
    error.statusCode = 404;
    throw error;
  }

  const expandedProducts = expandByCopies(products, copies);
  const html = buildA4BulkHtml(expandedProducts);
  return renderPdf(html);
};

module.exports = {
  getProductsDetail,
  printLabelA4,
};
