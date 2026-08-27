const helper = require("../helper.js");

let ensurePromise = null;

/**
 * Ensures user profile columns exist (auto-migration for existing DBs).
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

    const extraColumns = [
      { name: "department", ddl: "ALTER TABLE `user` ADD COLUMN `department` VARCHAR(150) DEFAULT NULL" },
      { name: "joining_date", ddl: "ALTER TABLE `user` ADD COLUMN `joining_date` DATE DEFAULT NULL" },
      { name: "profile_image", ddl: "ALTER TABLE `user` ADD COLUMN `profile_image` VARCHAR(255) DEFAULT NULL" },
      { name: "created_by", ddl: "ALTER TABLE `user` ADD COLUMN `created_by` INT DEFAULT NULL" },
      {
        name: "created_at",
        ddl: "ALTER TABLE `user` ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP",
      },
      {
        name: "updated_at",
        ddl: "ALTER TABLE `user` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      },
    ];

    for (const col of extraColumns) {
      const rows = await helper.query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'user'
           AND COLUMN_NAME = ?`,
        [col.name],
      );
      if (Number(rows[0]?.cnt) === 0) {
        await helper.query(col.ddl);
        console.log(`[user] Added missing column: ${col.name}`);
      }
    }
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
};

module.exports = { ensureUserActiveColumn };

