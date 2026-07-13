const express = require("express");
const jwt = require("jsonwebtoken");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const {
  addSubscriber,
  removeSubscriber,
} = require("../../services/notificationRealtimeService.js");

const notificationRouter = express.Router();
notificationRouter.use(express.json());

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const SECRET_KEY = process.env.JWT_SECRET || "NitechDigitalServices";

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
};

const ensureReadStateTable = async () => {
  await helper.query(
    `CREATE TABLE IF NOT EXISTS notification_read_state (
      user_id INT NOT NULL PRIMARY KEY,
      last_read_notification_id INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1`
  );
};

const getUserCompanyId = (req) => Number(req.companyId ?? req.user?.companyId) || helper.DEFAULT_COMPANY_ID;
const getUserId = (req) => Number(req.user?.user_id) || helper.DEFAULT_USER_ID;

const authenticateStreamToken = (req, res, next) => {
  const queryToken = req.query?.token;
  const headerToken = req.header("Authorization")?.split(" ")[1];
  const token = queryToken || headerToken;
  if (!token) {
    return res.status(401).json({ status: false, message: "Unauthorized access" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ status: false, message: "Forbidden access" });
    }
    req.user = user;
    next();
  });
};

const NOTIFICATION_BASE_FILTER = `
  company = ?
  AND LOWER(COALESCE(title, '')) NOT LIKE '%price changed%'
`;

const getLastReadIdSql = `
  COALESCE((
    SELECT last_read_notification_id
    FROM notification_read_state
    WHERE user_id = ?
    LIMIT 1
  ), 0)
`;

notificationRouter.get("/notification/stream", authenticateStreamToken, (req, res) => {
  const companyId = getUserCompanyId(req);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  addSubscriber(companyId, res);

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeSubscriber(companyId, res);
    try {
      res.end();
    } catch (_) {
      // no-op
    }
  });
});

notificationRouter.get("/notification", authenticateToken, async (req, res) => {
  try {
    await ensureReadStateTable();

    const companyId = getUserCompanyId(req);
    const userId = getUserId(req);
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const offset = toPositiveInt(req.query.offset, 0);
    const paginationOffset = offset * limit;

    const [readRows, rows, totalRows] = await Promise.all([
      helper.query(
        "SELECT last_read_notification_id FROM notification_read_state WHERE user_id = ? LIMIT 1",
        [userId]
      ),
      helper.query(
        `SELECT id, title, message, image, user, company, datetine
         FROM notification
         WHERE ${NOTIFICATION_BASE_FILTER}
           AND id > ${getLastReadIdSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [companyId, userId, limit, paginationOffset]
      ),
      helper.query(
        `SELECT COUNT(*) AS totalItems
         FROM notification
         WHERE ${NOTIFICATION_BASE_FILTER}
           AND id > ${getLastReadIdSql}`,
        [companyId, userId]
      ),
    ]);

    const lastReadId = Number(readRows?.[0]?.last_read_notification_id || 0);
    const unreadCount = Number(totalRows?.[0]?.totalItems || 0);
    const data = rows.map((item) => ({
      ...item,
      is_read: false,
    }));

    return res.status(200).json({
      TotalItems: unreadCount,
      UnreadCount: unreadCount,
      LastReadId: lastReadId,
      Data: data,
    });
  } catch (error) {
    console.error("GET /notification error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch notifications.",
    });
  }
});

notificationRouter.post("/notification/read-all", authenticateToken, async (req, res) => {
  try {
    await ensureReadStateTable();
    const companyId = getUserCompanyId(req);
    const userId = getUserId(req);

    const latestRows = await helper.query(
      `SELECT COALESCE(MAX(id), 0) AS latestId
       FROM notification
       WHERE company = ?`,
      [companyId]
    );
    const latestId = Number(latestRows?.[0]?.latestId || 0);

    await helper.query(
      `INSERT INTO notification_read_state (user_id, last_read_notification_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE last_read_notification_id = VALUES(last_read_notification_id)`,
      [userId, latestId]
    );

    return res.status(200).json({
      status: true,
      message: "All notifications marked as read.",
      lastReadNotificationId: latestId,
    });
  } catch (error) {
    console.error("POST /notification/read-all error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update notification read state.",
    });
  }
});

notificationRouter.post("/notification/read", authenticateToken, async (req, res) => {
  try {
    await ensureReadStateTable();
    const userId = getUserId(req);
    const notificationId = Number(req.body?.notificationId || 0);

    if (!notificationId) {
      return res.status(400).json({
        status: false,
        message: "notificationId is required.",
      });
    }

    await helper.query(
      `INSERT INTO notification_read_state (user_id, last_read_notification_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         last_read_notification_id = GREATEST(last_read_notification_id, VALUES(last_read_notification_id))`,
      [userId, notificationId]
    );

    return res.status(200).json({
      status: true,
      message: "Notification marked as read.",
      lastReadNotificationId: notificationId,
    });
  } catch (error) {
    console.error("POST /notification/read error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update notification read state.",
    });
  }
});

module.exports = notificationRouter;
