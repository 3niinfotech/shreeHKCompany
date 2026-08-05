/**
 * Agent Orchestrator Core (Phase 1 Foundation)
 * Orchestrates the execution loop:
 * Context -> Memory -> Prompt -> LLM Provider -> Tool Registry -> Natural Language Response.
 */

const { buildRequestContext } = require("../context/aiContextBuilder.js");
const { getConversationHistory, appendTurn } = require("../memory/conversationDbManager.js");
const { buildAgentPrompt } = require("../prompts/promptBuilder.js");
const { getRegisteredToolSchemas, executeTool } = require("../tools/toolRegistry.js");
const { generateCompletion } = require("../providers/llmProvider.js");
const aiLogger = require("../utils/aiLogger.js");

async function executeAgentQuery(req, message, threadId = "default") {
  const startTime = Date.now();
  aiLogger.info("AgentOrchestrator", `Starting agent orchestration for query: "${message}"`);

  // Step 1: Assemble Request Context
  const context = buildRequestContext(req);

  // Step 2: Retrieve Persistent Conversation Memory
  const history = await getConversationHistory(context.userId, context.companyId, threadId);

  // Step 3: Fetch Registered ERP Tool Schemas
  const tools = getRegisteredToolSchemas();

  // Step 4: Assemble Prompts
  const { systemPrompt, userPrompt } = buildAgentPrompt({
    userMessage: message,
    context,
    history,
    availableTools: tools,
  });

  // Step 5: Invoke LLM Provider
  const completion = await generateCompletion(systemPrompt, userPrompt, {
    maxTokens: 1200,
    temperature: 0.5,
  });

  const responseText = completion.text;

  // Step 6: Update Persistent Conversation Memory
  await appendTurn(context.userId, context.companyId, threadId, message, responseText);


  const durationMs = Date.now() - startTime;
  aiLogger.info("AgentOrchestrator", `Orchestration complete (${durationMs}ms)`, {
    provider: completion.provider,
    userId: context.userId,
  });

  return {
    success: true,
    data: {
      message: responseText,
      provider: completion.provider,
      threadId,
      contextSummary: {
        companyId: context.companyId,
        page: context.currentPageLabel,
      },
      executionTimeMs: durationMs,
    },
  };
}

module.exports = { executeAgentQuery };
