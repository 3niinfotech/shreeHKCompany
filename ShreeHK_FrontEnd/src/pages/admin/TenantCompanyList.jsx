import React, { useMemo, useState } from "react";
import {
  Layout, Typography, Button, Spin, Modal, Form, Space, Input, Tag, Empty, Alert,
} from "antd";
import { toast } from "sonner";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  TeamOutlined,
  GlobalOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { useFetchApi, usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import DynamicForm from "../../hooks/DynamicFormField";
import { tenantCompanyFields } from "./tenantCompanyData";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import useAuthStore from "../../store/Auth.Store";
import styles from "../../assets/scss/pages/admin/tenantCompany.module.scss";
import dayjs from "dayjs";

const { Content } = Layout;
const { Title, Text } = Typography;

const DATE_FIELDS = ["vwef", "cwef", "startdate", "enddate", "date"];

const toDayjs = (value) => {
  if (!value || value === "0000-00-00" || value === "0000-00-00 00:00:00") return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
};

const formatDateField = (value) => {
  if (!value) return null;
  const d = dayjs.isDayjs(value) ? value : dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
};

const mapApiToForm = (row = {}) => {
  const mapped = { ...row, id: row.id || 0 };
  DATE_FIELDS.forEach((field) => {
    mapped[field] = toDayjs(row[field]);
  });
  return mapped;
};

const mapFormToApi = (values) => {
  const payload = { ...values };
  DATE_FIELDS.forEach((field) => {
    payload[field] = formatDateField(values[field]);
  });
  return payload;
};

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const TenantCompanyList = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();
  const [deleteForm] = Form.useForm();

  const companyId = useAuthStore((s) => s.companyId);
  const companyName = useAuthStore((s) => s.companyName);

  const { data, isLoading, refetch } = useFetchApi(
    "tenantCompanies",
    ENDPOINTS.tenantCompany.list
  );
  const { mutate: saveCompany, isPending: isSaving } = usePostApiRequest(
    ENDPOINTS.tenantCompany.save,
    "tenantCompanies"
  );
  const { mutate: deleteCompany, isPending: isDeleting } = usePostApiRequest(
    ENDPOINTS.tenantCompany.delete,
    "tenantCompanies"
  );

  const companies = data?.Data || [];
  const activeCompanyId = companyId != null ? Number(companyId) : null;

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((item) => {
      const haystack = [
        item.name,
        item.address,
        item.number,
        item.city,
        item.country,
        item.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, search]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ id: 0 });
    setModalOpen(true);
  };

  const openEdit = (company) => {
    setEditing(company);
    form.setFieldsValue(mapApiToForm(company));
    setModalOpen(true);
  };

  const handleSave = (values) => {
    const payload = {
      ...mapFormToApi(values),
      id: editing?.id || 0,
    };
    saveCompany(payload, {
      onSuccess: () => {
        setModalOpen(false);
        form.resetFields();
        refetch();
      },
    });
  };

  const openDelete = (company) => {
    setDeletingCompany(company);
    deleteForm.resetFields();
    setDeleteModalOpen(true);
  };

  const closeDelete = () => {
    setDeleteModalOpen(false);
    setDeletingCompany(null);
    deleteForm.resetFields();
  };

  const handleDelete = (values) => {
    if (!deletingCompany?.id) return;
    deleteCompany(
      { id: deletingCompany.id, password: values.password },
      {
        onSuccess: (res) => {
          if (res?.status === false) return;
          closeDelete();
          refetch();
        },
      }
    );
  };

  const modalTitle = (
    <div className={styles.modalTitle}>
      <span className={styles.modalTitleIcon}>
        <BankOutlined />
      </span>
      <div>
        <div className={styles.modalTitleText}>
          {editing ? "Edit Company" : "Add New Company"}
        </div>
        <Text className={styles.modalTitleSub}>
          {editing
            ? "Update tenant company profile and registration details."
            : "Create a new tenant company for portal context mapping."}
        </Text>
      </div>
    </div>
  );

  return (
    <Layout className={styles.tenantCompanyPage}>
      <Content className={styles.pageContent}>
        <PageHeroHeader
          as="section"
          breadcrumb="ADMINISTRATION"
          title="Company List"
          icon={<BankOutlined />}
          actions={(
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              ADD NEW COMPANY
            </Button>
          )}
        />

        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Companies</span>
            <strong className={styles.statValue}>{companies.length}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Showing</span>
            <strong className={styles.statValue}>{filteredCompanies.length}</strong>
          </div>
          {activeCompanyId ? (
            <div className={`${styles.statCard} ${styles.activeStatCard}`}>
              <span className={styles.statLabel}>Your Active Company</span>
              <strong className={styles.statValueActive} title={companyName || undefined}>
                {companyName || `Company #${activeCompanyId}`}
              </strong>
            </div>
          ) : null}
          <div className={styles.searchWrap}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search by name, address, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </section>

        {isLoading ? (
          <div className={styles.loaderWrap}>
            <Spin size="large" />
          </div>
        ) : companies.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <BankOutlined />
            </div>
            <Title level={4}>No companies yet</Title>
            <Text type="secondary">
              Create your first tenant company to enable company/year context selection.
            </Text>
            <Button type="primary" onClick={openCreate} className={styles.emptyBtn}>
              Create Company Now
            </Button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className={styles.emptyState}>
            <Empty description="No companies match your search" />
          </div>
        ) : (
          <div className={styles.companyGrid}>
            {filteredCompanies.map((item) => {
              const isActive = activeCompanyId != null && Number(item.id) === activeCompanyId;
              return (
              <article
                key={item.id}
                className={`${styles.companyCard} ${isActive ? styles.companyCardActive : ""}`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.avatar} data-initials={getInitials(item.name)}>
                    {getInitials(item.name)}
                  </div>
                  <Space size={4}>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(item)}
                      aria-label="Edit company"
                      className={styles.editBtn}
                    >
                      Edit
                    </Button>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => openDelete(item)}
                      aria-label="Delete company"
                      className={styles.deleteBtn}
                      disabled={isActive}
                    >
                      Delete
                    </Button>
                  </Space>
                </div>

                {isActive ? (
                  <Tag icon={<CheckCircleFilled />} className={styles.activeBadge}>
                    Active — you are working in this company
                  </Tag>
                ) : null}

                <Title level={5} className={styles.companyName} title={item.name}>
                  {item.name}
                </Title>

                {item.type ? (
                  <Tag className={styles.typeTag}>{item.type}</Tag>
                ) : (
                  <Tag className={styles.typeTagMuted}>Tenant Company</Tag>
                )}

                <div className={styles.metaBlock}>
                  <div className={styles.metaLine}>
                    <EnvironmentOutlined />
                    <Text type="secondary">{item.address || "No address added"}</Text>
                  </div>
                  <div className={styles.metaLine}>
                    <PhoneOutlined />
                    <Text type="secondary">{item.number || "No contact number"}</Text>
                  </div>
                  {(item.city || item.country) && (
                    <div className={styles.metaLine}>
                      <GlobalOutlined />
                      <Text type="secondary">
                        {[item.city, item.country].filter(Boolean).join(", ")}
                      </Text>
                    </div>
                  )}
                  {item.partner && (
                    <div className={styles.metaLine}>
                      <TeamOutlined />
                      <Text type="secondary">{item.partner}</Text>
                    </div>
                  )}
                </div>
              </article>
            );
            })}
          </div>
        )}

        <Modal
          title={modalTitle}
          open={modalOpen}
          onCancel={() => { setModalOpen(false); form.resetFields(); }}
          footer={[
            <Button key="cancel" onClick={() => setModalOpen(false)} danger>Cancel</Button>,
            <Button key="save" type="primary" loading={isSaving} onClick={() => form.submit()} style={{ backgroundColor: "var(--color-success, #38a169)", borderColor: "var(--color-success, #38a169)", color: "#fff" }}>
              Save Company
            </Button>
          ]}
          width="min(900px, calc(100vw - 32px))"
          centered
          closable={false} 
          destroyOnClose
          className={styles.companyModal}
        >
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSave} 
            onFinishFailed={(errorInfo) => {
              if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
                toast.error(errorInfo.errorFields[0].errors[0]);
              }
            }}
            className={styles.companyForm}
          >
            <Form.Item name="id" hidden><input type="hidden" /></Form.Item>
            <DynamicForm fields={tenantCompanyFields} />
          </Form>
        </Modal>

        <Modal
          title="Delete Company"
          open={deleteModalOpen}
          onCancel={closeDelete}
          footer={[
            <Button key="cancel" onClick={closeDelete}>Cancel</Button>,
            <Button key="delete" type="primary" danger loading={isDeleting} onClick={() => deleteForm.submit()}>
              Delete Company
            </Button>
          ]}
          centered
          className={styles.deleteModal}
        >
          <Alert
            type="warning"
            showIcon
            message="This action cannot be undone"
            description={
              deletingCompany
                ? `Enter your login password to permanently delete "${deletingCompany.name}".`
                : "Enter your login password to confirm deletion."
            }
            className={styles.deleteAlert}
          />
          <Form
            form={deleteForm}
            layout="vertical"
            onFinish={handleDelete}
            className={styles.deleteForm}
          >
            <Form.Item
              name="password"
              label="Your Password"
              rules={[{ required: true, message: "Password is required to delete a company." }]}
            >
              <Input.Password placeholder="Enter your admin password" autoComplete="current-password" />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default TenantCompanyList;
