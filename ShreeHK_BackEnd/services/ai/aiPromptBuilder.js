/**
 * Builds Gemini prompts with injected live database context.
 */

function detectLanguageHint(message) {
  const q = String(message || "");
  if (/[\u0900-\u097F]/.test(q)) return "Respond in Hinglish (Hindi + English mix) matching the user's tone.";
  if (/\b(kya|kitne|kitna|kaun|batao|hai|hain|mujhe|aap)\b/i.test(q)) {
    return "Respond in Hinglish (Hindi + English mix) matching the user's tone.";
  }
  return "Respond in the same language the user used (English or Hinglish).";
}

/**
 * @param {{ message: string, conversationHistory?: Array, dbContext: object }} params
 */
function buildChatPrompt({ message, conversationHistory = [], dbContext }) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const historyText = (Array.isArray(conversationHistory) ? conversationHistory : [])
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are Shreehk Diamond ERP AI assistant with access to LIVE MySQL database snapshots.

Today's date: ${today}

CRITICAL RULES:
1. Answer ONLY using the REAL DATABASE DATA provided below. Never invent counts, names, SKUs, emails, or amounts.
2. If the answer is not in the data, say clearly: "Yeh data available nahi hai" (or in English if user wrote in English).
3. Never reveal passwords, tokens, OTP, or any sensitive fields (they are already excluded from data).
4. ${detectLanguageHint(message)}
5. Use numbered lists when listing multiple items (users, orders, stones, parties).
6. For totals, use table_counts or entity.total values exactly as provided.
7. inventory_on_hand = current on-hand stock (not sold/outward). Explain if user asks inventory vs all products.
8. Be conversational and helpful like a smart colleague — not robotic.

LIVE DATABASE DATA (JSON):
${JSON.stringify(dbContext)}`;

  const userPrompt = historyText
    ? `${historyText}\nuser: ${message}`
    : String(message);

  return { systemPrompt, userPrompt };
}

module.exports = { buildChatPrompt };
