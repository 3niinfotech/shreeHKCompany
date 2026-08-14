import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Avatar, Badge, Button, Tag, Tooltip } from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  WarningOutlined,
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
  const [pageSize, setPageSize] = useState(25);
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

  const columns = useMemo(() => [
    {
      title: "User",
      key: "user",
      fixed: "left",
      width: 210,
      render: (_, record) => (
        <div className={styles.loginUserCell}>
          <Badge dot status={record.isOnline ? "success" : "default"} offset={[-2, 34]}>
            <Avatar className={styles.loginAvatar}>{getInitials(record.userName)}</Avatar>
          </Badge>
          <div>
            <strong>{record.userName || "Unknown user"}</strong>
            <span>{record.userRole || "No role"}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Event",
      dataIndex: "actionType",
      key: "event",
      width: 120,
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
      title: "Exact timestamp",
      dataIndex: "createdAt",
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
      title: "Current status",
      dataIndex: "isOnline",
      key: "status",
      width: 130,
      render: (online) => (
        <Badge
          status={online ? "success" : "default"}
          text={online ? "Online now" : "Offline"}
        />
      ),
    },
    {
      title: "IP address",
      dataIndex: "ipAddress",
      key: "ip",
      width: 145,
      render: (value) => <code className={styles.ipAddress}>{value || "—"}</code>,
    },
    {
      title: "Device",
      dataIndex: "userAgent",
      key: "device",
      ellipsis: true,
      render: (value) => (
        <span title={value || ""}>{value ? describeDevice(value) : "Unknown device"}</span>
      ),
    },
  ], []);

  const tableHeight = useTableBodyScrollHeight(tableRef, [rows.length, loading, page]);

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
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          scroll={{ x: 980, y: tableHeight }}
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
