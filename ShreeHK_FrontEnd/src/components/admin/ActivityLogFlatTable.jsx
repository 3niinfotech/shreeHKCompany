import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Alert, Tag, Button, Tooltip } from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import ActivityUnifiedDataCell from "./ActivityUnifiedDataCell";
import ActivityLogDetail from "./ActivityLogDetail";
import {
  formatActionTypeLabel,
  buildActivityNarrative,
  getActionTone,
  getModulePageLabel,
  formatActivityDate,
  formatActivityTime,
  formatActivityDateTime,
  formatActivityRelativeTime,
  formatActivityIso,
} from "../../utils/activityLogFormatters";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import SkeletonAwareTable from "../common/skeleton/SkeletonAwareTable";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const ActivityLogFlatTable = ({
  filterParams = {},
  refreshKey = 0,
  onLoaded,
  autoRefreshMs = 0,
  onSynced,
  showDataColumns = false,
}) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [error, setError] = useState("");
  const fetchSeqRef = useRef(0);
  const onLoadedRef = useRef(onLoaded);
  const onSyncedRef = useRef(onSynced);
  onLoadedRef.current = onLoaded;
  onSyncedRef.current = onSynced;

  const fetchRows = useCallback(async (pageNum, size) => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError("");
    try {
      const params = {
        ...filterParams,
        limit: size,
        offset: (pageNum - 1) * size,
        mutationsOnly: filterParams.mutationsOnly ?? "1",
      };
      const res = await api.get(ENDPOINTS.admin.activityLog, { params });
      if (seq !== fetchSeqRef.current) return;
      const rows = (res.data?.Data || []).map((row) => ({ ...row, key: row.id }));
      setData(rows);
      setTotal(res.data?.TotalItems || 0);
      onLoadedRef.current?.(res.data?.TotalItems || 0);
      onSyncedRef.current?.(Date.now());
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setData([]);
      setTotal(0);
      onLoadedRef.current?.(0);
      setError(err.response?.data?.message || "Unable to load activity records.");
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    setPage(1);
    setExpandedRowKeys([]);
    // Drop stale rows immediately so deleted/empty results never flash old data
    setData([]);
    fetchRows(1, pageSize);
  }, [refreshKey, filterParams, fetchRows, pageSize]);

  useEffect(() => {
    if (!autoRefreshMs) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchRows(page, pageSize);
      }
    }, autoRefreshMs);
    return () => window.clearInterval(timer);
  }, [autoRefreshMs, fetchRows, page, pageSize]);

  const toggleRowDetail = (record, e) => {
    e?.stopPropagation();
    setExpandedRowKeys((keys) =>
      keys.includes(record.key)
        ? keys.filter((k) => k !== record.key)
        : [...keys, record.key],
    );
  };

  const baseColumns = useMemo(() => [
    {
      title: "When",
      dataIndex: "createdAt",
      key: "when",
      width: 138,
      fixed: "left",
      render: (val) => (
        val ? (
          <Tooltip
            title={(
              <span>
                {formatActivityDateTime(val)}
                <br />
                {formatActivityIso(val)}
              </span>
            )}
          >
            <div className={styles.whenCell}>
              <span>{formatActivityDate(val)}</span>
              <span className={styles.whenTime}>{formatActivityTime(val)}</span>
              <span className={styles.whenRelative}>{formatActivityRelativeTime(val)}</span>
            </div>
          </Tooltip>
        ) : "—"
      ),
    },
    {
      title: "User",
      key: "who",
      width: 140,
      fixed: "left",
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
          <div className={styles.whoCell}>
            <span className={styles.whoName}>{record.userName || "—"}</span>
            <div style={{ marginTop: 2 }}>
              <Tag icon={<RoleIcon />} color={roleColor} className={styles.roleBadge}>
                {roleStr}
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: "Module / Page",
      key: "module",
      width: 130,
      render: (_, record) => getModulePageLabel(record),
    },
    {
      title: "Action",
      dataIndex: "actionType",
      key: "actionType",
      width: 82,
      render: (type) => {
        const tone = getActionTone(type);
        return (
          <Tag className={`${styles.actionTag} ${styles[`actionTag--${tone}`]}`}>
            {formatActionTypeLabel(type)}
          </Tag>
        );
      },
    },
    {
      title: "SKU / Ref",
      dataIndex: "recordReference",
      key: "recordReference",
      width: 260,
      render: (val) => (
        val ? <Tag className={styles.refTagCompact}>{val}</Tag> : "—"
      ),
    },
    {
      title: "Summary",
      key: "summary",
      ellipsis: true,
      render: (_, record) => (
        <span className={styles.summaryInline}>
          {buildActivityNarrative(record) || record.description || "—"}
        </span>
      ),
    },
    {
      title: "Data",
      key: "dataToggle",
      width: 100,
      fixed: "right",
      render: (_, record) => {
        const isOpen = expandedRowKeys.includes(record.key);
        return (
          <Button
            type="link"
            size="small"
            className={styles.showDataBtn}
            icon={isOpen ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={(e) => toggleRowDetail(record, e)}
          >
            {isOpen ? "Hide" : "Show"}
          </Button>
        );
      },
    },
  ], [expandedRowKeys]);

  const dataColumns = useMemo(() => [
    {
      title: "Before",
      key: "before",
      width: 220,
      render: (_, record) => (
        <ActivityUnifiedDataCell record={record} column="before" />
      ),
    },
    {
      title: "After",
      key: "after",
      width: 220,
      render: (_, record) => (
        <ActivityUnifiedDataCell record={record} column="after" />
      ),
    },
  ], []);

  const columns = useMemo(() => {
    if (!showDataColumns) return baseColumns;
    const summaryIdx = baseColumns.findIndex((c) => c.key === "summary");
    return [
      ...baseColumns.slice(0, summaryIdx + 1),
      ...dataColumns,
      baseColumns[baseColumns.length - 1],
    ];
  }, [baseColumns, dataColumns, showDataColumns]);

  const tableRef = useRef(null);
  const tableHeight = useTableBodyScrollHeight(tableRef, [data.length, loading, page, showDataColumns]);

  return (
    <>
      <div ref={tableRef} className="erp-table-container">
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          className={styles.tableError}
          action={<Button size="small" onClick={() => fetchRows(page, pageSize)}>Retry</Button>}
        />
      ) : null}
      <SkeletonAwareTable
        className={styles.unifiedTable}
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
        bordered
        scroll={{ x: showDataColumns ? 1400 : 1000, y: tableHeight }}
        rowClassName={(record) => styles[`rowTone--${getActionTone(record.actionType)}`]}
        expandable={{
          expandedRowKeys,
          expandedRowRender: (record) => <ActivityLogDetail record={record} compact />,
          rowExpandable: () => true,
          expandIcon: () => null,
          showExpandColumn: false,
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (t) => `${t} activity record(s)`,
          onChange: (p, size) => {
            setPage(p);
            setPageSize(size);
            setExpandedRowKeys([]);
            fetchRows(p, size);
          },
        }}
      />
      </div>
    </>
  );
};

export default ActivityLogFlatTable;
