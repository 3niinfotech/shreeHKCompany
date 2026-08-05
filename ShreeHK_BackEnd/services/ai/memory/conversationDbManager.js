/**
 * DB-Backed Conversation Manager (Phase 5 Implementation)
 * Persists AI conversation threads, sliding-window history, and thread listings in MySQL `dai_ai_conversation`.
 */

const connection = require("../../../connection.js");
const aiLogger = require("../utils/aiLogger.js");

const MAX_HISTORY_TURNS = 10;

function queryMeta(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, values, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Get or initialize conversation history array for a user thread
 */
async function getConversationHistory(userId = 0, companyId = 1, threadId = "default") {
  const uid = Number(userId) || 0;
  const cid = Number(companyId) || 1;
  const tid = String(threadId || "default").trim();

  try {
    const sql = `SELECT messages FROM dai_ai_conversation WHERE user_id = ? AND company_id = ? AND thread_id = ? LIMIT 1`;
    const rows = await queryMeta(sql, [uid, cid, tid]);

    if (!rows.length || !rows[0].messages) {
      return [];
    }

    const messages = typeof rows[0].messages === "string" ? JSON.parse(rows[0].messages) : rows[0].messages;
    return Array.isArray(messages) ? messages : [];
  } catch (err) {
    aiLogger.error("ConversationDbManager", `Error reading thread ${tid}: ${err.message}`);
    return [];
  }
}

/**
 * Append user query and assistant response turn to thread history in MySQL
 */
async function appendTurn(userId = 0, companyId = 1, threadId = "default", userMessage = "", assistantResponse = "") {
  const uid = Number(userId) || 0;
  const cid = Number(companyId) || 1;
  const tid = String(threadId || "default").trim();

  try {
    let history = await getConversationHistory(uid, cid, tid);

    history.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });
    history.push({ role: "assistant", content: assistantResponse, timestamp: new Date().toISOString() });

    // Sliding window truncation (retain last MAX_HISTORY_TURNS * 2 messages)
    if (history.length > MAX_HISTORY_TURNS * 2) {
      history = history.slice(history.length - MAX_HISTORY_TURNS * 2);
    }

    const titleSnippet = String(userMessage).slice(0, 40) + (String(userMessage).length > 40 ? "..." : "");
    const messagesJson = JSON.stringify(history);

    const upsertSql = `
      INSERT INTO dai_ai_conversation (user_id, company_id, thread_id, title, messages)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        messages = VALUES(messages),
        updated_at = CURRENT_TIMESTAMP
    `;

    await queryMeta(upsertSql, [uid, cid, tid, titleSnippet, messagesJson]);
    aiLogger.info("ConversationDbManager", `Persisted turn to DB thread: ${tid}`, { totalMessages: history.length });
    return history;
  } catch (err) {
    aiLogger.error("ConversationDbManager", `Error persisting turn to thread ${tid}: ${err.message}`);
    return [];
  }
}

/**
 * Get all conversation threads for a user under active company context
 */
async function getUserThreads(userId = 0, companyId = 1) {
  const uid = Number(userId) || 0;
  const cid = Number(companyId) || 1;

  try {
    const sql = `
      SELECT thread_id, title, created_at, updated_at
      FROM dai_ai_conversation
      WHERE user_id = ? AND company_id = ?
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    const rows = await queryMeta(sql, [uid, cid]);
    return rows.map((r) => ({
      threadId: r.thread_id,
      title: r.title || "Conversation Thread",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    aiLogger.error("ConversationDbManager", `Error listing user threads: ${err.message}`);
    return [];
  }
}

/**
 * Delete a specific conversation thread
 */
async function deleteThread(userId = 0, companyId = 1, threadId = "default") {
  const uid = Number(userId) || 0;
  const cid = Number(companyId) || 1;
  const tid = String(threadId || "default").trim();

  try {
    const sql = `DELETE FROM dai_ai_conversation WHERE user_id = ? AND company_id = ? AND thread_id = ?`;
    await queryMeta(sql, [uid, cid, tid]);
    aiLogger.info("ConversationDbManager", `Deleted thread: ${tid}`);
    return true;
  } catch (err) {
    aiLogger.error("ConversationDbManager", `Error deleting thread ${tid}: ${err.message}`);
    return false;
  }
}

module.exports = {
  getConversationHistory,
  appendTurn,
  getUserThreads,
  deleteThread,
};
