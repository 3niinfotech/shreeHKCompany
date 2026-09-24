const express = require("express");
const AdvancePayment = express.Router();
AdvancePayment.use(express.json());

const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const advanceService = require("../../services/accounting/advancePaymentService.js");
const {
  parseAdvancePaymentBody,
  validateDeleteAdvanceQuery,
} = require("../../validators/accounting/advancePaymentValidation.js");

// GET advance payment data API
AdvancePayment.get("/advance/get", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const result = await advanceService.getAdvancePayments(companyId);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ err: err.message });
  }
});

// GET assigned invoice details API (with attached stones and payment history)
AdvancePayment.get("/advance/assigned-invoice", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const invoiceId = req.query.invoiceId || req.query.id;
    const type = req.query.type || "outward";
    const result = await advanceService.getAssignedInvoice(invoiceId, type, companyId);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// POST advance payment API (Create or Update)
AdvancePayment.post("/advance-payment", authenticateToken, async (req, res) => {
  try {
    const contextCompanyId = buildUserContext(req).companyId;
    const payload = parseAdvancePaymentBody(req.body, contextCompanyId);
    const auditContext = {
      pagePath: req.headers["x-audit-page-path"],
      pageLabel: req.headers["x-audit-page-label"],
    };

    const result = await advanceService.saveAdvancePayment(payload, contextCompanyId, auditContext);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE advance payment API
AdvancePayment.delete("/advance-delete", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    const validation = validateDeleteAdvanceQuery(req.query, companyId);

    if (!validation.isValid) {
      return res.status(validation.statusCode).json({ error: validation.error });
    }

    const auditContext = {
      pagePath: req.headers["x-audit-page-path"],
      pageLabel: req.headers["x-audit-page-label"],
    };

    const result = await advanceService.deleteAdvancePayment(validation.id, companyId, auditContext);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = AdvancePayment;
