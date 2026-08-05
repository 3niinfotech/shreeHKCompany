/**
 * Centralized AI Error Handling Utility
 * Normalizes error outputs, status codes, and user-friendly messages for AI requests.
 */

const aiLogger = require("./aiLogger.js");

function handleAiError(res, err, context = "General") {
  aiLogger.error("ErrorHandler", `Error in AI context [${context}]: ${err.message}`, {
    code: err.code,
    status: err.status,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  if (err.code === "AI_NOT_CONFIGURED" || err.code === "GEMINI_NOT_CONFIGURED" || err.code === "GROQ_NOT_CONFIGURED") {
    return res.status(503).json({
      success: false,
      code: "AI_CONFIG_ERROR",
      message: "AI engine is not fully configured. Please set AI API keys in backend environment.",
    });
  }

  if (err.status === 429 || err.code === "GEMINI_QUOTA_EXCEEDED" || String(err.message || "").toLowerCase().includes("quota")) {
    return res.status(429).json({
      success: false,
      code: "AI_QUOTA_EXCEEDED",
      message: "AI request rate limit reached. Please wait a moment before trying again.",
    });
  }

  if (err.status === 401 || String(err.message || "").includes("API key")) {
    return res.status(401).json({
      success: false,
      code: "AI_AUTH_ERROR",
      message: "Invalid or unauthorized AI API credentials.",
    });
  }

  if (err.code === "INVALID_AI_INPUT") {
    return res.status(400).json({
      success: false,
      code: "INVALID_INPUT",
      message: err.message || "Invalid input provided for AI execution.",
    });
  }

  return res.status(500).json({
    success: false,
    code: "AI_INTERNAL_ERROR",
    message: "An error occurred while processing the AI request.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
}

module.exports = { handleAiError };
