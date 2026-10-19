const { metaQuery } = require("../tenantHelper.js");

/**
 * Move every company under Surat onto HK / Dubai (UAE), round-robin.
 * Returns how many companies were moved.
 */
async function reassignSuratCompanies() {
  const branches = await metaQuery("SELECT id, name, status FROM branch ORDER BY id");
  const surat = (branches || []).find(
    (b) => /^surat$/i.test(String(b.name || "").trim())
  );
  if (!surat) return { moved: 0, detail: [] };

  const targets = (branches || []).filter((b) => {
    if (Number(b.id) === Number(surat.id)) return false;
    if (Number(b.status) === 0) return false;
    const n = String(b.name || "").trim().toLowerCase();
    return n === "hk" || n === "dubai" || n === "uae" || n.includes("dubai") || n.includes("uae");
  });

  // Prefer HK then Dubai order
  targets.sort((a, b) => {
    const rank = (n) => {
      const x = String(n || "").trim().toLowerCase();
      if (x === "hk") return 0;
      if (x === "dubai" || x.includes("dubai")) return 1;
      if (x === "uae" || x.includes("uae")) return 2;
      return 9;
    };
    return rank(a.name) - rank(b.name);
  });

  if (!targets.length) return { moved: 0, detail: [], error: "No HK/Dubai target branch" };

  const companies = await metaQuery(
    "SELECT id, name FROM company WHERE branch_id = ? ORDER BY id",
    [surat.id]
  );
  if (!companies.length) return { moved: 0, detail: [] };

  const detail = [];
  for (let i = 0; i < companies.length; i += 1) {
    const target = targets[i % targets.length];
    await metaQuery("UPDATE company SET branch_id = ? WHERE id = ?", [
      target.id,
      companies[i].id,
    ]);
    detail.push({
      companyId: companies[i].id,
      companyName: companies[i].name,
      toBranchId: target.id,
      toBranchName: target.name,
    });
  }

  return { moved: detail.length, detail };
}

module.exports = { reassignSuratCompanies };
