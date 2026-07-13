/**
 * One-time migration: expand legacy module keys in roll.resource to page-level keys.
 * Run: node backend/scripts/migrateRolePermissions.js
 */
try { require("dotenv").config({ path: require("path").join(__dirname, "../.env") }); } catch (e) {}

const connection = require("../connection.js");
const { normalizeResource } = require("../permissionHelper.js");
const { SUPER_ADMIN_ROLL_ID } = require("../config/permissionRegistry.js");

const query = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, values, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

async function migrate() {
  console.log("Starting roll.resource migration to page-level keys...");

  const roles = await query("SELECT id, name, resource FROM roll ORDER BY id ASC");
  let updated = 0;

  for (const role of roles) {
    const migrated =
      Number(role.id) === SUPER_ADMIN_ROLL_ID ? ["all"] : normalizeResource(role.resource);

    const currentNormalized = normalizeResource(role.resource);
    const changed =
      JSON.stringify([...migrated].sort()) !== JSON.stringify([...currentNormalized].sort()) ||
      (Number(role.id) === SUPER_ADMIN_ROLL_ID && !currentNormalized.includes("all"));

    if (changed || migrated.length !== currentNormalized.length) {
      await query("UPDATE roll SET resource = ? WHERE id = ?", [
        JSON.stringify(migrated),
        role.id,
      ]);
      console.log(`  [${role.id}] ${role.name} → ${JSON.stringify(migrated).slice(0, 80)}...`);
      updated++;
    } else {
      console.log(`  [${role.id}] ${role.name} — no change (${migrated.length} keys)`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${roles.length} roles.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
