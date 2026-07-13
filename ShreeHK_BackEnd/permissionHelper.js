const connection = require("./connection.js");
const {
  PAGE_ENTRIES,
  LEGACY_MODULE_MAP,
  ALL_PAGE_KEYS,
  PUBLIC_API_PREFIXES,
  SUPER_ADMIN_ROLL_ID,
} = require("./config/permissionRegistry.js");

const permissionCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const parseResourceRaw = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const isPageKey = (key) => ALL_PAGE_KEYS.includes(key);

const expandLegacyKey = (key) => {
  if (key === "all") return ["all"];
  if (isPageKey(key)) return [key];
  if (LEGACY_MODULE_MAP[key]) return LEGACY_MODULE_MAP[key];
  return [];
};

/**
 * Normalize roll.resource to deduplicated page keys (or ["all"]).
 */
const normalizeResource = (raw) => {
  const items = parseResourceRaw(raw);
  if (!items.length) return [];

  if (items.includes("all")) return ["all"];

  const expanded = new Set();
  items.forEach((item) => {
    expandLegacyKey(item).forEach((k) => expanded.add(k));
  });

  return [...expanded].filter(isPageKey).sort();
};

const isSuperAdminRoll = (rollId) => Number(rollId) === SUPER_ADMIN_ROLL_ID;

const hasPagePermission = (permissions, pageKey) => {
  if (!pageKey) return true;
  if (!permissions || !permissions.length) return false;
  if (permissions.includes("all")) return true;
  if (permissions.includes(pageKey)) return true;

  for (const perm of permissions) {
    const expanded = expandLegacyKey(perm);
    if (expanded.includes("all") || expanded.includes(pageKey)) return true;
  }
  return false;
};

/** Build prefix → pageKey map (longest prefix wins at lookup time) */
const buildApiPrefixMap = () => {
  const pairs = [];
  PAGE_ENTRIES.forEach((page) => {
    (page.apiPrefixes || []).forEach((prefix) => {
      pairs.push({ prefix, pageKey: page.key });
    });
  });
  pairs.sort((a, b) => b.prefix.length - a.prefix.length);
  return pairs;
};

const API_PREFIX_MAP = buildApiPrefixMap();

const pathMatchesPrefix = (path, prefix) => {
  if (!prefix) return false;
  if (prefix.endsWith("/")) return path.startsWith(prefix) || path === prefix.slice(0, -1);
  return path === prefix || path.startsWith(`${prefix}/`);
};

const isPublicApiPath = (path) =>
  PUBLIC_API_PREFIXES.some((prefix) => pathMatchesPrefix(path, prefix));

/**
 * All page keys whose apiPrefixes match this path (deduped, longest prefixes first).
 */
const getMatchingApiPermissions = (path) => {
  const normalized = path.split("?")[0];
  if (isPublicApiPath(normalized)) return [];

  const seen = new Set();
  const matches = [];
  for (const { prefix, pageKey } of API_PREFIX_MAP) {
    if (pathMatchesPrefix(normalized, prefix) && !seen.has(pageKey)) {
      seen.add(pageKey);
      matches.push(pageKey);
    }
  }
  return matches;
};

/**
 * Resolve a single page permission for an API path (first match), or null if unmapped/public.
 */
const getApiPermission = (path) => {
  const matches = getMatchingApiPermissions(path);
  return matches.length ? matches[0] : null;
};

const validateResourceKeys = (raw) => {
  const items = parseResourceRaw(raw);
  if (!items.length) return { valid: true, normalized: [] };
  if (items.includes("all")) return { valid: true, normalized: ["all"] };

  const invalid = items.filter((item) => item !== "all" && !isPageKey(item) && !LEGACY_MODULE_MAP[item]);
  if (invalid.length) {
    return { valid: false, invalid, normalized: normalizeResource(items) };
  }
  return { valid: true, normalized: normalizeResource(items) };
};

const queryRollPermissions = (rollId) =>
  new Promise((resolve, reject) => {
    if (isSuperAdminRoll(rollId)) {
      return resolve(["all"]);
    }
    connection.query(
      "SELECT resource FROM roll WHERE id = ? LIMIT 1",
      [rollId],
      (err, rows) => {
        if (err) return reject(err);
        if (!rows?.length) return resolve([]);
        resolve(normalizeResource(rows[0].resource));
      }
    );
  });

const getPermissionsForRoll = async (rollId) => {
  if (isSuperAdminRoll(rollId)) return ["all"];

  const cacheKey = String(rollId);
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.permissions;
  }

  const permissions = await queryRollPermissions(rollId);
  permissionCache.set(cacheKey, { permissions, at: Date.now() });
  return permissions;
};

const clearPermissionCache = (rollId) => {
  if (rollId != null) permissionCache.delete(String(rollId));
  else permissionCache.clear();
};

const expandRoleResourceForMigration = (raw, rollId) => {
  if (isSuperAdminRoll(rollId)) return ["all"];
  const items = parseResourceRaw(raw);
  if (!items.length) return [];
  if (items.includes("all")) return ["all"];
  return normalizeResource(items);
};

module.exports = {
  parseResourceRaw,
  normalizeResource,
  hasPagePermission,
  getApiPermission,
  getMatchingApiPermissions,
  isPublicApiPath,
  validateResourceKeys,
  getPermissionsForRoll,
  clearPermissionCache,
  isSuperAdminRoll,
  expandRoleResourceForMigration,
  isPageKey,
  ALL_PAGE_KEYS,
};
