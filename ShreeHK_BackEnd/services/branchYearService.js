const connection = require("../connection.js");
const { metaQuery } = require("../tenantHelper.js");
const { ensureCurrentFiscalYear } = require("./ensureCurrentFiscalYearService.js");

const metaExec = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

/**
 * branch_year: which fiscal years a branch can select.
 * New branches get ONLY the current FY at create time — not every historical year.
 */
async function ensureBranchYearSchema() {
  await metaQuery(`
    CREATE TABLE IF NOT EXISTS \`branch_year\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`branch_id\` INT NOT NULL,
      \`year_id\` INT NOT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_branch_year\` (\`branch_id\`, \`year_id\`),
      KEY \`idx_branch_year_branch\` (\`branch_id\`),
      KEY \`idx_branch_year_year\` (\`year_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * Attach current FY only to a newly created branch.
 */
async function attachCurrentYearToBranch(branchId) {
  const bid = Number(branchId);
  if (!bid) return null;

  await ensureBranchYearSchema();
  const fy = await ensureCurrentFiscalYear();
  if (!fy?.id) return null;

  try {
    await metaExec(
      "INSERT INTO branch_year (branch_id, year_id) VALUES (?, ?)",
      [bid, fy.id]
    );
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (!/Duplicate|ER_DUP_ENTRY/i.test(msg)) throw err;
  }

  return fy;
}

/**
 * Map of branchId → [yearId, ...] for branches that have explicit year links.
 * Branches with no rows are legacy (show all years).
 */
async function getBranchYearMap() {
  await ensureBranchYearSchema();
  const rows = await metaQuery(
    "SELECT branch_id, year_id FROM branch_year ORDER BY branch_id, year_id"
  );
  const map = {};
  (rows || []).forEach((r) => {
    const bid = Number(r.branch_id);
    const yid = Number(r.year_id);
    if (!bid || !yid) return;
    if (!map[bid]) map[bid] = [];
    map[bid].push(yid);
  });
  return map;
}

module.exports = {
  ensureBranchYearSchema,
  attachCurrentYearToBranch,
  getBranchYearMap,
};
