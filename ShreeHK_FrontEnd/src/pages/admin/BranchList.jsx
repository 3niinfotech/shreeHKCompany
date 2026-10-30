import React, { useMemo, useState } from "react";
import {
  Layout, Typography, Button, Modal, Form, Space, Tag, Drawer, Tabs, Dropdown,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { SkeletonCard } from "../../components/common/skeleton";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  AppstoreOutlined,
  MoreOutlined,
  CloseOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useFetchApi, usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import DynamicForm from "../../components/common/ui/DynamicFormField";
import { branchFields } from "./branchData";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import useAuthStore from "../../store/Auth.Store";
import styles from "../../assets/scss/pages/admin/tenantCompany.module.scss";
import branchStyles from "../../assets/scss/pages/admin/branch.module.scss";
import PermanentDeleteModal from "../../components/common/modals/PermanentDeleteModal";

const { Content } = Layout;
const { Title, Text } = Typography;

const EMPTY_PARAMS = Object.freeze({});

const toSafeText = (val, fallback = "") => {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof val.name === "string") return val.name;
    if (typeof val.label === "string") return val.label;
    if (typeof val.title === "string") return val.title;
    if (typeof val.company_name === "string") return val.company_name;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const getInitials = (name = "") => {
  const safeStr = toSafeText(name, "");
  const parts = safeStr.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "BR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const avatarClassForBranch = (name = "") => {
  const key = toSafeText(name, "").trim().toLowerCase();
  if (key === "hk") return branchStyles.avatarHk;
  if (key === "dubai") return branchStyles.avatarDubai;
  if (key === "surat") return branchStyles.avatarSurat;
  return "";
};

const BranchList = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [permDeleteOpen, setPermDeleteOpen] = useState(false);
  const [permDeleteEntity, setPermDeleteEntity] = useState(null);
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBranch, setDrawerBranch] = useState(null);
  const [form] = Form.useForm();

  const handleCardClick = (branch) => {
    setDrawerBranch(branch);
    setDrawerOpen(true);
  };

  const { data, isLoading, refetch, isFetching } = useFetchApi(
    "branches",
    ENDPOINTS.branch.list,
    EMPTY_PARAMS,
    "GET",
    { staleTime: 0, refetchOnMount: "always" }
  );
  const { mutate: saveBranch, isPending: isSaving } = usePostApiRequest(
    ENDPOINTS.branch.save,
    "branches"
  );

  const branches = useMemo(
    () => (Array.isArray(data?.Data) ? data.Data : []),
    [data]
  );
  const activeCount = useMemo(
    () => branches.filter((b) => Number(b?.status) === 1).length,
    [branches]
  );

  const currentBranchId = useAuthStore((s) => s.branchId);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ id: 0, status: 1 });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      ...row,
      id: row.id || 0,
      color_code: row.color_code || undefined,
      status: Number(row.status) ? 1 : 0,
    });
    setModalOpen(true);
  };

  const handleSave = (values) => {
    const rawColor = typeof values.color_code === "string" ? values.color_code.trim() : "";
    const cleanColor = rawColor
      ? (/^[0-9A-Fa-f]{3,8}$/.test(rawColor) ? `#${rawColor}` : rawColor)
      : null;

    saveBranch(
      {
        ...values,
        id: editing?.id || 0,
        color_code: cleanColor,
        status: Number(values.status) ? 1 : 0,
      },
      {
        onSuccess: (res) => {
          if (res?.status === false) return;
          setModalOpen(false);
          form.resetFields();
          if (editing?.id && Number(currentBranchId) === Number(editing.id)) {
            useAuthStore.getState().setSessionContext({
              branchColorCode: cleanColor,
            });
          }
          refetch();
          queryClient.invalidateQueries({ queryKey: ["fiscalYears"] });
          queryClient.invalidateQueries({ queryKey: ["session"] });
          queryClient.invalidateQueries({ queryKey: ["branchCompanies"] });
          queryClient.invalidateQueries({ queryKey: ["portalCompanyYears"] });
        },
      }
    );
  };

  const openDelete = (row) => {
    setPermDeleteEntity(row);
    setPermDeleteOpen(true);
  };

  const handleBranchDeleted = (result) => {
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["branchOptions"] });
    queryClient.invalidateQueries({ queryKey: ["tenantCompanies"] });
    queryClient.invalidateQueries({ queryKey: ["branchCompanies"] });
    refetch();
    if (currentBranchId != null && Number(permDeleteEntity?.id) === Number(currentBranchId)) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
  };

  const modalTitle = (
    <div className={styles.modalTitle}>
      <span className={styles.modalTitleIcon}>
        <ApartmentOutlined />
      </span>
      <div>
        <div className={styles.modalTitleText}>
          {editing ? "Edit Branch" : "Add New Branch"}
        </div>
        <Text className={styles.modalTitleSub}>
          {editing
            ? "Update branch profile used on login Branch → Company flow."
            : "Create a branch (HK / Dubai / Surat) for login selection."}
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
          title="Branches"
          icon={<ApartmentOutlined />}
          actions={(
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading || isFetching}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className={styles.primaryBtn}>
                Add branch
              </Button>
            </Space>
          )}
        />

        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <strong className={styles.statValue}>{branches.length}</strong>
              <span className={styles.statLabel}>Total branches</span>
            </div>
            <div className={`${styles.statIconWrap} ${styles.statIconTeal}`}>
              <ApartmentOutlined />
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <strong className={styles.statValue}>{branches.length}</strong>
              <span className={styles.statLabel}>Showing</span>
            </div>
            <div className={`${styles.statIconWrap} ${styles.statIconSlate}`}>
              <AppstoreOutlined />
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.activeStatCard}`}>
            <div className={styles.statContent}>
              <strong className={`${styles.statValue} ${styles.statValueGreen}`}>{activeCount}</strong>
              <span className={styles.statLabel}>Active (login)</span>
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
        ) : branches.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <ApartmentOutlined />
            </div>
            <Title level={4}>No branches yet</Title>
            <Text type="secondary">
              Create branches (HK, Dubai, Surat) so login can show Branch → Company.
            </Text>
            <Button type="primary" onClick={openCreate} className={styles.emptyBtn}>
              Create Branch Now
            </Button>
          </div>
        ) : (
          <div className={styles.companyGrid}>
            {branches.map((item) => {
              const isActive = Boolean(Number(item?.status));
              const branchName = toSafeText(item?.name, "Branch");
              const linkedNames = Array.isArray(item?.company_names)
                ? item.company_names
                : [];
              const addressText = toSafeText(item?.address, "No address added");
              const locationParts = [
                toSafeText(item?.city, ""),
                toSafeText(item?.country, ""),
              ].filter(Boolean);
              const locationText = locationParts.join(", ");
              const phoneText = toSafeText(item?.number, "");

              return (
                <article
                  key={item?.id ?? branchName}
                  className={`${styles.companyCard} ${isActive ? styles.companyCardActive : ""}`}
                  onClick={() => handleCardClick(item)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      <div
                        className={`${styles.avatar} ${avatarClassForBranch(branchName)}`}
                        style={item?.color_code ? { backgroundColor: item.color_code, color: "#fff" } : undefined}
                        data-initials={getInitials(branchName)}
                      >
                        {getInitials(branchName)}
                      </div>
                      <div className={styles.cardHeaderInfo}>
                        <Title level={5} className={styles.companyName} title={branchName}>
                          {branchName}
                        </Title>
                        {locationText ? (
                          <div className={styles.companyLocation}>
                            <GlobalOutlined className={styles.infoIcon} />
                            <span>{locationText}</span>
                          </div>
                        ) : addressText ? (
                          <div className={styles.companyLocation}>
                            <EnvironmentOutlined className={styles.infoIcon} />
                            <span>{addressText}</span>
                          </div>
                        ) : null}
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
                    {addressText ? (
                      <div className={styles.detailLine}>
                        <EnvironmentOutlined className={styles.infoIcon} />
                        <span>{addressText}</span>
                      </div>
                    ) : null}
                    {phoneText ? (
                      <div className={styles.detailLine}>
                        <PhoneOutlined className={styles.infoIcon} />
                        <span>{phoneText}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.cardStatusBadge}>
                      <span className={styles.statusDot} />
                      <span>{isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <div className={styles.bankLinkedText}>
                      {linkedNames.length > 0 || Number(item?.company_count) > 0
                        ? `${linkedNames.length || Number(item?.company_count)} ${
                            (linkedNames.length || Number(item?.company_count)) === 1 ? "company" : "companies"
                          } linked`
                        : "No company linked"}
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
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          footer={[
            <Button key="cancel" onClick={() => setModalOpen(false)} danger>
              Cancel
            </Button>,
            <Button
              key="save"
              type="primary"
              loading={isSaving}
              onClick={() => form.submit()}
              style={{
                backgroundColor: "var(--color-success, #38a169)",
                borderColor: "var(--color-success, #38a169)",
                color: "#fff",
              }}
            >
              Save Branch
            </Button>,
          ]}
          width="min(900px, calc(100vw - 32px))"
          centered
          closable={false}
          mask={{ closable: false }}
          destroyOnClose
          className={styles.companyModal}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            onFinishFailed={(errorInfo) => {
              if (errorInfo.errorFields?.length) {
                toast.error(errorInfo.errorFields[0].errors[0]);
              }
            }}
            className={styles.companyForm}
          >
            <Form.Item name="id" hidden>
              <input type="hidden" />
            </Form.Item>
            <DynamicForm fields={branchFields} />
          </Form>
        </Modal>

        <PermanentDeleteModal
          type="branch"
          entity={permDeleteEntity}
          open={permDeleteOpen}
          onClose={() => {
            setPermDeleteOpen(false);
            setPermDeleteEntity(null);
          }}
          onDeleted={handleBranchDeleted}
        />

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width="min(540px, 95vw)"
          closable={false}
          className={styles.companyDrawer}
          destroyOnClose
        >
          {drawerBranch && (
            <>
              <div className={styles.drawerHeader}>
                <div className={styles.drawerHeaderLeft}>
                  <div
                    className={`${styles.drawerAvatar} ${avatarClassForBranch(drawerBranch.name)}`}
                    style={drawerBranch.color_code ? { backgroundColor: drawerBranch.color_code, color: "#fff" } : undefined}
                    data-initials={getInitials(drawerBranch.name)}
                  >
                    {getInitials(drawerBranch.name)}
                  </div>
                  <div className={styles.drawerHeaderInfo}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Title level={5} className={styles.drawerCompanyName} style={{ margin: 0 }}>
                        {toSafeText(drawerBranch.name, "Branch")}
                      </Title>
                      {drawerBranch.shortcutName && (
                        <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 4 }}>
                          {drawerBranch.shortcutName}
                        </Tag>
                      )}
                    </div>
                    <div className={styles.drawerStatusBadge}>
                      <span
                        className={styles.statusDot}
                        style={{
                          backgroundColor: Number(drawerBranch.status) === 1 ? "#10b981" : "#94a3b8",
                        }}
                      />
                      <span>{Number(drawerBranch.status) === 1 ? "Active" : "Inactive"}</span>
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
                          <span className={styles.drawerDetailLabel}>Branch Name</span>
                          <span className={styles.drawerDetailValue}>{toSafeText(drawerBranch.name, "—")}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Shortcut Code</span>
                          <span className={styles.drawerDetailValue}>
                            {drawerBranch.shortcutName ? (
                              <Tag color="geekblue" style={{ margin: 0, fontWeight: 700, borderRadius: 4 }}>
                                {drawerBranch.shortcutName}
                              </Tag>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Status</span>
                          <span className={styles.drawerDetailValue}>
                            <Tag
                              color={Number(drawerBranch.status) === 1 ? "success" : "default"}
                              style={{ margin: 0, fontWeight: 600, borderRadius: 4 }}
                            >
                              {Number(drawerBranch.status) === 1 ? "Active" : "Inactive"}
                            </Tag>
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Phone Number</span>
                          <span className={styles.drawerDetailValue}>{toSafeText(drawerBranch.number, "—")}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>City</span>
                          <span className={styles.drawerDetailValue}>{toSafeText(drawerBranch.city, "—")}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Country</span>
                          <span className={styles.drawerDetailValue}>{toSafeText(drawerBranch.country, "—")}</span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Address</span>
                          <div className={styles.drawerDetailAddress}>
                            {drawerBranch.address ? (
                              <div>{drawerBranch.address}</div>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Theme Color</span>
                          <span className={styles.drawerDetailValue}>
                            {drawerBranch.color_code ? (
                              <Space align="center" size={8}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    backgroundColor: drawerBranch.color_code,
                                    border: "1px solid rgba(0,0,0,0.15)",
                                    verticalAlign: "middle",
                                  }}
                                />
                                <Tag
                                  style={{
                                    backgroundColor: drawerBranch.color_code,
                                    color: "#fff",
                                    fontWeight: 700,
                                    border: "none",
                                    borderRadius: 4,
                                    margin: 0,
                                  }}
                                >
                                  {drawerBranch.color_code}
                                </Tag>
                              </Space>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Default</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Created At</span>
                          <span className={styles.drawerDetailValue}>
                            {drawerBranch.created_at && dayjs(drawerBranch.created_at).isValid()
                              ? dayjs(drawerBranch.created_at).format("DD MMM YYYY, hh:mm A")
                              : "—"}
                          </span>
                        </div>
                        <div className={styles.drawerDetailRow}>
                          <span className={styles.drawerDetailLabel}>Total Companies</span>
                          <span className={styles.drawerDetailValue}>
                            <Tag color="cyan" style={{ margin: 0, fontWeight: 700, borderRadius: 4 }}>
                              {drawerBranch.company_names?.length ?? drawerBranch.company_count ?? 0}
                            </Tag>
                          </span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "linked_companies",
                    label: `Linked Companies (${drawerBranch.company_names?.length ?? drawerBranch.company_count ?? 0})`,
                    children: (
                      <div>
                        {(!Array.isArray(drawerBranch.company_names) || drawerBranch.company_names.length === 0) ? (
                          <div style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                            <BankOutlined style={{ fontSize: 32, marginBottom: 10, display: "block", color: "#cbd5e1" }} />
                            <div style={{ fontWeight: 600, color: "#64748b", marginBottom: 4 }}>No Companies Linked</div>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              No companies are currently assigned to {drawerBranch.name || "this branch"}.
                            </Text>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {drawerBranch.company_names.map((entry, idx) => {
                              const cName = toSafeText(entry, `Company ${idx + 1}`);
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: "12px 16px",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Space size={12}>
                                    <div
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 8,
                                        background: "rgba(13, 148, 136, 0.12)",
                                        color: "#0d9488",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 16,
                                      }}
                                    >
                                      <BankOutlined />
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                                        {cName}
                                      </div>
                                      <div style={{ fontSize: 11, color: "#64748b" }}>
                                        Linked company
                                      </div>
                                    </div>
                                  </Space>
                                  <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 500, margin: 0 }}>
                                    Active
                                  </Tag>
                                </div>
                              );
                            })}
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

export default BranchList;
