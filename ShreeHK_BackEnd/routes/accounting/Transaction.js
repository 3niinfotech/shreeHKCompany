const express = require("express");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const transactionService = require("../../services/accounting/transactionService.js");
const {
  parseTransactionFilters,
  parseAdvanceReportFilters,
} = require("../../validators/accounting/transactionValidation.js");

const Transaction = express.Router();
Transaction.use(express.json());

// POST /transaction - General transaction ledger report
Transaction.post("/transaction", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const filters = parseTransactionFilters(req.body);
    const result = await transactionService.getGeneralLedgerTransactions(filters, companyId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// POST /transaction/advance-report - Advance transaction report
Transaction.post("/transaction/advance-report", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const filters = parseAdvanceReportFilters(req.body);
    const result = await transactionService.getAdvanceReportTransactions(filters, companyId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// GET /transaction/books - Distinct books dropdown options
Transaction.get("/transaction/books", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const result = await transactionService.getBooksDropdown(companyId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = Transaction;
