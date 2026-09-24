const connection = require("../../connection.js");

/**
 * Execute SQL query as a Promise
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any>}
 */
function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

/**
 * Fetch advance payments for a tenant company with party join
 * @param {number} companyId
 */
async function getAdvancePaymentsByCompany(companyId) {
  const sql = `
    SELECT a.id, a.party, a.date, a.type, a.book, a.cheque, a.amount, a.use_amount, a.balance_amount, a.invoice, a.invoice_id, a.assign_date, a.description, a.company, a.user,
           p.name AS party_name
    FROM acc_advance a
    LEFT JOIN dai_party p ON (a.party = CAST(p.id AS CHAR) OR a.party = p.name) AND (p.company = ? OR p.company IS NULL)
    WHERE (a.deleted = 0 OR a.deleted IS NULL) AND a.company = ?
    ORDER BY a.id DESC
  `;
  return queryAsync(sql, [companyId, companyId]);
}

/**
 * Fetch an advance payment record by ID and company
 * @param {number} id
 * @param {number} companyId
 */
async function getAdvancePaymentByIdAndCompany(id, companyId) {
  const sql = `SELECT party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user FROM acc_advance WHERE id = ? AND company = ?`;
  const rows = await queryAsync(sql, [id, companyId]);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Fetch full advance payment row by ID and company (used for delete audit pre-snapshot)
 * @param {number} id
 * @param {number} companyId
 */
async function getAdvancePaymentFullByIdAndCompany(id, companyId) {
  const sql = `SELECT * FROM acc_advance WHERE id = ? AND company = ? LIMIT 1`;
  const rows = await queryAsync(sql, [id, companyId]);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Insert a new advance payment record
 * @param {Object} data
 */
async function insertAdvancePayment({ party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user }) {
  const sql = `INSERT INTO acc_advance 
               (party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user];
  const result = await queryAsync(sql, params);
  return result?.insertId;
}

/**
 * Update an existing advance payment record
 * @param {Object} data
 */
async function updateAdvancePayment({ id, party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user, contextCompanyId }) {
  const sql = `UPDATE acc_advance
               SET party = ?, date = ?, type = ?, book = ?, cheque = ?, amount = ?, use_amount = ?, balance_amount = ?, invoice = ?, assign_date = ?, description = ?, company = ?, user = ?
               WHERE id = ? AND company = ?`;
  const params = [party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user, id, contextCompanyId];
  return queryAsync(sql, params);
}

/**
 * Delete an advance payment record by ID and company
 * @param {number} id
 * @param {number} companyId
 */
async function deleteAdvancePaymentByIdAndCompany(id, companyId) {
  const sql = `DELETE FROM acc_advance WHERE id = ? AND company = ?`;
  return queryAsync(sql, [id, companyId]);
}

module.exports = {
  queryAsync,
  getAdvancePaymentsByCompany,
  getAdvancePaymentByIdAndCompany,
  getAdvancePaymentFullByIdAndCompany,
  insertAdvancePayment,
  updateAdvancePayment,
  deleteAdvancePaymentByIdAndCompany,
};
