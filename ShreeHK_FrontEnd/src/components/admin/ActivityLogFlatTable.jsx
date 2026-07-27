import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Table, Tag, Button, Switch, Space } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import ActivityUnifiedDataCell from "./ActivityUnifiedDataCell";
import ActivityLogDetail from "./ActivityLogDetail";
import {
  formatActionTypeLabel,
  buildActivityNarrative,
  getActionTone,
  getModulePageLabel,
} from "../../utils/activityLogFormatters";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const ActivityLogFlatTable = ({
  filterParams = {},
  refreshKey = 0,
  onLoaded,
}) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showDataColumns, setShowDataColumns] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const fetchRows = useCallback(async (pageNum, size) => {
    setLoading(true);
    try {
      const params = {
        ...filterParams,
        limit: size,
        offset: (pageNum - 1) * size,
        mutationsOnly: filterParams.mutationsOnly ?? "1",
      };
      const res = await api.get(ENDPOINTS.admin.activityLog, { params });
      const rows = (res.data?.Data || []).map((row) => ({ ...row, key: row.id }));
      setData(rows);
      setTotal(res.data?.TotalItems || 0);
      onLoaded?.(res.data?.TotalItems || 0);
    } catch {
      setData([]);
      setTotal(0);
      onLoaded?.(0);
    } finally {
      setLoading(false);
    }
  }, [filterParams, onLoaded]);

  useEffect(() => {
    setPage(1);
    setExpandedRowKeys([]);
    fetchRows(1, pageSize);
  }, [refreshKey, filterParams, fetchRows, pageSize]);

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
      width: 118,
      fixed: "left",
      render: (val) => (
        val ? (
          <div className={styles.whenCell}>
            <span>{dayjs(val).format("DD-MM-YYYY")}</span>
            <span className={styles.whenTime}>{dayjs(val).format("hh:mm A")}</span>
          </div>
        ) : "—"
      ),
    },
    {
      title: "User",
      key: "who",
      width: 120,
      fixed: "left",
      render: (_, record) => (
        <div className={styles.whoCell}>
          <span className={styles.whoName}>{record.userName || "—"}</span>
          {record.userRole ? (
            <span className={styles.whoRole}>{record.userRole}</span>
          ) : null}
        </div>
      ),
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
      width: 100,
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
      <div className={styles.tableToolbar}>
        <p className={styles.tableHint}>
          Summary by default. &quot;Show&quot; per row or toggle Before/After columns Show.
        </p>
        <Space className={styles.tableToolbarActions}>
          <span className={styles.toolbarLabel}>Before / After columns</span>
          <Switch
            checked={showDataColumns}
            onChange={setShowDataColumns}
            checkedChildren="Show"
            unCheckedChildren="Hide"
          />
        </Space>
      </div>
      <div ref={tableRef} className="erp-table-container">
      <Table
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
