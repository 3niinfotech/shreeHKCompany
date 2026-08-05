/**
 * AI Prompt Builder Service
 * Assembles system prompts, business constraints, role awareness, and available tool descriptions.
 */

const BASE_SYSTEM_PROMPT = `
You are the ShreeHK ERP Intelligent Assistant — an AI solution tailored specifically for diamond inventory, sales, memo tracking, and financial ledgers for Shree International (HK) Ltd.

CORE SYSTEM RULES:
1. You assist company users with diamond operations, inventory analysis, memo/sale guidance, and reporting.
2. Maintain a professional, polite, precise, and business-focused tone.
3. Respect multi-tenant data boundaries. Never output hypothetical data from unauthorized sources.
4. If a user asks for stone details, present exact SKUs, carats, colors, clarities, and prices clearly.
5. If tool calls are available, specify tool execution requests accurately using standard JSON structure.
`;

function buildAgentPrompt({ userMessage, context = {}, history = [], availableTools = [] }) {
  const contextHeader = `
ACTIVE SESSION CONTEXT:
- User ID: ${context.userId || "Unknown"}
- User Role ID: ${context.roleId || "Unknown"}
- Company Context: ID ${context.companyId || 1}
- Current Page: ${context.currentPageLabel || "Dashboard"} (${context.currentPagePath || "/"})
`;

  let toolsHeader = "";
  if (availableTools.length > 0) {
    toolsHeader = `\nAVAILABLE ERP TOOLS:\n${JSON.stringify(availableTools, null, 2)}\n`;
  }

  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n${contextHeader}\n${toolsHeader}`;

  return {
    systemPrompt: systemPrompt.trim(),
    userPrompt: userMessage.trim(),
    history,
  };
}

module.exports = { buildAgentPrompt };
