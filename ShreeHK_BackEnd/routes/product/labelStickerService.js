const repository = require("./labelA4Repository.js");
const { getProductsDetail } = require("./labelA4Service.js");
const { generateBarcodeSvgDataUrl } = require("./labelA4Barcode.js");
const { buildStickerHtml } = require("./labelStickerTemplate.js");
const { renderPdf } = require("./labelStickerPdf.js");

const hasBarcode = (value) =>
  value !== undefined && value !== null && value !== "" && value !== 0 && value !== "0";

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

const ensurePairBarcode = async (pairData) => {
  if (!pairData) return pairData;

  const enriched = { ...pairData };
  let barcode = enriched.barcode;
  if (!hasBarcode(barcode)) {
    barcode = await repository.saveNewBarcode(enriched.id);
    enriched.barcode = barcode;
  }
  enriched.barcodeDataUrl = generateBarcodeSvgDataUrl(barcode);
  return enriched;
};

const enrichProductsForSticker = async (products, diaPair) => {
  const enriched = [];
  for (const product of products) {
    const item = { ...product };
    if (item.pair && diaPair === "pair" && item.pair_data) {
      item.pair_data = await ensurePairBarcode(item.pair_data);
    }
    enriched.push(item);
  }
  return enriched;
};

const printLabelSticker = async ({ ids, diaPair = "", copies = 1 }) => {
  if (!ids?.length) {
    const error = new Error("Please Select Item");
    error.statusCode = 400;
    throw error;
  }

  const products = await getProductsDetail(ids, diaPair);
  if (!products.length) {
    const error = new Error("No product found for selected items");
    error.statusCode = 404;
    throw error;
  }

  const enrichedProducts = await enrichProductsForSticker(products, diaPair);
  const expandedProducts = expandByCopies(enrichedProducts, copies);
  const html = buildStickerHtml(expandedProducts, diaPair);
  return renderPdf(html);
};

module.exports = {
  printLabelSticker,
};
