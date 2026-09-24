const moment = require("moment");
const transactionRepository = require("../../repositories/accounting/transactionRepository.js");

/**
 * Format a raw database transaction row into a standardized ledger response object
 * @param {Object} row
 * @param {number} no
 * @param {number} balance
 */
function mapTxnRow(row, no, balance) {
  const amount = parseFloat(row.amount) || 0;
  const isCredit = String(row.type).toLowerCase() === "cr" || String(row.type).toLowerCase() === "credit";
  const credit = isCredit ? amount : 0;
  const debit = !isCredit ? amount : 0;
  return {
    no,
    date: row.date ? moment(row.date).format("DD-MM-YYYY") : "",
    account: row.book || "",
    party: row.party_name || row.party || "",
    otherParty: row.other_party_name || row.other_party || "",
    cheque: row.cheque || "",
    description: row.description || "",
    credit: credit.toFixed(2),
    debit: debit.toFixed(2),
    balance: balance.toFixed(2),
  };
}

/**
 * Fetch general transaction ledger records with sequential running balance
 * @param {Object} filters
 * @param {number} companyId
 */
async function getGeneralLedgerTransactions(filters, companyId) {
  if (!companyId || companyId <= 0) {
    return {
      status: true,
      message: "Transaction Data Fetched Successfully",
      data: [],
    };
  }

  const rows = await transactionRepository.getTransactionsFromDb(filters, companyId);
  let balance = 0;
  const data = rows.map((row, idx) => {
    const amount = parseFloat(row.amount) || 0;
    const isCredit = String(row.type).toLowerCase() === "cr" || String(row.type).toLowerCase() === "credit";
    balance += isCredit ? amount : -amount;
    return mapTxnRow(row, idx + 1, balance);
  });

  return {
    status: true,
    message: "Transaction Data Fetched Successfully",
    data,
  };
}

/**
 * Fetch advance transaction ledger report with sequential running balance
 * @param {Object} filters
 * @param {number} companyId
 */
async function getAdvanceReportTransactions(filters, companyId) {
  if (!companyId || companyId <= 0) {
    return {
      status: true,
      data: [],
    };
  }

  const rows = await transactionRepository.getAdvanceReportTransactionsFromDb(filters, companyId);
  let balance = 0;
  const data = rows.map((row, idx) => {
    const amount = parseFloat(row.amount) || 0;
    const isCredit = String(row.type).toLowerCase() === "cr" || String(row.type).toLowerCase() === "credit";
    balance += isCredit ? amount : -amount;
    return {
      no: idx + 1,
      date: row.date ? moment(row.date).format("DD-MM-YYYY") : "",
      account: row.book || "",
      party: row.party || "",
      otherParty: "",
      cheque: row.cheque || "",
      description: row.description || "",
      credit: isCredit ? amount.toFixed(2) : "0.00",
      debit: !isCredit ? amount.toFixed(2) : "0.00",
      balance: balance.toFixed(2),
    };
  });

  return {
    status: true,
    data,
  };
}

/**
 * Fetch books/accounts list for dropdown
 * @param {number} companyId
 */
async function getBooksDropdown(companyId) {
  if (!companyId || companyId <= 0) {
    return {
      status: true,
      Data: [],
    };
  }

  const rows = await transactionRepository.getDistinctBooksFromDb(companyId);
  return {
    status: true,
    Data: rows.map((r) => ({ value: r.name, label: r.name })),
  };
}

module.exports = {
  mapTxnRow,
  getGeneralLedgerTransactions,
  getAdvanceReportTransactions,
  getBooksDropdown,
};
