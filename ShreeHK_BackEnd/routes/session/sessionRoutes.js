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
  const token = jwt.sign({ ...claims, jti }, SECRET_KEY, { expiresIn: "8h" });
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

    if (!companyId) {
      return res.status(400).json({
        status: false,
        Message: "companyId is required",
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
        "SELECT id, name, shortcutName, logo, address, number, city, state, pincode, country, email, website, rapnet_id, skype FROM company WHERE id = ? LIMIT 1",
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
    });

    const comp = companies[0] || {};

    res.status(200).json({
      status: true,
      Message: "Session context updated",
      token,
      Data: {
        companyId,
        yearId: yearId || null,
        dbName,
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
