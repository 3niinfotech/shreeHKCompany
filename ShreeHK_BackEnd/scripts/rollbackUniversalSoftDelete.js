/**
 * rollbackUniversalSoftDelete.js
 * Rollback Script: Drops deleted, deleted_at, deleted_by and idx_deleted.
 * Strictly for reversal testing on TEST DB.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const connection = require("../connection.js");

const TARGET_TABLES = [
  "branch", "company", "company_year", "user", "roll", "dai_party", "category",
  "dai_attribute", "dai_attribute_value", "dai_lab", "dai_book", "dai_currencyrate",
  "dai_product", "dai_product_value", "dai_history", "dai_gia", "dai_hold",
  "dai_inward_item", "dai_outward", "dai_outward_item", "dai_invoice",
  "dai_company_transfer", "dai_company_transfer_item",
  "acc_group", "acc_subgroup",
  "dai_quick_notes", "dai_ai_conversation", "dai_activity_log",
  "notification", "user_track"
  // Note: dai_inward, acc_advance, acc_transaction, dai_origin, dai_shipping
  // originally had `deleted` column before migration, so we don't drop their original `deleted` column.
];

function poolQuery(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function runRollback() {
  console.log("=== STARTING ROLLBACK: REMOVE SOFT DELETE SCHEMA CHANGES ===");

  // Parse arguments
  const args = process.argv.slice(2);
  const dbArg = args.find((a) => a.startsWith("--db="))?.split("=")[1];
  const confirmArg = args.find((a) => a.startsWith("--confirm-db="))?.split("=")[1];

  const targetDb = dbArg || process.env.DB_NAME || connection.META_DB;

  console.log("Target Database:", targetDb);

  // Mandatory Safety Confirmation Guard
  if (!confirmArg || confirmArg !== targetDb) {
    console.error(`\n[ABORTED] Safety requirement: You must provide an explicit confirmation flag matching the target database.`);
    console.error(`Usage: node ${require("path").basename(__filename)} --confirm-db=${targetDb} [--db=<target_db>]`);
    console.error(`Received: --confirm-db=${confirmArg || "(none)"}`);
    process.exit(1);
  }

  const pool = connection.getMetaPool();

  for (const table of TARGET_TABLES) {
    const cols = await poolQuery(
      pool,
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [targetDb, table]
    );
    const existingCols = new Set(cols.map((c) => c.COLUMN_NAME));

    const toDrop = [];
    if (existingCols.has("deleted_by")) toDrop.push("DROP COLUMN `deleted_by`");
    if (existingCols.has("deleted_at")) toDrop.push("DROP COLUMN `deleted_at`");
    if (existingCols.has("deleted")) toDrop.push("DROP COLUMN `deleted`");

    if (toDrop.length > 0) {
      try {
        await poolQuery(pool, `ALTER TABLE \`${targetDb}\`.\`${table}\` ${toDrop.join(", ")}`);
        console.log(`- Rolled back table [${table}]: dropped columns.`);
      } catch (err) {
        console.error(`! Table [${table}] rollback failed:`, err.message);
      }
    }
  }

  // Idempotent step: re-add branch.uq_branch_name unique index if not present
  try {
    const uqBranch = await poolQuery(
      pool,
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'branch' AND INDEX_NAME = 'uq_branch_name' LIMIT 1",
      [targetDb]
    );
    if (uqBranch.length === 0) {
      await poolQuery(pool, `ALTER TABLE \`${targetDb}\`.\`branch\` ADD UNIQUE KEY \`uq_branch_name\` (\`name\`)`);
      console.log("  Index [uq_branch_name] re-added to [branch].");
    }
  } catch (addErr) {
    console.warn("  Could not re-add uq_branch_name to branch:", addErr.message);
  }

  // Idempotent step: re-add user.user_name unique index if not present
  try {
    const uqUser = await poolQuery(
      pool,
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user' AND INDEX_NAME = 'user_name' LIMIT 1",
      [targetDb]
    );
    if (uqUser.length === 0) {
      await poolQuery(pool, `ALTER TABLE \`${targetDb}\`.\`user\` ADD UNIQUE KEY \`user_name\` (\`user_name\`)`);
      console.log("  Index [user_name] re-added to [user].");
    }
  } catch (addErr) {
    console.warn("  Could not re-add user_name to user:", addErr.message);
  }

  console.log("Rollback completed.");
  process.exit(0);
}

runRollback().catch((e) => {
  console.error("Rollback error:", e);
  process.exit(1);
});

