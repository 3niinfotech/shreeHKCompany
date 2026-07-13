const helper = require("../helper.js");

let ensurePromise = null;

/**
 * Ensures `user.is_active` exists (auto-migration for existing DBs).
 */
const ensureUserActiveColumn = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const rows = await helper.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user'
         AND COLUMN_NAME = 'is_active'`,
    );

    if (Number(rows[0]?.cnt) > 0) return;

    await helper.query(
      "ALTER TABLE `user` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1",
    );
    console.log("[user] Added missing column: is_active");
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
};

module.exports = { ensureUserActiveColumn };
