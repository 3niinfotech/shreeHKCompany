const connection = require("../../connection.js");
const { ensureCompanyColumn } = require("../../schemaHelper.js");

function queryPool(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

/**
 * Load master rows for companyId.
 * 1) Ensure company column + rematch Venya company ids on active year DB
 * 2) If still empty, same on meta DB (imported masters often live only there)
 */
async function fetchMasterList({ tableName, companyId, buildQueries }) {
  // If session has no company, still try company=1 so masters are not blank
  const cid = Number(companyId) > 0 ? Number(companyId) : 1;

  const active = connection.getActivePool();
  const meta = connection.getMetaPool();
  const pools = [active];
  if (meta && meta !== active) pools.push(meta);

  let lastError = null;

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    const dbName =
      i === 0
        ? connection.getTenantStore()?.dbName || connection.META_DB
        : connection.META_DB;

    try {
      const result = await connection.runWithTenant(
        { pool, companyId: cid, dbName },
        async () => {
          await ensureCompanyColumn(tableName, cid);
          const { dataSql, countSql, dataParams, countParams } = buildQueries(cid);
          // perf: parallel count + data (independent queries, same response shape)
          const [countRows, data] = await Promise.all([
            queryPool(pool, countSql, countParams),
            queryPool(pool, dataSql, dataParams),
          ]);
          const totalItems = Number(countRows?.[0]?.totalItems || 0);
          return { TotalItems: totalItems, Data: Array.isArray(data) ? data : [] };
        }
      );

      if ((result.Data && result.Data.length > 0) || result.TotalItems > 0) {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  return { TotalItems: 0, Data: [] };
}

module.exports = { fetchMasterList, queryPool };
