const express = require("express");
const ExpansePayment = express.Router();
ExpansePayment.use(express.json());

const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const expenseService = require("../../services/accounting/expensePaymentService.js");
const {
  parseExpensePaymentBody,
  validateDeleteExpenseQuery,
} = require("../../validators/accounting/expensePaymentValidation.js");

// GET expanse payment data API
ExpansePayment.get("/expanse/get", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const result = await expenseService.getExpensePayments(companyId);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ err: err.message });
  }
});

// POST expanse payment API (Create or Update)
ExpansePayment.post("/expanse-payment", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const payload = parseExpensePaymentBody(req.body);
    const auditContext = {
      pagePath: req.headers["x-audit-page-path"],
      pageLabel: req.headers["x-audit-page-label"],
    };

    const result = await expenseService.saveExpensePayment(payload, companyId, auditContext);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE expanse payment API
ExpansePayment.delete("/expanse-delete", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const validation = validateDeleteExpenseQuery(req.query, companyId);

    if (!validation.isValid) {
      return res.status(validation.statusCode).json({ error: validation.error });
    }

    const auditContext = {
      pagePath: req.headers["x-audit-page-path"],
      pageLabel: req.headers["x-audit-page-label"],
    };

    const result = await expenseService.deleteExpensePayment(validation.id, companyId, auditContext);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = ExpansePayment;