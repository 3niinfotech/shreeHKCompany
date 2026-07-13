const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_FALLBACKS = [
  ...new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash-lite",
    ].filter(Boolean)
  ),
];

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ maxTokens?: number, temperature?: number }} [options]
 */
async function askAI(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;
  let sawQuota = false;
  let sawOverloaded = false;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      console.log("Calling Gemini model:", modelName);
      console.log(
        "Calling Gemini with key:",
        `${String(apiKey).slice(0, 8)}...`
      );

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 800,
        },
      });

      const text = result?.response?.text?.();
      return text || "No response";
    } catch (err) {
      lastError = err;
      const msg = String(err.message || "");
      const isModelNotFound =
        err.status === 404 ||
        msg.includes("not found") ||
        msg.includes("is not supported");
      const isQuotaExceeded =
        err.status === 429 || msg.toLowerCase().includes("quota");
      const isOverloaded =
        err.status === 503 ||
        msg.toLowerCase().includes("high demand") ||
        msg.toLowerCase().includes("service unavailable");

      if (isQuotaExceeded) sawQuota = true;
      if (isOverloaded) sawOverloaded = true;
      if (!isModelNotFound && !isQuotaExceeded && !isOverloaded) throw err;
    }
  }

  const fail = lastError || new Error("No Gemini model available");
  if (sawQuota) {
    fail.code = "GEMINI_QUOTA_EXCEEDED";
    fail.status = 429;
  } else if (sawOverloaded) {
    fail.code = "GEMINI_OVERLOADED";
    fail.status = 503;
  } else {
    fail.code = "GEMINI_MODEL_NOT_FOUND";
  }
  throw fail;
}

module.exports = { askAI };
