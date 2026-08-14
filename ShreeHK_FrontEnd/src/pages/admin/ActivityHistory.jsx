import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  Card, Form, Input, Select, DatePicker, Button, Switch, Tabs, Tooltip, Space,
} from "antd";
import {
  HistoryOutlined, FileExcelOutlined, FilePdfOutlined, DeleteOutlined, ReloadOutlined,
  LoginOutlined, TeamOutlined, DatabaseOutlined, ThunderboltOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import ActivityLogFlatTable from "../../components/admin/ActivityLogFlatTable";
import LoginHistoryPanel from "../../components/admin/LoginHistoryPanel";
import DeleteConfirmModal from "../../components/common/masterCommon/DeleteConfirmModal";
import useAuthStore from "../../store/Auth.Store";
import { hasPagePermission } from "../../config/permissionRegistry";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const { RangePicker } = DatePicker;

const ACTION_TYPES = [
  "CREATE", "UPDATE", "DELETE", "EXPORT", "PRINT",
  "TRANSFER", "STOCK_IN", "STOCK_OUT", "MEMO_CREATE", "MEMO_RETURN",
].map((v) => ({ value: v, label: v }));
const LOGIN_ACTION_TYPES = [
  { value: "LOGIN", label: "Successful login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "LOGIN_FAILED", label: "Failed login" },
];

const EMPTY_SUMMARY = {
  total: 0,
  uniqueUsers: 0,
  logins: 0,
  logouts: 0,
  failedLogins: 0,
  changes: 0,
  latestAt: null,
};

const triggerDownload = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

const todayRange = () => [dayjs().startOf("day"), dayjs().endOf("day")];

const ActivityHistory = () => {
  const user = useAuthStore((s) => s.user);
  const storePermissions = useAuthStore((s) => s.permissions);
  const permissions = user?.permissions ?? storePermissions ?? [];
  const canDelete =
    Number(user?.roll) === 1 || hasPagePermission(permissions, "admin.activity_history");

  const [form] = Form.useForm();
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(null);
  const [pageSize] = useState(50);
  const [activeFilters, setActiveFilters] = useState({});
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDataColumns, setShowDataColumns] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({ dateRange: todayRange() });
    setInitialLoaded(true);
  }, [form]);

  useEffect(() => {
    if (!initialLoaded) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoaded]);

  const buildParams = useCallback((values, pageNum = 1, size = pageSize, mode = activeTab) => {
    const params = {
      limit: size,
      offset: (pageNum - 1) * size,
      mutationsOnly: mode === "logins" ? "0" : "1",
    };
    if (mode === "logins") params.authEventsOnly = "1";
    if (values.userId) params.userId = values.userId;
    if (values.role?.trim()) params.role = values.role.trim();
    if (values.module?.trim()) params.module = values.module.trim();
    if (values.actionType) params.actionType = values.actionType;
    if (values.search?.trim()) params.search = values.search.trim();
    if (values.dateRange?.[0]) params.from = dayjs(values.dateRange[0]).format("YYYY-MM-DD");
    if (values.dateRange?.[1]) params.to = dayjs(values.dateRange[1]).format("YYYY-MM-DD 23:59:59");
    return params;
  }, [activeTab, pageSize]);

  const filterParamsOnly = useMemo(() => {
    const { limit, offset, ...rest } = activeFilters;
    return rest;
  }, [activeFilters]);

  const activeFilterCount = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    let count = ["search", "userId", "role", "module", "actionType"]
      .filter((key) => Boolean(activeFilters[key]))
      .length;
    const fromDay = String(activeFilters.from || "").slice(0, 10);
    const toDay = String(activeFilters.to || "").slice(0, 10);
    if ((fromDay && fromDay !== today) || (toDay && toDay !== today)) count += 1;
    return count;
  }, [activeFilters]);

  const handleSearch = () => {
    const values = form.getFieldsValue();
    const params = buildParams(values, 1, pageSize);
    setActiveFilters(params);
    setTableRefreshKey((k) => k + 1);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setTotal(0);
    const params = buildParams(form.getFieldsValue(), 1, pageSize, key);
    setActiveFilters(params);
    setTableRefreshKey((value) => value + 1);
  };

  const summaryParams = useMemo(() => {
    const params = { ...activeFilters };
    delete params.limit;
    delete params.offset;
    delete params.actionType;
    delete params.authEventsOnly;
    delete params.mutationsOnly;
    return { ...params, showAll: "1" };
  }, [activeFilters]);

  const loadSummary = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setSummaryLoading(true);
    try {
      const res = await api.get(ENDPOINTS.admin.activityLogSummary, {
        params: summaryParams,
      });
      setSummary({ ...EMPTY_SUMMARY, ...(res.data?.Data || {}) });
      setLastSyncedAt(Date.now());
    } catch (err) {
      if (!silent) toastApiError(err);
    } finally {
      if (!silent) setSummaryLoading(false);
    }
  }, [summaryParams]);

  useEffect(() => {
    if (!initialLoaded) return;
    loadSummary();
  }, [initialLoaded, loadSummary, tableRefreshKey]);

  useEffect(() => {
    if (!autoRefresh || !initialLoaded) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadSummary({ silent: true });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, initialLoaded, loadSummary]);

  const buildDeleteAllParams = useCallback(() => {
    // Delete exactly what the table is currently filtered by
    const { limit, offset, ...filterParams } = activeFilters;
    return {
      mutationsOnly: "1",
      ...filterParams,
    };
  }, [activeFilters]);

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const filterParams = buildDeleteAllParams();
      const res = await api.delete(ENDPOINTS.admin.activityLogDeleteAll, {
        params: filterParams,
      });
      toastApiSuccess(res.data);
      setDeleteAllOpen(false);
      setTotal(0);
      // Same filters, fresh fetch (table ignores stale in-flight responses)
      setTableRefreshKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const { limit, offset, ...filterParams } = activeFilters;
      const res = await api.get(ENDPOINTS.admin.activityLogExport, {
        params: { ...filterParams, format },
        responseType: "blob",
      });
      const ext = format === "pdf" ? "pdf" : "xlsx";
      triggerDownload(res.data, `activity-log.${ext}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={styles.erpContainer}>
      <PageHeroHeader
        breadcrumb="ADMIN"
        title="Activity Intelligence"
        icon={<HistoryOutlined />}
        actions={(
          <div className={styles.heroBar}>
            <Form form={form} className={styles.heroFilterFields}>
              <Form.Item name="search" className={`${styles.heroField} ${styles.heroFieldWide}`}>
                <Input
                  allowClear
                  placeholder={activeTab === "logins" ? "User / IP / device" : "SKU / Reference"}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
              <Form.Item name="userId" className={styles.heroField}>
                <Input allowClear placeholder="User ID" />
              </Form.Item>
              <Form.Item name="role" className={styles.heroField}>
                <Input allowClear placeholder="Role" />
              </Form.Item>
              <Form.Item name="module" className={styles.heroField}>
                <Input allowClear placeholder="Module" />
              </Form.Item>
              <Form.Item name="actionType" className={styles.heroField}>
                <Select
                  allowClear
                  placeholder="Action"
                  options={activeTab === "logins" ? LOGIN_ACTION_TYPES : ACTION_TYPES}
                />
              </Form.Item>
              <Form.Item name="dateRange" className={`${styles.heroField} ${styles.heroFieldWide}`}>
                <RangePicker style={{ width: "100%" }} placeholder={["From", "To"]} />
              </Form.Item>
            </Form>

            <div className={styles.heroActionBtns}>
              <Tooltip title="Apply filters">
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
                  Search
                  {activeFilterCount ? ` (${activeFilterCount})` : ""}
                </Button>
              </Tooltip>
              <Tooltip title="Refresh now">
                <Button
                  icon={<ReloadOutlined />}
                  loading={summaryLoading}
                  onClick={() => setTableRefreshKey((value) => value + 1)}
                />
              </Tooltip>
              <Tooltip title="Export Excel">
                <Button
                  className={styles.excelBtn}
                  icon={<FileExcelOutlined />}
                  loading={exporting === "xlsx"}
                  disabled={!total || !!exporting}
                  onClick={() => handleExport("xlsx")}
                />
              </Tooltip>
              <Tooltip title="Export PDF">
                <Button
                  icon={<FilePdfOutlined />}
                  loading={exporting === "pdf"}
                  disabled={!total || !!exporting}
                  onClick={() => handleExport("pdf")}
                />
              </Tooltip>
              {canDelete && activeTab === "activity" ? (
                <Tooltip title="Delete all filtered logs">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!total || deletingAll || !!exporting}
                    loading={deletingAll}
                    onClick={() => setDeleteAllOpen(true)}
                  />
                </Tooltip>
              ) : null}
              <div className={styles.liveStatus}>
                <span className={`${styles.liveDot} ${autoRefresh ? styles.liveDotActive : ""}`} />
                <div>
                  <strong>{autoRefresh ? "Live updates on" : "Live updates paused"}</strong>
                  <span>
                    {lastSyncedAt
                      ? `Synced ${dayjs(lastSyncedAt).format("hh:mm:ss A")}`
                      : "Waiting for first sync"}
                  </span>
                </div>
              </div>
              <Tooltip title="Refresh automatically every 10 seconds while this tab is visible">
                <Switch
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                  checkedChildren="Live"
                  unCheckedChildren="Paused"
                />
              </Tooltip>
            </div>
          </div>
        )}
      />

      <section className={styles.summaryGrid} aria-label="Activity summary">
        <div
          className={`${styles.summaryMetric} ${styles.summaryMetricPrimary}`}
          title="Total events in the current date range"
        >
          <span className={styles.metricIcon}><ThunderboltOutlined /></span>
          <div>
            <span>Total events</span>
            <strong>{summary.total.toLocaleString()}</strong>
          </div>
        </div>
        <div className={styles.summaryMetric} title="Unique users recorded in this range">
          <span className={styles.metricIcon}><TeamOutlined /></span>
          <div>
            <span>Users active</span>
            <strong>{summary.uniqueUsers.toLocaleString()}</strong>
          </div>
        </div>
        <div
          className={styles.summaryMetric}
          title={`${summary.logouts.toLocaleString()} logout · ${summary.failedLogins.toLocaleString()} failed`}
        >
          <span className={styles.metricIcon}><LoginOutlined /></span>
          <div>
            <span>User logins</span>
            <strong>{summary.logins.toLocaleString()}</strong>
          </div>
        </div>
        <div className={styles.summaryMetric} title="Create, edit and delete events">
          <span className={styles.metricIcon}><DatabaseOutlined /></span>
          <div>
            <span>Data changes</span>
            <strong>{summary.changes.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <Card className={styles.tableCard}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className={styles.activityTabs}
          destroyOnHidden
          tabBarExtraContent={{
            right: activeTab === "activity" ? (
              <Space className={styles.tabBarExtra}>
                <span className={styles.toolbarLabel}>Before / After columns</span>
                <Switch
                  checked={showDataColumns}
                  onChange={setShowDataColumns}
                  checkedChildren="Show"
                  unCheckedChildren="Hide"
                />
              </Space>
            ) : (
              <Button
                className={styles.tabBarExtra}
                icon={<ReloadOutlined />}
                loading={summaryLoading}
                onClick={() => setTableRefreshKey((value) => value + 1)}
              >
                Refresh
              </Button>
            ),
          }}
          items={[
            {
              key: "activity",
              label: (
                <span className={styles.tabLabel}>
                  <HistoryOutlined />
                  Activity timeline
                </span>
              ),
              children: (
                <ActivityLogFlatTable
                  filterParams={filterParamsOnly}
                  refreshKey={tableRefreshKey}
                  onLoaded={setTotal}
                  autoRefreshMs={autoRefresh ? 10000 : 0}
                  onSynced={setLastSyncedAt}
                  showDataColumns={showDataColumns}
                />
              ),
            },
            {
              key: "logins",
              label: (
                <span className={styles.tabLabel}>
                  <LoginOutlined />
                  User login history
                </span>
              ),
              children: (
                <LoginHistoryPanel
                  filterParams={filterParamsOnly}
                  refreshKey={tableRefreshKey}
                  autoRefreshMs={autoRefresh ? 10000 : 0}
                  onSynced={setLastSyncedAt}
                  onLoaded={setTotal}
                />
              ),
            },
          ]}
        />
      </Card>

      <DeleteConfirmModal
        open={deleteAllOpen}
        title="Delete All Activity Logs"
        entityName={
          total
            ? `All ${total} record(s) matching the current search / filters`
            : "No records"
        }
        loading={deletingAll}
        onCancel={() => !deletingAll && setDeleteAllOpen(false)}
        onConfirm={handleDeleteAllConfirm}
      />
    </div>
  );
};

export default ActivityHistory;
