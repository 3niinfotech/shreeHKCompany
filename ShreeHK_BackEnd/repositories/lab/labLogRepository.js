const connection = require("../../connection.js");

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

/**
 * Log a certificate fetch event
 * @param {Object} logEntry
 */
async function createFetchLog({
  companyId,
  userId = null,
  lab,
  reportNumber,
  status = "SUCCESS",
  source = "live",
  responseTimeMs = 0,
  errorMessage = null,
}) {
  if (!companyId || !lab || !reportNumber) return null;

  const sql = `
    INSERT INTO lab_fetch_log (
      company_id, user_id, lab, report_number,
      status, source, response_time_ms, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const results = await queryAsync(sql, [
    companyId,
    userId ? Number(userId) : null,
    lab.toUpperCase(),
    String(reportNumber).trim(),
    status,
    source,
    Math.max(0, parseInt(responseTimeMs, 10) || 0),
    errorMessage ? String(errorMessage).slice(0, 1000) : null,
  ]);

  return results?.insertId || null;
}

/**
 * Get recent fetch logs for a tenant company
 * @param {number} companyId 
 * @param {number} limit 
 */
async function getRecentLogs(companyId, limit = 50) {
  if (!companyId) return [];
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);

  const sql = `
    SELECT 
      l.id, l.company_id, l.user_id, l.lab, l.report_number,
      l.status, l.source, l.response_time_ms, l.error_message, l.created_at,
      u.name AS user_name
    FROM lab_fetch_log l
    LEFT JOIN user u ON l.user_id = u.user_id
    WHERE l.company_id = ?
    ORDER BY l.id DESC
    LIMIT ?
  `;

  return queryAsync(sql, [companyId, safeLimit]);
}

/**
 * Get count of live external lookups for a company today (cache hits and mocks are excluded)
 * @param {number} companyId 
 * @returns {Promise<number>}
 */
async function getDailyLiveLookupCount(companyId) {
  if (!companyId) return 0;
  const sql = `
    SELECT COUNT(*) AS cnt 
    FROM lab_fetch_log 
    WHERE company_id = ? AND source = 'live' AND created_at >= CURDATE()
  `;
  const rows = await queryAsync(sql, [companyId]);
  return Number(rows?.[0]?.cnt || 0);
}

module.exports = {
  createFetchLog,
  getRecentLogs,
  getDailyLiveLookupCount,
};
