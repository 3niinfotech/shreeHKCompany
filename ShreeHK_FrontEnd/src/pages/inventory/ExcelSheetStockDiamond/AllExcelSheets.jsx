/**
 * exportDiamondExcel.js
 * ─────────────────────────────────────────────────────────────
 * Common Diamond Inventory Excel Export Utility
 * Requires: xlsx-js-style  →  npm install xlsx-js-style
 *
 * Usage in any component:
 *   import { exportDiamondExcel } from "../../utils/exportDiamondExcel";
 *
 *   exportDiamondExcel({
 *     data        : tableData,
 *     selectedKeys: selectedRowKeys,   // [] = export all
 *     filePrefix  : "Defult_Stock_List",
 *     sheetName   : "Stock List",
 *     onSuccess   : (msg) => toastSuccess(msg),
 *     onError     : (msg) => toastWarning(msg),
 *   });
 * ─────────────────────────────────────────────────────────────
 */
// ── Exact colors from the original Excel layout ─────────────────
const HEADER_BG = "1D3557";  // Navy Blue  — header background
const HEADER_FG = "FFFFFF";  // White      — header text
const ROW_ODD_BG = "F0F4FF";  // Light Blue — odd data rows
const ROW_EVEN_BG = "FFFFFF";  // White      — even data rows
const BORDER_CLR = "CCCCCC";  // Light Gray — all borders

// ── 30 headers in exact order ───────────────────────────────────
const HEADERS = [
  "No", "MFG Code", "SKU", "Lab", "Shape", "Crt.", "Color", "Clarity",
  "In-House Clarity", "Intensity", "Overtone", "Cut", "Pol.", "Sym.", "Flour.",
  "Meas.", "Table%", "Depth%", "Girdle", "Rap Price", "Price/Crt", "Amount",
  "BGM", "Eye Clean", "Location", "Package", "Main Group", "Sub Group",
  "Cert #", "Remark",
];

// ── Column widths (character width) ─────────────────────────────
const COL_WIDTHS = [
  5, 12, 10, 7, 18, 7, 8, 8, 14, 14,
  10, 6, 6, 6, 7, 16, 8, 8, 8, 10,
  10, 10, 7, 10, 10, 10, 12, 12, 14, 12,
];

// ── Thin border object ───────────────────────────────────────────
const makeBorder = () => ({
  top: { style: "thin", color: { rgb: BORDER_CLR } },
  bottom: { style: "thin", color: { rgb: BORDER_CLR } },
  left: { style: "thin", color: { rgb: BORDER_CLR } },
  right: { style: "thin", color: { rgb: BORDER_CLR } },
});

// ── Build one styled cell ────────────────────────────────────────
const makeCell = (value, isHeader, isOddRow) => {
  const bg = isHeader ? HEADER_BG : (isOddRow ? ROW_ODD_BG : ROW_EVEN_BG);
  const fg = isHeader ? HEADER_FG : "000000";
  return {
    v: value ?? "",
    t: typeof value === "number" ? "n" : "s",
    s: {
      font: {
        name: "Arial",
        sz: 10,
        bold: isHeader,
        color: { rgb: fg },
      },
      fill: {
        patternType: "solid",
        fgColor: { rgb: bg },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: isHeader,
      },
      border: makeBorder(),
    },
  };
};

// ── Map one data object → 30-value array (matches HEADERS order) ─
const mapToRow = (item) => [
  item.no ?? "",
  item.mfgCode ?? "",
  item.sku ?? "",
  item.lab ?? "",
  item.shape ?? "",
  item.polishCarat ?? "",
  item.color ?? "",
  item.clarity ?? "",
  item.mainClarity ?? "",
  item.intensity ?? "",
  item.overTone ?? "",
  item.cut ?? "",
  item.polish ?? "",
  item.symmetry ?? "",
  item.fluorescence ?? "",
  item.measurement ?? "",
  item.table ?? "",
  item.depth ?? "",
  item.girdle ?? "",
  item.rapPrice ?? "",
  item.price ?? "",
  item.amount ?? "",
  item.bgm ?? "",
  item.eyeClean ?? "",
  item.location ?? "",
  item.package ?? "",
  item.group ?? "",
  item.subGroup ?? "",
  item.certificate ?? "",
  item.remark ?? "",
];

// ── Main export function ─────────────────────────────────────────
export const exportDiamondExcel = async ({
  data = [],
  selectedKeys = [],
  filePrefix = "Defult_Stock_List",
  sheetName = "Stock List",
  onSuccess = () => { },
  onError = () => { },
}) => {
  const XLSXModule = await import("xlsx-js-style");
  const XLSX = XLSXModule.default;

  // 1. Decide which rows to export
  const exportData =
    selectedKeys.length > 0
      ? data.filter((i) => selectedKeys.includes(i.id))
      : data;

  if (exportData.length === 0) {
    onError("No data to export.");
    return;
  }

  // 2. Build worksheet cell-by-cell for full style control
  const ws = {};

  // Header row → Excel row 1 (r=0)
  HEADERS.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = makeCell(h, true, false);
  });

  // Data rows → Excel rows 2+ (r=1,2,3…)
  exportData.forEach((item, rowIdx) => {
    const values = mapToRow(item);
    const isOdd = rowIdx % 2 === 0; // 0,2,4… = light-blue rows
    values.forEach((val, c) => {
      ws[XLSX.utils.encode_cell({ r: rowIdx + 1, c })] = makeCell(val, false, isOdd);
    });
  });

  // Worksheet range
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: exportData.length, c: HEADERS.length - 1 },
  });

  // Column widths
  ws["!cols"] = COL_WIDTHS.map((w) => ({ wch: w }));

  // Row heights — header 35pt, data rows 18pt
  ws["!rows"] = [{ hpt: 35 }];
  exportData.forEach((_, i) => { ws["!rows"][i + 1] = { hpt: 18 }; });

  // Freeze header row
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
  };

  // 3. Build workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 4. Generate filename  e.g. Defult_Stock_List_31032026.xlsx
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const fileName = `${filePrefix}_${dd}${mm}${yyyy}.xlsx`;

  // 5. Trigger browser download
  XLSX.writeFile(wb, fileName);
  onSuccess(`Exported ${exportData.length} records → ${fileName}`);
};