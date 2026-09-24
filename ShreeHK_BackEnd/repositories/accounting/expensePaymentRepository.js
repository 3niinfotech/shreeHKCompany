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
 * Fetch expense payments for a tenant company
 * @param {number} companyId
 */
async function getExpensePaymentsByCompany(companyId) {
  const sql = `SELECT id, party, other_party, date, type, book, cheque, amount, description
               FROM acc_transaction
               WHERE company = ?
               ORDER BY id DESC`;
  return queryAsync(sql, [companyId]);
}

/**
 * Fetch a single expense payment by ID and company
 * @param {number} id
 * @param {number} companyId
 */
async function getExpensePaymentByIdAndCompany(id, companyId) {
  const sql = `SELECT party, other_party, date, type, book, cheque, amount, description FROM acc_transaction WHERE id = ? AND company = ?`;
  const rows = await queryAsync(sql, [id, companyId]);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Fetch full expense payment row by ID and company (used for delete audit pre-snapshot)
 * @param {number} id
 * @param {number} companyId
 */
async function getExpensePaymentFullByIdAndCompany(id, companyId) {
  const sql = `SELECT * FROM acc_transaction WHERE id = ? AND company = ? LIMIT 1`;
  const rows = await queryAsync(sql, [id, companyId]);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Insert a new expense payment
 * @param {Object} data
 */
async function insertExpensePayment({ party, other_party, date, type, book, cheque, amount, description, companyId }) {
  const sql = `INSERT INTO acc_transaction
               (party, other_party, date, type, book, cheque, amount, description, company) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [party, other_party, date, type, book, cheque, amount, description, companyId];
  const result = await queryAsync(sql, params);
  return result?.insertId;
}

/**
 * Update an existing expense payment
 * @param {Object} data
 */
async function updateExpensePayment({ id, party, other_party, date, type, book, cheque, amount, description, companyId }) {
  const sql = `UPDATE acc_transaction
               SET party = ?, other_party = ?, date = ?, type = ?, book = ?, cheque = ?, amount = ?, description = ?, company = ?
               WHERE id = ? AND company = ?`;
  const params = [party, other_party, date, type, book, cheque, amount, description, companyId, id, companyId];
  return queryAsync(sql, params);
}

/**
 * Delete an expense payment by ID and company
 * @param {number} id
 * @param {number} companyId
 */
async function deleteExpensePaymentByIdAndCompany(id, companyId) {
  const sql = `DELETE FROM acc_transaction WHERE id = ? AND company = ?`;
  return queryAsync(sql, [id, companyId]);
}

module.exports = {
  queryAsync,
  getExpensePaymentsByCompany,
  getExpensePaymentByIdAndCompany,
  getExpensePaymentFullByIdAndCompany,
  insertExpensePayment,
  updateExpensePayment,
  deleteExpensePaymentByIdAndCompany,
};
