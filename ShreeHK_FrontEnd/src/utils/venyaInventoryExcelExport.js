import ExcelJS from "exceljs";

/**
 * Venya PHP inventory Export (fn=exportToExcel) clone using ExcelJS.
 * Preserves exact visual styling and formatting:
 * - Top Summary Box Header (TOTAL, SELECTED, PCS, CARAT, RATE, AMOUNT): BG #A4D2DF, Text #033955, Font size 11, Black borders
 * - Cell E2: White background with black border
 * - Company Header Contact Text (L to T, Rows 1 to 4): Merged cells (L1:T1, L2:P2, Q2:T2, L3:P3, Q3:T3, L4:P4, Q4:T4), Font #CC0066, No Borders
 * - Data Table Header (Row 6, A to AL): BG #ECABCB, Text #033955, Font size 12, Black borders
 * - Data Rows (Row 7+): Font size 11, Alternating ROWS (1st row plain white #FFFFFF, 2nd row #CCCCCC...), Black borders
 * - SKU Column (Col B): Clickable Excel Hyperlink to ERP SKU detail page (`/transaction/stone-update?sku=...`)
 * - Certificate Column (Col D): Clickable Excel Hyperlink to GIA Certificate (`https://www.gia.edu/report-check?reportno=...`) opening in new tab
 * - Amount formula (=G{row}*N{row}), numeric types
 * - Frozen panes at Row 6 (A7), AutoFilter
 */

const COLUMNS = [
  { key: "sku", header: "Sku", width: 16, align: "center" },
  { key: "lab", header: "Lab", width: 8, align: "center" },
  { key: "report_no", header: "Certificate", width: 14, align: "center" },
  { key: "shape", header: "Shape", width: 12, align: "center" },
  { key: "polish_pcs", header: "Pcs", width: 8, align: "center", type: "int" },
  { key: "polish_carat", header: "Carat", width: 10, align: "center", type: "num" },
  { key: "color", header: "Color", width: 18, align: "center" },
  { key: "clarity", header: "Clarity", width: 8, align: "center" },
  { key: "rap_price", header: "Rapnet", width: 10, align: "center", type: "num" },
  { key: "discount", header: "Discount", width: 10, align: "center", type: "num" },
  { key: "price", header: "Price", width: 10, align: "right", type: "num" },
  { key: "amount", header: "Amount", width: 14, align: "right", type: "formula" },
  { key: "size", header: "Size", width: 8, align: "center" },
  { key: "f_intensity", header: "Fluorescence", width: 12, align: "center" },
  { key: "cut", header: "Cut", width: 8, align: "center" },
  { key: "polish", header: "Polish", width: 8, align: "center" },
  { key: "symmentry", header: "Symmetry", width: 8, align: "center" },
  { key: "table_pc", header: "Table", width: 8, align: "right", type: "num" },
  { key: "depth_pc", header: "Depth", width: 8, align: "right", type: "num" },
  { key: "mesurment", header: "Measurement", width: 16, align: "left" },
  { key: "gridle", header: "Girdle", width: 12, align: "left" },
  { key: "location", header: "LOC", width: 10, align: "center" },
  { key: "package", header: "Package", width: 12, align: "left" },
  { key: "mfg_code", header: "Type", width: 10, align: "center" },
  { key: "main_color", header: "Full Color", width: 18, align: "center" },
  { key: "argyle_color", header: "Argyle Color", width: 14, align: "center" },
  { key: "in_house_clarity", header: "House", width: 12, align: "center" },
  { key: "cost", header: "Cost", width: 10, align: "right", type: "num" },
  { key: "mining", header: "Mining", width: 12, align: "left" },
  { key: "origin", header: "Origin", width: 12, align: "left" },
  { key: "intensity", header: "Intensity", width: 12, align: "left" },
  { key: "overtone", header: "Overtone", width: 12, align: "left" },
  { key: "bgm", header: "BGM", width: 10, align: "center" },
  { key: "eyeclean", header: "Eye Clean", width: 10, align: "center" },
  { key: "main_group", header: "Group", width: 12, align: "left" },
  { key: "sub_group", header: "Sub Group", width: 14, align: "left" },
  { key: "remark", header: "Remark", width: 18, align: "left" },
  { key: "category", header: "Category", width: 16, align: "left" },
];

const TABLE_HEADER_BG = "ECABCB";
const TABLE_HEADER_FG = "033955";
const COMPANY_PINK_FG = "CC0066";
const SUMMARY_HDR_BG = "A4D2DF";
const SUMMARY_HDR_FG = "033955";
const SUMMARY_VAL_BG = "F2F2F2";
const BORDER_CLR = "FF000000";
const SKU_BLUE_FG = "0000FF";

const NUM_FORMAT = "#,##0.00";
const INT_FORMAT = "#,##0";

const pad = (value) => String(value).padStart(2, "0");

const colLetter = (index) => {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

const getNumeric = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const cellText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const pickField = (row, key) => {
  switch (key) {
    case "mfg_code":
      return row.mfgCode ?? row.mfg_code ?? "";
    case "sku":
      return row.sku ?? "";
    case "lab":
      return row.lab ?? "";
    case "report_no":
      return row.certificate ?? row.report_no ?? row.reportNo ?? row.certiNo ?? "";
    case "shape":
      return row.shape ?? "";
    case "polish_pcs": {
      const p = getNumeric(row.polishPcs ?? row.polish_pcs ?? row.pcs);
      return p > 0 ? p : 1;
    }
    case "polish_carat":
      return getNumeric(row.polishCarat ?? row.polish_carat ?? row.carat ?? 0);
    case "main_color":
      return row.mainColor || row.main_color || row.color || "";
    case "argyle_color":
      return row.argyleColor ?? row.argyle_color ?? "";
    case "in_house_clarity":
      return row.mainClarity ?? row.in_house_clarity ?? "";
    case "clarity":
      return row.clarity || row.mainClarity || row.in_house_clarity || "";
    case "rap_price":
      return getNumeric(row.rapPrice ?? row.rap_price ?? row.rap ?? 0);
    case "discount":
      return getNumeric(row.discount ?? row.disc ?? row.dis ?? 0);
    case "cost":
      return getNumeric(row.cost ?? 0);
    case "price":
      return getNumeric(row.price ?? row.rate ?? 0);
    case "amount":
      return getNumeric(row.amount ?? 0);
    case "size":
      return row.size ?? "";
    case "f_intensity":
      return row.fluorescence ?? row.f_intensity ?? row.fluor ?? row.fln ?? "";
    case "cut":
      return row.cut ?? "";
    case "polish":
      return row.polish ?? "";
    case "symmentry":
      return row.symmetry ?? row.symmentry ?? row.sym ?? "";
    case "table_pc":
      return getNumeric(row.table ?? row.table_pc ?? row.tablePc ?? 0);
    case "depth_pc":
      return getNumeric(row.depth ?? row.depth_pc ?? row.depthPc ?? 0);
    case "mesurment":
      return row.measurement ?? row.mesurment ?? row.measurements ?? "";
    case "gridle":
      return row.girdle ?? row.gridle ?? "";
    case "mining":
      return row.mining ?? "";
    case "origin":
      return row.origin ?? "";
    case "intensity":
      return row.intensity ?? "";
    case "overtone":
      return row.overTone ?? row.overtone ?? "";
    case "color":
      return row.color || row.mainColor || row.main_color || "";
    case "location":
      return row.location ?? row.loc ?? row.locName ?? "";
    case "package":
      return row.package ?? row.pkg ?? row.pkgName ?? "";
    case "bgm":
      return row.bgm ?? "";
    case "eyeclean":
      return row.eyeClean ?? row.eyeclean ?? "";
    case "main_group":
      return row.group ?? row.main_group ?? "";
    case "sub_group":
      return row.subGroup ?? row.sub_group ?? "";
    case "remark":
      return row.remark ?? "";
    case "category":
      return row.category ?? "";
    default:
      return row[key] ?? "";
  }
};

const thinBorder = {
  top: { style: "thin", color: { argb: BORDER_CLR } },
  left: { style: "thin", color: { argb: BORDER_CLR } },
  bottom: { style: "thin", color: { argb: BORDER_CLR } },
  right: { style: "thin", color: { argb: BORDER_CLR } },
};

const getBaseUrl = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:5173";
};

const buildVenyaFileName = () => {
  const now = new Date();
  return `Export ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.xlsx`;
};

const triggerFileDownload = (buffer, fileName) => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

export const exportVenyaInventoryExcel = async ({
  rows = [],
  sheetName = "Export",
} = {}) => {
  if (!rows.length) {
    const error = new Error("Please Select Item");
    throw error;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sheetName.slice(0, 31) || "Export");

  const dataCount = rows.length;
  const startDataRow = 7;
  const lastDataRow = startDataRow + dataCount - 1;
  const lastColIdx = COLUMNS.length - 1;

  const pcsColIdx = COLUMNS.findIndex((c) => c.key === "polish_pcs");
  const caratColIdx = COLUMNS.findIndex((c) => c.key === "polish_carat");
  const priceColIdx = COLUMNS.findIndex((c) => c.key === "price");
  const amountColIdx = COLUMNS.findIndex((c) => c.key === "amount");

  const pcsLetter = colLetter(pcsColIdx);
  const caratLetter = colLetter(caratColIdx);
  const priceLetter = colLetter(priceColIdx);
  const amountLetter = colLetter(amountColIdx);

  // Set column widths
  ws.columns = COLUMNS.map((col) => ({
    key: col.key,
    width: col.width,
  }));

  // Set row heights for rows 1 to 6
  ws.getRow(1).height = 16;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 16;
  ws.getRow(4).height = 16;
  ws.getRow(5).height = 10;
  ws.getRow(6).height = 18;

  // --- 1. COMPANY INFO HEADER (Rows 1-4, Top Right, Cols L-T, Merged, No Borders) ---
  const companyStyle = {
    font: { name: "Calibri", size: 12, bold: false, color: { argb: "FF" + COMPANY_PINK_FG } },
    alignment: { horizontal: "left", vertical: "middle" },
  };

  const companyCells = [
    { cell: "L1", text: "201, 2/F, Chevalier House,45-51 Chatham Road South,Tsim Sha Tsui, Kowloon, Hong Kong" },
    { cell: "L2", text: "Website : www.shreehk.com" },
    { cell: "Q2", text: "Email : info@shreehk.com" },
    { cell: "L3", text: "Contact No : +852 23666047" },
    { cell: "Q3", text: "WhatsApp : +852 60404708" },
    { cell: "L4", text: "Rapnet : 91552 (shreehk)" },
    { cell: "Q4", text: "Skype : shreeintl.hk" },
  ];

  companyCells.forEach(({ cell, text }) => {
    const c = ws.getCell(cell);
    c.value = text;
    c.font = companyStyle.font;
    c.alignment = companyStyle.alignment;
  });

  // Merges for Company Header
  ws.mergeCells("L1:T1");
  ws.mergeCells("L2:P2");
  ws.mergeCells("Q2:T2");
  ws.mergeCells("L3:P3");
  ws.mergeCells("Q3:T3");
  ws.mergeCells("L4:P4");
  ws.mergeCells("Q4:T4");

  // Calculate summary totals
  let totalPcsVal = 0;
  let totalCaratVal = 0;
  let totalAmountVal = 0;

  rows.forEach((r) => {
    const rawPcs = getNumeric(r.polishPcs ?? r.polish_pcs ?? r.pcs);
    const pcs = rawPcs > 0 ? rawPcs : 1;
    const carat = getNumeric(r.polishCarat ?? r.polish_carat ?? r.carat ?? 0);
    const price = getNumeric(r.price ?? r.rate ?? 0);
    const amt = getNumeric(r.amount ?? 0);

    totalPcsVal += pcs;
    totalCaratVal += carat;
    totalAmountVal += amt > 0 ? amt : carat * price;
  });

  const totalRateVal = totalCaratVal > 0 ? totalAmountVal / totalCaratVal : 0;

  // --- 2. SUMMARY BOX (Rows 2-4, Cols E to I, BG: #A4D2DF, Text: #033955, Font size 11, Black Borders) ---
  const sumHdrFont = { name: "Calibri", size: 11, bold: true, color: { argb: "FF" + SUMMARY_HDR_FG } };
  const sumHdrFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + SUMMARY_HDR_BG } };
  const sumValFont = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
  const sumValFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + SUMMARY_VAL_BG } };

  // Row 2: Cell E2 has NO top and NO left border
  const cellE2 = ws.getCell("E2");
  cellE2.value = "";
  cellE2.font = sumHdrFont;
  cellE2.border = {
    bottom: { style: "thin", color: { argb: BORDER_CLR } },
    right: { style: "thin", color: { argb: BORDER_CLR } },
  };

  const sumHeaders = [
    { ref: "F2", text: "PCS" },
    { ref: "G2", text: "CARAT" },
    { ref: "H2", text: "RATE" },
    { ref: "I2", text: "AMOUNT" },
  ];
  sumHeaders.forEach(({ ref, text }) => {
    const c = ws.getCell(ref);
    c.value = text;
    c.font = sumHdrFont;
    c.fill = sumHdrFill;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  });

  // Row 3: TOTAL Row (E3:I3)
  const cellE3 = ws.getCell("E3");
  cellE3.value = "TOTAL";
  cellE3.font = sumHdrFont;
  cellE3.fill = sumHdrFill;
  cellE3.alignment = { horizontal: "center", vertical: "middle" };
  cellE3.border = thinBorder;

  const cellF3 = ws.getCell("F3");
  cellF3.value = { formula: `SUM(${pcsLetter}${startDataRow}:${pcsLetter}${lastDataRow})`, result: totalPcsVal };
  cellF3.font = sumValFont;
  cellF3.fill = sumValFill;
  cellF3.numFmt = INT_FORMAT;
  cellF3.alignment = { horizontal: "center", vertical: "middle" };
  cellF3.border = thinBorder;

  const cellG3 = ws.getCell("G3");
  cellG3.value = { formula: `SUM(${caratLetter}${startDataRow}:${caratLetter}${lastDataRow})`, result: Number(totalCaratVal.toFixed(3)) };
  cellG3.font = sumValFont;
  cellG3.fill = sumValFill;
  cellG3.numFmt = NUM_FORMAT;
  cellG3.alignment = { horizontal: "center", vertical: "middle" };
  cellG3.border = thinBorder;

  const cellH3 = ws.getCell("H3");
  cellH3.value = { formula: `IF(G3=0,0,I3/G3)`, result: Number(totalRateVal.toFixed(2)) };
  cellH3.font = sumValFont;
  cellH3.fill = sumValFill;
  cellH3.numFmt = NUM_FORMAT;
  cellH3.alignment = { horizontal: "center", vertical: "middle" };
  cellH3.border = thinBorder;

  const cellI3 = ws.getCell("I3");
  cellI3.value = { formula: `SUM(${amountLetter}${startDataRow}:${amountLetter}${lastDataRow})`, result: Number(totalAmountVal.toFixed(2)) };
  cellI3.font = sumValFont;
  cellI3.fill = sumValFill;
  cellI3.numFmt = NUM_FORMAT;
  cellI3.alignment = { horizontal: "center", vertical: "middle" };
  cellI3.border = thinBorder;

  // Row 4: SELECTED Row (E4:I4) — Uses SUBTOTAL(109, ...) so Excel AutoFilter updates SELECTED values dynamically
  const cellE4 = ws.getCell("E4");
  cellE4.value = "SELECTED";
  cellE4.font = sumHdrFont;
  cellE4.fill = sumHdrFill;
  cellE4.alignment = { horizontal: "center", vertical: "middle" };
  cellE4.border = thinBorder;

  const cellF4 = ws.getCell("F4");
  cellF4.value = { formula: `SUBTOTAL(109,${pcsLetter}${startDataRow}:${pcsLetter}${lastDataRow})`, result: totalPcsVal };
  cellF4.font = sumValFont;
  cellF4.fill = sumValFill;
  cellF4.numFmt = INT_FORMAT;
  cellF4.alignment = { horizontal: "center", vertical: "middle" };
  cellF4.border = thinBorder;

  const cellG4 = ws.getCell("G4");
  cellG4.value = { formula: `SUBTOTAL(109,${caratLetter}${startDataRow}:${caratLetter}${lastDataRow})`, result: Number(totalCaratVal.toFixed(3)) };
  cellG4.font = sumValFont;
  cellG4.fill = sumValFill;
  cellG4.numFmt = NUM_FORMAT;
  cellG4.alignment = { horizontal: "center", vertical: "middle" };
  cellG4.border = thinBorder;

  const cellH4 = ws.getCell("H4");
  cellH4.value = { formula: `IF(G4=0,0,I4/G4)`, result: Number(totalRateVal.toFixed(2)) };
  cellH4.font = sumValFont;
  cellH4.fill = sumValFill;
  cellH4.numFmt = NUM_FORMAT;
  cellH4.alignment = { horizontal: "center", vertical: "middle" };
  cellH4.border = thinBorder;

  const cellI4 = ws.getCell("I4");
  cellI4.value = { formula: `SUBTOTAL(109,${amountLetter}${startDataRow}:${amountLetter}${lastDataRow})`, result: Number(totalAmountVal.toFixed(2)) };
  cellI4.font = sumValFont;
  cellI4.fill = sumValFill;
  cellI4.numFmt = NUM_FORMAT;
  cellI4.alignment = { horizontal: "center", vertical: "middle" };
  cellI4.border = thinBorder;

  // --- 3. TABLE COLUMN HEADERS (Row 6, A to AL) ---
  const headerFont = { name: "Calibri", size: 12, bold: false, color: { argb: "FF" + TABLE_HEADER_FG } };
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + TABLE_HEADER_BG } };

  COLUMNS.forEach((col, c) => {
    const cellRef = `${colLetter(c)}6`;
    const cell = ws.getCell(cellRef);
    cell.value = col.header;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  const baseUrl = getBaseUrl();

  // --- 4. DATA ROWS (Row 7 onwards) ---
  rows.forEach((row, idx) => {
    const excelRow = idx + startDataRow;
    const rowObj = ws.getRow(excelRow);
    rowObj.height = 16;

    // Alternating Row Fill: 1st row white (#FFFFFF), 2nd row gray (#CCCCCC)
    const rowBgColor = idx % 2 === 0 ? "FFFFFF" : "CCCCCC";
    const rowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rowBgColor } };

    COLUMNS.forEach((col, c) => {
      const cellRef = `${colLetter(c)}${excelRow}`;
      const cell = ws.getCell(cellRef);
      cell.fill = rowFill;
      cell.border = thinBorder;
      cell.alignment = { horizontal: col.align || "left", vertical: "middle" };

      const raw = pickField(row, col.key);

      // --- A. SKU HYPERLINK ---
      if (col.key === "sku") {
        const skuVal = cellText(raw);
        if (skuVal) {
          const skuUrl = `${baseUrl}/transaction/stone-update?sku=${encodeURIComponent(skuVal)}`;
          cell.value = {
            text: skuVal,
            hyperlink: skuUrl,
            tooltip: skuVal,
          };
          cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF" + SKU_BLUE_FG }, underline: true };
        } else {
          cell.value = "";
          cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF000000" } };
        }
        return;
      }

      // --- B. CERTIFICATE HYPERLINK ---
      if (col.key === "report_no") {
        const certVal = cellText(raw);
        if (certVal) {
          const certUrl = `https://www.gia.edu/report-check?reportno=${encodeURIComponent(certVal)}`;
          cell.value = {
            text: certVal,
            hyperlink: certUrl,
            tooltip: certVal,
          };
          cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF" + SKU_BLUE_FG }, underline: true };
        } else {
          cell.value = "";
          cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF000000" } };
        }
        return;
      }

      // --- C. AMOUNT FORMULA ---
      if (col.key === "amount") {
        const caratVal = getNumeric(row.polishCarat ?? row.polish_carat ?? row.carat ?? 0);
        const priceVal = getNumeric(row.price ?? 0);
        const amtVal = getNumeric(row.amount ?? (caratVal * priceVal));
        cell.value = {
          formula: `${caratLetter}${excelRow}*${priceLetter}${excelRow}`,
          result: Number(amtVal.toFixed(2)),
        };
        cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF000000" } };
        cell.numFmt = NUM_FORMAT;
        return;
      }

      // --- D. NUMERIC & INT TYPES ---
      if (col.type === "int" || col.type === "num") {
        const n = getNumeric(raw);
        cell.value = col.type === "int" ? Math.round(n) : Number(n.toFixed(3));
        cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF000000" } };
        cell.numFmt = col.type === "int" ? INT_FORMAT : NUM_FORMAT;
        return;
      }

      // --- E. TEXT COLUMNS ---
      cell.value = cellText(raw);
      cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: "FF000000" } };
    });
  });

  // --- 5. AUTOFILTER & FROZEN VIEWS ---
  ws.autoFilter = `A6:${colLetter(lastColIdx)}${lastDataRow}`;
  ws.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: 6,
      topLeftCell: "A7",
      activePane: "bottomLeft",
    },
  ];

  // Write Excel file buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  triggerFileDownload(buffer, buildVenyaFileName());

  return rows.length;
};
