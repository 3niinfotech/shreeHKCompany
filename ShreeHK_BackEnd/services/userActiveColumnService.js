const helper = require("../helper.js");

let ensurePromise = null;

/**
 * Ensures `user.is_active` and `user.designation` exist (auto-migration for existing DBs).
 */
const ensureUserActiveColumn = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const rowsActive = await helper.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user'
         AND COLUMN_NAME = 'is_active'`,
    );

    if (Number(rowsActive[0]?.cnt) === 0) {
      await helper.query(
        "ALTER TABLE `user` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1",
      );
      console.log("[user] Added missing column: is_active");
    }

    const rowsDesig = await helper.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user'
         AND COLUMN_NAME = 'designation'`,
    );

    if (Number(rowsDesig[0]?.cnt) === 0) {
      await helper.query(
        "ALTER TABLE `user` ADD COLUMN `designation` VARCHAR(150) DEFAULT NULL",
      );
      console.log("[user] Added missing column: designation");
    }
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
};

module.exports = { ensureUserActiveColumn };

