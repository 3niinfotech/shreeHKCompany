/**
 * Maps lab grading terminology to ShreeHK ERP master standards.
 * Accounts for specific database column namings:
 * - symmentry (double m)
 * - mesurment (no e)
 * - gridle
 */

const SHAPE_MAP = {
  round: "ROUND",
  "round brilliant": "ROUND",
  princess: "PRINCESS",
  "square modified brilliant": "PRINCESS",
  cushion: "CUSHION",
  "cushion modified": "CUSHION MODIFIED",
  "cushion modified brilliant": "CUSHION MODIFIED",
  "cushion brilliant": "CUSHION",
  "cushion rose cut": "ROSE",
  emerald: "EMERALD",
  "emerald cut": "EMERALD",
  asscher: "ASSCHER",
  "square emerald cut": "ASSCHER",
  radiant: "RADIANT",
  "cut-cornered rectangular modified": "RADIANT",
  "cut-cornered rectangular modified brilliant": "RADIANT",
  "cut-cornered square modified brilliant": "RADIANT",
  pear: "PEAR",
  "pear brilliant": "PEAR",
  "pear modified brilliant": "PEAR",
  oval: "OVAL",
  "oval brilliant": "OVAL",
  "oval modified brilliant": "OVAL",
  marquise: "MARQUISE",
  "marquise brilliant": "MARQUISE",
  "marquise modified brilliant": "MARQUISE",
  heart: "HEART",
  "heart brilliant": "HEART",
  "heart modified brilliant": "HEART",
  rose: "ROSE",
  baguette: "BAGUETTE",
};

const GRADE_ABBR_MAP = {
  excellent: "EX",
  "very good": "VG",
  good: "GD",
  fair: "FR",
  poor: "PR",
  ideal: "ID",
  ex: "EX",
  vg: "VG",
  gd: "GD",
  fr: "FR",
  pr: "PR",
  id: "ID",
};

const FLUORESCENCE_MAP = {
  none: "NONE",
  nil: "NONE",
  faint: "FAINT",
  slight: "FAINT",
  medium: "MEDIUM",
  "medium blue": "MEDIUM BLUE",
  "medium yellow": "MEDIUM YELLOW",
  strong: "STRONG",
  "strong blue": "STRONG BLUE",
  "strong yellow": "STRONG YELLOW",
  "very strong": "VERY STRONG",
  "very strong blue": "VERY STRONG BLUE",
};

const CLARITY_STANDARDS = new Set([
  "FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "SI3", "I1", "I2", "I3"
]);

const COLOR_STANDARDS = new Set([
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
  "O-P", "Q-R", "S-T", "U-V", "W-X", "Y-Z"
]);

function cleanText(val) {
  if (val == null) return "";
  return String(val).trim().replace(/\s+/g, " ");
}

/**
 * Maps raw lab grading values into ERP master values and flags unmapped terms
 * @param {Object} raw 
 * @returns {{ mapped: Object, unmapped: Object }}
 */
function mapToErpMasters(input = {}) {
  const unmapped = {};
  const mapped = {};

  // 1. Shape
  const rawShape = cleanText(input.shape);
  const shapeKey = rawShape.toLowerCase().replace(/~/g, " ").trim();
  if (shapeKey) {
    if (SHAPE_MAP[shapeKey]) {
      mapped.shape = SHAPE_MAP[shapeKey];
    } else {
      mapped.shape = rawShape.toUpperCase();
      unmapped.shape = { original: rawShape, reason: "Shape not in standard map" };
    }
  } else {
    mapped.shape = "";
  }

  // 2. Color (D-Z or Fancy)
  const rawColor = cleanText(input.color).toUpperCase();
  if (rawColor) {
    if (COLOR_STANDARDS.has(rawColor)) {
      mapped.color = rawColor;
    } else if (rawColor.includes("FANCY") || input.fancyColor) {
      mapped.color = rawColor;
      mapped.isFancy = true;
    } else {
      mapped.color = rawColor;
      unmapped.color = { original: rawColor, reason: "Non-standard color term" };
    }
  } else {
    mapped.color = "";
  }

  // 3. Clarity
  const rawClarity = cleanText(input.clarity).toUpperCase();
  if (rawClarity) {
    if (CLARITY_STANDARDS.has(rawClarity)) {
      mapped.clarity = rawClarity;
    } else {
      mapped.clarity = rawClarity;
      unmapped.clarity = { original: rawClarity, reason: "Clarity not in standard master" };
    }
  } else {
    mapped.clarity = "";
  }

  // 4. Cut
  const rawCut = cleanText(input.cut).toLowerCase();
  mapped.cut = GRADE_ABBR_MAP[rawCut] || (rawCut ? rawCut.toUpperCase() : "");

  // 5. Polish
  const rawPolish = cleanText(input.polish).toLowerCase();
  mapped.polish = GRADE_ABBR_MAP[rawPolish] || (rawPolish ? rawPolish.toUpperCase() : "");

  // 6. Symmetry (maps to 'symmentry' in DB)
  const rawSym = cleanText(input.symmetry).toLowerCase();
  mapped.symmentry = GRADE_ABBR_MAP[rawSym] || (rawSym ? rawSym.toUpperCase() : "");

  // 7. Fluorescence intensity (maps to 'f_intensity' in DB)
  const rawFluo = cleanText(input.fluorescence).toLowerCase();
  mapped.f_intensity = FLUORESCENCE_MAP[rawFluo] || (rawFluo ? rawFluo.toUpperCase() : "NONE");

  // 8. Measurements (maps to 'mesurment' in DB)
  let rawMeas = cleanText(input.measurements);
  if (!rawMeas && input.length && input.width) {
    rawMeas = `${input.length} x ${input.width}${input.depth ? ` x ${input.depth}` : ""} mm`;
  }
  mapped.mesurment = rawMeas.replace(/mm/gi, "").trim();

  // 9. Girdle (maps to 'gridle' in DB)
  mapped.gridle = cleanText(input.girdle);

  // 10. Table & Depth % (table_pc, depth_pc)
  mapped.table_pc = input.tablePercent != null && !isNaN(Number(input.tablePercent))
    ? Number(Number(input.tablePercent).toFixed(2))
    : null;
  mapped.depth_pc = input.depthPercent != null && !isNaN(Number(input.depthPercent))
    ? Number(Number(input.depthPercent).toFixed(2))
    : null;

  // 11. Carat
  mapped.carat = input.carat != null && !isNaN(Number(input.carat))
    ? Number(Number(input.carat).toFixed(3))
    : null;

  return { mapped, unmapped };
}

module.exports = {
  mapToErpMasters,
  SHAPE_MAP,
  GRADE_ABBR_MAP,
  FLUORESCENCE_MAP,
};
