const express = require("express");
const BulkModel = require("./bulkModel.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");

const bulkRouter = express.Router();
bulkRouter.use(express.json({ limit: "20mb" }));

const ALLOWED_FIELDS = ["fn", "import", "type", "fileName", "fileContent"];
const IMPORT_FIELD = "import";
const ALLOWED_TYPES = [
  "price",
  "location",
  "intensity",
  "package",
  "sku",
  "shape",
  "gia",
  "rap_price",
  "group",
  "sku-pair",
  "bgm-eyeclean",
  "category",
  "remark",
  "argyle",
  "mining",
  "csv-gia",
];

function hasOnlyAllowedFields(payload) {
  const keys = Object.keys(payload);
  return keys.every((key) => ALLOWED_FIELDS.includes(key));
}

function hasAllRequiredFields(payload) {
  return ALLOWED_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(payload, field));
}

function normalizeFileContent(value) {
  if (value === undefined || value === null) return "";
  const raw = String(value);
  return raw.includes(",") ? raw.split(",").pop() || "" : raw;
}

async function bulkUploadHandler(req, res) {
  try {
    const payload = req.body || {};

    if (!hasOnlyAllowedFields(payload) || !hasAllRequiredFields(payload)) {
      return res.status(400).json({ error: 1, message: "Invalid request." });
    }

    if (payload.fn !== "save" || payload[IMPORT_FIELD] !== "import") {
      return res.status(400).json({ error: 1, message: "Invalid request." });
    }

    if (!ALLOWED_TYPES.includes(String(payload.type || "").trim())) {
      return res.status(400).json({ error: 1, message: "Invalid request." });
    }

    const normalizedFileContent = normalizeFileContent(payload.fileContent);
    if (!normalizedFileContent.trim()) {
      return res.status(400).json({ error: 1, message: "No file selected!! Please Select file. <br />" });
    }

    const fileBuffer = Buffer.from(normalizedFileContent, "base64");
    if (!fileBuffer.length) {
      return res.status(400).json({ error: 1, message: "Invalid file data." });
    }

    const model = new BulkModel(buildUserContext(req).companyId);
    const result = await model.importData(payload.type, fileBuffer);

    const isSuccess =
      result === 1 ||
      (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "affectedRows"));

    if (isSuccess) {
      return res.status(200).json({ error: 0, message: "Import Successfully !!!" });
    }

    const failMessage = typeof result === "string" ? result : "Import failed.";
    return res.status(200).json({ error: 1, message: failMessage });
  } catch (error) {
    return res.status(500).json({ error: 1, message: error.message });
  }
}

bulkRouter.post("/bulk-update", authenticateToken, bulkUploadHandler);

module.exports = bulkRouter;
