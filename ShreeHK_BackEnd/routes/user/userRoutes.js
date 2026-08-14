const express = require("express");
const crypto = require("crypto");
const connection = require("../../connection.js");
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../authMiddleware.js');
const { isSuperAdminRoll, getPermissionsForRoll } = require('../../permissionHelper.js');
const { addToBlacklist } = require('../../middleware/tokenBlacklist.js');
const { ensureUserActiveColumn } = require('../../services/userActiveColumnService.js');
const { touchUserPresence, clearUserPresence } = require('../../services/userPresenceService.js');
const helper = require("../../helper.js");
const { logAudit } = require("../../services/auditIntegration.js");
const userRouter = express.Router();
const md5 = require('md5');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = String(forwarded).split(",")[0].trim();
    if (ip) return ip;
  }
  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

const logFailedLogin = async (req, { username, user = null, reason }) => {
  try {
    await logAudit({
      actionType: "LOGIN_FAILED",
      moduleName: "User Management",
      recordId: user?.user_id || null,
      recordReference: String(username || "unknown").slice(0, 150),
      userId: user?.user_id || null,
      userName: user?.user_name || String(username || "Unknown user").slice(0, 150),
      userRole: user?.role_name || "",
      userRoleId: user?.roll || null,
      companyId: 1,
      newValue: { reason },
      description: `Failed login attempt for ${String(username || "unknown").slice(0, 150)}: ${reason}`,
      ipAddress: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
      status: "ATTEMPTED",
    });
  } catch (auditError) {
    console.error("Failed login audit error:", auditError);
  }
};

userRouter.use(bodyParser.json());

// ─────────────────────────────────────────────────────────
// LOGIN API
// ─────────────────────────────────────────────────────────
userRouter.post('/user/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: false, message: 'Username and password required.' });
  }

  try {
    await ensureUserActiveColumn();

    const user = await new Promise((resolve, reject) => {
      const query = `
                SELECT u.user_id, u.user_name, u.user_email, u.first_name, u.last_name,
                       u.pass, u.roll, u.profile_image, u.mobile,
                       COALESCE(u.is_active, 1) AS is_active,
                       r.name AS role_name, r.resource AS role_resource
                FROM user u
                LEFT JOIN roll r ON u.roll = r.id
                WHERE u.user_name = ? OR u.user_email = ?
                LIMIT 1
            `;
      connection.query(query, [username, username], (error, data) => {
        if (error) return reject(error);
        resolve(data[0]);
      });
    });

    if (!user) {
      await logFailedLogin(req, { username, reason: "User not found" });
      return res.status(401).json({ status: false, message: 'User not found.' });
    }

    if (Number(user.is_active) === 0) {
      await logFailedLogin(req, { username, user, reason: "Account inactive" });
      return res.status(403).json({ status: false, message: 'Your account is inactive. Contact administrator.' });
    }

    const hash = md5(password);
    if (hash !== user.pass) {
      await logFailedLogin(req, { username, user, reason: "Invalid password" });
      return res.status(401).json({ status: false, message: 'Invalid password.' });
    }

    const permissions = isSuperAdminRoll(user.roll)
      ? ['all']
      : await getPermissionsForRoll(user.roll);

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.user_name,
        roll: user.roll,
        jti,
        companyId: null,
        yearId: null,
      },
      SECRET_KEY,
      { expiresIn: '8h' }
    );

    const loginAt = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const loginDate = `${pad(loginAt.getDate())}-${pad(loginAt.getMonth() + 1)}-${loginAt.getFullYear()}`;
    const hours = loginAt.getHours();
    const loginTime = `${pad(hours % 12 || 12)}:${pad(loginAt.getMinutes())} ${hours >= 12 ? "PM" : "AM"}`;
    try {

      await helper.addNotification({
        title: "User Login",
        message: [
          `User: ${user.first_name || ""} ${user.last_name || ""}`.trim() || `User: ${user.user_name}`,
          `Username: ${user.user_name}`,
          `IP: ${getClientIp(req)}`,
          `Login At: ${loginAt.toISOString()}`,
        ].join("\n"),
        datetine: loginAt,
        user: user.user_id,
        company: 1,
      });
    } catch (notificationError) {
      // Login should not fail if notification insert fails.
      console.error("Login notification error:", notificationError);
    }

    try {
      await logAudit({
        actionType: "LOGIN",
        moduleName: "User Management",
        recordId: user.user_id,
        recordReference: user.user_name,
        userId: user.user_id,
        userName: user.user_name,
        userRole: user.role_name || "",
        userRoleId: user.roll,
        companyId: 1,
        newValue: {
          user_id: user.user_id,
          user_name: user.user_name,
          roll: user.roll,
          loginAt: loginAt.toISOString(),
          loginDate,
          loginTime,
        },
        ipAddress: getClientIp(req),
        userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
      });
    } catch (auditErr) {
      console.error("Login audit error:", auditErr);
    }

    touchUserPresence(user.user_id);

    res.status(200).json({
      status: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        user_email: user.user_email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
        roll: user.roll && Number(user.roll) > 0 ? Number(user.roll) : null,
        role: isSuperAdminRoll(user.roll) ? 'super_admin' : 'admin',
        role_name: user.role_name || null,
        has_role: Boolean(user.roll && Number(user.roll) > 0),
        permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: false, message: 'Server error.' });
  }
});

userRouter.post('/user/logout', authenticateToken, async (req, res) => {
  clearUserPresence(req.user?.user_id);

  const token =
    req.header('Authorization') && req.header('Authorization').split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.jti && decoded?.exp) {
        addToBlacklist(decoded.jti, decoded.exp);
      }
    } catch (e) {
      console.error('Logout blacklist error:', e);
    }
  }

  try {
    await logAudit({
      actionType: "LOGOUT",
      moduleName: "User Management",
      recordId: req.user?.user_id,
      recordReference: req.user?.username,
      userId: req.user?.user_id,
      userName: req.user?.username || "User",
      userRoleId: req.user?.roll,
      companyId: Number(req.companyId || req.user?.companyId) || 1,
      ipAddress: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
    });
  } catch (auditErr) {
    console.error("Logout audit error:", auditErr);
  }

  res.status(200).json({
    status: true,
    message: 'Logged out successfully',
  });
});

// Protected test route
userRouter.get('/user/protected', authenticateToken, (req, res) => {
  res.json({
    message: `Hello ${req.user.username}`,
    role: req.user.roll === 1 ? 'super_admin' : 'admin'
  });
});

module.exports = userRouter;