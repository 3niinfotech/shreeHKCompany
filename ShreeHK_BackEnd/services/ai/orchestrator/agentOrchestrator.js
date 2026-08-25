/**
 * Agent Orchestrator Core (Phase 1 & Phase 2 Zero Hallucination Engine)
 * Orchestrates the dynamic 2-pass tool execution loop:
 * Context -> Tool Selection -> Live MySQL Query Execution -> Real Result Verification -> Natural Language Output
 */

const { buildRequestContext } = require("../context/aiContextBuilder.js");
const { getConversationHistory, appendTurn } = require("../memory/conversationDbManager.js");
const { buildAgentPrompt } = require("../prompts/promptBuilder.js");
const { getRegisteredToolSchemas, executeTool } = require("../tools/toolRegistry.js");
const { generateCompletion } = require("../providers/llmProvider.js");
const aiLogger = require("../utils/aiLogger.js");

const TOOL_SELECTION_SYSTEM_PROMPT = `
You are the ShreeHK Diamond ERP Intelligence Router.
Your job is to determine if answering the user's query requires executing a live MySQL database tool.

AVAILABLE ERP TOOLS:
1. "searchInventory" — Search diamonds by shape, color, clarity, carat range, price range, lab, or SKU.
2. "getStoneById" — Fetch exact diamond stock details by SKU.
3. "getInventorySummary" — Aggregate inventory total carats, total count, stock amount value.
4. "getAvailableStones" — Fetch live available on-hand stock stones.
5. "getHoldStones" — Fetch stones currently on inventory hold.
6. "getMemoStones" — Fetch stones out on Out-Memo or Consignment.
7. "getLabStones" — Fetch stones submitted to GIA/Lab.
8. "getSoldStones" — Fetch sold or exported stones.
9. "getExportStones" — Fetch exported stones.
10. "getStoneHistory" — Fetch audit movement history for a stone SKU.
11. "getPartiesList" — Search customer/vendor parties by name or code.
12. "getPartyById" — Fetch customer/vendor profile by party ID or name.
13. "getPartyOutstanding" — Calculate accounts receivable/payable open balance for a party.
14. "getPartyTransactions" — Fetch transaction statement history for a party.
15. "getOutwardStock" — Fetch outward sales/memo/export invoice headers.
16. "getInwardStock" — Fetch inward purchase/import/in-memo headers.
17. "getTransactionDetails" — Fetch line items for an inward or outward transaction.
18. "getOutstandingSummary" — Aggregate company total accounts receivable & payable.
19. "detectAnomalies" — Detect price mismatches below cost, duplicate certificates, and high discounts.
20. "forecastDemand" — Calculate historical monthly sales velocity by shape and reorder needs.
21. "suggestPrice" — Calculate recommended selling rate per carat based on purchase cost and sales history.

CRITICAL INSTRUCTIONS:
- If answering the user's question requires database data, respond ONLY with a raw JSON tool request:
  {"tool": "TOOL_NAME", "params": { ... }}
- If the question is ambiguous (e.g. "diamond ka price kya hai" without specifying which diamond SKU/shape/carat), return:
  {"clarify": "Clarifying question to ask user"}
- If no tool is needed (e.g. greeting or general help), return:
  {"directResponse": "Natural language response"}
- Do NOT output any markdown code blocks, explainers, or formatting outside JSON.
`;

async function executeAgentQuery(req, message, threadId = "default") {
  const startTime = Date.now();
  aiLogger.info("AgentOrchestrator", `Starting agent orchestration for query: "${message}"`);

  // Step 1: Assemble Request Context & Retrieve Memory
  const context = buildRequestContext(req);
  const history = await getConversationHistory(context.userId, context.companyId, threadId);
  const tools = getRegisteredToolSchemas();

  // Step 2: Pass 1 — Intent Router / Tool Selection Call
  const routerPrompt = `${TOOL_SELECTION_SYSTEM_PROMPT}\nUser Query: "${message}"`;
  const intentResult = await generateCompletion(
    "You are a strict JSON intent router for diamond ERP.",
    routerPrompt,
    { temperature: 0.1, maxTokens: 400 }
  );

  let toolName = null;
  let toolParams = {};
  let clarifyMsg = null;
  let directResponse = null;

  try {
    const rawText = intentResult.text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsedIntent = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    if (parsedIntent.tool) {
      toolName = parsedIntent.tool;
      toolParams = parsedIntent.params || {};
    } else if (parsedIntent.clarify) {
      clarifyMsg = parsedIntent.clarify;
    } else if (parsedIntent.directResponse) {
      directResponse = parsedIntent.directResponse;
    }
  } catch (parseErr) {
    aiLogger.warn("AgentOrchestrator", `Intent router JSON parse fallback: ${parseErr.message}`);
  }

  // If clarifying question needed
  if (clarifyMsg) {
    await appendTurn(context.userId, context.companyId, threadId, message, clarifyMsg);
    return {
      success: true,
      data: {
        message: clarifyMsg,
        provider: intentResult.provider,
        threadId,
        executionTimeMs: Date.now() - startTime,
      },
    };
  }

  // Step 3: Execute Real MySQL Query Tool if selected
  let toolExecutionResult = null;
  if (toolName) {
    aiLogger.info("AgentOrchestrator", `Executing live database tool: ${toolName}`, { params: toolParams });
    toolExecutionResult = await executeTool(toolName, toolParams, context);
  }

  // Step 4: Pass 2 — Format Real MySQL Tool Result into Natural Language (Zero Hallucination)
  let finalSystemPrompt = "";
  let finalUserPrompt = "";

  if (toolExecutionResult && toolExecutionResult.success) {
    const realDataStr = JSON.stringify(toolExecutionResult.data);
    finalSystemPrompt = `
You are the ShreeHK Diamond ERP Intelligent Assistant.
You have executed a live MySQL database query via tool [${toolName}].

CRITICAL ZERO HALLUCINATION RULES:
1. Answer strictly using the REAL DATABASE QUERY RESULT below.
2. If the results array is empty or totalResults is 0, state clearly: "Is criteria ka koi data nahi mila database mein." NEVER invent or assume any fictional stones, parties, or numbers.
3. Present exact SKUs, carats, shapes, colors, clarities, and amounts as returned by the query.
4. Respond in Hinglish or English matching the user's input tone.
5. Append this source verification footer at the end of your response:
   "\n\n*— Source: Live MySQL query executed via ${toolName}*"
`;
    finalUserPrompt = `User question: "${message}"\nLive Database Query Output:\n${realDataStr}`;
  } else {
    // Fallback: Default brain context or direct generation
    const { systemPrompt, userPrompt } = buildAgentPrompt({
      userMessage: message,
      context,
      history,
      availableTools: tools,
    });
    finalSystemPrompt = systemPrompt;
    finalUserPrompt = userPrompt;
  }

  const finalCompletion = await generateCompletion(finalSystemPrompt, finalUserPrompt, {
    maxTokens: 1200,
    temperature: 0.3,
  });

  const responseText = finalCompletion.text;

  // Step 5: Save turn to persistent conversation database
  await appendTurn(context.userId, context.companyId, threadId, message, responseText);

  const durationMs = Date.now() - startTime;
  aiLogger.info("AgentOrchestrator", `Orchestration complete (${durationMs}ms)`, {
    executedTool: toolName || "none",
    provider: finalCompletion.provider,
  });

  return {
    success: true,
    data: {
      message: responseText,
      executedTool: toolName,
      toolData: toolExecutionResult?.data || null,
      provider: finalCompletion.provider,
      threadId,
      executionTimeMs: durationMs,
    },
  };
}

module.exports = { executeAgentQuery };
