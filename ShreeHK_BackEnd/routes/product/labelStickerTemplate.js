const { escapeHtml, getShapeFirst } = require("./labelA4TemplateHelpers.js");

const formatGiaMainColor = (mainColor) => {
  const trimmed = String(mainColor || "").trim();
  if (trimmed.length > 30) {
    return trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("");
  }
  return trimmed.replace(/\s+/g, "");
};

const formatNonGiaMainColor = (mainColor) => {
  const trimmed = String(mainColor || "").trim();
  if (trimmed.length > 26) {
    const acronym = trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("");
    return `${escapeHtml(acronym)}&nbsp;`;
  }
  return `${escapeHtml(mainColor ?? "")}&nbsp;`;
};

const formatCostPriceLine = (cost, price) => {
  const costStr = Math.round(Number(cost) || 0).toString();
  const priceStr = Math.round(Number(price) || 0).toString();
  const randSuffix = Math.floor(Math.random() * 91) + 10;
  return `12${costStr}3456${priceStr}${randSuffix}`;
};

const buildGiaPairTable = (data, barcodeDataUrl, pairBarcodeDataUrl) => {
  const mainColor = formatGiaMainColor(data.main_color);
  const pairMainColor = formatGiaMainColor(data.pair_data?.main_color);

  return `<table style="width:24%;font-size:6px;text-align:left;font-weight:bold" cellpadding="0" cellspacing="">
    <tr>
      <td style="width:70%;padding-bottom:0px;font-size:7px;">${escapeHtml(data.sku)}</td>
      <td style="width:30%;padding-bottom:0px;text-align:right">${escapeHtml(data.polish_carat)}</td>
    </tr>
    <tr>
      <td style="width:40%;padding-bottom:0px;">${escapeHtml(getShapeFirst(data.shape))}</td>
      <td style="width:60%;padding-bottom:0px;text-align:right">${escapeHtml(data.report_no)}</td>
    </tr>
    <tr>
      <td style="width:90%;padding-bottom:3px;white-space:nowrap">${escapeHtml(mainColor)}</td>
      <td style="width:10%;padding-bottom:3px;text-align:right">${escapeHtml(data.clarity)}</td>
    </tr>
    <tr style="padding:0px;margin:0px;">
      <td colspan="2" style="width:100%;padding:0px;margin:0px;text-align:center;"><img src="${barcodeDataUrl}" alt="shreehk" style="width:80%;"/></td>
    </tr>
    <tr style="padding:0px;margin:0px;">
      <td colspan="2" style="width:100%;padding:0px;margin:0px;text-align:center;">&nbsp;</td>
    </tr>
    <tr>
      <td style="width:70%;padding-bottom:0px;font-size:7px;">${escapeHtml(data.pair)}</td>
      <td style="width:30%;padding-bottom:0px;text-align:right">${escapeHtml(data.pair_data?.polish_carat)}</td>
    </tr>
    <tr>
      <td style="width:40%;padding-bottom:0px;">${escapeHtml(getShapeFirst(data.pair_data?.shape))}</td>
      <td style="width:60%;padding-bottom:0px;text-align:right">${escapeHtml(data.pair_data?.report_no)}</td>
    </tr>
    <tr>
      <td style="width:90%;padding-bottom:3px;white-space:nowrap">${escapeHtml(pairMainColor)}</td>
      <td style="width:10%;padding-bottom:3px;text-align:right">${escapeHtml(data.pair_data?.clarity)}</td>
    </tr>
    <tr style="padding:0px;margin:0px;">
      <td colspan="2" style="width:100%;padding:0px;margin:0px;text-align:center;"><img src="${pairBarcodeDataUrl}" alt="shreehk" style="width:80%;"/></td>
    </tr>
  </table>`;
};

const buildGiaTable = (data, barcodeDataUrl) => {
  const mainColor = formatGiaMainColor(data.main_color);

  return `<table style="width:26%;font-size:6px;text-align:left;font-weight:bold" cellpadding="0" cellspacing="">
    <tr>
      <td style="width:70%;padding-bottom:5px;font-size:7px;">${escapeHtml(data.sku)}</td>
      <td style="width:30%;padding-bottom:5px;text-align:right">${escapeHtml(data.polish_carat)}</td>
    </tr>
    <tr>
      <td style="width:50%;padding-bottom:3px;">${escapeHtml(getShapeFirst(data.shape))}</td>
      <td style="width:50%;padding-bottom:3px;text-align:right">${escapeHtml(data.clarity)}</td>
    </tr>
    <tr>
      <td colspan="2" style="width:100%;max-width:100%;padding-bottom:3px;white-space:nowrap">${escapeHtml(mainColor)}</td>
    </tr>
    <tr>
      <td style="width:40%;padding-bottom:3px;">${escapeHtml(data.lab)}</td>
      <td style="width:60%;padding-bottom:3px;text-align:right">${escapeHtml(data.report_no)}</td>
    </tr>
    <tr>
      <td colspan="2" style="width:100%;padding-bottom:3px;">
        <table style="width:100%;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:33.33%;">${escapeHtml(data.polish)}</td>
            <td style="width:33.33%;text-align:center">${escapeHtml(data.symmentry)}</td>
            <td style="width:33.33%;text-align:right">${escapeHtml(data.f_intensity)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="width:50%;padding-bottom:5px;">T: ${escapeHtml(data.table_pc)}</td>
      <td style="width:50%;padding-bottom:5px;text-align:right">D: ${escapeHtml(data.depth_pc)}</td>
    </tr>
    <tr style="padding:0px;margin:0px;">
      <td colspan="2" style="width:100%;padding:0px;margin:0px;text-align:center;"><img src="${barcodeDataUrl}" alt="shreehk" style="width:100%;"/></td>
    </tr>
  </table>`;
};

const buildNonGiaTable = (data, barcodeDataUrl) => {
  const sizeCell = data.size != null && String(data.size) !== ""
    ? `S: ${escapeHtml(data.size)}`
    : "&nbsp;";

  return `<table style="width:26%;font-size:7px;text-align:left;font-weight:bold" cellpadding="0" cellspacing="0">
    <tr>
      <td colspan="2" style="width:100%;padding-bottom:3px;">${escapeHtml(data.sku)}</td>
    </tr>
    <tr>
      <td colspan="2" style="width:100%;padding-bottom:3px;">${escapeHtml(getShapeFirst(data.shape))}</td>
    </tr>
    <tr>
      <td colspan="2" style="width:100%;padding-bottom:3px;white-space:nowrap">${formatNonGiaMainColor(data.main_color)}</td>
    </tr>
    <tr>
      <td style="width:50%;padding-bottom:3px;">${escapeHtml(data.clarity)}</td>
      <td style="width:50%;padding-bottom:3px;text-align:right;">${sizeCell}</td>
    </tr>
    <tr>
      <td style="width:50%;padding-bottom:3px;">pcs: ${escapeHtml(data.polish_pcs)}</td>
      <td style="width:50%;padding-bottom:3px;text-align:right;">cts: ${escapeHtml(data.polish_carat)}</td>
    </tr>
    <tr style="padding:0px;margin:0px;">
      <td colspan="2" style="width:100%;padding:0px;margin:0px;text-align:left;"><img src="${barcodeDataUrl}" alt="shreehk" style="width:100%;"/></td>
    </tr>
    <tr>
      <td colspan="2" style="width:100%;padding-bottom:2px;font-size:6px;text-align:center;">${formatCostPriceLine(data.cost, data.price)}</td>
    </tr>
  </table>`;
};

const buildStickerPage = (data, diaPair = "") => {
  const sku = escapeHtml(data.sku);
  const barcodeDataUrl = data.barcodeDataUrl;
  let innerHtml = "";

  if (String(data.lab) === "GIA") {
    if (data.pair && diaPair === "pair" && data.pair_data) {
      innerHtml = buildGiaPairTable(data, barcodeDataUrl, data.pair_data.barcodeDataUrl);
    } else {
      innerHtml = buildGiaTable(data, barcodeDataUrl);
    }
  } else {
    innerHtml = buildNonGiaTable(data, barcodeDataUrl);
  }

  return `<div class="label-page" style="font-size: 12pt">
    <bookmark title="${sku}" level="0"></bookmark>
    ${innerHtml}
  </div>`;
};

const buildStickerHtml = (products, diaPair = "") => {
  const pagesHtml = products.map((product) => buildStickerPage(product, diaPair)).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: 75mm 30mm landscape;
      margin: 5mm 1mm 1mm 0mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    .label-page {
      page-break-after: always;
      break-after: page;
    }
    .label-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
};

module.exports = {
  buildStickerHtml,
  buildStickerPage,
  formatGiaMainColor,
  formatNonGiaMainColor,
};
