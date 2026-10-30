/**
 * permanentDeleteService.js
 *
 * Handles all logic for permanently deleting a Company or Branch,
 * including impact preview, cross-DB deletion, cache invalidation,
 * file cleanup and post-commit audit logging.
 *
 * RULES:
 *  - Never delete dai_activity_log rows.
 *  - Never delete company_year rows.
 *  - Never delete user rows.
 *  - Never DROP DATABASE.
 *  - Write PERMANENT_DELETE audit entry AFTER commit on a SEPARATE connection.
 *  - All tenant-DB deletes for a branch happen in ONE single transaction.
 */

const fs = require("fs");
const path = require("path");
const connection = require("../connection.js");
const { clearPermissionCache } = require("../permissionHelper.js");
const { TENANT_TABLES, META_TABLES } = require("../config/permanentDeleteConfig.js");
const { auditQuery } = require("./auditDb.js");

// ─── helpers ────────────────────────────────────────────────────────────────

/** Run a query on a specific pool, returning a promise. */
function poolQuery(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

/** Get the meta pool (promisified helper). */
function metaQ(sql, values = []) {
  return poolQuery(connection.getMetaPool(), sql, values);
}

/** Check whether a table exists in a DB via information_schema. */
async function tableExists(pool, db, table) {
  const rows = await poolQuery(
    pool,
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [db, table]
  );
  return rows.length > 0;
}

/** Check whether a column exists in a table via information_schema. */
async function columnExists(pool, db, table, column) {
  const rows = await poolQuery(
    pool,
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [db, table, column]
  );
  return rows.length > 0;
}

/** Return all distinct tenant DB names from company_year. */
async function getAllTenantDbNames() {
  const rows = await metaQ(
    "SELECT DISTINCT db_name FROM company_year WHERE db_name IS NOT NULL AND db_name != '' ORDER BY db_name"
  );
  const names = new Set(rows.map((r) => r.db_name));
  names.add(connection.META_DB); // meta DB also holds some data
  return [...names];
}

// ─── failed-attempt rate limiter ─────────────────────────────────────────────
const _failMap = new Map(); // userId -> { count, resetAt }

function isRateLimited(userId) {
  const rec = _failMap.get(userId);
  if (!rec) return false;
  if (Date.now() >= rec.resetAt) { _failMap.delete(userId); return false; }
  return rec.count >= 5;
}

function recordFailedAttempt(userId) {
  const rec = _failMap.get(userId);
  const resetAt = Date.now() + 15 * 60 * 1000;
  if (rec && Date.now() < rec.resetAt) {
    rec.count += 1;
  } else {
    _failMap.set(userId, { count: 1, resetAt });
  }
}

function clearFailedAttempts(userId) {
  _failMap.delete(userId);
}

function getRateLimitResetMs(userId) {
  const rec = _failMap.get(userId);
  if (!rec) return 0;
  return Math.max(0, rec.resetAt - Date.now());
}

// ─── impact helpers ──────────────────────────────────────────────────────────

/** Parse rolls.company JSON arrays, find roles containing this companyId. */
async function getAffectedRolesInfo(companyId) {
  const rolls = await metaQ("SELECT id, name, company FROM roll");
  const affected = [];
  for (const row of rolls || []) {
    let ids = [];
    try { ids = JSON.parse(row.company || "[]"); } catch { ids = []; }
    if (!Array.isArray(ids)) ids = [];
    if (ids.map(Number).includes(Number(companyId))) {
      // find users with this roll
      const users = await metaQ(
        "SELECT user_id, user_name FROM user WHERE roll = ? AND (is_active = 1 OR is_active IS NULL)",
        [row.id]
      );
      affected.push({
        roleId: row.id,
        roleName: row.name,
        userCount: users.length,
        users: users.map((u) => ({ id: u.user_id, name: u.user_name })),
      });
    }
  }
  return affected;
}

/** Check user.company_name references. */
async function getUserCompanyNameRefs(companyId) {
  const company = await metaQ("SELECT name FROM company WHERE id = ? LIMIT 1", [companyId]);
  if (!company.length) return [];
  const compName = company[0].name;
  const users = await metaQ(
    "SELECT user_id, user_name, company_name FROM user WHERE company_name = ?",
    [compName]
  );
  return users.map((u) => ({ userId: u.user_id, userName: u.user_name, companyName: u.company_name }));
}

/** Find inter-company transfer records that touch this company. */
async function getSharedTransferInfo(companyId, pool, db) {
  const exists = await tableExists(pool, db, "dai_company_transfer");
  if (!exists) return { count: 0, otherCompanyNames: [] };

  const colFromExists = await columnExists(pool, db, "dai_company_transfer", "from_company_id");
  const colToExists = await columnExists(pool, db, "dai_company_transfer", "to_company_id");
  if (!colFromExists && !colToExists) return { count: 0, otherCompanyNames: [] };

  let sql = "SELECT from_company_id, to_company_id FROM dai_company_transfer WHERE ";
  const parts = [];
  const params = [];
  if (colFromExists) { parts.push("from_company_id = ?"); params.push(companyId); }
  if (colToExists) { parts.push("to_company_id = ?"); params.push(companyId); }
  sql += parts.join(" OR ");

  const rows = await poolQuery(pool, sql, params);
  const otherIds = new Set();
  for (const r of rows) {
    if (r.from_company_id && Number(r.from_company_id) !== Number(companyId)) otherIds.add(Number(r.from_company_id));
    if (r.to_company_id && Number(r.to_company_id) !== Number(companyId)) otherIds.add(Number(r.to_company_id));
  }

  let otherCompanyNames = [];
  if (otherIds.size > 0) {
    const placeholders = [...otherIds].map(() => "?").join(",");
    const companies = await metaQ(`SELECT name FROM company WHERE id IN (${placeholders})`, [...otherIds]);
    otherCompanyNames = companies.map((c) => c.name);
  }

  return { count: rows.length, otherCompanyNames };
}

/** Count rows for a company across all tenant DBs and meta tables. */
async function countRowsForCompany(companyId) {
  const counts = {};
  const warnings = [];
  const dbNames = await getAllTenantDbNames();
  const metaPool = connection.getMetaPool();

  // Tenant tables
  for (const cfg of TENANT_TABLES) {
    counts[cfg.moduleLabel] = counts[cfg.moduleLabel] || 0;
    for (const db of dbNames) {
      const pool = connection.getPoolForDb(db);
      const tExists = await tableExists(pool, db, cfg.table);
      if (!tExists) { warnings.push(`[SKIP] ${db}.${cfg.table} not found`); continue; }

      try {
        let sql, params;
        if (cfg.deleteType === "subquery") {
          const colOk = await columnExists(pool, db, cfg.parentTable, cfg.companyColumn || "company");
          if (!colOk) { warnings.push(`[SKIP] ${db}.${cfg.parentTable} has no company column`); continue; }
          sql = `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE \`${cfg.parentJoinColumn}\` IN (SELECT id FROM \`${cfg.parentTable}\` WHERE \`${cfg.companyColumn || "company"}\` = ?)`;
          params = [companyId];
        } else if (cfg.deleteType === "gia_special") {
          const skuRows = await poolQuery(
            pool,
            `SELECT DISTINCT sku FROM \`dai_product\` WHERE company = ? AND sku IS NOT NULL AND sku != ''`,
            [companyId]
          );
          const candidateSkus = skuRows.map((r) => r.sku).filter(Boolean);
          if (candidateSkus.length > 0) {
            const placeholders = candidateSkus.map(() => "?").join(",");
            const sharedRows = await poolQuery(
              pool,
              `SELECT DISTINCT sku FROM \`dai_product\` WHERE company != ? AND sku IN (${placeholders})`,
              [companyId, ...candidateSkus]
            );
            const sharedSet = new Set(sharedRows.map((r) => r.sku));
            const exclusiveSkus = candidateSkus.filter((sku) => !sharedSet.has(sku));
            if (exclusiveSkus.length > 0) {
              const delPlaceholders = exclusiveSkus.map(() => "?").join(",");
              const rows = await poolQuery(
                pool,
                `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE sku IN (${delPlaceholders})`,
                exclusiveSkus
              );
              counts[cfg.moduleLabel] += Number(rows[0]?.c || 0);
            }
          }
          continue;
        } else if (cfg.deleteType === "transfer_special" || cfg.deleteType === "transfer_item_special") {
          const colFrom = await columnExists(pool, db, cfg.table, "from_company_id");
          const colTo = await columnExists(pool, db, cfg.table, "to_company_id");
          if (!colFrom && !colTo) { warnings.push(`[SKIP] ${db}.${cfg.table} missing transfer columns`); continue; }
          const parts = [];
          params = [];
          if (colFrom) { parts.push("from_company_id = ?"); params.push(companyId); }
          if (colTo) { parts.push("to_company_id = ?"); params.push(companyId); }
          sql = `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE ${parts.join(" OR ")}`;
        } else {
          const colOk = await columnExists(pool, db, cfg.table, cfg.companyColumn);
          if (!colOk) { warnings.push(`[SKIP] ${db}.${cfg.table}.${cfg.companyColumn} not found`); continue; }
          sql = `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE \`${cfg.companyColumn}\` = ?`;
          params = [companyId];
        }
        const rows = await poolQuery(pool, sql, params);
        counts[cfg.moduleLabel] += Number(rows[0]?.c || 0);
      } catch (e) {
        warnings.push(`[WARN] count ${db}.${cfg.table}: ${e.message}`);
      }
    }
  }

  // Meta tables
  for (const cfg of META_TABLES) {
    counts[cfg.moduleLabel] = counts[cfg.moduleLabel] || 0;
    const tExists = await tableExists(metaPool, connection.META_DB, cfg.table);
    if (!tExists) { warnings.push(`[SKIP] meta.${cfg.table} not found`); continue; }
    try {
      let sql, params;
      if (cfg.matchType === "name_string") {
        const company = await metaQ("SELECT name FROM company WHERE id = ? LIMIT 1", [companyId]);
        if (!company.length) continue;
        sql = `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE \`${cfg.companyColumn}\` = ?`;
        params = [company[0].name];
      } else {
        sql = `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE \`${cfg.companyColumn}\` = ?`;
        params = [companyId];
      }
      const rows = await poolQuery(metaPool, sql, params);
      counts[cfg.moduleLabel] += Number(rows[0]?.c || 0);
    } catch (e) {
      warnings.push(`[WARN] count meta.${cfg.table}: ${e.message}`);
    }
  }

  return { counts, warnings };
}

// ─── impact preview ──────────────────────────────────────────────────────────

async function getCompanyDeleteImpact(companyId) {
  const existing = await metaQ("SELECT id, name, shortcutName FROM company WHERE id = ? LIMIT 1", [companyId]);
  if (!existing.length) throw Object.assign(new Error("Company not found."), { statusCode: 404 });

  const dbNames = await getAllTenantDbNames();
  const tenantDbs = dbNames.filter((d) => d !== connection.META_DB);

  // Count rows
  const { counts, warnings } = await countRowsForCompany(companyId);

  // Shared transfers — check first tenant DB only for performance
  let transferInfo = { count: 0, otherCompanyNames: [] };
  for (const db of dbNames) {
    const pool = connection.getPoolForDb(db);
    const info = await getSharedTransferInfo(companyId, pool, db);
    transferInfo.count += info.count;
    transferInfo.otherCompanyNames = [...new Set([...transferInfo.otherCompanyNames, ...info.otherCompanyNames])];
  }

  const rolesInfo = await getAffectedRolesInfo(companyId);
  const userCompanyNameRefs = await getUserCompanyNameRefs(companyId);

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    company: existing[0],
    tenantDbCount: tenantDbs.length,
    totalRows,
    byModule: counts,
    sharedTransfers: transferInfo,
    rolesAffected: rolesInfo,
    userCompanyNameRefs,
    warnings,
  };
}

async function getBranchDeleteImpact(branchId) {
  const existing = await metaQ("SELECT id, name, shortcutName FROM branch WHERE id = ? LIMIT 1", [branchId]);
  if (!existing.length) throw Object.assign(new Error("Branch not found."), { statusCode: 404 });

  const companies = await metaQ("SELECT id, name, shortcutName FROM company WHERE branch_id = ?", [branchId]);

  const perCompany = [];
  for (const c of companies) {
    const impact = await getCompanyDeleteImpact(c.id);
    perCompany.push(impact);
  }

  return {
    branch: existing[0],
    companies,
    companyCount: companies.length,
    perCompany,
    warnings: perCompany.flatMap((i) => i.warnings),
  };
}

// ─── execution helpers ────────────────────────────────────────────────────────

/**
 * Execute all DELETE statements for one company across ALL tenant DBs and meta,
 * using a provided query runner `q` that must already be inside a transaction.
 *
 * For tenant DBs we use fully qualified `db`.`table` names so everything is
 * in ONE connection/transaction.
 *
 * Returns { byModule: {label: count}, total: number, warnings: string[] }
 */
async function executeCompanyDeleteInTx(companyId, q, allDbNames, warnings = []) {
  const byModule = {};
  const metaDb = connection.META_DB;
  const tenantDbs = allDbNames;
  const metaPool = connection.getMetaPool();

  // Sort tenant tables by deleteOrder
  const sortedTenant = [...TENANT_TABLES].sort((a, b) => a.deleteOrder - b.deleteOrder);

  // We need the company name for user_track (name_string match)
  const companyRows = await metaQ("SELECT name FROM company WHERE id = ? LIMIT 1", [companyId]);
  const companyName = companyRows[0]?.name || null;

  for (const cfg of sortedTenant) {
    const dbs = cfg.dbScope === "meta" ? [metaDb] : tenantDbs;
    byModule[cfg.moduleLabel] = byModule[cfg.moduleLabel] || 0;

    for (const db of dbs) {
      const pool = connection.getPoolForDb(db);
      const tExists = await tableExists(pool, db, cfg.table);
      if (!tExists) { warnings.push(`[SKIP] ${db}.${cfg.table} not found`); continue; }

      const fqTable = `\`${db}\`.\`${cfg.table}\``;
      try {
        let result;

        if (cfg.deleteType === "subquery") {
          const parentExists = await tableExists(pool, db, cfg.parentTable);
          if (!parentExists) { warnings.push(`[SKIP] ${db}.${cfg.parentTable} not found`); continue; }
          const colOk = await columnExists(pool, db, cfg.parentTable, cfg.companyColumn || "company");
          if (!colOk) { warnings.push(`[SKIP] ${db}.${cfg.parentTable} no company col`); continue; }
          const joinColOk = await columnExists(pool, db, cfg.table, cfg.parentJoinColumn);
          if (!joinColOk) { warnings.push(`[SKIP] ${db}.${cfg.table}.${cfg.parentJoinColumn} not found`); continue; }
          result = await q(
            `DELETE FROM ${fqTable} WHERE \`${cfg.parentJoinColumn}\` IN (SELECT id FROM \`${db}\`.\`${cfg.parentTable}\` WHERE \`${cfg.companyColumn || "company"}\` = ?)`,
            [companyId]
          );

        } else if (cfg.deleteType === "gia_special") {
          // Delete only GIA rows whose SKU does NOT exist in dai_product of any OTHER company
          const dpExists = await tableExists(pool, db, "dai_product");
          if (!dpExists) { warnings.push(`[SKIP] ${db}.dai_product not found — skipping dai_gia`); continue; }

          const skuRows = await q(
            `SELECT DISTINCT sku FROM \`${db}\`.\`dai_product\` WHERE company = ? AND sku IS NOT NULL AND sku != ''`,
            [companyId]
          );
          const candidateSkus = skuRows.map((r) => r.sku).filter(Boolean);
          if (candidateSkus.length > 0) {
            const placeholders = candidateSkus.map(() => "?").join(",");
            const sharedRows = await q(
              `SELECT DISTINCT sku FROM \`${db}\`.\`dai_product\` WHERE company != ? AND sku IN (${placeholders})`,
              [companyId, ...candidateSkus]
            );
            const sharedSet = new Set(sharedRows.map((r) => r.sku));
            const exclusiveSkus = candidateSkus.filter((sku) => !sharedSet.has(sku));

            if (exclusiveSkus.length > 0) {
              const delPlaceholders = exclusiveSkus.map(() => "?").join(",");
              result = await q(
                `DELETE FROM ${fqTable} WHERE sku IN (${delPlaceholders})`,
                exclusiveSkus
              );
            } else {
              result = { affectedRows: 0 };
            }
          } else {
            result = { affectedRows: 0 };
          }

        } else if (cfg.deleteType === "transfer_special") {
          const colFrom = await columnExists(pool, db, cfg.table, "from_company_id");
          const colTo = await columnExists(pool, db, cfg.table, "to_company_id");
          if (!colFrom && !colTo) { warnings.push(`[SKIP] ${db}.${cfg.table} no transfer cols`); continue; }
          const parts = []; const params = [];
          if (colFrom) { parts.push("from_company_id = ?"); params.push(companyId); }
          if (colTo) { parts.push("to_company_id = ?"); params.push(companyId); }
          result = await q(`DELETE FROM ${fqTable} WHERE ${parts.join(" OR ")}`, params);

        } else if (cfg.deleteType === "transfer_item_special") {
          // Delete transfer items whose parent transfer references this company
          const parentFq = `\`${db}\`.\`dai_company_transfer\``;
          const parentExists = await tableExists(pool, db, "dai_company_transfer");
          if (!parentExists) { warnings.push(`[SKIP] ${db}.dai_company_transfer not found — skip items`); continue; }
          const colFrom = await columnExists(pool, db, "dai_company_transfer", "from_company_id");
          const colTo = await columnExists(pool, db, "dai_company_transfer", "to_company_id");
          if (!colFrom && !colTo) { warnings.push(`[SKIP] ${db}.dai_company_transfer no cols`); continue; }
          const parts = []; const params = [];
          if (colFrom) { parts.push("from_company_id = ?"); params.push(companyId); }
          if (colTo) { parts.push("to_company_id = ?"); params.push(companyId); }
          result = await q(
            `DELETE FROM ${fqTable} WHERE transfer_id IN (SELECT id FROM ${parentFq} WHERE ${parts.join(" OR ")})`,
            params
          );

        } else {
          // direct
          const colOk = await columnExists(pool, db, cfg.table, cfg.companyColumn);
          if (!colOk) { warnings.push(`[SKIP] ${db}.${cfg.table}.${cfg.companyColumn} not found`); continue; }
          result = await q(
            `DELETE FROM ${fqTable} WHERE \`${cfg.companyColumn}\` = ?`,
            [companyId]
          );
        }

        byModule[cfg.moduleLabel] = (byModule[cfg.moduleLabel] || 0) + (result?.affectedRows || 0);
      } catch (e) {
        warnings.push(`[WARN] delete ${db}.${cfg.table}: ${e.message}`);
      }
    }
  }

  // Meta tables
  const sortedMeta = [...META_TABLES].sort((a, b) => a.deleteOrder - b.deleteOrder);
  for (const cfg of sortedMeta) {
    byModule[cfg.moduleLabel] = byModule[cfg.moduleLabel] || 0;
    const tExists = await tableExists(metaPool, metaDb, cfg.table);
    if (!tExists) { warnings.push(`[SKIP] meta.${cfg.table} not found`); continue; }
    try {
      let result;
      if (cfg.matchType === "name_string") {
        if (!companyName) { warnings.push(`[SKIP] meta.${cfg.table}: company name not found`); continue; }
        result = await q(
          `DELETE FROM \`${metaDb}\`.\`${cfg.table}\` WHERE \`${cfg.companyColumn}\` = ?`,
          [companyName]
        );
      } else {
        result = await q(
          `DELETE FROM \`${metaDb}\`.\`${cfg.table}\` WHERE \`${cfg.companyColumn}\` = ?`,
          [companyId]
        );
      }
      byModule[cfg.moduleLabel] = (byModule[cfg.moduleLabel] || 0) + (result?.affectedRows || 0);
    } catch (e) {
      warnings.push(`[WARN] delete meta.${cfg.table}: ${e.message}`);
    }
  }

  // Remove company from roll JSON arrays
  const rolls = await metaQ("SELECT id, company FROM roll");
  for (const row of rolls || []) {
    let ids = [];
    try { ids = JSON.parse(row.company || "[]"); } catch { ids = []; }
    if (!Array.isArray(ids)) ids = [];
    const filtered = ids.map(Number).filter((id) => id !== Number(companyId));
    if (filtered.length !== ids.length) {
      await q(
        `UPDATE \`${metaDb}\`.\`roll\` SET company = ? WHERE id = ?`,
        [JSON.stringify(filtered), row.id]
      );
    }
  }

  // Clear user.company_name references
  if (companyName) {
    try {
      const usersExist = await tableExists(metaPool, metaDb, "user");
      const colExists = await columnExists(metaPool, metaDb, "user", "company_name");
      if (usersExist && colExists) {
        await q(
          `UPDATE \`${metaDb}\`.\`user\` SET company_name = NULL WHERE company_name = ?`,
          [companyName]
        );
      }
    } catch (e) {
      warnings.push(`[WARN] clearing user.company_name: ${e.message}`);
    }
  }

  // Delete dai_incrementid in meta DB for this company (if exists there too)
  try {
    const incExists = await tableExists(metaPool, metaDb, "dai_incrementid");
    if (incExists) {
      const r = await q(
        `DELETE FROM \`${metaDb}\`.\`dai_incrementid\` WHERE company = ?`,
        [companyId]
      );
      byModule["Settings/IncrementId"] = (byModule["Settings/IncrementId"] || 0) + (r?.affectedRows || 0);
    }
  } catch (e) {
    warnings.push(`[WARN] meta.dai_incrementid: ${e.message}`);
  }

  // Finally delete from company table
  const compDelRes = await q(`DELETE FROM \`${metaDb}\`.\`company\` WHERE id = ?`, [companyId]);
  if (!compDelRes || compDelRes.affectedRows === 0) {
    throw Object.assign(new Error("Company not found or already deleted."), { statusCode: 404 });
  }

  const total = Object.values(byModule).reduce((a, b) => a + b, 0);
  return { byModule, total, warnings };
}

// ─── write audit AFTER commit ────────────────────────────────────────────────

async function writePostCommitAudit({ actionType, moduleName, recordId, recordReference, newValue, reqInfo }) {
  const sql = `
    INSERT INTO dai_activity_log (
      company_id, user_id, user_name, user_role, user_role_id,
      action_type, module_name, record_id, record_reference,
      old_value, new_value, changed_fields, description,
      ip_address, user_agent, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, 'SUCCESS', UTC_TIMESTAMP(3))
  `;
  const desc = `${reqInfo.userName} (${reqInfo.userRole}) permanently deleted ${moduleName} "${recordReference}"`;
  await auditQuery(sql, [
    reqInfo.companyId || 1,
    reqInfo.userId,
    reqInfo.userName,
    reqInfo.userRole,
    reqInfo.userRoleId || null,
    actionType,
    moduleName,
    String(recordId),
    recordReference,
    JSON.stringify(newValue),
    desc,
    reqInfo.ip || null,
    reqInfo.userAgent || null,
  ]);
}

// ─── logo file cleanup ────────────────────────────────────────────────────────

function deleteCompanyLogo(logoPath) {
  if (!logoPath) return;
  try {
    const full = path.resolve(logoPath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.warn("[LOGO CLEANUP]", e.message);
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Get impact preview for deleting a company.
 */
async function getCompanyDeleteImpactPublic(companyId) {
  return getCompanyDeleteImpact(companyId);
}

/**
 * Get impact preview for deleting a branch (all its companies).
 */
async function getBranchDeleteImpactPublic(branchId) {
  return getBranchDeleteImpact(branchId);
}

/**
 * Execute permanent delete for a single company.
 * Uses ONE transaction via helper.runInTransaction (which uses meta pool connection).
 */
async function executePermanentDeleteCompany({ companyId, sessionCompanyId, reqInfo }) {
  // Session safety block
  if (Number(companyId) === Number(sessionCompanyId)) {
    throw Object.assign(
      new Error("Cannot delete the company you are currently logged into. Switch to another company first."),
      { statusCode: 400 }
    );
  }

  const existing = await metaQ("SELECT id, name, logo FROM company WHERE id = ? LIMIT 1", [companyId]);
  if (!existing.length) throw Object.assign(new Error("Company not found."), { statusCode: 404 });

  const companyRecord = existing[0];
  const allDbNames = await getAllTenantDbNames();
  const warnings = [];
  let deletedCounts;

  // ONE transaction covering all DBs (fully-qualified table names)
  await new Promise((resolve, reject) => {
    connection.getMetaPool().getConnection((connErr, conn) => {
      if (connErr) return reject(connErr);

      const q = (sql, values = []) =>
        new Promise((res, rej) => {
          conn.query(sql, values, (e, r) => (e ? rej(e) : res(r)));
        });

      const run = async () => {
        try {
          await q("START TRANSACTION");
          const result = await executeCompanyDeleteInTx(companyId, q, allDbNames, warnings);
          deletedCounts = result;
          await q("COMMIT");
          resolve();
        } catch (e) {
          try { await q("ROLLBACK"); } catch (_) {}
          reject(e);
        } finally {
          conn.release();
        }
      };
      run();
    });
  });

  // Post-commit: clean up logo file
  deleteCompanyLogo(companyRecord.logo);

  // Post-commit: clear permission cache
  clearPermissionCache();

  // Post-commit: write audit on SEPARATE connection (never rolled back)
  try {
    await writePostCommitAudit({
      actionType: "PERMANENT_DELETE",
      moduleName: "Company",
      recordId: companyId,
      recordReference: companyRecord.name,
      newValue: {
        deletedByUser: reqInfo.userName,
        deletedByRole: reqInfo.userRole,
        byModule: deletedCounts?.byModule || {},
        totalDeleted: deletedCounts?.total || 0,
        warnings,
      },
      reqInfo,
    });
  } catch (auditErr) {
    console.error("[AUDIT] Failed to write PERMANENT_DELETE audit:", auditErr.message);
  }

  return {
    companyId,
    companyName: companyRecord.name,
    byModule: deletedCounts?.byModule || {},
    total: deletedCounts?.total || 0,
    warnings,
  };
}

/**
 * Execute permanent delete for a branch and ALL its companies.
 * Uses ONE single transaction covering all companies.
 */
async function executePermanentDeleteBranch({ branchId, sessionCompanyBranchId, reqInfo }) {
  // Session safety block
  if (Number(branchId) === Number(sessionCompanyBranchId)) {
    throw Object.assign(
      new Error("Cannot delete the branch your current session belongs to. Switch to another branch first."),
      { statusCode: 400 }
    );
  }

  const existing = await metaQ("SELECT id, name FROM branch WHERE id = ? LIMIT 1", [branchId]);
  if (!existing.length) throw Object.assign(new Error("Branch not found."), { statusCode: 404 });

  const branchRecord = existing[0];
  const companies = await metaQ(
    "SELECT id, name, logo FROM company WHERE branch_id = ? ORDER BY id",
    [branchId]
  );

  const allDbNames = await getAllTenantDbNames();
  const warnings = [];
  const perCompanyCounts = {};
  let grandTotal = 0;

  // ONE single transaction for all companies under this branch
  await new Promise((resolve, reject) => {
    connection.getMetaPool().getConnection((connErr, conn) => {
      if (connErr) return reject(connErr);

      const q = (sql, values = []) =>
        new Promise((res, rej) => {
          conn.query(sql, values, (e, r) => (e ? rej(e) : res(r)));
        });

      const run = async () => {
        try {
          await q("START TRANSACTION");

          for (const company of companies) {
            const result = await executeCompanyDeleteInTx(company.id, q, allDbNames, warnings);
            perCompanyCounts[company.name] = result.byModule;
            grandTotal += result.total;
          }

          // Delete branch_year rows
          try {
            const metaDb = connection.META_DB;
            const branchYearExists = await tableExists(
              connection.getMetaPool(), metaDb, "branch_year"
            );
            if (branchYearExists) {
              await q(
                `DELETE FROM \`${metaDb}\`.\`branch_year\` WHERE branch_id = ?`,
                [branchId]
              );
            }
          } catch (e) {
            warnings.push(`[WARN] branch_year delete: ${e.message}`);
          }

          // Delete branch itself
          const branchDelRes = await q(`DELETE FROM \`${connection.META_DB}\`.\`branch\` WHERE id = ?`, [branchId]);
          if (!branchDelRes || branchDelRes.affectedRows === 0) {
            throw Object.assign(new Error("Branch not found or already deleted."), { statusCode: 404 });
          }

          await q("COMMIT");
          resolve();
        } catch (e) {
          try { await q("ROLLBACK"); } catch (_) {}
          reject(e);
        } finally {
          conn.release();
        }
      };
      run();
    });
  });

  // Post-commit: clean up all company logos
  for (const company of companies) {
    deleteCompanyLogo(company.logo);
  }

  // Post-commit: clear permission cache
  clearPermissionCache();

  // Post-commit: write audit on SEPARATE connection
  try {
    await writePostCommitAudit({
      actionType: "PERMANENT_DELETE",
      moduleName: "Branch",
      recordId: branchId,
      recordReference: branchRecord.name,
      newValue: {
        deletedByUser: reqInfo.userName,
        deletedByRole: reqInfo.userRole,
        companiesDeleted: companies.map((c) => c.name),
        perCompany: perCompanyCounts,
        totalDeleted: grandTotal,
        warnings,
      },
      reqInfo,
    });
  } catch (auditErr) {
    console.error("[AUDIT] Failed to write PERMANENT_DELETE audit (branch):", auditErr.message);
  }

  return {
    branchId,
    branchName: branchRecord.name,
    companiesDeleted: companies.map((c) => c.name),
    perCompany: perCompanyCounts,
    total: grandTotal,
    warnings,
  };
}

module.exports = {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  getRateLimitResetMs,
  getCompanyDeleteImpact: getCompanyDeleteImpactPublic,
  getBranchDeleteImpact: getBranchDeleteImpactPublic,
  executePermanentDeleteCompany,
  executePermanentDeleteBranch,
};

