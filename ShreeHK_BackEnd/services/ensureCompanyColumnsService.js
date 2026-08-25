const helper = require("../helper.js");

let ensurePromise = null;

/**
 * Ensures `company` column exists on tables like `dai_balance` and `dai_currencyrate`
 * so that multi-company data isolation works across all modules.
 */
const ensureCompanyColumns = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const tablesToMigrate = [
      { table: "dai_balance", col: "company", def: "INT NOT NULL DEFAULT 1" },
      { table: "dai_currencyrate", col: "company", def: "INT NOT NULL DEFAULT 1" },
      { table: "dai_shipping", col: "company", def: "INT NOT NULL DEFAULT 1" },
      { table: "dai_origin", col: "company", def: "INT NOT NULL DEFAULT 1" },
      { table: "category", col: "company", def: "INT NOT NULL DEFAULT 1" },
    ];

    for (const item of tablesToMigrate) {
      try {
        const rows = await helper.query(
          `SELECT COUNT(*) AS cnt
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND COLUMN_NAME = ?`,
          [item.table, item.col]
        );

        if (Number(rows[0]?.cnt) === 0) {
          await helper.query(
            `ALTER TABLE \`${item.table}\` ADD COLUMN \`${item.col}\` ${item.def}`
          );
          console.log(`[schema-migration] Added missing column: ${item.table}.${item.col}`);
        }
      } catch (err) {
        console.error(`[schema-migration] Error checking/adding column ${item.table}.${item.col}:`, err.message);
      }
    }
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
};

module.exports = { ensureCompanyColumns };
