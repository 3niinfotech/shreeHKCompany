const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { isBlacklisted } = require("../../middleware/tokenBlacklist.js");
const {
  metaQuery,
  userCanAccessCompany,
  resolveYearDbName,
} = require("../../tenantHelper.js");

const sessionRouter = express.Router();
sessionRouter.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || "NitechDigitalServices";

const issueSessionToken = (claims) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...claims, jti }, SECRET_KEY, { expiresIn: "2h" });
  return { token, jti };
};

/**
 * Legacy parity: venya/dai/checkSession.php → s0 | s1 | s2
 */
sessionRouter.get("/session/keepalive", (req, res) => {
  const token =
    req.header("Authorization") && req.header("Authorization").split(" ")[1];

  if (!token) {
    return res.status(200).json({
      status: true,
      state: "s0",
      Message: "No active session",
    });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err || isBlacklisted(decoded?.jti)) {
      return res.status(200).json({
        status: true,
        state: "s0",
        Message: "Session expired or revoked",
      });
    }

    const clientCompanyId =
      req.query.companyId != null && req.query.companyId !== ""
        ? Number(req.query.companyId)
        : null;
    const clientYearId =
      req.query.yearId != null && req.query.yearId !== ""
        ? Number(req.query.yearId)
        : null;
    const clientDbName = req.query.dbName || null;

    if (
      clientCompanyId != null &&
      decoded.companyId != null &&
      clientCompanyId !== Number(decoded.companyId)
    ) {
      return res.status(200).json({
        status: true,
        state: "s2",
        Message: "Company context mismatch",
      });
    }

    if (
      clientYearId != null &&
      decoded.yearId != null &&
      clientYearId !== Number(decoded.yearId)
    ) {
      return res.status(200).json({
        status: true,
        state: "s2",
        Message: "Year context mismatch",
      });
    }

    if (clientDbName && decoded.dbName && clientDbName !== decoded.dbName) {
      return res.status(200).json({
        status: true,
        state: "s2",
        Message: "Database context mismatch",
      });
    }

    return res.status(200).json({
      status: true,
      state: "s1",
      Message: "Session valid",
      Data: {
        companyId: decoded.companyId ?? null,
        yearId: decoded.yearId ?? null,
        dbName: decoded.dbName ?? null,
      },
    });
  });
});

/**
 * Legacy parity: venya/dai/setSession.php — switch company/year context
 */
sessionRouter.post("/session/context", authenticateToken, async (req, res) => {
  try {
    const companyId = Number(req.body?.companyId) || 0;
    const yearId = Number(req.body?.yearId) || 0;
    const branchId = Number(req.body?.branchId) || 0;

    // Branch + Year only (no company yet) — user creates company after login
    if (!companyId && branchId && yearId) {
      const branches = await metaQuery(
        "SELECT id, name, shortcutName FROM branch WHERE id = ? AND status = 1 LIMIT 1",
        [branchId]
      );
      if (!branches.length) {
        return res.status(404).json({
          status: false,
          Message: "Branch not found",
        });
      }
      const dbName = await resolveYearDbName(yearId);
      const branch = branches[0];
      const branchLabel = branch.name || branch.shortcutName || "Branch";
      const { token } = issueSessionToken({
        user_id: req.user.user_id,
        username: req.user.username,
        roll: req.user.roll,
        companyId: 0,
        branchId,
        yearId,
        dbName: dbName || connection.META_DB,
      });
      const isFirstLoginContext =
        req.user.companyId == null ||
        req.user.companyId === "" ||
        Number(req.user.companyId) === 0;
      return res.status(200).json({
        status: true,
        Message: isFirstLoginContext
          ? `Login successful — Branch: ${branchLabel} (add company from Admin)`
          : `Switched successfully — Branch: ${branchLabel}`,
        token,
        Data: {
          companyId: 0,
          yearId,
          dbName: dbName || connection.META_DB,
          branchId,
          branchName: branchLabel,
          companyName: null,
          companyShortcutName: null,
          companyLogo: null,
          companyAddress: null,
          companyNumber: null,
          companyTel: null,
          companyCity: null,
          companyState: null,
          companyPincode: null,
          companyCountry: null,
          companyEmail: null,
          companyWebsite: null,
          companyRapnetId: null,
          companySkypeId: null,
          companySkype: null,
        },
      });
    }

    if (!companyId) {
      return res.status(400).json({
        status: false,
        Message: "companyId is required (or pass branchId + yearId to enter without company)",
      });
    }

    const allowed = await userCanAccessCompany(req.user.roll, companyId);
    if (!allowed) {
      return res.status(403).json({
        status: false,
        Message: "Company not found or access denied",
      });
    }

    let companies;
    try {
      companies = await metaQuery(
        `SELECT c.id, c.name, c.shortcutName, c.logo, c.address, c.number, c.city, c.state,
                c.pincode, c.country, c.email, c.website, c.rapnet_id, c.skype, c.branch_id,
                b.name AS branch_name, b.shortcutName AS branch_shortcut
         FROM company c
         LEFT JOIN branch b ON b.id = c.branch_id
         WHERE c.id = ? LIMIT 1`,
        [companyId]
      );
    } catch {
      try {
        companies = await metaQuery(
          "SELECT id, name, shortcutName, logo, address, number, city, state, pincode, country, email, website, rapnet_id, skype, branch_id FROM company WHERE id = ? LIMIT 1",
          [companyId]
        );
      } catch {
        try {
          companies = await metaQuery(
            "SELECT id, name, shortcutName, logo, address, number, city, state, pincode, country, email, website, rapnet_id FROM company WHERE id = ? LIMIT 1",
            [companyId]
          );
        } catch {
          companies = await metaQuery(
            "SELECT id, name, shortcutName FROM company WHERE id = ? LIMIT 1",
            [companyId]
          );
        }
      }
    }
    if (!companies.length) {
      return res.status(404).json({
        status: false,
        Message: "Company not found or access denied",
      });
    }

    const dbName = yearId ? await resolveYearDbName(yearId) : connection.META_DB;

    const { token } = issueSessionToken({
      user_id: req.user.user_id,
      username: req.user.username,
      roll: req.user.roll,
      companyId,
      yearId: yearId || null,
      dbName,
      branchId: companies[0].branch_id || null,
    });

    const comp = companies[0] || {};
    const isFirstLoginContext =
      req.user.companyId == null ||
      req.user.companyId === "" ||
      Number(req.user.companyId) === 0;

    const branchLabel = comp.branch_name || comp.branch_shortcut || null;
    const companyLabel = comp.name || comp.shortcutName || "Company";
    const contextLabel = branchLabel
      ? `Branch: ${branchLabel} | Company: ${companyLabel}`
      : `Company: ${companyLabel}`;
    const successMessage = isFirstLoginContext
      ? `Login successful — ${contextLabel}`
      : `Switched successfully — ${contextLabel}`;

    res.status(200).json({
      status: true,
      Message: successMessage,
      token,
      Data: {
        companyId,
        yearId: yearId || null,
        dbName,
        branchId: comp.branch_id || null,
        branchName: branchLabel,
        companyName: comp.name,
        companyShortcutName: comp.shortcutName || null,
        companyLogo: comp.logo || null,
        companyAddress: comp.address || null,
        companyNumber: comp.number || null,
        companyTel: comp.number || null,
        companyCity: comp.city || null,
        companyState: comp.state || null,
        companyPincode: comp.pincode || null,
        companyCountry: comp.country || null,
        companyEmail: comp.email || null,
        companyWebsite: comp.website || null,
        companyRapnetId: comp.rapnet_id || null,
        companySkypeId: comp.skype || comp.skype_id || comp.skypeId || null,
        companySkype: comp.skype || comp.skype_id || comp.skypeId || null,
      },
    });
  } catch (err) {
    res.status(500).json({ status: false, Message: err.message });
  }
});

module.exports = sessionRouter;
