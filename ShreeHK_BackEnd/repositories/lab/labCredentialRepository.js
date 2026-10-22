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
 * Get raw encrypted credentials for a lab provider
 * Internal service use only. Never return this directly to API routes.
 */
async function getProviderCredential(companyId, lab) {
  if (!companyId || !lab) return null;

  const sql = `
    SELECT 
      id, company_id, lab, is_active, base_url,
      api_key_encrypted, api_secret_encrypted, extra_config_encrypted,
      last_tested_at, last_test_status, last_test_error
    FROM lab_provider_credential
    WHERE company_id = ? AND lab = ?
    LIMIT 1
  `;

  const rows = await queryAsync(sql, [companyId, lab.toUpperCase()]);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Save or update encrypted credentials for a provider
 */
async function saveProviderCredential({
  companyId,
  lab,
  isActive = 1,
  baseUrl = null,
  apiKeyEncrypted = null,
  apiSecretEncrypted = null,
  extraConfigEncrypted = null,
}) {
  if (!companyId || !lab) return false;

  const sql = `
    INSERT INTO lab_provider_credential (
      company_id, lab, is_active, base_url,
      api_key_encrypted, api_secret_encrypted, extra_config_encrypted
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      is_active = VALUES(is_active),
      base_url = COALESCE(VALUES(base_url), base_url),
      api_key_encrypted = COALESCE(VALUES(api_key_encrypted), api_key_encrypted),
      api_secret_encrypted = COALESCE(VALUES(api_secret_encrypted), api_secret_encrypted),
      extra_config_encrypted = COALESCE(VALUES(extra_config_encrypted), extra_config_encrypted),
      updated_at = NOW()
  `;

  await queryAsync(sql, [
    companyId,
    lab.toUpperCase(),
    isActive ? 1 : 0,
    baseUrl ? String(baseUrl).trim() : null,
    apiKeyEncrypted,
    apiSecretEncrypted,
    extraConfigEncrypted,
  ]);

  return true;
}

/**
 * Update connection test results
 */
async function updateTestResult(companyId, lab, status, error = null) {
  if (!companyId || !lab) return false;

  const sql = `
    INSERT INTO lab_provider_credential (
      company_id, lab, is_active, last_tested_at, last_test_status, last_test_error
    ) VALUES (?, ?, 1, NOW(), ?, ?)
    ON DUPLICATE KEY UPDATE
      last_tested_at = NOW(),
      last_test_status = VALUES(last_test_status),
      last_test_error = VALUES(last_test_error)
  `;

  await queryAsync(sql, [companyId, lab.toUpperCase(), status, error ? String(error).slice(0, 500) : null]);
  return true;
}

/**
 * Return provider statuses for a tenant with all secrets masked
 */
async function getAllProviderStatuses(companyId) {
  if (!companyId) return [];

  const sql = `
    SELECT 
      lab, is_active, base_url,
      (api_key_encrypted IS NOT NULL AND api_key_encrypted != '') AS is_configured,
      last_tested_at, last_test_status, last_test_error, updated_at
    FROM lab_provider_credential
    WHERE company_id = ?
  `;

  const rows = await queryAsync(sql, [companyId]);
  return rows || [];
}

module.exports = {
  getProviderCredential,
  saveProviderCredential,
  updateTestResult,
  getAllProviderStatuses,
};
