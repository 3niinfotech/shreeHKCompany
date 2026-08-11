import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  Card, Form, Input, Select, DatePicker, Button,
} from "antd";
import {
  HistoryOutlined, FileExcelOutlined, FilePdfOutlined, DeleteOutlined, ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import AdvancedFilterPanel, { filterPanelStyles } from "../../components/common/filters/AdvancedFilterPanel";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import ActivityLogFlatTable from "../../components/admin/ActivityLogFlatTable";
import DeleteConfirmModal from "../../components/common/masterCommon/DeleteConfirmModal";
import useAuthStore from "../../store/Auth.Store";
import { hasPagePermission } from "../../config/permissionRegistry";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const { RangePicker } = DatePicker;

const ACTION_TYPES = [
  "CREATE", "UPDATE", "DELETE", "EXPORT", "PRINT",
  "TRANSFER", "STOCK_IN", "STOCK_OUT", "MEMO_CREATE", "MEMO_RETURN",
].map((v) => ({ value: v, label: v }));

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
  const permissions = useAuthStore((s) => s.permissions) || user?.permissions || [];
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

  useEffect(() => {
    form.setFieldsValue({ dateRange: todayRange() });
    setInitialLoaded(true);
  }, [form]);

  useEffect(() => {
    if (!initialLoaded) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoaded]);

  const buildParams = useCallback((values, pageNum = 1, size = pageSize) => {
    const params = {
      limit: size,
      offset: (pageNum - 1) * size,
      mutationsOnly: "1",
    };
    if (values.userId) params.userId = values.userId;
    if (values.role?.trim()) params.role = values.role.trim();
    if (values.module?.trim()) params.module = values.module.trim();
    if (values.actionType) params.actionType = values.actionType;
    if (values.search?.trim()) params.search = values.search.trim();
    if (values.dateRange?.[0]) params.from = dayjs(values.dateRange[0]).format("YYYY-MM-DD");
    if (values.dateRange?.[1]) params.to = dayjs(values.dateRange[1]).format("YYYY-MM-DD 23:59:59");
    return params;
  }, [pageSize]);

  const filterParamsOnly = useMemo(() => {
    const { limit, offset, ...rest } = activeFilters;
    return rest;
  }, [activeFilters]);

  const handleSearch = () => {
    const values = form.getFieldsValue();
    const params = buildParams(values, 1, pageSize);
    setActiveFilters(params);
    setTableRefreshKey((k) => k + 1);
  };

  const handleClear = () => {
    form.resetFields();
    form.setFieldsValue({ dateRange: todayRange() });
    setTotal(0);
    setActiveFilters({});
    setTableRefreshKey((k) => k + 1);
  };

  const buildDeleteAllParams = useCallback(() => {
    const { limit, offset, ...filterParams } = activeFilters;
    return filterParams;
  }, [activeFilters]);

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const res = await api.delete(ENDPOINTS.admin.activityLogDeleteAll, {
        params: buildDeleteAllParams(),
      });
      toastApiSuccess(res.data);
      setDeleteAllOpen(false);
      setTotal(0);
      setActiveFilters({});
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

  const watched = Form.useWatch([], form) || {};
  const activeCount = [
    watched.userId,
    watched.role,
    watched.module,
    watched.actionType,
    watched.search,
    watched.dateRange,
  ].filter(Boolean).length;

  return (
    <div className={styles.erpContainer}>
      {/* <PageHeroHeader
        breadcrumb="ADMIN"
        title="Activity History"
        icon={<HistoryOutlined />}
        actions={(
          <div className={styles.exportActions}>
            <Button
              icon={<FileExcelOutlined />}
              loading={exporting === "xlsx"}
              disabled={!total || !!exporting}
              onClick={() => handleExport("xlsx")}
            >
              Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              loading={exporting === "pdf"}
              disabled={!total || !!exporting}
              onClick={() => handleExport("pdf")}
            >
              PDF
            </Button>
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!total || deletingAll || !!exporting}
                loading={deletingAll}
                onClick={() => setDeleteAllOpen(true)}
              >
                Delete All
              </Button>
            )}
          </div>
        )}
      /> */}

      <AdvancedFilterPanel
        title="Filter Activity Log"
        subtitle="Summary Show First. Show button or toggle After/Before data Show"
        activeCount={activeCount}
        onClear={handleClear}
        clearDisabled={!activeCount && !total}
        onSearch={handleSearch}
        extraActions={(
          <div className={styles.exportActions}>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              className={filterPanelStyles.btnClear}
              onClick={handleSearch}
            >
              Reload
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              loading={exporting === "xlsx"}
              disabled={!total || !!exporting}
              onClick={() => handleExport("xlsx")}
              // style={{ padding: "19px 15px" }}
              className={styles.excelBtn}
            >
              Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              loading={exporting === "pdf"}
              disabled={!total || !!exporting}
              onClick={() => handleExport("pdf")}
              style={{ padding: "19px 15px" }}
            >
              PDF
            </Button>
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!total || deletingAll || !!exporting}
                loading={deletingAll}
                onClick={() => setDeleteAllOpen(true)}
                style={{ padding: "19px 15px" }}
              >
                Delete All
              </Button>
            )}
          </div>
        )}
      >
        <div className={`${filterPanelStyles.filterInlineRow} ${styles.filterForm}`}>
          <Form form={form} layout="vertical" className={styles.filterFieldsFlex}>
            <Form.Item name="search" label="SKU / Reference" className={styles.filterItem}>
              <Input allowClear placeholder="BG-002, invoice, party…" onPressEnter={handleSearch} />
            </Form.Item>
            <Form.Item name="userId" label="User ID" className={styles.filterItem}>
              <Input allowClear placeholder="User ID" />
            </Form.Item>
            <Form.Item name="role" label="Role" className={styles.filterItem}>
              <Input allowClear placeholder="Role name" />
            </Form.Item>
            <Form.Item name="module" label="Module / Page" className={styles.filterItem}>
              <Input allowClear placeholder="Diamond Stock, Memo, Party…" />
            </Form.Item>
            <Form.Item name="actionType" label="Action" className={styles.filterItem}>
              <Select allowClear placeholder="Add / Edit / Delete" options={ACTION_TYPES} />
            </Form.Item>
            <Form.Item name="dateRange" label="Date Range" className={`${styles.filterItem} ${styles.fieldWide}`}>
              <RangePicker style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        </div>
      </AdvancedFilterPanel>

      <Card className={styles.tableCard}>
        <ActivityLogFlatTable
          filterParams={filterParamsOnly}
          refreshKey={tableRefreshKey}
          onLoaded={setTotal}
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
