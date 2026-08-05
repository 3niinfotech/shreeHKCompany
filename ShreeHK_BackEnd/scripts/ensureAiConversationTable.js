const fs = require("fs");
const path = require("path");
const connection = require("../connection.js");

let ensured = false;

function queryPool(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureAiConversationTableOnMeta() {
  if (ensured) return;
  try {
    const metaPool = connection.getMetaPool();
    const sqlPath = path.join(__dirname, "..", "migrations", "create_dai_ai_conversation.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await queryPool(metaPool, sql);
    console.log(`dai_ai_conversation ready on meta (${connection.META_DB})`);
    ensured = true;
  } catch (e) {
    console.warn("dai_ai_conversation bootstrap warning:", e.message);
  }
}

module.exports = { ensureAiConversationTableOnMeta };
