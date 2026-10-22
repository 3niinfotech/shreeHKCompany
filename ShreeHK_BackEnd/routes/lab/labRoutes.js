const express = require("express");
const { authenticateToken, requirePagePermission } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const labService = require("../../services/lab/labService.js");
const {
  validateFetchReport,
  validateBulkFetch,
  validateSaveCredential,
  validateApplyLabData,
} = require("../../validators/lab/labValidation.js");

let rateLimit;
try {
  rateLimit = require("express-rate-limit");
} catch (e) {
  rateLimit = null;
}

const labRouter = express.Router();
labRouter.use(express.json());

// Per-company / per-user rate limiter (60 fetches per minute)
const labFetchLimiter = rateLimit
  ? rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const userCtx = buildUserContext(req);
        return `lab_${userCtx.companyId || req.ip}`;
      },
      message: {
        status: false,
        statusCode: 429,
        message: "Lab certificate request rate limit reached. Please wait a minute.",
      },
    })
  : (req, res, next) => next();

/**
 * POST /api/lab/fetch
 * Fetch single report (from cache or live/mock provider)
 * Requires permission: lab.fetch
 */
labRouter.post(
  "/fetch",
  authenticateToken,
  requirePagePermission("lab.fetch"),
  labFetchLimiter,
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;

      if (!companyId || companyId <= 0) {
        return res.status(400).json({ status: false, message: "Valid company tenant context is required" });
      }

      const validation = validateFetchReport(req.body);
      if (!validation.isValid) {
        return res.status(validation.statusCode).json({ status: false, message: validation.error });
      }

      const { lab, reportNumber, forceRefresh } = validation.data;
      const result = await labService.fetchCertificate({
        lab,
        reportNumber,
        forceRefresh,
        companyId,
        userId: userCtx.userId,
      });

      return res.status(result.statusCode || (result.status ? 200 : 500)).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/lab/fetch-bulk
 * Fetch multiple reports with concurrency throttling
 * Requires permission: lab.fetch.bulk
 */
labRouter.post(
  "/fetch-bulk",
  authenticateToken,
  requirePagePermission("lab.fetch.bulk"),
  labFetchLimiter,
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;

      if (!companyId || companyId <= 0) {
        return res.status(400).json({ status: false, message: "Valid company tenant context is required" });
      }

      const validation = validateBulkFetch(req.body);
      if (!validation.isValid) {
        return res.status(validation.statusCode).json({ status: false, message: validation.error });
      }

      const result = await labService.fetchBulkCertificates({
        items: validation.data.items,
        companyId,
        userId: userCtx.userId,
        dryRun: Boolean(req.body.dryRun),
      });

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * GET /api/lab/providers/status
 * Get status of configured providers for the active company
 * Requires permission: lab.manage
 */
labRouter.get(
  "/providers/status",
  authenticateToken,
  requirePagePermission("lab.manage"),
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;

      const result = await labService.getProviderStatuses(companyId);
      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/lab/providers/credential
 * Save/update encrypted credentials for a provider
 * Requires permission: lab.manage
 */
labRouter.post(
  "/providers/credential",
  authenticateToken,
  requirePagePermission("lab.manage"),
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;

      const validation = validateSaveCredential(req.body);
      if (!validation.isValid) {
        return res.status(validation.statusCode).json({ status: false, message: validation.error });
      }

      const result = await labService.saveProviderCredential({
        companyId,
        ...validation.data,
      });

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/lab/providers/test
 * Test provider connection and persist test status
 * Requires permission: lab.manage
 */
labRouter.post(
  "/providers/test",
  authenticateToken,
  requirePagePermission("lab.manage"),
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;
      const { lab, reportNumber } = req.body || {};

      if (!lab) {
        return res.status(400).json({ status: false, message: "lab parameter is required" });
      }

      const result = await labService.testProviderConnection({
        companyId,
        lab,
        reportNumber,
      });

      return res.status(result.statusCode || 200).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * Middleware: Requires BOTH 'transaction.stone_update' AND 'lab.fetch' (or superadmin 'all')
 */
const requireApplyPermission = async (req, res, next) => {
  const { hasPagePermission, isSuperAdminRoll, getPermissionsForRoll } = require("../../permissionHelper.js");
  if (!req.user) {
    return res.status(401).json({ status: false, message: "Not authenticated." });
  }

  if (isSuperAdminRoll(req.user.roll)) return next();

  let perms = req.user.permissions;
  if (!perms && req.user.roll) {
    try {
      perms = await getPermissionsForRoll(req.user.roll);
    } catch {
      perms = [];
    }
  }
  perms = perms || [];

  const hasStoneUpdate = perms.includes("all") || hasPagePermission(perms, "transaction.stone_update");
  const hasLabFetch = perms.includes("all") || hasPagePermission(perms, "lab.fetch");

  if (!hasStoneUpdate || !hasLabFetch) {
    return res.status(403).json({
      status: false,
      message: "Permission denied. Requires both 'transaction.stone_update' and 'lab.fetch' permissions to apply certificate data.",
    });
  }
  next();
};

/**
 * POST /api/lab/apply
 * Apply lab grading data to stone (supports selective fields, blocks sold/memo/hold, checks report_no)
 * Requires permission: transaction.stone_update AND lab.fetch
 */
labRouter.post(
  "/apply",
  authenticateToken,
  requireApplyPermission,
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;

      if (!companyId || companyId <= 0) {
        return res.status(400).json({ status: false, message: "Valid company tenant context is required" });
      }

      const validation = validateApplyLabData(req.body);
      if (!validation.isValid) {
        return res.status(validation.statusCode).json({ status: false, message: validation.error });
      }

      const result = await labService.applyLabDataToStone({
        ...validation.data,
        companyId,
        userCtx,
      });

      return res.status(result.statusCode || (result.status ? 200 : 400)).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/lab/apply-to-stone (Alias to /apply)
 */
labRouter.post(
  "/apply-to-stone",
  authenticateToken,
  requireApplyPermission,
  async (req, res) => {
    try {
      const userCtx = buildUserContext(req);
      const companyId = userCtx.companyId;

      if (!companyId || companyId <= 0) {
        return res.status(400).json({ status: false, message: "Valid company tenant context is required" });
      }

      const validation = validateApplyLabData(req.body);
      if (!validation.isValid) {
        return res.status(validation.statusCode).json({ status: false, message: validation.error });
      }

      const result = await labService.applyLabDataToStone({
        ...validation.data,
        companyId,
        userCtx,
      });

      return res.status(result.statusCode || (result.status ? 200 : 400)).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal server error" });
    }
  }
);

/**
 * GET /api/lab/pdf-proxy
 * Securely stream lab certificate PDF without leaking provider API keys
 * Requires permission: lab.fetch
 */
labRouter.get(
  "/pdf-proxy",
  authenticateToken,
  requirePagePermission("lab.fetch"),
  async (req, res) => {
    try {
      const reportNo = String(req.query.reportNumber || req.query.reportNo || "").trim();
      const lab = String(req.query.lab || "GIA").trim().toUpperCase();

      if (!reportNo) {
        return res.status(400).json({ status: false, message: "reportNumber is required" });
      }

      // In mock mode or when no direct PDF binary stream is needed, redirect safely to official report check
      if (lab === "GIA") {
        return res.redirect(`https://www.gia.edu/report-check?reportno=${reportNo}`);
      }

      return res.status(404).json({ status: false, message: "PDF proxy not available for this provider" });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }
);

labRouter.requireApplyPermission = requireApplyPermission;

module.exports = labRouter;
