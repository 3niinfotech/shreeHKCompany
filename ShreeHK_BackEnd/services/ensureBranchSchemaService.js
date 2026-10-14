/**
 * Meta DB: branch master (HK / Dubai) + company.branch_id.
 * Branches stay separate from companies — never create a branch from a company name.
 * Surat is NOT auto-seeded (admin may delete it permanently).
 */
const connection = require("../connection.js");
const { metaQuery } = require("../tenantHelper.js");

const DEFAULT_BRANCHES = [
  { name: "HK", shortcutName: "HK" },
  { name: "Dubai", shortcutName: "UAE" },
];

const metaExec = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const ensureBranchSchema = async () => {
  await metaQuery(`
    CREATE TABLE IF NOT EXISTS \`branch\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(150) NOT NULL,
      \`shortcutName\` VARCHAR(50) NULL,
      \`address\` VARCHAR(500) NULL,
      \`number\` VARCHAR(50) NULL,
      \`city\` VARCHAR(100) NULL,
      \`country\` VARCHAR(100) NULL,
      \`status\` TINYINT NOT NULL DEFAULT 1,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_branch_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await metaQuery("ALTER TABLE `company` ADD COLUMN `branch_id` INT NULL");
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (!/duplicate column|ER_DUP_FIELDNAME/i.test(msg)) {
      console.error("ensureBranchSchema company.branch_id:", msg);
    }
  }

  for (const b of DEFAULT_BRANCHES) {
    const found = await metaQuery(
      "SELECT id, status FROM branch WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [b.name]
    );
    if (!found.length) {
      try {
        await metaExec(
          "INSERT INTO branch (name, shortcutName, status) VALUES (?, ?, 1)",
          [b.name, b.shortcutName]
        );
      } catch (err) {
        const msg = String(err?.message || err || "");
        if (!/Duplicate|ER_DUP_ENTRY/i.test(msg)) {
          console.error("ensureBranchSchema seed branch:", msg);
        }
      }
    } else {
      // Keep login-modal branches always active + sync shortcut (Dubai → UAE)
      await metaQuery(
        "UPDATE branch SET status = 1, shortcutName = ? WHERE id = ?",
        [b.shortcutName, found[0].id]
      );
    }
  }

  // Hide any junk branches that were previously created from company names.
  // Keep only real location branches active for login (HK / Dubai / Surat + admin-created extras that are not company clones).
  const defaultNames = DEFAULT_BRANCHES.map((b) => b.name.toLowerCase());
  const allBranches = await metaQuery("SELECT id, name FROM branch");
  const companyNames = await metaQuery("SELECT LOWER(TRIM(name)) AS n FROM company");
  const companyNameSet = new Set((companyNames || []).map((r) => String(r.n || "").trim()).filter(Boolean));

  for (const b of allBranches || []) {
    const bName = String(b.name || "").trim().toLowerCase();
    if (!bName) continue;
    if (defaultNames.includes(bName)) continue;
    // If branch name is exactly an old company name, deactivate it (was auto-cloned).
    if (companyNameSet.has(bName)) {
      await metaQuery("UPDATE branch SET status = 0 WHERE id = ?", [b.id]);
      await metaQuery(
        "UPDATE company SET branch_id = NULL WHERE branch_id = ?",
        [b.id]
      );
    }
  }

  // Active location branches for login picker (HK / Dubai; Surat only if still present)
  const branches = await metaQuery(
    "SELECT id, name, shortcutName FROM branch WHERE status = 1 AND LOWER(name) IN ('hk','dubai','surat')"
  );
  const branchByName = {};
  (branches || []).forEach((b) => {
    branchByName[String(b.name || "").toLowerCase()] = b;
  });
  const hkBranch = branchByName.hk;
  const dubaiBranch = branchByName.dubai; // UAE location

  // Explicit mapping (always re-apply so picker stays correct):
  // - ShreeHK / KG Infrastructure → HK
  // - Test / Free companies → Dubai (UAE)
  const allCompanies = await metaQuery(
    "SELECT id, name, shortcutName, branch_id FROM company"
  );

  for (const company of allCompanies || []) {
    const blob = `${company.name || ""} ${company.shortcutName || ""}`.toLowerCase().trim();
    let targetId = null;

    // HK: ShreeHK International + KG Infrastructure
    if (/kg\s*infra/.test(blob) || /shree\s*hk/.test(blob) || /shreehk/.test(blob)) {
      targetId = hkBranch?.id || null;
    } else if (/test|free|uae|dubai|\bdxb\b/.test(blob)) {
      // UAE location → Dubai branch
      targetId = dubaiBranch?.id || null;
    } else {
      // Do not auto-map by name "surat" — Surat branch is optional / deletable
      const match = (branches || []).find((b) => {
        const bName = String(b.name || "").toLowerCase();
        const bShort = String(b.shortcutName || "").toLowerCase();
        if (bName === "surat" || bShort === "srt") return false;
        if (bName && blob.includes(bName)) return true;
        if (bShort && blob.includes(bShort)) return true;
        return false;
      });
      if (match?.id) {
        targetId = match.id;
      } else if (!company.branch_id && dubaiBranch?.id) {
        // Leftover demo/unassigned tenant → Dubai (UAE)
        targetId = dubaiBranch.id;
      }
    }

    if (targetId && Number(company.branch_id) !== Number(targetId)) {
      await metaQuery("UPDATE company SET branch_id = ? WHERE id = ?", [targetId, company.id]);
    }
  }
};

module.exports = { ensureBranchSchema };
