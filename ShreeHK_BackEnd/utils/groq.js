const Groq = require("groq-sdk");

let groqClient = null;

const getClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("GROQ_API_KEY is not configured");
    err.code = "GROQ_NOT_CONFIGURED";
    throw err;
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ maxTokens?: number, temperature?: number }} [options]
 */
async function askAI(systemPrompt, userPrompt, options = {}) {
  const groq = getClient();
  const chat = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 800,
  });
  return chat.choices[0]?.message?.content || "No response";
}

module.exports = { askAI };
