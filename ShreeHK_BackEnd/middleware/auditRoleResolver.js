const connection = require("../connection.js");
const { isSuperAdminRoll } = require("../permissionHelper.js");

const roleNameCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getRoleNameByRollId(rollId) {
  const id = Number(rollId);
  if (!id) return "";
  if (isSuperAdminRoll(id)) return "Super Admin";

  const cached = roleNameCache.get(id);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.name;
  }

  const rows = await new Promise((resolve, reject) => {
    connection.getMetaPool().query(
      "SELECT name FROM roll WHERE id = ? LIMIT 1",
      [id],
      (err, data) => (err ? reject(err) : resolve(data)),
    );
  });

  const name = rows[0]?.name || `Role ${id}`;
  roleNameCache.set(id, { name, at: Date.now() });
  return name;
}

module.exports = { getRoleNameByRollId };
