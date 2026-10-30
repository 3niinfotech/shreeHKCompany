import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Layout, Typography, Button, Modal, Form, Space, Input, Tag, Alert, Upload, Row, Col, Card, Drawer, Tabs, Dropdown,
} from "antd";
import { SkeletonCard } from "../../components/common/skeleton";
import { toast } from "sonner";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  GlobalOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  UploadOutlined,
  CloseOutlined,
  MoreOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useFetchApi, usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import DynamicForm from "../../components/common/ui/DynamicFormField";
import { tenantCompanyFields } from "./tenantCompanyData";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import useAuthStore from "../../store/Auth.Store";
import { resolveUploadUrl } from "../../utils/uploadBaseUrl";
import styles from "../../assets/scss/pages/admin/tenantCompany.module.scss";
import dayjs from "dayjs";
import PermanentDeleteModal from "../../components/common/modals/PermanentDeleteModal";

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

const parseCompanyBanks = (company) => {
  if (!company?.bank_details) return [];
  let parsed = [];
  if (Array.isArray(company.bank_details)) {
    parsed = company.bank_details;
  } else if (typeof company.bank_details === "string" && company.bank_details.trim()) {
    try {
      parsed = JSON.parse(company.bank_details);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((b) => b && (b.bank_label || b.bank_name || b.account_no));
};

const TenantCompanyList = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCompany, setDrawerCompany] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [banks, setBanks] = useState([]);

  // Permanent delete state
  const [permDeleteOpen, setPermDeleteOpen] = useState(false);
  const [permDeleteEntity, setPermDeleteEntity] = useState(null);

  const handleCardClick = (company) => {
    setDrawerCompany(company);
    setDrawerOpen(true);
  };

  const handleAddBank = () => {
    setBanks((prev) => [
      ...prev,
      {
        bank_label: "",
        bank_name: "",
        ac_name: form.getFieldValue("name") || "",
        account_no: "",
        bank_code: "",
        branch_code: "",
        swift_code: "",
      },
    ]);
  };

  const handleRemoveBank = (index) => {
    setBanks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBankChange = (index, field, value) => {
    setBanks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const companyId = useAuthStore((s) => s.companyId);
  const companyName = useAuthStore((s) => s.companyName);
  const sessionBranchId = useAuthStore((s) => s.branchId);
  const setSessionContext = useAuthStore((s) => s.setSessionContext);

  const { data, isLoading, isFetching, refetch } = useFetchApi(
    "tenantCompanies",
    ENDPOINTS.tenantCompany.list
  );
  const { data: branchOptionsData } = useFetchApi(
    "branchOptions",
    ENDPOINTS.branch.options
  );
  const { mutate: saveCompany, isPending: isSaving } = usePostApiRequest(
    ENDPOINTS.tenantCompany.save,
    "tenantCompanies"
  );

  const allCompanies = useMemo(() => data?.Data || [], [data]);
  const activeCompanyId = companyId != null ? Number(companyId) : null;
  const activeBranchId = sessionBranchId != null ? Number(sessionBranchId) : null;

  // Branch ke andar ki saari active companies dikhti hain — list ko ek company tak narrow mat karo
  const companies = allCompanies;

  // Login branch ke andar companies
  const activeBranchCompanies = useMemo(() => {
    if (activeBranchId == null) return [];
    return allCompanies.filter((c) => Number(c.branch_id) === activeBranchId);
  }, [allCompanies, activeBranchId]);
  const branchOptions = useMemo(
    () =>
      (branchOptionsData?.Data || []).map((b) => ({
        label: b.shortcutName ? `${b.name} (${b.shortcutName})` : b.name,
        value: b.id,
      })),
    [branchOptionsData]
  );
  const companyFormFields = useMemo(
    () => tenantCompanyFields(branchOptions),
    [branchOptions]
  );

  const openCreate = () => {
    setEditing(null);
    setLogoFile(null);
    setLogoPreview(null);
    setClearLogo(false);
    setBanks([]);
    form.resetFields();
    form.setFieldsValue({
      id: 0,
      // Pre-select login branch (e.g. Surat) so company maps under that branch
      branch_id: sessionBranchId != null ? Number(sessionBranchId) : undefined,
      invoice_prefix: "INV-",
      memo_prefix: "MEMO-",
      purchase_prefix: "PUR-",
      lab_prefix: "LAB-",
    });
    setModalOpen(true);
  };

  const openEdit = (company) => {
    setEditing(company);
    setLogoFile(null);
    setClearLogo(false);
    setLogoPreview(company?.logo ? resolveUploadUrl(company.logo) : null);
    let parsedBanks = [];
    if (company?.bank_details) {
      if (Array.isArray(company.bank_details)) {
        parsedBanks = company.bank_details;
      } else if (typeof company.bank_details === "string" && company.bank_details.trim()) {
        try {
          parsedBanks = JSON.parse(company.bank_details);
        } catch {
          parsedBanks = [];
        }
      }
    }
    setBanks(Array.isArray(parsedBanks) ? parsedBanks : []);
    form.setFieldsValue(mapApiToForm(company));
    setModalOpen(true);
  };

  const handleSave = (values) => {
    const mapped = {
      ...mapFormToApi(values),
      id: editing?.id || 0,
    };

    const formData = new FormData();
    Object.entries(mapped).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, value);
    });
    formData.append("bank_details", JSON.stringify(banks));
    if (logoFile) {
      formData.append("logo", logoFile);
    } else if (clearLogo) {
      formData.append("clear_logo", "1");
      formData.append("logo", "");
    } else if (editing?.logo) {
      formData.append("logo", editing.logo);
    }

    saveCompany(formData, {
      onSuccess: (res) => {
        if (res?.status === false) return;
        if (editing?.id && activeCompanyId != null && Number(editing.id) === activeCompanyId) {
          const nextLogo = clearLogo ? null : (res?.logo ?? editing.logo ?? null);
          setSessionContext({
            companyLogo: nextLogo,
            companyName: mapped.name || companyName,
            companyColorCode: mapped.color_code || null,
          });
        }
        setModalOpen(false);
        form.resetFields();
        setLogoFile(null);
        setLogoPreview(null);
        setClearLogo(false);
        queryClient.invalidateQueries({ queryKey: ["branchCompanies"] });
        queryClient.invalidateQueries({ queryKey: ["tenantCompanies"] });
        refetch();
      },
    });
  };

  const openDelete = (company) => {
    setPermDeleteEntity(company);
    setPermDeleteOpen(true);
  };

  const handleCompanyDeleted = (result) => {
    queryClient.invalidateQueries({ queryKey: ["tenantCompanies"] });
    queryClient.invalidateQueries({ queryKey: ["branchCompanies"] });
    queryClient.invalidateQueries({ queryKey: ["portalCompanyYears"] });
    refetch();
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
          title="Companies"
          icon={<BankOutlined />}
          actions={(
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading || isFetching}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className={styles.primaryBtn}>
                Add company
              </Button>
            </Space>
          )}
        />

        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <strong className={styles.statValue}>{companies.length}</strong>
              <span className={styles.statLabel}>Total companies</span>
            </div>
            <div className={`${styles.statIconWrap} ${styles.statIconTeal}`}>
              <BankOutlined />
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <strong className={styles.statValue}>{companies.length}</strong>
              <span className={styles.statLabel}>Showing</span>
            </div>
            <div className={`${styles.statIconWrap} ${styles.statIconSlate}`}>
              <AppstoreOutlined />
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.activeStatCard}`}>
            <div className={styles.statContent}>
              <strong className={`${styles.statValue} ${styles.statValueGreen}`}>
                {activeBranchCompanies.length || (activeCompanyId ? 1 : 0)}
              </strong>
              <span className={styles.statLabel}>
                Active companies{activeBranchCompanies.length ? ` (${activeBranchCompanies.length})` : ""}
              </span>
              {activeBranchCompanies.length > 0 ? (
                <span className={styles.statSubText} title={activeBranchCompanies.map((c) => c.name).join(", ")}>
                  {activeBranchCompanies.map((c) => c.name).join(", ")}
                </span>
              ) : companyName ? (
                <span className={styles.statSubText} title={companyName}>
                  {companyName}
                </span>
              ) : null}
            </div>
            <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
              <CheckCircleOutlined />
            </div>
          </div>
        </section>

        {(isLoading || isFetching) ? (
          <div className={styles.companyGrid} aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} lines={4} withAvatar />
            ))}
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
        ) : (
          <div className={styles.companyGrid}>
            {companies.map((item) => {
              const isActive = (activeCompanyId != null && Number(item.id) === activeCompanyId) ||
                (activeBranchId != null && Number(item.branch_id) === activeBranchId);
              const itemBanks = parseCompanyBanks(item);
              return (
              <article
                key={item.id}
                className={`${styles.companyCard} ${isActive ? styles.companyCardActive : ""}`}
                onClick={() => handleCardClick(item)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <div
                      className={`${styles.avatar} ${isActive ? "" : styles.avatarMuted}`}
                      data-initials={getInitials(item.name)}
                    >
                      {item.logo ? (
                        <img
                          src={resolveUploadUrl(item.logo)}
                          alt={item.name || "logo"}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                        />
                      ) : (
                        getInitials(item.name)
                      )}
                    </div>
                    <div className={styles.cardHeaderInfo}>
                      <Title level={5} className={styles.companyName} title={item.name}>
                        {item.name}
                      </Title>
                      <div className={styles.companyLocation}>
                        <GlobalOutlined className={styles.infoIcon} />
                        <span>
                          {[item.city, item.country].filter(Boolean).join(", ") || item.address || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardHeaderRight} onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "edit",
                            icon: <EditOutlined />,
                            label: "Edit",
                            onClick: () => openEdit(item),
                          },
                          {
                            key: "delete",
                            icon: <DeleteOutlined style={{ color: "#ef4444" }} />,
                            label: <span style={{ color: "#ef4444", fontWeight: 500 }}>Delete</span>,
                            danger: true,
                            onClick: () => openDelete(item),
                          },
                        ],
                      }}
                      trigger={["click"]}
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined style={{ fontSize: 18 }} />}
                        className={styles.moreBtn}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="More actions"
                      />
                    </Dropdown>
                  </div>
                </div>

                <div className={styles.cardDetails}>
                  <div className={styles.detailLine}>
                    <PhoneOutlined className={styles.infoIcon} />
                    <span>{item.number || "—"}</span>
                  </div>
                  <div className={styles.detailLine}>
                    <MailOutlined className={styles.infoIcon} />
                    <span>{item.email || "—"}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.cardStatusBadge}>
                    <span className={styles.statusDot} />
                    <span>Active</span>
                  </div>
                  <div className={styles.bankLinkedText}>
                    {itemBanks.length > 0
                      ? `${itemBanks.length} ${itemBanks.length === 1 ? "bank" : "banks"} linked`
                      : "No bank added"}
                  </div>
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
          maskClosable={false}
          mask={{ closable: false }}
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
            <DynamicForm fields={companyFormFields} />
            <Row gutter={[16, 0]} align="top">
              <Col span={12}>
                <Form.Item name="rapnet_password" label="RapNet Password">
                  <Input.Password
                    autoComplete="new-password"
                    placeholder={editing ? "Leave blank to keep current password" : "Enter RapNet Password..."}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Company Logo (for bills / invoices)">
                  <Space align="start" wrap>
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company logo preview"
                        style={{ width: 88, height: 88, objectFit: "contain", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}
                      />
                    ) : null}
                    <Upload
                      accept="image/*"
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={(file) => {
                        setLogoFile(file);
                        setClearLogo(false);
                        setLogoPreview(URL.createObjectURL(file));
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />}>
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                    </Upload>
                    {logoPreview ? (
                      <Button
                        danger
                        type="link"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                          setClearLogo(true);
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </Space>
                  <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                    This logo appears on sale, purchase, memo and other bills for the selected company.
                  </Text>
                </Form.Item>
              </Col>
            </Row>

            <div style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <Typography.Text strong style={{ fontSize: 15, color: "#1e293b" }}>
                    Bank Details
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                    Add multiple bank accounts for this company. These will be selectable on invoices/bills.
                  </Typography.Text>
                </div>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddBank}
                  style={{ borderColor: "#0284c7", color: "#0284c7" }}
                >
                  Add Bank
                </Button>
              </div>

              {banks.length === 0 ? (
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: "center" }}>
                  <Text type="secondary">No banks added yet. Click &ldquo;Add Bank&rdquo; to add account details.</Text>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {banks.map((b, idx) => (
                    <Card
                      key={idx}
                      size="small"
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}
                      title={
                        <Space>
                          <Tag color="blue">{b.bank_label || `Bank #${idx + 1}`}</Tag>
                          <Text strong style={{ fontSize: 13 }}>{b.bank_name || "New Bank Account"}</Text>
                        </Space>
                      }
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveBank(idx)}
                          size="small"
                        >
                          Remove
                        </Button>
                      }
                    >
                      <Row gutter={[12, 10]}>
                        <Col span={6}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            Bank Shortcut / Label <span style={{ color: "red" }}>*</span>
                          </label>
                          <Input
                            size="small"
                            placeholder="e.g. BOC, CITI, DBS, SC, HDFC"
                            value={b.bank_label}
                            onChange={(e) => handleBankChange(idx, "bank_label", e.target.value)}
                          />
                        </Col>
                        <Col span={9}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            Bank Full Name <span style={{ color: "red" }}>*</span>
                          </label>
                          <Input
                            size="small"
                            placeholder="e.g. Bank of China (Hong Kong) Ltd"
                            value={b.bank_name}
                            onChange={(e) => handleBankChange(idx, "bank_name", e.target.value)}
                          />
                        </Col>
                        <Col span={9}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            A/c. Name (Beneficiary)
                          </label>
                          <Input
                            size="small"
                            placeholder="Account Holder Name"
                            value={b.ac_name}
                            onChange={(e) => handleBankChange(idx, "ac_name", e.target.value)}
                          />
                        </Col>
                        <Col span={9}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            Account No <span style={{ color: "red" }}>*</span>
                          </label>
                          <Input
                            size="small"
                            placeholder="Account number(s)"
                            value={b.account_no}
                            onChange={(e) => handleBankChange(idx, "account_no", e.target.value)}
                          />
                        </Col>
                        <Col span={5}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            Bank Code
                          </label>
                          <Input
                            size="small"
                            placeholder="e.g. 012"
                            value={b.bank_code}
                            onChange={(e) => handleBankChange(idx, "bank_code", e.target.value)}
                          />
                        </Col>
                        <Col span={5}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            Branch Code
                          </label>
                          <Input
                            size="small"
                            placeholder="e.g. 791"
                            value={b.branch_code}
                            onChange={(e) => handleBankChange(idx, "branch_code", e.target.value)}
                          />
                        </Col>
                        <Col span={5}>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                            Swift Code
                          </label>
                          <Input
                            size="small"
                            placeholder="e.g. BKCHHKHHXXX"
                            value={b.swift_code}
                            onChange={(e) => handleBankChange(idx, "swift_code", e.target.value)}
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Form>
        </Modal>

        <PermanentDeleteModal
          type="company"
          entity={permDeleteEntity}
          open={permDeleteOpen}
          onClose={() => {
            setPermDeleteOpen(false);
            setPermDeleteEntity(null);
          }}
          onDeleted={handleCompanyDeleted}
        />

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width="min(500px, 92vw)"
          closable={false}
          className={styles.companyDrawer}
          destroyOnClose
        >
          {drawerCompany && (
            <>
              <div className={styles.drawerHeader}>
                <div className={styles.drawerHeaderLeft}>
                  <div
                    className={styles.drawerAvatar}
                    data-initials={getInitials(drawerCompany.name)}
                  >
                    {drawerCompany.logo ? (
                      <img
                        src={resolveUploadUrl(drawerCompany.logo)}
                        alt={drawerCompany.name || "logo"}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                      />
                    ) : (
                      getInitials(drawerCompany.name)
                    )}
                  </div>
                  <div className={styles.drawerHeaderInfo}>
                    <Title level={5} className={styles.drawerCompanyName}>
                      {drawerCompany.name}
                    </Title>
                    <div className={styles.drawerStatusBadge}>
                      <span className={styles.drawerStatusDot} />
                      <span>Active</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.drawerCloseBtn}
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close"
                >
                  <CloseOutlined />
                </button>
              </div>

              <Tabs
                defaultActiveKey="overview"
                items={[
                  {
                    key: "overview",
                    label: "Overview",
                    children: (
                      <div className={styles.drawerDetailList}>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Partner</span>
                          <span className={styles.drawerDetailValue}>{drawerCompany.partner || "—"}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Phone</span>
                          <span className={styles.drawerDetailValue}>{drawerCompany.number || "—"}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Email</span>
                          <span className={styles.drawerDetailValue}>{drawerCompany.email || "—"}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Website</span>
                          <span className={styles.drawerDetailValue}>
                            {drawerCompany.website ? (
                              <a
                                href={drawerCompany.website.startsWith("http") ? drawerCompany.website : `https://${drawerCompany.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {drawerCompany.website}
                              </a>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Address</span>
                          <div className={styles.drawerDetailAddress}>
                            {drawerCompany.address && <div>{drawerCompany.address}</div>}
                            {(drawerCompany.city || drawerCompany.state || drawerCompany.pincode) && (
                              <div>
                                {[drawerCompany.city, drawerCompany.state, drawerCompany.pincode].filter(Boolean).join(", ")}
                              </div>
                            )}
                            {drawerCompany.country && <div>{drawerCompany.country}</div>}
                            {!drawerCompany.address && !drawerCompany.city && !drawerCompany.country && (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "banks",
                    label: "Banks",
                    children: (
                      <div>
                        {parseCompanyBanks(drawerCompany).length === 0 ? (
                          <div style={{ textAlign: "center", padding: "28px 0", color: "#94a3b8" }}>
                            No bank details added
                          </div>
                        ) : (
                          parseCompanyBanks(drawerCompany).map((b, idx) => (
                            <div key={idx} className={styles.drawerBankCard}>
                              <div className={styles.drawerBankTop}>
                                <Tag color="blue" style={{ margin: 0, fontWeight: 700 }}>
                                  {b.bank_label || `Bank ${idx + 1}`}
                                </Tag>
                                <strong style={{ fontSize: 13, color: "#1e293b" }}>{b.bank_name || b.bank_label}</strong>
                              </div>
                              <div className={styles.drawerDetailList} style={{ gap: 6, paddingTop: 6 }}>
                                {b.ac_name && (
                                  <div className={styles.drawerDetailRow}>
                                    <span className={styles.drawerDetailLabel}>A/c Name</span>
                                    <span className={styles.drawerDetailValue}>{b.ac_name}</span>
                                  </div>
                                )}
                                {b.account_no && (
                                  <div className={styles.drawerDetailRow}>
                                    <span className={styles.drawerDetailLabel}>Account No</span>
                                    <span className={styles.drawerDetailValue} style={{ fontFamily: "monospace", fontWeight: 600 }}>
                                      {b.account_no}
                                    </span>
                                  </div>
                                )}
                                {b.bank_code && (
                                  <div className={styles.drawerDetailRow}>
                                    <span className={styles.drawerDetailLabel}>Bank Code</span>
                                    <span className={styles.drawerDetailValue}>{b.bank_code}</span>
                                  </div>
                                )}
                                {b.branch_code && (
                                  <div className={styles.drawerDetailRow}>
                                    <span className={styles.drawerDetailLabel}>Branch Code</span>
                                    <span className={styles.drawerDetailValue}>{b.branch_code}</span>
                                  </div>
                                )}
                                {b.swift_code && (
                                  <div className={styles.drawerDetailRow}>
                                    <span className={styles.drawerDetailLabel}>Swift Code</span>
                                    <span className={styles.drawerDetailValue} style={{ fontFamily: "monospace", fontWeight: 600 }}>
                                      {b.swift_code}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "prefixes",
                    label: "Prefixes",
                    children: (
                      <div className={styles.drawerDetailList}>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Invoice Prefix</span>
                          <span className={styles.drawerDetailValue}>
                            <Tag color="blue">{drawerCompany.invoice_prefix || "INV-"}</Tag>
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Memo Prefix</span>
                          <span className={styles.drawerDetailValue}>
                            <Tag color="cyan">{drawerCompany.memo_prefix || "MEMO-"}</Tag>
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Purchase Prefix</span>
                          <span className={styles.drawerDetailValue}>
                            <Tag color="purple">{drawerCompany.purchase_prefix || "PUR-"}</Tag>
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Lab Prefix</span>
                          <span className={styles.drawerDetailValue}>
                            <Tag color="orange">{drawerCompany.lab_prefix || "LAB-"}</Tag>
                          </span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "financial_year",
                    label: "Financial year",
                    children: (
                      <div className={styles.drawerDetailList}>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Period</span>
                          <span className={styles.drawerDetailValue}>{drawerCompany.period || "1"}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Start Date</span>
                          <span className={styles.drawerDetailValue}>
                            {drawerCompany.startdate ? String(drawerCompany.startdate).slice(0, 10) : "—"}
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>End Date</span>
                          <span className={styles.drawerDetailValue}>
                            {drawerCompany.enddate ? String(drawerCompany.enddate).slice(0, 10) : "—"}
                          </span>
                        </div>
                        {drawerCompany.cwef && (
                          <div className={styles.drawerDetailRow}>
                            <span className={styles.drawerDetailLabel}>CST W.E.F</span>
                            <span className={styles.drawerDetailValue}>{String(drawerCompany.cwef).slice(0, 10)}</span>
                          </div>
                        )}
                        {drawerCompany.vwef && (
                          <div className={styles.drawerDetailRow}>
                            <span className={styles.drawerDetailLabel}>VAT W.E.F</span>
                            <span className={styles.drawerDetailValue}>{String(drawerCompany.vwef).slice(0, 10)}</span>
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </>
          )}
        </Drawer>
      </Content>
    </Layout>
  );
};

export default TenantCompanyList;
