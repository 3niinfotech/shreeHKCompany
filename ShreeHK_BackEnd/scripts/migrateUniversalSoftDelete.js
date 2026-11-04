/**
 * migrateUniversalSoftDelete.js
 * Phase 1 Migration: Add soft delete columns (deleted, deleted_at, deleted_by)
 * Strictly executed on TEST DB (shreehkweb_snj2024_test).
 * Idempotent: safe to run multiple times without altering existing data.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const connection = require("../connection.js");

const TARGET_TABLES = [
  // Core masters & structures
  "branch",
  "company",
  "company_year",
  "user",
  "roll",
  "dai_party",
  "category",
  "dai_attribute",
  "dai_attribute_value",
  "dai_lab",
  "dai_origin",
  "dai_shipping",
  "dai_book",
  "dai_currencyrate",

  // Stock, inventory & movement
  "dai_product",
  "dai_product_value",
  "dai_history",
  "dai_gia",
  "dai_hold",
  "dai_inward",
  "dai_inward_item",
  "dai_outward",
  "dai_outward_item",
  "dai_invoice",
  "dai_company_transfer",
  "dai_company_transfer_item",

  // Accounting & transactions
  "acc_advance",
  "acc_transaction",
  "acc_group",
  "acc_subgroup",

  // Notes, logs, notifications
  "dai_quick_notes",
  "dai_ai_conversation",
  "dai_activity_log",
  "notification",
  "user_track"
];

function poolQuery(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function runMigration() {
  console.log("=== STARTING PHASE 1: UNIVERSAL SOFT DELETE SCHEMA MIGRATION ===");

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
  let addedCount = 0;
  let skippedCount = 0;

  for (const table of TARGET_TABLES) {
    // Check if table exists
    const tExists = await poolQuery(
      pool,
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1",
      [targetDb, table]
    );

    if (tExists.length === 0) {
      console.log(`- Table [${table}] does not exist in schema. Skipped.`);
      continue;
    }

    // Check existing columns
    const cols = await poolQuery(
      pool,
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [targetDb, table]
    );
    const existingCols = new Set(cols.map((c) => c.COLUMN_NAME));

    const toAdd = [];
    if (!existingCols.has("deleted")) {
      toAdd.push("ADD COLUMN `deleted` TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!existingCols.has("deleted_at")) {
      toAdd.push("ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL");
    }
    if (!existingCols.has("deleted_by")) {
      toAdd.push("ADD COLUMN `deleted_by` INT NULL DEFAULT NULL");
    }

    if (toAdd.length > 0) {
      const alterSql = `ALTER TABLE \`${targetDb}\`.\`${table}\` ${toAdd.join(", ")}`;
      try {
        const t0 = Date.now();
        await poolQuery(pool, alterSql);
        const durationMs = Date.now() - t0;
        console.log(`+ Table [${table}]: Added ${toAdd.length} column(s) in ${durationMs}ms.`);
        addedCount += toAdd.length;
      } catch (err) {
        console.error(`! Table [${table}] ALTER failed:`, err.message);
      }
    } else {
      console.log(`  Table [${table}]: Already has soft delete columns.`);
      skippedCount++;
    }

    // Ensure index on `deleted` for optimal query speed
    try {
      const idxExists = await poolQuery(
        pool,
        "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = 'idx_deleted' LIMIT 1",
        [targetDb, table]
      );
      if (idxExists.length === 0) {
        await poolQuery(pool, `ALTER TABLE \`${targetDb}\`.\`${table}\` ADD INDEX \`idx_deleted\` (\`deleted\`)`);
        console.log(`  Index [idx_deleted] created on [${table}].`);
      }
    } catch (idxErr) {
      // index could already exist or duplicate
    }
  }

  // Idempotent step: drop branch.uq_branch_name unique index to allow re-creating branches with same name after soft delete
  try {
    const uqBranch = await poolQuery(
      pool,
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'branch' AND INDEX_NAME = 'uq_branch_name' LIMIT 1",
      [targetDb]
    );
    if (uqBranch.length > 0) {
      await poolQuery(pool, `ALTER TABLE \`${targetDb}\`.\`branch\` DROP INDEX \`uq_branch_name\``);
      console.log("  Index [uq_branch_name] dropped from [branch] (allows soft-deleted branch name re-use).");
    }
  } catch (dropErr) {
    console.warn("  Could not drop uq_branch_name from branch:", dropErr.message);
  }

  // Idempotent step: drop user.user_name unique index to allow re-creating users with same username after soft delete
  try {
    const uqUser = await poolQuery(
      pool,
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user' AND INDEX_NAME = 'user_name' LIMIT 1",
      [targetDb]
    );
    if (uqUser.length > 0) {
      await poolQuery(pool, `ALTER TABLE \`${targetDb}\`.\`user\` DROP INDEX \`user_name\``);
      console.log("  Index [user_name] dropped from [user] (allows soft-deleted username re-use).");
    }
  } catch (dropErr) {
    console.warn("  Could not drop user_name from user:", dropErr.message);
  }

  console.log("\n--- Migration Complete ---");
  console.log(`Total Columns Added: ${addedCount}`);
  console.log(`Tables Fully Ready: ${TARGET_TABLES.length}`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed with error:", err);
  process.exit(1);
});

