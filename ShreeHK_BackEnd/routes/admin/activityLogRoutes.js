const express = require("express");
const { auditQuery } = require("../../services/auditDb.js");
const {
  authenticateToken,
  loadUserPermissions,
} = require("../../authMiddleware.js");
const { buildExcelBuffer, buildPdfBuffer } = require("../../services/auditExportService.js");
const { logActivity } = require("../../services/auditService.js");
const { PAGE_BY_KEY } = require("../../config/permissionRegistry.js");
const { refreshAuditContextFromReq } = require("../../middleware/auditContext.js");
const { isUserOnline } = require("../../services/userPresenceService.js");

const activityLogRouter = express.Router();

const AUDIT_PAGE_KEYS = ["admin.activity_history", "admin.auditor"];

const canViewAudit = async (req) => {
  if (Number(req.user?.roll) === 1) return true;
  const { getPermissionsForRoll, hasPagePermission: hasPerm } = require("../../permissionHelper.js");
  const permissions =
    req.user.permissions || (await getPermissionsForRoll(req.user.roll));
  return AUDIT_PAGE_KEYS.some((k) => hasPerm(permissions, k));
};

/** Delete audit rows — Super Admin or admin.activity_history only (not auditor). */
const canDeleteAudit = async (req) => {
  if (Number(req.user?.roll) === 1) return true;
  const { getPermissionsForRoll, hasPagePermission: hasPerm } = require("../../permissionHelper.js");
  const permissions =
    req.user.permissions || (await getPermissionsForRoll(req.user.roll));
  return hasPerm(permissions, "admin.activity_history");
};

const getAuditCompanyScope = (req) => {
  if (Number(req.user?.roll) === 1) return null;
  return Number(req.companyId || req.user?.companyId) || -1;
};

const AUTH_ACTION_TYPES = ["LOGIN", "LOGOUT", "LOGIN_FAILED"];

const resolveUserId = (row) => {
  const direct = Number(row?.user_id);
  if (direct) return direct;
  const fromRecord = Number(row?.record_id);
  return fromRecord || null;
};

const mapRow = (row) => ({
  id: row.id,
  companyId: row.company_id,
  userId: resolveUserId(row),
  userName: row.user_name,
  userRole: row.user_role,
  userRoleId: row.user_role_id,
  actionType: row.action_type,
  moduleName: row.module_name,
  recordId: row.record_id,
  recordReference: row.record_reference,
  oldValue: parseJson(row.old_value),
  newValue: parseJson(row.new_value),
  changedFields: parseJson(row.changed_fields),
  description: row.description,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  status: row.status,
  createdAt: row.created_at,
});

function parseJson(val) {
  if (val == null) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

const NOISE_ACTION_TYPES = [
  "VIEW",
  "API_READ",
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "ATTEMPTED",
  "UI_CLICK",
  "UI_FILTER",
  "UI_MODAL_OPEN",
  "UI_MODAL_CLOSE",
  "UI_TAB",
  "UI_ACTION",
];

function buildFilters(query, companyScope = null) {
  const where = ["1=1"];
  const values = [];
  const authEventsOnly =
    query.authEventsOnly === "1" ||
    query.authEventsOnly === "true";

  if (companyScope !== null) {
    if (companyScope > 0) {
      if (authEventsOnly || query.includeGlobalAuth === "1" || query.includeGlobalAuth === "true") {
        where.push(
          `(company_id = ? OR (action_type IN (${AUTH_ACTION_TYPES.map(() => "?").join(", ")}) AND user_id IN (SELECT DISTINCT user_id FROM dai_activity_log WHERE company_id = ? AND user_id IS NOT NULL)))`,
        );
        values.push(companyScope, ...AUTH_ACTION_TYPES, companyScope);
      } else {
        where.push("company_id = ?");
        values.push(companyScope);
      }
    } else {
      // Fail closed if a non-super-admin token has no valid company context.
      where.push("1=0");
    }
  }

  const showAll =
    authEventsOnly ||
    query.mutationsOnly === "0" ||
    query.mutationsOnly === "false" ||
    query.showAll === "1";

  if (!showAll) {
    where.push(`action_type NOT IN (${NOISE_ACTION_TYPES.map(() => "?").join(",")})`);
    values.push(...NOISE_ACTION_TYPES);
  }
  if (authEventsOnly) {
    where.push(`action_type IN (${AUTH_ACTION_TYPES.map(() => "?").join(", ")})`);
    values.push(...AUTH_ACTION_TYPES);
  }

  if (query.userId) {
    const userId = Number(query.userId);
    where.push("(user_id = ? OR record_id = ?)");
    values.push(userId, String(userId));
  }
  if (query.role) {
    where.push("user_role LIKE ?");
    values.push(`%${query.role}%`);
  }
  if (query.module) {
    where.push("module_name LIKE ?");
    values.push(`%${query.module}%`);
  }
  if (query.actionType) {
    where.push("action_type = ?");
    values.push(String(query.actionType));
  }
  if (query.from) {
    where.push("created_at >= ?");
    values.push(String(query.from));
  }
  if (query.to) {
    where.push("created_at <= ?");
    values.push(String(query.to));
  }
  if (query.search) {
    where.push(
      `(record_reference LIKE ? OR description LIKE ? OR user_name LIKE ?
        OR module_name LIKE ? OR ip_address LIKE ? OR user_agent LIKE ?)`,
    );
    const term = `%${query.search}%`;
    values.push(term, term, term, term, term, term);
  }

  return { where: where.join(" AND "), values };
}

const mapLoginRow = (row) => {
  const mapped = mapRow(row);
  const details = mapped.newValue && typeof mapped.newValue === "object"
    ? mapped.newValue
    : {};
  return {
    ...mapped,
    loginAt: details.loginAt || mapped.createdAt,
    isOnline: isUserOnline(mapped.userId),
  };
};

function buildGroupDetailFilters(query, userId, userName, activityDate, companyScope = null) {
  const scoped = { ...query };
  delete scoped.userId;
  delete scoped.limit;
  delete scoped.offset;
  delete scoped.from;
  delete scoped.to;
  const { where, values } = buildFilters(scoped, companyScope);
  const clauses = [where];
  const params = [...values];

  if (userId) {
    clauses.push("(user_id = ? OR record_id = ?)");
    params.push(Number(userId), String(userId));
  } else if (userName) {
    clauses.push("user_name = ?");
    params.push(String(userName));
  }

  if (activityDate) {
    clauses.push("DATE(created_at) = ?");
    params.push(String(activityDate));
  }

  return { where: clauses.join(" AND "), values: params };
}

function formatActivityDate(raw) {
  if (raw == null) return "";
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(raw).slice(0, 10);
}

function mapGroupRow(row) {
  const userId = row.user_id;
  const userName = row.user_name || "Unknown";
  const dateKey = formatActivityDate(row.activity_date);

  return {
    groupKey: `${userId ?? "u0"}_${userName}_${dateKey}`,
    userId: userId ?? null,
    userName,
    userRole: row.user_role || "",
    activityDate: dateKey,
    activityCount: Number(row.activity_count) || 0,
    firstAt: row.first_at,
    lastAt: row.last_at,
    actionTypes: String(row.action_types || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function resolvePageLabel(path) {
  const normalized = String(path || "").split("?")[0];
  const entry = Object.values(PAGE_BY_KEY).find((p) => p.path === normalized);
  return entry?.label || normalized || "Page";
}

const UI_EVENT_TO_ACTION = {
  click: "UI_CLICK",
  filter: "UI_FILTER",
  modal_open: "UI_MODAL_OPEN",
  modal_close: "UI_MODAL_CLOSE",
  tab_switch: "UI_TAB",
};

function buildUiEventDescription(username, actionType, pageLabel, ev) {
  const who = username || "User";
  const page = pageLabel || ev.pageLabel || "Page";
  const label = ev.label || ev.target || "";
  switch (actionType) {
    case "UI_CLICK":
      return `${who} clicked "${label}" on ${page}`;
    case "UI_FILTER":
      return `${who} changed filter "${label}" on ${page}`;
    case "UI_MODAL_OPEN":
      return `${who} opened modal "${label}" on ${page}`;
    case "UI_MODAL_CLOSE":
      return `${who} closed modal "${label}" on ${page}`;
    case "UI_TAB":
      return `${who} switched tab "${label}" on ${page}`;
    default:
      return `${who} UI action on ${page}${label ? ` — ${label}` : ""}`;
  }
}

activityLogRouter.post(
  "/admin/activity-log/track-ui",
  authenticateToken,
  async (req, res) => {
    try {
      const raw = req.body?.events;
      const events = Array.isArray(raw) ? raw : req.body?.eventType ? [req.body] : [];
      if (!events.length) {
        return res.json({ status: true, skipped: true });
      }

      await refreshAuditContextFromReq(req);
      let logged = 0;

      for (const ev of events.slice(0, 50)) {
        const pagePath = String(ev.path || "").trim();
        if (!pagePath || pagePath.startsWith("/auth")) continue;

        const eventType = String(ev.eventType || "click").toLowerCase();
        const actionType = UI_EVENT_TO_ACTION[eventType] || "UI_ACTION";
        const label = ev.pageLabel || resolvePageLabel(pagePath);

        await logActivity({
          actionType,
          moduleName: label,
          recordReference: String(ev.label || ev.target || pagePath).slice(0, 255),
          newValue: {
            path: pagePath,
            search: ev.search || null,
            pageLabel: label,
            eventType,
            target: ev.target || null,
            label: ev.label || null,
            meta: ev.meta || null,
            timestamp: ev.timestamp || null,
          },
          description: buildUiEventDescription(
            req.user?.username,
            actionType,
            label,
            ev,
          ),
        });
        logged += 1;
      }

      res.json({ status: true, logged });
    } catch (err) {
      console.error("activity-log track-ui:", err);
      res.status(500).json({ status: false, message: err.message || "UI track failed." });
    }
  },
);

activityLogRouter.post(
  "/admin/activity-log/track",
  authenticateToken,
  async (req, res) => {
    try {
      const pagePath = String(req.body?.path || "").trim();
      if (!pagePath || pagePath.startsWith("/auth")) {
        return res.json({ status: true, skipped: true });
      }

      await refreshAuditContextFromReq(req);
      const label = req.body?.label || resolvePageLabel(pagePath);
      const search = String(req.body?.search || "");

      await logActivity({
        actionType: "VIEW",
        moduleName: label,
        recordReference: pagePath,
        newValue: { path: pagePath, search: search || null, pageLabel: label },
        description: `${req.user?.username || "User"} visited ${label} (${pagePath})`,
      });

      res.json({ status: true });
    } catch (err) {
      console.error("activity-log track:", err);
      res.status(500).json({ status: false, message: err.message || "Track failed." });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;
      const { where, values } = buildFilters(req.query, getAuditCompanyScope(req));

      const countRows = await auditQuery(
        `SELECT COUNT(*) AS total FROM dai_activity_log WHERE ${where}`,
        values,
      );
      const total = countRows[0]?.total || 0;

      const rows = await auditQuery(
        `SELECT * FROM dai_activity_log WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset],
      );

      res.json({
        TotalItems: total,
        Data: rows.map(mapRow),
      });
    } catch (err) {
      console.error("activity-log list:", err);
      res.status(500).json({ status: false, message: err.message || "Failed to load activity log." });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log/summary",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const summaryQuery = { ...req.query, showAll: "1", includeGlobalAuth: "1" };
      delete summaryQuery.actionType;
      delete summaryQuery.authEventsOnly;
      const { where, values } = buildFilters(summaryQuery, getAuditCompanyScope(req));
      const rows = await auditQuery(
        `SELECT
          COUNT(*) AS total,
          COUNT(DISTINCT COALESCE(
            user_id,
            IF(action_type IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED'), record_id, NULL)
          )) AS unique_users,
          COALESCE(SUM(action_type = 'LOGIN'), 0) AS logins,
          COALESCE(SUM(action_type = 'LOGOUT'), 0) AS logouts,
          COALESCE(SUM(action_type = 'LOGIN_FAILED'), 0) AS failed_logins,
          COALESCE(SUM(action_type IN (
            'CREATE', 'UPDATE', 'DELETE', 'TRANSFER', 'STOCK_IN', 'STOCK_OUT',
            'MEMO_CREATE', 'MEMO_RETURN'
          )), 0) AS changes,
          MAX(created_at) AS latest_at
        FROM dai_activity_log
        WHERE ${where}`,
        values,
      );
      const row = rows[0] || {};

      return res.json({
        status: true,
        Data: {
          total: Number(row.total) || 0,
          uniqueUsers: Number(row.unique_users) || 0,
          logins: Number(row.logins) || 0,
          logouts: Number(row.logouts) || 0,
          failedLogins: Number(row.failed_logins) || 0,
          changes: Number(row.changes) || 0,
          latestAt: row.latest_at || null,
        },
      });
    } catch (err) {
      console.error("activity-log summary:", err);
      return res.status(500).json({
        status: false,
        message: err.message || "Failed to load activity summary.",
      });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log/login-history",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
      const offset = parseInt(req.query.offset, 10) || 0;
      const query = { ...req.query, authEventsOnly: "1" };
      const { where, values } = buildFilters(query, getAuditCompanyScope(req));
      const countRows = await auditQuery(
        `SELECT COUNT(*) AS total FROM dai_activity_log WHERE ${where}`,
        values,
      );
      const rows = await auditQuery(
        `SELECT * FROM dai_activity_log
         WHERE ${where}
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset],
      );

      return res.json({
        status: true,
        TotalItems: Number(countRows[0]?.total) || 0,
        Data: rows.map(mapLoginRow),
      });
    } catch (err) {
      console.error("activity-log login-history:", err);
      return res.status(500).json({
        status: false,
        message: err.message || "Failed to load login history.",
      });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log/grouped",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;
      const { where, values } = buildFilters(req.query, getAuditCompanyScope(req));

      const countRows = await auditQuery(
        `SELECT COUNT(*) AS total FROM (
          SELECT user_id, user_name, user_role, DATE(created_at) AS activity_date
          FROM dai_activity_log
          WHERE ${where}
          GROUP BY user_id, user_name, user_role, DATE(created_at)
        ) grouped`,
        values,
      );
      const total = countRows[0]?.total || 0;

      const rows = await auditQuery(
        `SELECT
          user_id,
          user_name,
          user_role,
          DATE_FORMAT(DATE(created_at), '%Y-%m-%d') AS activity_date,
          COUNT(*) AS activity_count,
          MIN(created_at) AS first_at,
          MAX(created_at) AS last_at,
          GROUP_CONCAT(DISTINCT action_type ORDER BY action_type SEPARATOR ',') AS action_types
        FROM dai_activity_log
        WHERE ${where}
        GROUP BY user_id, user_name, user_role, DATE(created_at)
        ORDER BY activity_date DESC, user_name ASC
        LIMIT ? OFFSET ?`,
        [...values, limit, offset],
      );

      res.json({
        TotalItems: total,
        Data: rows.map(mapGroupRow),
      });
    } catch (err) {
      console.error("activity-log grouped:", err);
      res.status(500).json({ status: false, message: err.message || "Failed to load grouped activity log." });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log/group-detail",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const activityDate = String(req.query.activityDate || req.query.date || "").slice(0, 10);
      const userId = req.query.userId != null && req.query.userId !== ""
        ? Number(req.query.userId)
        : null;
      const userName = req.query.userName ? String(req.query.userName) : null;

      if (!activityDate || (!userId && !userName)) {
        return res.status(400).json({
          status: false,
          message: "activityDate and userId (or userName) are required.",
        });
      }

      const { where, values } = buildGroupDetailFilters(
        req.query,
        userId,
        userName,
        activityDate,
        getAuditCompanyScope(req),
      );

      const rows = await auditQuery(
        `SELECT * FROM dai_activity_log WHERE ${where} ORDER BY created_at ASC, id ASC LIMIT 2000`,
        values,
      );

      res.json({
        status: true,
        TotalItems: rows.length,
        Data: rows.map(mapRow),
      });
    } catch (err) {
      console.error("activity-log group-detail:", err);
      res.status(500).json({ status: false, message: err.message || "Failed to load day activity detail." });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log/export",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const format = (req.query.format || "xlsx").toLowerCase();
      const { where, values } = buildFilters(req.query, getAuditCompanyScope(req));
      const rows = await auditQuery(
        `SELECT * FROM dai_activity_log WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT 5000`,
        values,
      );
      const mapped = rows.map(mapRow);

      if (format === "pdf") {
        const buf = await buildPdfBuffer(mapped);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="activity-log.pdf"');
        return res.send(buf);
      }

      const buf = buildExcelBuffer(mapped);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", 'attachment; filename="activity-log.xlsx"');
      return res.send(buf);
    } catch (err) {
      console.error("activity-log export:", err);
      res.status(500).json({ status: false, message: err.message || "Export failed." });
    }
  },
);

activityLogRouter.delete(
  "/admin/activity-log/delete-all",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canDeleteAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const { where, values } = buildFilters(req.query, getAuditCompanyScope(req));
      const countRows = await auditQuery(
        `SELECT COUNT(*) AS total FROM dai_activity_log WHERE ${where}`,
        values,
      );
      const total = Number(countRows[0]?.total) || 0;

      if (!total) {
        return res.status(404).json({ status: false, message: "No matching records to delete." });
      }

      await auditQuery(`DELETE FROM dai_activity_log WHERE ${where}`, values);

      res.status(200).json({
        status: true,
        message: `${total} activity log record(s) deleted successfully.`,
        deletedCount: total,
      });
    } catch (err) {
      console.error("activity-log delete-all:", err);
      res.status(500).json({ status: false, message: err.message || "Delete all failed." });
    }
  },
);

activityLogRouter.delete(
  "/admin/activity-log/delete",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canDeleteAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const id = parseInt(req.query.deleteId, 10);
      if (!id) {
        return res.status(400).json({ status: false, message: "Invalid or missing deleteId." });
      }

      const companyScope = getAuditCompanyScope(req);
      const idWhere = companyScope === null ? "id = ?" : "id = ? AND company_id = ?";
      const idValues = companyScope === null ? [id] : [id, companyScope];
      const rows = await auditQuery(
        `SELECT * FROM dai_activity_log WHERE ${idWhere} LIMIT 1`,
        idValues,
      );
      if (!rows.length) {
        return res.status(404).json({ status: false, message: "Record not found." });
      }

      await auditQuery(`DELETE FROM dai_activity_log WHERE ${idWhere}`, idValues);

      res.status(200).json({
        status: true,
        message: "Activity log entry deleted successfully.",
      });
    } catch (err) {
      console.error("activity-log delete:", err);
      res.status(500).json({ status: false, message: err.message || "Delete failed." });
    }
  },
);

activityLogRouter.get(
  "/admin/activity-log/:id",
  authenticateToken,
  loadUserPermissions,
  async (req, res) => {
    try {
      if (!(await canViewAudit(req))) {
        return res.status(403).json({ status: false, message: "Access denied." });
      }

      const id = parseInt(req.params.id, 10);
      if (!id) {
        return res.status(400).json({ status: false, message: "Invalid id." });
      }

      const companyScope = getAuditCompanyScope(req);
      const idWhere = companyScope === null ? "id = ?" : "id = ? AND company_id = ?";
      const idValues = companyScope === null ? [id] : [id, companyScope];
      const rows = await auditQuery(
        `SELECT * FROM dai_activity_log WHERE ${idWhere} LIMIT 1`,
        idValues,
      );
      if (!rows.length) {
        return res.status(404).json({ status: false, message: "Not found." });
      }

      res.json({ status: true, Data: mapRow(rows[0]) });
    } catch (err) {
      console.error("activity-log detail:", err);
      res.status(500).json({ status: false, message: err.message || "Failed to load detail." });
    }
  },
);

module.exports = activityLogRouter;
