const connection = require("../../connection.js");
const moment = require("moment");

/**
 * Execute SQL query as a Promise
 * @param {string} sql
 * @param {any[]} values
 * @returns {Promise<any>}
 */
function queryAsync(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

/**
 * Query general transactions with filters and double party join
 * @param {Object} filters
 * @param {number} companyId
 */
async function getTransactionsFromDb(filters = {}, companyId) {
  let sql = `SELECT t.id, t.date, t.cheque, t.description, t.party, t.type, t.amount, t.book, t.other_party,
    p1.name AS party_name,
    p2.name AS other_party_name
    FROM acc_transaction t
    LEFT JOIN dai_party p1 ON (t.party = CAST(p1.id AS CHAR) OR t.party = p1.name) AND p1.company = ?
    LEFT JOIN dai_party p2 ON (t.other_party = CAST(p2.id AS CHAR) OR t.other_party = p2.name) AND p2.company = ?
    WHERE (t.deleted = 0 OR t.deleted IS NULL) AND t.company = ?`;
  const values = [companyId, companyId, companyId];

  if (filters.book) {
    sql += " AND t.book = ?";
    values.push(filters.book);
  }
  if (filters.party || filters.partyId) {
    const partyVal = filters.party || filters.partyId;
    const partyIdVal = filters.partyId || filters.party;
    sql += " AND (t.party = ? OR t.party = ? OR p1.name = ? OR t.party = (SELECT CAST(id AS CHAR) FROM dai_party WHERE name = ? AND company = ? LIMIT 1))";
    values.push(partyVal, partyIdVal, partyVal, partyVal, companyId);
  }
  if (filters.other_party || filters.otherParty) {
    const otherP = filters.other_party || filters.otherParty;
    sql += " AND (t.other_party = ? OR p2.name = ? OR t.other_party = (SELECT CAST(id AS CHAR) FROM dai_party WHERE name = ? AND company = ? LIMIT 1))";
    values.push(otherP, otherP, otherP, companyId);
  }
  if (filters.fromDate) {
    sql += " AND t.date >= ?";
    values.push(moment(filters.fromDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
  }
  if (filters.toDate) {
    sql += " AND t.date <= ?";
    values.push(moment(filters.toDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
  }

  sql += " ORDER BY t.date ASC, t.id ASC";

  return queryAsync(sql, values);
}

/**
 * Query advance transactions for ledger report
 * @param {Object} filters
 * @param {number} companyId
 */
async function getAdvanceReportTransactionsFromDb(filters = {}, companyId) {
  let sql = `SELECT id, party, date, type, book, cheque, amount, description FROM acc_advance WHERE company = ?`;
  const values = [companyId];

  if (filters.party && filters.party !== "0") {
    sql += " AND party = ?";
    values.push(filters.party);
  }
  if (filters.book) {
    sql += " AND book = ?";
    values.push(filters.book);
  }
  if (filters.fromDate) {
    sql += " AND date >= ?";
    values.push(moment(filters.fromDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
  }
  if (filters.toDate) {
    sql += " AND date <= ?";
    values.push(moment(filters.toDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
  }

  sql += " ORDER BY date ASC, id ASC";

  return queryAsync(sql, values);
}

/**
 * Fetch distinct account/bank names for dropdown
 * @param {number} companyId
 */
async function getDistinctBooksFromDb(companyId) {
  const sql = `SELECT DISTINCT TRIM(bank) AS name 
               FROM dai_balance 
               WHERE (company = ? OR company IS NULL) AND bank IS NOT NULL AND TRIM(bank) <> ''
               ORDER BY name`;
  return queryAsync(sql, [companyId]);
}

module.exports = {
  queryAsync,
  getTransactionsFromDb,
  getAdvanceReportTransactionsFromDb,
  getDistinctBooksFromDb,
};
