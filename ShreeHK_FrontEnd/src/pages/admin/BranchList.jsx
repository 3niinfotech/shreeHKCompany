import React, { useMemo, useState } from "react";
import {
  Layout, Typography, Button, Modal, Form, Space, Tag,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { SkeletonCard } from "../../components/common/skeleton";
import { toast } from "sonner";
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
} from "@ant-design/icons";
import { useFetchApi, usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import DynamicForm from "../../components/common/ui/DynamicFormField";
import { branchFields } from "./branchData";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import styles from "../../assets/scss/pages/admin/tenantCompany.module.scss";
import branchStyles from "../../assets/scss/pages/admin/branch.module.scss";

const { Content } = Layout;
const { Title, Text } = Typography;

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "BR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const avatarClassForBranch = (name = "") => {
  const key = String(name).trim().toLowerCase();
  if (key === "hk") return branchStyles.avatarHk;
  if (key === "dubai") return branchStyles.avatarDubai;
  if (key === "surat") return branchStyles.avatarSurat;
  return "";
};

const BranchList = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, refetch, isFetching } = useFetchApi(
    "branches",
    ENDPOINTS.branch.list,
    {},
    "GET",
    { staleTime: 0, refetchOnMount: "always" }
  );
  const { mutate: saveBranch, isPending: isSaving } = usePostApiRequest(
    ENDPOINTS.branch.save,
    "branches"
  );
  const { mutate: deleteBranch, isPending: isDeleting } = usePostApiRequest(
    ENDPOINTS.branch.delete,
    "branches"
  );

  const branches = data?.Data || [];
  const activeCount = useMemo(
    () => branches.filter((b) => Number(b.status)).length,
    [branches]
  );

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
      status: Number(row.status) ? 1 : 0,
    });
    setModalOpen(true);
  };

  const handleSave = (values) => {
    saveBranch(
      {
        ...values,
        id: editing?.id || 0,
        status: Number(values.status) ? 1 : 0,
      },
      {
        onSuccess: (res) => {
          if (res?.status === false) return;
          setModalOpen(false);
          form.resetFields();
          refetch();
          queryClient.invalidateQueries({ queryKey: ["fiscalYears"] });
          queryClient.invalidateQueries({ queryKey: ["session"] });
        },
      }
    );
  };

  const openDelete = (row) => {
    setDeleting(row);
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!deleting?.id) return;
    deleteBranch(
      { id: deleting.id },
      {
        onSuccess: (res) => {
          if (res?.status === false) return;
          setDeleteModalOpen(false);
          setDeleting(null);
          refetch();
        },
      }
    );
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
            <strong className={styles.statValue}>{branches.length}</strong>
            <span className={styles.statLabel}>Total branches</span>
          </div>
          <div className={styles.statCard}>
            <strong className={styles.statValue}>{branches.length}</strong>
            <span className={styles.statLabel}>Showing</span>
          </div>
          <div className={`${styles.statCard} ${styles.activeStatCard}`}>
            <strong className={styles.statValue}>{activeCount}</strong>
            <span className={styles.statLabel}>Active (login)</span>
          </div>
        </section>

        {isLoading ? (
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
              const isActive = Boolean(Number(item.status));
              const linkedNames = Array.isArray(item.company_names)
                ? item.company_names
                : [];
              return (
                <article
                  key={item.id}
                  className={`${styles.companyCard} ${branchStyles.branchCard}`}
                >
                  <div className={branchStyles.branchHead}>
                    <div
                      className={`${styles.avatar} ${avatarClassForBranch(item.name)}`}
                      data-initials={getInitials(item.name)}
                    >
                      {getInitials(item.name)}
                    </div>
                    <div className={branchStyles.branchHeadMain}>
                      <div className={branchStyles.branchTitleRow}>
                        <Title level={5} className={branchStyles.branchName} title={item.name}>
                          {item.name}
                        </Title>
                        {item.shortcutName ? (
                          <Tag className={styles.typeTag}>{item.shortcutName}</Tag>
                        ) : null}
                        {isActive ? (
                          <Tag icon={<CheckCircleFilled />} className={`${styles.activeBadge} ${branchStyles.statusBadge}`}>
                            Active
                          </Tag>
                        ) : (
                          <Tag className={`${styles.typeTagMuted} ${branchStyles.statusBadge}`}>Inactive</Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={branchStyles.linkedBlock}>
                    <span className={branchStyles.linkedLabel}>
                      Linked companies ({linkedNames.length || Number(item.company_count) || 0})
                    </span>
                    {linkedNames.length > 0 ? (
                      <div className={branchStyles.linkedTags}>
                        {linkedNames.map((name) => (
                          <Tag key={`${item.id}-${name}`} className={branchStyles.linkedTag} title={name}>
                            {name}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <span className={branchStyles.linkedEmpty}>No company linked yet</span>
                    )}
                  </div>

                  <div className={styles.metaBlock}>
                    <div className={styles.metaLine}>
                      <EnvironmentOutlined />
                      <Text type="secondary">{item.address || "No address added"}</Text>
                    </div>
                    {(item.city || item.country) && (
                      <div className={styles.metaLine}>
                        <GlobalOutlined />
                        <Text type="secondary">
                          {[item.city, item.country].filter(Boolean).join(", ")}
                        </Text>
                      </div>
                    )}
                    {item.number && (
                      <div className={styles.metaLine}>
                        <PhoneOutlined />
                        <Text type="secondary">{item.number}</Text>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardActionsBranch}>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => openEdit(item)}
                      aria-label="Edit branch"
                      className={`${styles.editBtn} ${styles.editBtnGrow}`}
                    >
                      Edit branch
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => openDelete(item)}
                      aria-label="Delete branch"
                      className={styles.deleteIconBtn}
                    />
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

        <Modal
          title="Delete Branch"
          open={deleteModalOpen}
          onCancel={() => {
            setDeleteModalOpen(false);
            setDeleting(null);
          }}
          onOk={handleDelete}
          okText="Delete"
          okButtonProps={{ danger: true, loading: isDeleting }}
          centered
          className={styles.companyModal}
        >
          <Text>
            Delete branch <strong>{deleting?.name}</strong>? Linked companies will be moved to
            HK / Dubai automatically.
          </Text>
        </Modal>
      </Content>
    </Layout>
  );
};

export default BranchList;
