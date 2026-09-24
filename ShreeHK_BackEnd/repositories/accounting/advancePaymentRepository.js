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

/**
 * Fetch assigned invoice details with attached stones and paid transactions
 * @param {string|number} invoiceId
 * @param {'outward'|'inward'} type
 * @param {number} companyId
 */
async function getAssignedInvoiceDetails(invoiceId, type = "outward", companyId) {
  const isOutward = String(type).toLowerCase() === "outward" || String(type).toLowerCase() === "cr" || String(type).toLowerCase() === "credit";
  
  let header = null;
  let products = [];
  let transactions = [];

  if (isOutward) {
    const headerRows = await queryAsync(
      `SELECT o.*, p.name AS party_name, p.address AS party_address, p.contact_number AS party_contact
       FROM dai_outward o
       LEFT JOIN dai_party p ON (o.party = CAST(p.id AS CHAR) OR o.party = p.name) AND (p.company = ? OR p.company IS NULL)
       WHERE o.company = ? AND (o.id = ? OR o.invoiceno = ? OR o.entryno = ?)
       LIMIT 1`,
      [companyId, companyId, invoiceId, invoiceId, invoiceId]
    );
    header = headerRows && headerRows.length > 0 ? headerRows[0] : null;

    if (header) {
      const productIdsStr = header.products || header.return_products || "";
      const pids = String(productIdsStr)
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      if (pids.length > 0) {
        const placeholders = pids.map(() => "?").join(",");
        products = await queryAsync(
          `SELECT p.*, pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmentry AS symmetry, pv.f_intensity AS fluorescence
           FROM dai_product p
           LEFT JOIN dai_product_value pv ON p.id = pv.product_id
           WHERE p.company = ? AND p.id IN (${placeholders})`,
          [companyId, ...pids]
        );
      }

      transactions = await queryAsync(
        `SELECT t.*, sg.name AS subgroup_name, p.name AS party_name
         FROM acc_transaction t
         LEFT JOIN acc_subgroup sg ON t.under_subgroup = sg.id
         LEFT JOIN dai_party p ON (t.party = CAST(p.id AS CHAR) OR t.party = p.name) AND (p.company = ? OR p.company IS NULL)
         WHERE (t.deleted = 0 OR t.deleted IS NULL) AND t.company = ? AND (t.sale_id = ? OR t.sale_id = ?)
         ORDER BY t.date ASC, t.id ASC`,
        [companyId, companyId, header.id, String(header.id)]
      );
    }
  } else {
    const headerRows = await queryAsync(
      `SELECT i.*, p.name AS party_name, p.address AS party_address, p.contact_number AS party_contact
       FROM dai_inward i
       LEFT JOIN dai_party p ON (i.party = CAST(p.id AS CHAR) OR i.party = p.name) AND (p.company = ? OR p.company IS NULL)
       WHERE i.company = ? AND (i.id = ? OR i.invoiceno = ? OR i.entryno = ?)
       LIMIT 1`,
      [companyId, companyId, invoiceId, invoiceId, invoiceId]
    );
    header = headerRows && headerRows.length > 0 ? headerRows[0] : null;

    if (header) {
      const productIdsStr = header.products || "";
      const pids = String(productIdsStr)
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      if (pids.length > 0) {
        const placeholders = pids.map(() => "?").join(",");
        products = await queryAsync(
          `SELECT p.*, pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmentry AS symmetry, pv.f_intensity AS fluorescence
           FROM dai_product p
           LEFT JOIN dai_product_value pv ON p.id = pv.product_id
           WHERE p.company = ? AND (p.inward_id = ? OR p.id IN (${placeholders}))`,
          [companyId, header.id, ...pids]
        );
      } else {
        products = await queryAsync(
          `SELECT p.*, pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmentry AS symmetry, pv.f_intensity AS fluorescence
           FROM dai_product p
           LEFT JOIN dai_product_value pv ON p.id = pv.product_id
           WHERE p.company = ? AND p.inward_id = ?`,
          [companyId, header.id]
        );
      }

      transactions = await queryAsync(
        `SELECT t.*, sg.name AS subgroup_name, p.name AS party_name
         FROM acc_transaction t
         LEFT JOIN acc_subgroup sg ON t.under_subgroup = sg.id
         LEFT JOIN dai_party p ON (t.party = CAST(p.id AS CHAR) OR t.party = p.name) AND (p.company = ? OR p.company IS NULL)
         WHERE (t.deleted = 0 OR t.deleted IS NULL) AND t.company = ? AND (t.purchase_id = ? OR t.purchase_id = ?)
         ORDER BY t.date ASC, t.id ASC`,
        [companyId, companyId, header.id, String(header.id)]
      );
    }
  }

  return {
    header,
    type: isOutward ? "outward" : "inward",
    products: products || [],
    transactions: transactions || [],
  };
}

module.exports = {
  queryAsync,
  getAdvancePaymentsByCompany,
  getAdvancePaymentByIdAndCompany,
  getAdvancePaymentFullByIdAndCompany,
  getAssignedInvoiceDetails,
  insertAdvancePayment,
  updateAdvancePayment,
  deleteAdvancePaymentByIdAndCompany,
};
