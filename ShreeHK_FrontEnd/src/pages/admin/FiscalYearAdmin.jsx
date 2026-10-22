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
import { ENDPOINTS } from "../../api/endpoints";
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

  const { data, isLoading, isFetching, refetch } = useFetchApi("fiscalYears", ENDPOINTS.portal.years);
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
    "fiscalYears",
    { queryParam: "deleteId" }
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
      width: 140,
      render: (val) => (
        <span className={styles.yearBadge}>
          <CalendarOutlined className={styles.yearBadgeIcon} />
          {val}
        </span>
      ),
    },
    {
      title: "From",
      dataIndex: "fromDate",
      key: "fromDate",
      width: 130,
      render: (val) => <span className={styles.dateCell}>{formatDate(val)}</span>,
    },
    {
      title: "To",
      dataIndex: "toDate",
      key: "toDate",
      width: 130,
      render: (val) => <span className={styles.dateCell}>{formatDate(val)}</span>,
    },
    {
      title: "Action",
      key: "action",
      width: 110,
      fixed: "right",
      align: "center",
      className: styles.actionCol,
      render: (_, record) => (
        <div className={styles.actionWrapper}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            aria-label="Edit financial year"
            className={styles.actionBtnEdit}
            title="Edit"
          />
          <Popconfirm
            title="Delete this financial year?"
            description="Are you sure you want to delete this financial year record?"
            onConfirm={() => deleteYear(record.id, { onSuccess: () => refetch() })}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              loading={isDeleting}
              aria-label="Delete financial year"
              className={styles.actionBtnDelete}
              title="Delete"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.fiscalPage}>
      <PageHeroHeader
        breadcrumb="ADMINISTRATION"
        title="Financial Year Management"
        icon={<CalendarOutlined />}
        actions={(
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading || isFetching}>
            Refresh
          </Button>
        )}
      />

      <Row gutter={[16, 16]} className={styles.contentRow} align="stretch">
        <Col xs={24} xl={8} className={styles.formCol}>
          <Card
            title={(
              <div className={styles.cardHeaderTitle}>
                <span className={styles.headerIconWrapper}>
                  <PlusOutlined />
                </span>
                <span>Create Financial Year</span>
              </div>
            )}
            className={styles.formCard}
          >
            <Form form={form} layout="vertical" onFinish={onFinish} className={styles.createForm}>
              <Form.Item name="year" label="Year Label" rules={[{ required: true, message: "Enter year label" }]}>
                <Input prefix={<CalendarOutlined />} placeholder="2025-26" />
              </Form.Item>
              <Form.Item name="fromDate" label="From Date">
                <DatePicker className={styles.fullWidth} format="DD-MM-YYYY" />
              </Form.Item>
              <Form.Item name="toDate" label="To Date">
                <DatePicker className={styles.fullWidth} format="DD-MM-YYYY" />
              </Form.Item>
              <Form.Item name="dbName" label="Database Name (optional)">
                <Input prefix={<DatabaseOutlined />} placeholder="shreehkweb_snj2026" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={isCreating} className={styles.createBtn} block icon={<PlusOutlined />}>
                Create Financial Year
              </Button>

              <div className={styles.formNote}>
                <CalendarOutlined className={styles.noteIcon} />
                <span>Financial years define the active accounting & transaction period across all branches.</span>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={16} className={styles.tableCol}>
          <Card
            title={(
              <div className={styles.cardHeaderTitle}>
                <span className={styles.headerIconWrapper}>
                  <TableOutlined />
                </span>
                <span>Saved Financial Years</span>
                <span className={styles.countBadge}>{rows.length}</span>
              </div>
            )}
            className={styles.tableCard}
          >
            <SkeletonAwareTable
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={isLoading || isFetching}
              pagination={{ pageSize: 8, size: "small", showSizeChanger: false }}
              locale={{ emptyText: "No financial years created yet." }}
              className={styles.fiscalTable}
              size="middle"
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={(
          <Space>
            <EditOutlined style={{ color: "var(--color-primary)" }} />
            <span>Edit Financial Year</span>
          </Space>
        )}
        open={editOpen}
        rootClassName={styles.editModalRoot}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          editForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setEditOpen(false)}>Cancel</Button>,
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
        closable={false}
        maskClosable={false}
        mask={{ closable: false }}
        className={styles.editModal}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="year" label="Year Label" rules={[{ required: true, message: "Enter year label" }]}>
            <Input prefix={<CalendarOutlined />} />
          </Form.Item>
          <Form.Item name="fromDate" label="From Date">
            <DatePicker className={styles.fullWidth} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="toDate" label="To Date">
            <DatePicker className={styles.fullWidth} format="DD-MM-YYYY" />
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
