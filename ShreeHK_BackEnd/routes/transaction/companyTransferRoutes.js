const express = require("express");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext, getBranchCompanyIds } = require("../../tenantHelper.js");
const { validateTransferPayload, validateReturnPayload } = require("../../validators/transaction/companyTransferValidation.js");
const companyTransferService = require("../../services/transaction/companyTransferService.js");

const companyTransferRouter = express.Router();
companyTransferRouter.use(express.json());

// Execute Inter-Company Transfer
companyTransferRouter.post(
  "/transaction/company-transfer",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userContext = buildUserContext(req);
      const validatedPayload = validateTransferPayload({
        ...req.body,
        from_company_id: req.body.from_company_id || userContext.companyId,
      });

      const result = await companyTransferService.executeTransfer(
        validatedPayload,
        userContext
      );

      return res.status(201).json({
        status: true,
        message: `Stock transferred successfully. Sale Bill: ${result.source_invoice_no}, Purchase Bill: ${result.target_invoice_no}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// List Inter-Company Transfers
companyTransferRouter.get(
  "/transaction/company-transfer/list",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userContext = buildUserContext(req);
      const branchCompanyIds = userContext.companyId
        ? await getBranchCompanyIds(userContext.companyId)
        : [];
      userContext.allowedCompanyIds = branchCompanyIds;

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        sku: req.query.sku,
        fromCompanyId: req.query.fromCompanyId ? Number(req.query.fromCompanyId) : null,
        toCompanyId: req.query.toCompanyId ? Number(req.query.toCompanyId) : null,
        status: req.query.status,
        offset,
        limit,
      };

      const result = await companyTransferService.listTransfers(filters, userContext);

      return res.status(200).json({
        status: true,
        data: result.rows,
        total: result.total,
        page,
        limit,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get Transfer Details & Bill
companyTransferRouter.get(
  "/transaction/company-transfer/:id",
  authenticateToken,
  async (req, res, next) => {
    try {
      const transferId = Number(req.params.id);
      if (!transferId) {
        return res.status(400).json({ status: false, message: "Valid transfer ID required." });
      }

      const result = await companyTransferService.getTransferDetails(transferId);
      if (!result) {
        return res.status(404).json({ status: false, message: "Transfer record not found." });
      }

      return res.status(200).json({
        status: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Process Sale Return of a Transfer
companyTransferRouter.post(
  "/transaction/company-transfer/return",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userContext = buildUserContext(req);
      const validatedPayload = validateReturnPayload(req.body);

      const result = await companyTransferService.executeSaleReturn(
        validatedPayload,
        userContext
      );

      return res.status(200).json({
        status: true,
        message: `Sale return processed successfully for Transfer #${result.transfer_no}. Stock restored to source company.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = companyTransferRouter;
