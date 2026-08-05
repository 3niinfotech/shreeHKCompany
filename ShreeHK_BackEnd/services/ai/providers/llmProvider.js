/**
 * LLM Provider Abstraction Core
 * Unified LLM interface wrapping Groq SDK and Google Gemini SDK with primary & fallback execution.
 */

const { askAI: askGemini } = require("../../../utils/gemini.js");
const { askAI: askGroq } = require("../../../utils/groq.js");
const aiLogger = require("../utils/aiLogger.js");

const PREFERRED_PROVIDER = process.env.AI_PROVIDER || "groq"; // "groq" or "gemini"

async function generateCompletion(systemPrompt, userPrompt, options = {}) {
  let primaryErr = null;

  if (PREFERRED_PROVIDER === "groq") {
    try {
      aiLogger.debug("LLMProvider", "Attempting primary completion via Groq...");
      const result = await askGroq(systemPrompt, userPrompt, options);
      return { provider: "groq", text: result };
    } catch (err) {
      primaryErr = err;
      aiLogger.warn("LLMProvider", `Groq completion failed (${err.message}). Falling back to Gemini...`);
    }
  }

  try {
    aiLogger.debug("LLMProvider", "Attempting completion via Gemini...");
    const result = await askGemini(systemPrompt, userPrompt, options);
    return { provider: "gemini", text: result };
  } catch (geminiErr) {
    aiLogger.error("LLMProvider", `Gemini completion failed: ${geminiErr.message}`);
    const err = primaryErr || geminiErr;
    err.code = err.code || "LLM_PROVIDER_FAILED";
    throw err;
  }
}

module.exports = { generateCompletion };
