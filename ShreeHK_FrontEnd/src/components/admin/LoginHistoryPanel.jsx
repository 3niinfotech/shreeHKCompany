import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Avatar, Badge, Button, Tag, Tooltip } from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  WarningOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import {
  formatActivityDateTime,
  formatActivityRelativeTime,
  formatActivityIso,
} from "../../utils/activityLogFormatters";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import SkeletonAwareTable from "../common/skeleton/SkeletonAwareTable";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const getInitials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

const describeDevice = (userAgent = "") => {
  const ua = String(userAgent);
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const platform = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad/i.test(ua)
      ? "iOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown device";
  return `${browser} · ${platform}`;
};

const LoginHistoryPanel = ({
  filterParams = {},
  refreshKey = 0,
  autoRefreshMs = 0,
  onSynced,
  onLoaded,
}) => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchSeqRef = useRef(0);
  const onSyncedRef = useRef(onSynced);
  const onLoadedRef = useRef(onLoaded);
  const tableRef = useRef(null);
  onSyncedRef.current = onSynced;
  onLoadedRef.current = onLoaded;

  const fetchRows = useCallback(async (pageNumber, size) => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(ENDPOINTS.admin.activityLoginHistory, {
        params: {
          ...filterParams,
          limit: size,
          offset: (pageNumber - 1) * size,
        },
      });
      if (seq !== fetchSeqRef.current) return;
      setRows((res.data?.Data || []).map((row) => ({ ...row, key: row.id })));
      const nextTotal = Number(res.data?.TotalItems) || 0;
      setTotal(nextTotal);
      onLoadedRef.current?.(nextTotal);
      onSyncedRef.current?.(Date.now());
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setRows([]);
      setTotal(0);
      onLoadedRef.current?.(0);
      setError(err.response?.data?.message || "Unable to load user login history.");
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    setPage(1);
    fetchRows(1, pageSize);
  }, [fetchRows, pageSize, refreshKey]);

  useEffect(() => {
    if (!autoRefreshMs) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchRows(page, pageSize);
      }
    }, autoRefreshMs);
    return () => window.clearInterval(timer);
  }, [autoRefreshMs, fetchRows, page, pageSize]);

  // Group fetched rows by User for Main Table + Sub Table
  const userGroupedData = useMemo(() => {
    const map = new Map();

    (rows || []).forEach((row) => {
      const userKey = row.userId ? `user-${row.userId}` : `name-${row.userName || "unknown"}`;
      if (!map.has(userKey)) {
        map.set(userKey, {
          key: userKey,
          userId: row.userId,
          userName: row.userName,
          userRole: row.userRole,
          isOnline: Boolean(row.isOnline && row.actionType === "LOGIN"),
          latestEvent: row.actionType,
          latestTimestamp: row.createdAt,
          latestIp: row.ipAddress,
          latestDevice: row.userAgent,
          history: [],
        });
      }
      const group = map.get(userKey);
      group.history.push(row);

      // If any recent event marked this user as online
      if (row.isOnline && row.actionType === "LOGIN") {
        group.isOnline = true;
      }
    });

    return Array.from(map.values());
  }, [rows]);

  // Parent Columns (Main User Summary Table)
  const parentColumns = useMemo(() => [
    {
      title: "User",
      key: "user",
      fixed: "left",
      width: 220,
      render: (_, record) => {
        const roleStr = String(record.userRole || "User").trim();
        const roleUpper = roleStr.toUpperCase();
        let roleColor = "default";
        let RoleIcon = UserOutlined;
        if (roleUpper.includes("SUPER")) {
          roleColor = "purple";
          RoleIcon = CrownOutlined;
        } else if (roleUpper.includes("ADMIN")) {
          roleColor = "blue";
          RoleIcon = SafetyCertificateOutlined;
        }

        return (
          <div className={styles.loginUserCell}>
            <Badge dot status={record.isOnline ? "success" : "default"} offset={[-2, 34]}>
              <Avatar className={styles.loginAvatar}>{getInitials(record.userName)}</Avatar>
            </Badge>
            <div className={styles.loginUserInfo}>
              <strong className={styles.loginUserName}>{record.userName || "Unknown user"}</strong>
              <div style={{ marginTop: 2 }}>
                <Tag icon={<RoleIcon />} color={roleColor} className={styles.roleBadge}>
                  {roleStr}
                </Tag>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Current Status",
      dataIndex: "isOnline",
      key: "status",
      width: 140,
      render: (online) => (
        <Badge
          status={online ? "success" : "default"}
          text={online ? "Online now" : "Offline"}
        />
      ),
    },
    {
      title: "Latest Event",
      dataIndex: "latestEvent",
      key: "latestEvent",
      width: 130,
      render: (event) => (
        <Tag
          icon={
            event === "LOGIN_FAILED"
              ? <WarningOutlined />
              : event === "LOGOUT"
                ? <LogoutOutlined />
                : <LoginOutlined />
          }
          color={event === "LOGIN_FAILED" ? "red" : event === "LOGOUT" ? "default" : "green"}
          className={styles.loginEventTag}
        >
          {event === "LOGIN_FAILED" ? "Failed" : event === "LOGOUT" ? "Logout" : "Login"}
        </Tag>
      ),
    },
    {
      title: "Latest Timestamp",
      dataIndex: "latestTimestamp",
      key: "timestamp",
      width: 230,
      render: (value) => (
        <Tooltip
          title={(
            <span>
              {formatActivityDateTime(value)}
              <br />
              {formatActivityIso(value)}
            </span>
          )}
        >
          <div className={styles.exactTimeCell}>
            <strong>{formatActivityDateTime(value)}</strong>
            <span>{formatActivityRelativeTime(value)}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: "IP Address",
      dataIndex: "latestIp",
      key: "ip",
      width: 145,
      render: (value) => <code className={styles.ipAddress}>{value || "—"}</code>,
    },
    {
      title: "Device",
      dataIndex: "latestDevice",
      key: "device",
      ellipsis: true,
      render: (value) => (
        <span title={value || ""}>{value ? describeDevice(value) : "Unknown device"}</span>
      ),
    },
    {
      title: "Total History",
      key: "totalEvents",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Tag color="cyan" style={{ fontWeight: 600, borderRadius: 12 }}>
          {record.history.length} Event(s)
        </Tag>
      ),
    },
  ], []);

  // Child Columns (Sub-table inside Expandable Row)
  const childColumns = useMemo(() => [
    {
      title: "#",
      key: "srNo",
      width: 50,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Event Action",
      dataIndex: "actionType",
      key: "actionType",
      width: 130,
      render: (event) => (
        <Tag
          icon={
            event === "LOGIN_FAILED"
              ? <WarningOutlined />
              : event === "LOGOUT"
                ? <LogoutOutlined />
                : <LoginOutlined />
          }
          color={event === "LOGIN_FAILED" ? "red" : event === "LOGOUT" ? "default" : "green"}
          style={{ fontWeight: 600 }}
        >
          {event === "LOGIN_FAILED" ? "FAILED LOGIN" : event === "LOGOUT" ? "LOGOUT" : "LOGIN SUCCESS"}
        </Tag>
      ),
    },
    {
      title: "Exact Timestamp",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 230,
      render: (value) => (
        <div className={styles.exactTimeCell}>
          <strong>{formatActivityDateTime(value)}</strong>
          <span>{formatActivityRelativeTime(value)}</span>
        </div>
      ),
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 145,
      render: (val) => <code className={styles.ipAddress}>{val || "—"}</code>,
    },
    {
      title: "Device / Browser",
      dataIndex: "userAgent",
      key: "userAgent",
      render: (val) => <span>{val ? describeDevice(val) : "Unknown device"}</span>,
    },
  ], []);

  const tableHeight = useTableBodyScrollHeight(tableRef, [userGroupedData.length, loading, page]);

  return (
    <div className={styles.loginHistoryWrap}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button size="small" onClick={() => fetchRows(page, pageSize)}>Retry</Button>}
        />
      ) : null}

      <div ref={tableRef} className="erp-table-container">
        <SkeletonAwareTable
          className={styles.loginHistoryTable}
          columns={parentColumns}
          dataSource={userGroupedData}
          rowKey="key"
          loading={loading}
          size="small"
          scroll={{ x: 1050, y: tableHeight }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ margin: "4px 8px 12px", padding: "12px 16px", background: "var(--color-bg-subtle, #f8fafc)", borderRadius: 8, border: "1px solid var(--color-border, #e2e8f0)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--color-primary)" }}>
                  📋 Login & Logout History Logs for User: <span style={{ color: "#000" }}>{record.userName}</span> ({record.history.length} event records)
                </div>
                <SkeletonAwareTable
                  columns={childColumns}
                  dataSource={record.history}
                  pagination={false}
                  size="small"
                  bordered
                  rowKey="id"
                />
              </div>
            ),
            rowExpandable: (record) => record.history && record.history.length > 0,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["25", "50", "100", "200"],
            showTotal: (count) => `${count} login event(s)`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
              fetchRows(nextPage, nextSize);
            },
          }}
        />
      </div>
    </div>
  );
};

export default LoginHistoryPanel;
