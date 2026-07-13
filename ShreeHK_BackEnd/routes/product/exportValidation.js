const parseIds = (body = {}) => {
  if (Array.isArray(body.ids)) {
    return body.ids;
  }
  if (typeof body.exportProducts === "string" && body.exportProducts.trim()) {
    return body.exportProducts.split(",");
  }
  return [];
};

const validateExportBody = (body = {}) => {
  const ids = parseIds(body)
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!ids.length) {
    return { ok: false, message: "Please Select Item" };
  }

  const rawName = String(body.fileName || "Defult_Stock_List").trim() || "Defult_Stock_List";
  const fileName = rawName.replace(/[\\/:*?"<>|]+/g, "_");
  const rawSheet = String(body.sheetName || "Stock List").trim() || "Stock List";
  const sheetName = rawSheet.slice(0, 31);

  return {
    ok: true,
    ids,
    fileName,
    sheetName,
  };
};

module.exports = {
  validateExportBody,
};
