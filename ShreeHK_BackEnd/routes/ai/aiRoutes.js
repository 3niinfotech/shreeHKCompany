const express = require("express");
const { authenticateToken } = require("../../authMiddleware.js");
const { askAI } = require("../../utils/gemini.js");
const aiData = require("../../services/ai/aiDataService.js");
const aiBrain = require("../../services/ai/aiBrainService.js");
const aiPromptBuilder = require("../../services/ai/aiPromptBuilder.js");

const aiRouter = express.Router();
aiRouter.use(express.json());

const handleAiError = (res, err) => {
  console.error("AI error:", err);
  if (err.code === "GEMINI_NOT_CONFIGURED") {
    return res.status(503).json({
      success: false,
      message: "AI is not configured. Set GEMINI_API_KEY in backend .env",
    });
  }
  if (err.code === "GEMINI_QUOTA_EXCEEDED" || err.status === 429 || String(err.message || "").toLowerCase().includes("quota")) {
    const retryMatch = String(err.message || "").match(/retry in ([\d.]+)s/i);
    const retrySec = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
    const hint =
      String(err.message || "").includes("limit: 0")
        ? " Free tier quota is 0 — check https://ai.dev/rate-limit or enable billing on Google Cloud."
        : "";
    return res.status(429).json({
      success: false,
      message: retrySec
        ? `Gemini quota full. Wait ${retrySec} seconds and try again.${hint}`
        : `Gemini quota full. Wait a few minutes or check https://ai.dev/rate-limit.${hint}`,
    });
  }
  if (err.code === "GEMINI_MODEL_NOT_FOUND" || err.status === 404) {
    return res.status(503).json({
      success: false,
      message:
        "No Gemini model available for your API key. Set GEMINI_MODEL=gemini-2.5-flash in backend .env.",
    });
  }
  if (
    err.code === "GEMINI_OVERLOADED" ||
    err.status === 503 ||
    String(err.message || "").toLowerCase().includes("high demand")
  ) {
    return res.status(503).json({
      success: false,
      message: "Gemini is busy (high demand). Please try again in a few seconds.",
    });
  }
  if (err.status === 401 || err.message?.includes("API key not valid")) {
    return res.status(401).json({
      success: false,
      message: "Invalid Gemini API key. Get a key from Google AI Studio.",
    });
  }
  if (err.code === "ER_BAD_FIELD_ERROR" || err.code === "ER_NO_SUCH_TABLE") {
    return res.status(500).json({
      success: false,
      message: "Database query failed for AI context",
    });
  }
  return res.status(500).json({ success: false, message: "AI unavailable, try again" });
};

aiRouter.post("/stock-alert", authenticateToken, async (req, res) => {
  try {
    const inventory = await aiData.getStockAlertContext();
    const systemPrompt =
      "Diamond inventory expert for Shreehk ERP. Natural Hinglish. Analyze data and give low-stock alerts + reorder tips. Conversational, not robotic.";
    const userPrompt = `Inventory data: ${JSON.stringify(inventory)}. Low stock alerts aur reorder suggestions do.`;
    const result = await askAI(systemPrompt, userPrompt, { maxTokens: 450, temperature: 0.7 });
    res.json({ success: true, data: result });
  } catch (err) {
    handleAiError(res, err);
  }
});

aiRouter.post("/price-suggest", authenticateToken, async (req, res) => {
  try {
    const { shape, carat, color, clarity, purchasePrice } = req.body || {};
    const systemPrompt =
      "Tu ek diamond pricing expert hai India market ka. Natural Hinglish mein reasoning ke saath jawab do.";
    const userPrompt = `${shape || "N/A"} ${carat || "N/A"}ct ${color || "N/A"} ${clarity || "N/A"} diamond ka India mein selling price kya hona chahiye? Purchase price tha ₹${purchasePrice ?? "N/A"}/ct. Range aur reasoning do.`;
    const result = await askAI(systemPrompt, userPrompt, { temperature: 0.7 });
    res.json({ success: true, data: result });
  } catch (err) {
    handleAiError(res, err);
  }
});

aiRouter.post("/sales-report", authenticateToken, async (req, res) => {
  try {
    let salesData = req.body?.salesData;
    if (!salesData || (Array.isArray(salesData) && salesData.length === 0)) {
      salesData = await aiData.getSalesLast30Days();
    }
    const systemPrompt =
      "Tu ek business analyst hai diamond industry ka. Natural Hinglish report likho.";
    const userPrompt = `Sales data: ${JSON.stringify(salesData)}. Monthly business report — trends, top performers, slow movers, 3 actionable tips.`;
    const result = await askAI(systemPrompt, userPrompt, { maxTokens: 500, temperature: 0.7 });
    res.json({ success: true, data: result });
  } catch (err) {
    handleAiError(res, err);
  }
});

aiRouter.post("/customer-insight", authenticateToken, async (req, res) => {
  try {
    const { customerId, purchaseHistory, preferences } = req.body || {};
    let historyPayload = purchaseHistory;
    let partyInfo = null;

    if (customerId) {
      const loaded = await aiData.getPartyPurchaseHistory(customerId);
      partyInfo = loaded.party;
      if (!historyPayload || (Array.isArray(historyPayload) && historyPayload.length === 0)) {
        historyPayload = loaded.sales;
      }
    }

    const systemPrompt =
      "Tu ek experienced diamond salesperson hai. Natural Hinglish mein customer ko samajh kar suggest karo.";
    const userPrompt = `Customer data: ${JSON.stringify({
      party: partyInfo,
      purchaseHistory: historyPayload,
      preferences,
    })}. Is customer ko kaunse diamonds dikhane chahiye aur kyun? 3 personalized suggestions.`;
    const result = await askAI(systemPrompt, userPrompt, { temperature: 0.7 });
    res.json({ success: true, data: result });
  } catch (err) {
    handleAiError(res, err);
  }
});

aiRouter.post("/chat", authenticateToken, async (req, res) => {
  const { message, threadId = "default" } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: "message is required" });
  }

  try {
    const outcome = await executeAgentQuery(req, message, threadId);
    res.json(outcome);
  } catch (err) {
    handleAiError(res, err);
  }
});

aiRouter.post("/barcode-lookup", authenticateToken, async (req, res) => {
  try {
    const { barcodeData } = req.body || {};
    const dbMatches = await aiData.lookupProductByBarcode(barcodeData);

    const systemPrompt =
      "Diamond inventory barcode expert. Natural Hinglish. Explain best match from database results clearly.";
    const userPrompt = `Scanned: ${JSON.stringify(barcodeData)}. Database matches: ${JSON.stringify(dbMatches)}. Best match identify karo aur details explain karo.`;
    const result = await askAI(systemPrompt, userPrompt, { temperature: 0.6 });

    res.json({
      success: true,
      data: result,
      matches: dbMatches,
    });
    logger.info(`[AI Barcode Lookup] Result: ${result}`);
  } catch (err) {
    handleAiError(res, err);
  }
});

// Phase 1: AI Agent Gateway & Orchestrator Core Endpoint
const { executeAgentQuery } = require("../../services/ai/orchestrator/agentOrchestrator.js");

aiRouter.post("/agent/query", authenticateToken, async (req, res) => {
  const { message, threadId = "default" } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: "message is required" });
  }

  try {
    const outcome = await executeAgentQuery(req, message, threadId);
    res.json(outcome);
  } catch (err) {
    handleAiError(res, err, "AgentOrchestration");
  }
});

// Phase 4: GIA / IGI / HRD Certificate OCR Reader Endpoint
const { parseCertificateImage } = require("../../services/ai/ocr/certificateOcrService.js");

aiRouter.post("/ocr/certificate", authenticateToken, async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: "imageBase64 is required" });
  }

  try {
    const outcome = await parseCertificateImage(imageBase64, mimeType);
    res.json(outcome);
  } catch (err) {
    handleAiError(res, err, "CertificateOCR");
  }
});

// Phase 5: DB-Backed Conversation Thread Management Endpoints
const conversationDbManager = require("../../services/ai/memory/conversationDbManager.js");

aiRouter.get("/threads", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id || 0;
    const companyId = req.user?.companyId || req.companyId || 1;
    const threads = await conversationDbManager.getUserThreads(userId, companyId);
    res.json({ success: true, threads });
  } catch (err) {
    handleAiError(res, err, "ThreadList");
  }
});

aiRouter.get("/threads/:threadId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id || 0;
    const companyId = req.user?.companyId || req.companyId || 1;
    const threadId = req.params.threadId;
    const history = await conversationDbManager.getConversationHistory(userId, companyId, threadId);
    res.json({ success: true, threadId, history });
  } catch (err) {
    handleAiError(res, err, "ThreadGet");
  }
});

aiRouter.delete("/threads/:threadId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id || 0;
    const companyId = req.user?.companyId || req.companyId || 1;
    const threadId = req.params.threadId;
    const deleted = await conversationDbManager.deleteThread(userId, companyId, threadId);
    res.json({ success: deleted });
  } catch (err) {
    handleAiError(res, err, "ThreadDelete");
  }
});

module.exports = aiRouter;



