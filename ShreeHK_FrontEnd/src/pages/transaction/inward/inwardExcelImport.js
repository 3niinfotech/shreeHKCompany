import { loadXlsx } from "../../../utils/loadXlsx";

const NUMBER_FIELDS = new Set([
  "rPcs", "pPcs", "pCarat", "cost", "price", "amount", "tablePer", "depthPer",
]);

const HEADER_TO_FIELD = {
  "mfg.code": "mfgCode",
  "mfg code": "mfgCode",
  "mfgcode": "mfgCode",
  "d.no.": "dNo",
  "d.no": "dNo",
  "dno": "dNo",
  "sku": "sku",
  "r.pcs": "rPcs",
  "r pcs": "rPcs",
  "rpcs": "rPcs",
  "p.pcs": "pPcs",
  "p pcs": "pPcs",
  "ppcs": "pPcs",
  "p.carat": "pCarat",
  "p carat": "pCarat",
  "pcarat": "pCarat",
  "cost": "cost",
  "price": "price",
  "amount": "amount",
  "main color": "mainColor",
  "maincolor": "mainColor",
  "loc": "loc",
  "location": "loc",
  "lab": "lab",
  "report no": "reportNo",
  "reportno": "reportNo",
  "shape": "shape",
  "clarity": "clarity",
  "intensity": "intensity",
  "overtone": "overtone",
  "color": "color",
  "size": "size",
  "polish": "polish",
  "symm": "symm",
  "symmetry": "symm",
  "cut": "cut",
  "flo. intenser": "floIntensity",
  "flo intenser": "floIntensity",
  "flo intensity": "floIntensity",
  "fluorescence": "floIntensity",
  "measurements": "measurements",
  "measurment": "measurements",
  "table%": "tablePer",
  "table": "tablePer",
  "depth%": "depthPer",
  "depth": "depthPer",
  "girdle": "girdle",
  "gridle": "girdle",
  "bgm": "bgm",
  "remark": "remark",
  "group type": "groupType",
  "grouptype": "groupType",
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveField(header) {
  const key = normalizeHeader(header);
  return HEADER_TO_FIELD[key] || null;
}

function parseCellValue(field, value) {
  if (NUMBER_FIELDS.has(field)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return value == null ? "" : String(value).trim();
}

function rowHasData(row) {
  return row.some((cell) => String(cell ?? "").trim() !== "");
}

function mapRowToLineItem(cells, fieldIndexes) {
  const item = {};
  fieldIndexes.forEach(({ field, index }) => {
    item[field] = parseCellValue(field, cells[index]);
  });
  return item;
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read Excel file."));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseInwardImportExcel(file) {
  if (!file) throw new Error("Please select an Excel file.");

  const buffer = await readFileAsArrayBuffer(file);
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets.");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  if (!rows.length) throw new Error("Excel file is empty.");

  const headerRow = rows[0].map((cell) => String(cell ?? "").trim());
  const fieldIndexes = headerRow
    .map((header, index) => ({ header, index, field: resolveField(header) }))
    .filter((entry) => entry.field);

  if (!fieldIndexes.some((entry) => entry.field === "sku")) {
    throw new Error("Excel must include a Sku column (Import Format template).");
  }

  const lineItems = [];
  rows.slice(1).forEach((cells) => {
    if (!rowHasData(cells)) return;
    lineItems.push(mapRowToLineItem(cells, fieldIndexes));
  });

  if (!lineItems.length) {
    throw new Error("No data rows found in Excel file.");
  }

  return lineItems;
}
