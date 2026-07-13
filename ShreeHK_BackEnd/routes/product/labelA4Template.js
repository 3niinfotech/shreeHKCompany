const { escapeHtml, getShapeFirst, formatMainColor } = require("./labelA4TemplateHelpers.js");

const buildGiaLabelCell = (data, barcodeDataUrl) => {
  const sku = escapeHtml(data.sku);
  const polishCarat = escapeHtml(data.polish_carat);
  const shape = escapeHtml(getShapeFirst(data.shape));
  const clarity = escapeHtml(data.clarity);
  const mainColor = escapeHtml(formatMainColor(data.main_color));
  const lab = escapeHtml(data.lab);
  const reportNo = escapeHtml(data.report_no);
  const polish = escapeHtml(data.polish);
  const symmentry = escapeHtml(data.symmentry);
  const fIntensity = escapeHtml(data.f_intensity);
  const tablePc = escapeHtml(data.table_pc);
  const depthPc = escapeHtml(data.depth_pc);

  return `<td style="width:14%;padding-left:6px;padding-right:6px;padding-bottom:5px;padding-top:10px;">
    <table style="width:75%;font-size:6px;text-align:left;font-weight:bold" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:70%;padding-bottom:5px;font-size:7px;">${sku}</td>
        <td style="width:30%;padding-bottom:5px;text-align:right">${polishCarat}</td>
      </tr>
      <tr>
        <td style="width:50%;padding-bottom:3px;">${shape}</td>
        <td style="width:50%;padding-bottom:3px;text-align:right">${clarity}</td>
      </tr>
      <tr>
        <td colspan="2" style="width:100%;max-width:100%;padding-bottom:3px;white-space:nowrap">${mainColor}</td>
      </tr>
      <tr>
        <td style="width:40%;padding-bottom:3px;">${lab}</td>
        <td style="width:60%;padding-bottom:3px;text-align:right">${reportNo}</td>
      </tr>
      <tr>
        <td colspan="2" style="width:100%;padding-bottom:3px;">
          <table style="width:100%;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:33.33%;font-size:6px;">${polish}&nbsp;</td>
              <td style="width:33.33%;text-align:center;font-size:6px;">${symmentry}&nbsp;</td>
              <td style="width:33.33%;text-align:right;font-size:6px;">${fIntensity}&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="width:50%;padding-bottom:5px;">T: ${tablePc}</td>
        <td style="width:50%;padding-bottom:5px;text-align:right">D: ${depthPc}</td>
      </tr>
      <tr style="padding:0;margin:0;">
        <td colspan="2" style="width:100%;padding:0;margin:0;text-align:center;">
          <img src="${barcodeDataUrl}" alt="shreehk" style="width:100%;" />
        </td>
      </tr>
    </table>
  </td>`;
};

const buildA4BulkHtml = (products) => {
  let count = 0;
  let rowsHtml = "<tr>";

  products.forEach((product) => {
    count += 1;
    rowsHtml += buildGiaLabelCell(product, product.barcodeDataUrl);

    if (count === 6) {
      count = 0;
      rowsHtml += "</tr><tr>";
    } else {
      rowsHtml += '<td style="width:2.5%;">&nbsp;</td>';
    }
  });

  rowsHtml += "</tr>";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page { size: A4 portrait; margin: 11mm 0 5mm 0; }
    body { margin: 0; font-family: Arial, sans-serif; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <table style="width:100%;font-size:6px;text-align:left;" cellpadding="0" cellspacing="0" border="0">
    ${rowsHtml}
  </table>
</body>
</html>`;
};

module.exports = {
  buildA4BulkHtml,
};
