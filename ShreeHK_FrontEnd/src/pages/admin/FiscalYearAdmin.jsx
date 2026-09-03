import React, { useState } from "react";
import {
  Card, Form, Input, Button, Typography, DatePicker, Alert, Table, Space, Modal, Popconfirm, Row, Col,
} from "antd";
import {
  EditOutlined, DeleteOutlined, CalendarOutlined, DatabaseOutlined, PlusOutlined, TableOutlined, ReloadOutlined,
} from "@ant-design/icons";
import {
  useFetchApi, usePostApiRequest, usePutApiRequest, useDeleteApiRequest,
} from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import dayjs from "dayjs";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import SkeletonAwareTable from "../../components/common/skeleton/SkeletonAwareTable";
import styles from "../../assets/scss/pages/admin/fiscalYearAdmin.module.scss";

const { Title, Text } = Typography;

const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format("DD-MM-YYYY") : "—");

const FiscalYearAdmin = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading, refetch } = useFetchApi("fiscalYears", ENDPOINTS.portal.years);
  const { mutate: createYear, isPending: isCreating } = usePostApiRequest(
    ENDPOINTS.portal.addYear,
    "fiscalYears"
  );
  const { mutate: updateYear, isPending: isUpdating } = usePutApiRequest(
    ENDPOINTS.portal.updateYear,
    "fiscalYears"
  );
  const { mutate: deleteYear, isPending: isDeleting } = useDeleteApiRequest(
    ENDPOINTS.portal.deleteYear,
    "fiscalYears"
  );

  const rows = data?.Data || [];

  const onFinish = (values) => {
    const payload = {
      year: values.year,
      fromDate: values.fromDate ? dayjs(values.fromDate).format("YYYY-MM-DD") : null,
      toDate: values.toDate ? dayjs(values.toDate).format("YYYY-MM-DD") : null,
      dbName: values.dbName || null,
    };
    createYear(payload, {
      onSuccess: () => form.resetFields(),
    });
  };

  const openEdit = (record) => {
    setEditing(record);
    editForm.setFieldsValue({
      year: record.year,
      fromDate: record.fromDate ? dayjs(record.fromDate) : null,
      toDate: record.toDate ? dayjs(record.toDate) : null,
      dbName: record.dbName || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = (values) => {
    if (!editing?.id) return;
    updateYear(
      {
        id: editing.id,
        payload: {
          year: values.year,
          fromDate: values.fromDate ? dayjs(values.fromDate).format("YYYY-MM-DD") : null,
          toDate: values.toDate ? dayjs(values.toDate).format("YYYY-MM-DD") : null,
          dbName: values.dbName || null,
        },
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditing(null);
          editForm.resetFields();
          refetch();
        },
      }
    );
  };

  const columns = [
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      width: 150,
      render: (val) => <span className={styles.yearCell}>{val}</span>,
    },
    {
      title: "From",
      dataIndex: "fromDate",
      key: "fromDate",
      width: 120,
      render: (val) => formatDate(val),
    },
    {
      title: "To",
      dataIndex: "toDate",
      key: "toDate",
      width: 120,
      render: (val) => formatDate(val),
    },
    {
      title: "Database",
      dataIndex: "dbName",
      key: "dbName",
      ellipsis: true,
      render: (val) => val || "—",
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            aria-label="Edit fiscal year"
            className={styles.actionEdit}
          />
          <Popconfirm
            title="Delete this fiscal year?"
            onConfirm={() => deleteYear(record.id, { onSuccess: () => refetch() })}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={isDeleting}
              aria-label="Delete fiscal year"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.fiscalPage}>
      <PageHeroHeader
        breadcrumb="ADMINISTRATION"
        title="Fiscal Year Management"
        icon={<CalendarOutlined />}
        actions={(
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
            Refresh
          </Button>
        )}
      />

      <Alert
        className={styles.infoAlert}
        type="info"
        showIcon
        message="Super admin only. Full database copy/transfer from legacy addYear must be run separately on the server."
      />

      <Row gutter={[16, 16]} className={styles.contentRow} align="stretch">
        <Col xs={24} xl={8} className={styles.formCol}>
          <Card
            title={(
              <Space>
                <PlusOutlined />
                Create Fiscal Year
              </Space>
            )}
            className={styles.formCard}
          >
            <Form form={form} layout="vertical" onFinish={onFinish} className={styles.createForm}>
              <Form.Item name="year" label="Year Label" rules={[{ required: true, message: "Enter year label" }]}>
                <Input prefix={<CalendarOutlined />} placeholder="2025-26" />
              </Form.Item>
              <Form.Item name="fromDate" label="From Date">
                <DatePicker className={styles.fullWidth} />
              </Form.Item>
              <Form.Item name="toDate" label="To Date">
                <DatePicker className={styles.fullWidth} />
              </Form.Item>
              <Form.Item name="dbName" label="Database Name (optional)">
                <Input prefix={<DatabaseOutlined />} placeholder="shreehkweb_snj2026" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={isCreating} className={styles.createBtn} block>
                Create Fiscal Year
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={16} className={styles.tableCol}>
          <Card
            title={(
              <Space className={styles.tableTitle}>
                <TableOutlined />
                Saved Fiscal Years
                <span className={styles.countBadge}>{rows.length}</span>
              </Space>
            )}
            className={styles.tableCard}
          >
            <SkeletonAwareTable
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={isLoading}
              pagination={{ pageSize: 8, size: "small", showSizeChanger: false }}
              locale={{ emptyText: "No fiscal years created yet." }}
              className={styles.fiscalTable}
              size="middle"
              scroll={{ x: 640 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Edit Fiscal Year"
        open={editOpen}
        rootClassName={styles.editModalRoot}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          editForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setEditOpen(false)} danger>Cancel</Button>,
          <Button
            key="save"
            loading={isUpdating}
            onClick={() => editForm.submit()}
            className="fiscal-save-btn"
          >
            Save Changes
          </Button>,
        ]}
        destroyOnClose
        centered
        className={styles.editModal}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="year" label="Year Label" rules={[{ required: true, message: "Enter year label" }]}>
            <Input prefix={<CalendarOutlined />} />
          </Form.Item>
          <Form.Item name="fromDate" label="From Date">
            <DatePicker className={styles.fullWidth} />
          </Form.Item>
          <Form.Item name="toDate" label="To Date">
            <DatePicker className={styles.fullWidth} />
          </Form.Item>
          <Form.Item name="dbName" label="Database Name (optional)">
            <Input prefix={<DatabaseOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FiscalYearAdmin;
