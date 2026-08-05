/**
 * Conversation Manager (In-Memory Sliding Window Interface)
 * Maintains active chat thread history per session/user in memory.
 * (No database persistence required for Phase 1 scope)
 */

const aiLogger = require("../utils/aiLogger.js");

const memoryStore = new Map();
const MAX_HISTORY_TURNS = 10;
const THREAD_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours idle TTL

function getThreadKey(userId, threadId = "default") {
  return `user_${userId || "guest"}_thread_${threadId}`;
}

function evictIdleThreads() {
  const now = Date.now();
  for (const [key, data] of memoryStore.entries()) {
    if (now - data.lastAccessed > THREAD_TTL_MS) {
      memoryStore.delete(key);
      aiLogger.debug("ConversationManager", `Evicted idle thread: ${key}`);
    }
  }
}

function getConversationHistory(userId, threadId = "default") {
  evictIdleThreads();
  const key = getThreadKey(userId, threadId);
  const data = memoryStore.get(key);
  if (data) {
    data.lastAccessed = Date.now();
    return data.history;
  }
  return [];
}

function appendTurn(userId, threadId = "default", userMessage, assistantResponse) {
  evictIdleThreads();
  const key = getThreadKey(userId, threadId);
  const history = getConversationHistory(userId, threadId);

  history.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });
  history.push({ role: "assistant", content: assistantResponse, timestamp: new Date().toISOString() });

  // Sliding window truncation
  if (history.length > MAX_HISTORY_TURNS * 2) {
    history.splice(0, history.length - MAX_HISTORY_TURNS * 2);
  }

  memoryStore.set(key, { history, lastAccessed: Date.now() });
  aiLogger.debug("ConversationManager", `Appended turn for key: ${key}`, { totalMessages: history.length });
  return history;
}

function clearConversation(userId, threadId = "default") {
  const key = getThreadKey(userId, threadId);
  memoryStore.delete(key);
  aiLogger.info("ConversationManager", `Cleared thread history for key: ${key}`);
}

module.exports = {
  getConversationHistory,
  appendTurn,
  clearConversation,
};

