/**
 * Move all companies under Surat branch onto Dubai / HK (round-robin).
 * Usage: node scripts/reassignSuratCompanies.js
 */
const { metaQuery } = require("../tenantHelper.js");

async function main() {
  const branches = await metaQuery("SELECT id, name FROM branch ORDER BY id");
  const byName = (re) =>
    branches.find((b) => re.test(String(b.name || "").trim()));

  const surat = byName(/^surat$/i);
  const hk = byName(/^hk$/i);
  const dubai = byName(/^(dubai|uae)$/i);

  if (!surat) {
    console.log("No Surat branch found. Nothing to do.");
    process.exit(0);
  }

  const targets = [hk, dubai].filter(Boolean);
  if (!targets.length) {
    console.error("Neither HK nor Dubai/UAE branch found. Abort.");
    process.exit(1);
  }

  const companies = await metaQuery(
    "SELECT id, name, branch_id FROM company WHERE branch_id = ? ORDER BY id",
    [surat.id]
  );

  console.log(`Surat branch id=${surat.id}, companies=${companies.length}`);
  console.log(
    "Targets:",
    targets.map((t) => `${t.name}(#${t.id})`).join(", ")
  );

  for (let i = 0; i < companies.length; i += 1) {
    const target = targets[i % targets.length];
    await metaQuery("UPDATE company SET branch_id = ? WHERE id = ?", [
      target.id,
      companies[i].id,
    ]);
    console.log(
      `  ${companies[i].name} (#${companies[i].id}) → ${target.name} (#${target.id})`
    );
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
