/**
 * Vision LLM Certificate OCR Reader Service (Phase 4 Implementation)
 * Extracts diamond grading attributes from GIA / IGI / HRD certificate image or PDF base64 payloads.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const aiLogger = require("../utils/aiLogger.js");

const OCR_SYSTEM_PROMPT = `
You are an expert diamond certificate OCR reader for ShreeHK ERP.
Your task is to analyze the provided diamond grading certificate image or PDF (GIA, IGI, HRD, EGL, etc.) and extract the precise diamond specifications.

Return ONLY a raw valid JSON object with the following exact keys:
{
  "reportNo": "string or empty",
  "lab": "GIA or IGI or HRD or OTHER",
  "shape": "ROUND or PEAR or OVAL or CUSHION or EMERALD or PRINCESS or RADIANT or MARQUISE or OTHER",
  "pCarat": number or 0,
  "color": "D or E or F or G or H or I or J or K or OTHER",
  "clarity": "FL or IF or VVS1 or VVS2 or VS1 or VS2 or SI1 or SI2 or I1 or I2 or OTHER",
  "cut": "EX or VG or G or F or POOR or empty",
  "polish": "EX or VG or G or F or POOR or empty",
  "symm": "EX or VG or G or F or POOR or empty",
  "floIntensity": "NON or FNT or MED or SL or STG or empty",
  "depthPer": "string or empty",
  "tablePer": "string or empty",
  "measurements": "string or empty"
}

Rules:
- Capitalize shapes, colors, clarities, cut, polish, symm, and fluorescence intensity values.
- Strip all non-JSON text, markdown code blocks, or explanatory commentary.
`;

async function parseCertificateImage(base64Data, mimeType = "image/jpeg") {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY is not configured for Vision OCR.");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  aiLogger.info("CertificateOCR", "Sending certificate scan to Vision LLM...");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
    systemInstruction: OCR_SYSTEM_PROMPT,
  });

  const cleanBase64 = String(base64Data).replace(/^data:image\/\w+;base64,/, "");

  const imagePart = {
    inlineData: {
      data: cleanBase64,
      mimeType: mimeType || "image/jpeg",
    },
  };

  const userPrompt = "Extract all diamond specifications from this certificate image into structured JSON.";

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [imagePart, { text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 600,
    },
  });

  const responseText = result?.response?.text?.() || "{}";
  const durationMs = Date.now() - startTime;

  aiLogger.info("CertificateOCR", `Vision OCR response received (${durationMs}ms)`);

  let parsed = {};
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    parsed = JSON.parse(jsonStr);
  } catch (jsonErr) {
    aiLogger.warn("CertificateOCR", `JSON parse warning: ${jsonErr.message}. Raw output: ${responseText.slice(0, 100)}`);
  }

  const structuredData = {
    reportNo: String(parsed.reportNo || "").trim(),
    lab: String(parsed.lab || "GIA").toUpperCase().trim(),
    shape: String(parsed.shape || "ROUND").toUpperCase().trim(),
    pCarat: Number(parsed.pCarat) || 0,
    color: String(parsed.color || "").toUpperCase().trim(),
    clarity: String(parsed.clarity || "").toUpperCase().trim(),
    cut: String(parsed.cut || "").toUpperCase().trim(),
    polish: String(parsed.polish || "").toUpperCase().trim(),
    symm: String(parsed.symm || "").toUpperCase().trim(),
    floIntensity: String(parsed.floIntensity || "").toUpperCase().trim(),
    depthPer: String(parsed.depthPer || "").trim(),
    tablePer: String(parsed.tablePer || "").trim(),
    measurements: String(parsed.measurements || "").trim(),
  };

  return {
    success: true,
    executionTimeMs: durationMs,
    data: structuredData,
  };
}

module.exports = { parseCertificateImage };
