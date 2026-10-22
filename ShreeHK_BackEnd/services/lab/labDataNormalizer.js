const { mapToErpMasters } = require("./labMasterMapper.js");

/**
 * Builds the canonical normalized certificate data model.
 * @param {Object} params
 */
function buildNormalizedCertificate({
  reportNumber,
  lab = "GIA",
  reportDate = null,
  shape = "",
  carat = null,
  color = "",
  fancyColor = null,
  clarity = "",
  cut = null,
  polish = null,
  symmetry = null,
  fluorescence = null,
  measurements = null,
  proportions = null,
  inscriptions = [],
  keyToSymbols = [],
  comments = null,
  origin = null,
  pdfReportUrl = null,
  plotImageUrl = null,
  rawJson = null,
  isMock = false,
}) {
  const repNum = String(reportNumber || "").trim();
  const labUpper = String(lab || "GIA").toUpperCase();

  // Run through ERP master term mappings
  const fluoStr =
    typeof fluorescence === "object" && fluorescence !== null
      ? `${fluorescence.intensity || ""} ${fluorescence.color || ""}`.trim()
      : String(fluorescence || "");

  const measFormatted =
    typeof measurements === "object" && measurements !== null
      ? measurements.formatted || `${measurements.length || ""} x ${measurements.width || ""}${measurements.depth ? ` x ${measurements.depth}` : ""}`
      : String(measurements || "");

  const { mapped: erpMapped, unmapped } = mapToErpMasters({
    shape,
    color,
    fancyColor,
    clarity,
    cut,
    polish,
    symmetry,
    fluorescence: fluoStr,
    measurements: measFormatted,
    girdle: proportions?.girdle || "",
    tablePercent: proportions?.tablePercent ?? null,
    depthPercent: proportions?.depthPercent ?? null,
    carat,
  });

  return {
    reportNumber: repNum,
    lab: labUpper,
    reportDate: reportDate || null,
    shape: erpMapped.shape || shape,
    carat: erpMapped.carat ?? carat,
    color: erpMapped.color || color,
    fancyColor: fancyColor || null,
    clarity: erpMapped.clarity || clarity,
    cut: erpMapped.cut || cut,
    polish: erpMapped.polish || polish,
    symmetry: erpMapped.symmentry || symmetry,
    fluorescence: {
      intensity: erpMapped.f_intensity || "NONE",
      color: fluorescence?.color || null,
    },
    measurements: {
      length: measurements?.length ?? null,
      width: measurements?.width ?? null,
      depth: measurements?.depth ?? null,
      formatted: erpMapped.mesurment || measFormatted,
    },
    proportions: {
      tablePercent: erpMapped.table_pc,
      depthPercent: erpMapped.depth_pc,
      girdle: erpMapped.gridle || proportions?.girdle || null,
      culet: proportions?.culet || null,
      crownAngle: proportions?.crownAngle ?? null,
      crownHeight: proportions?.crownHeight ?? null,
      pavilionAngle: proportions?.pavilionAngle ?? null,
      pavilionDepth: proportions?.pavilionDepth ?? null,
      starLength: proportions?.starLength ?? null,
      lowerHalf: proportions?.lowerHalf ?? null,
    },
    inscriptions: Array.isArray(inscriptions) ? inscriptions : inscriptions ? [String(inscriptions)] : [],
    keyToSymbols: Array.isArray(keyToSymbols) ? keyToSymbols : keyToSymbols ? [String(keyToSymbols)] : [],
    comments: comments || null,
    origin: origin || null,
    pdfReportUrl: pdfReportUrl || null,
    plotImageUrl: plotImageUrl || null,
    unmappedFields: unmapped,
    erpMapped: {
      report_no: repNum,
      lab: labUpper,
      shape: erpMapped.shape,
      color: erpMapped.color,
      clarity: erpMapped.clarity,
      cut: erpMapped.cut,
      polish: erpMapped.polish,
      symmentry: erpMapped.symmentry,
      f_intensity: erpMapped.f_intensity,
      table_pc: erpMapped.table_pc,
      depth_pc: erpMapped.depth_pc,
      mesurment: erpMapped.mesurment,
      gridle: erpMapped.gridle,
      carat: erpMapped.carat,
    },
    isMock: Boolean(isMock),
    verifiedAt: new Date().toISOString(),
    rawJson,
  };
}

module.exports = {
  buildNormalizedCertificate,
};
