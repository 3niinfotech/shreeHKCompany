const parseIds = (body = {}) => {
  if (Array.isArray(body.ids)) {
    return body.ids;
  }
  if (typeof body.exportProducts === "string" && body.exportProducts.trim()) {
    return body.exportProducts.split(",");
  }
  return [];
};

const validateIExportBody = (body = {}) => {
  const ids = parseIds(body)
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!ids.length) {
    return { ok: false, message: "Please Select Item" };
  }

  const format = String(body.format || "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
  const rawName = String(body.fileName || "Import_Format").trim() || "Import_Format";
  const fileName = rawName.replace(/[\\/:*?"<>|]+/g, "_");

  return {
    ok: true,
    ids,
    format,
    fileName,
  };
};

module.exports = {
  validateIExportBody,
};
