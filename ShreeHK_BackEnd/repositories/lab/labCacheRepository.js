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
 * Fetch cached certificate for a tenant if not expired
 * @param {number} companyId 
 * @param {string} lab 
 * @param {string} reportNumber 
 */
async function getCachedCertificate(companyId, lab, reportNumber) {
  if (!companyId || !lab || !reportNumber) return null;

  const sql = `
    SELECT 
      id, company_id, lab, report_number, status, 
      normalized_json, raw_json, pdf_url, plot_url, 
      fetched_at, expires_at
    FROM lab_certificate_cache
    WHERE company_id = ? AND lab = ? AND report_number = ? AND expires_at > NOW()
    LIMIT 1
  `;
  const rows = await queryAsync(sql, [companyId, lab.toUpperCase(), String(reportNumber).trim()]);
  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  let normalized = null;
  let raw = null;

  try {
    normalized = typeof row.normalized_json === "string" ? JSON.parse(row.normalized_json) : row.normalized_json;
  } catch {
    normalized = null;
  }

  try {
    raw = row.raw_json ? JSON.parse(row.raw_json) : null;
  } catch {
    raw = row.raw_json;
  }

  return {
    ...row,
    normalized,
    raw,
  };
}

/**
 * Save certificate to cache with specified TTL
 * Never caches if isMock is true or status is ERROR.
 * @param {Object} params
 */
async function setCachedCertificate({
  companyId,
  lab,
  reportNumber,
  status = "SUCCESS",
  normalized,
  raw = null,
  pdfUrl = null,
  plotUrl = null,
  ttlSeconds = 30 * 24 * 60 * 60, // 30 days default
  isMock = false,
}) {
  // RULE 1: Never cache mock results
  if (isMock) return false;

  // RULE 4: Never cache ERROR status
  if (status === "ERROR") return false;

  if (!companyId || !lab || !reportNumber || !normalized) return false;

  const labNorm = lab.toUpperCase();
  const repNorm = String(reportNumber).trim();
  const normalizedStr = typeof normalized === "string" ? normalized : JSON.stringify(normalized);
  const rawStr = raw ? (typeof raw === "string" ? raw : JSON.stringify(raw)) : null;

  const sql = `
    INSERT INTO lab_certificate_cache (
      company_id, lab, report_number, status,
      normalized_json, raw_json, pdf_url, plot_url,
      fetched_at, expires_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND)
    )
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      normalized_json = VALUES(normalized_json),
      raw_json = VALUES(raw_json),
      pdf_url = VALUES(pdf_url),
      plot_url = VALUES(plot_url),
      fetched_at = NOW(),
      expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
  `;

  await queryAsync(sql, [
    companyId,
    labNorm,
    repNorm,
    status,
    normalizedStr,
    rawStr,
    pdfUrl,
    plotUrl,
    ttlSeconds,
    ttlSeconds,
  ]);

  return true;
}

/**
 * Invalidate cached report for a company
 */
async function deleteCachedCertificate(companyId, lab, reportNumber) {
  if (!companyId || !lab || !reportNumber) return false;
  const sql = `DELETE FROM lab_certificate_cache WHERE company_id = ? AND lab = ? AND report_number = ?`;
  await queryAsync(sql, [companyId, lab.toUpperCase(), String(reportNumber).trim()]);
  return true;
}

module.exports = {
  getCachedCertificate,
  setCachedCertificate,
  deleteCachedCertificate,
};
