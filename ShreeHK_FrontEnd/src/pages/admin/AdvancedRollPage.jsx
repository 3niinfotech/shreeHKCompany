import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout, Form, Card, Button, Input, Space,
  Typography, Switch, notification, Modal, Spin,
  Tag, Tooltip, Checkbox, Row, Col, Empty,
} from 'antd';
import {
  SearchOutlined, SaveOutlined, ReloadOutlined,
  ClusterOutlined, PlusOutlined, DeleteOutlined,
  CrownOutlined, ExclamationCircleOutlined,
  SafetyCertificateOutlined, BankOutlined, CheckCircleOutlined,
} from '@ant-design/icons';

import DynamicForm from '../../hooks/DynamicFormField';
import PageHeroHeader, { pageHeroHeaderStyles } from '../../components/common/PageHeroHeader';
import styles from '../../assets/scss/pages/admin/advanceRollPage.module.scss';
import { useFetchApi, usePostApiRequest, usePutApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import {
  buildPermissionFormGroupsFromModules,
  getAllConfigurablePageKeys,
  getPermissionFormFieldNames,
  hasPagePermission,
} from '../../config/permissionRegistry';

const { Content } = Layout;
const { Text, Title } = Typography;
const { confirm } = Modal;

const normalizeCompanyIds = (company) => {
  if (Array.isArray(company)) return company.map(Number).filter(Boolean);
  if (typeof company === 'string') {
    try {
      const parsed = JSON.parse(company);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
    } catch {
      const n = Number(company);
      return n ? [n] : [];
    }
  }
  return [];
};

const AdvancedRollPage = () => {
  const [form] = Form.useForm();
  const [newRoleForm] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [masterToggle, setMasterToggle] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [companyIds, setCompanyIds] = useState([]);

  const { data: rolesData, isLoading: isRolesLoading } = useFetchApi('getRoleList', ENDPOINTS.role.list);
  const { data: companyOptionsData } = useFetchApi('tenantCompanyOptions', ENDPOINTS.tenantCompany.options);
  const { mutate: updateRole, isLoading: isSaving } = usePutApiRequest(ENDPOINTS.role.update, 'getRoleList');
  const { mutate: createRole, isLoading: isCreating } = usePostApiRequest(ENDPOINTS.role.add, 'getRoleList');
  const { mutate: deleteRole, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.role.delete, 'getRoleList');

  const roles = rolesData?.data || [];
  const companyOptions = rolesData?.companies?.length
    ? rolesData.companies
    : (companyOptionsData?.Data || []);

  const permissionGroups = useMemo(
    () => buildPermissionFormGroupsFromModules(rolesData?.pages?.modules),
    [rolesData?.pages?.modules]
  );

  const allPageKeys = useMemo(
    () => (rolesData?.pages?.allKeys?.length ? rolesData.pages.allKeys : getAllConfigurablePageKeys()),
    [rolesData?.pages?.allKeys]
  );

  const allFieldNames = useMemo(
    () => getPermissionFormFieldNames(permissionGroups),
    [permissionGroups]
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const pageKeysFromRole = (role) => {
    const pages = role?.pages || role?.resource || [];
    if (!Array.isArray(pages)) return [];
    if (pages.includes('all')) return allPageKeys;
    return allPageKeys.filter((key) => hasPagePermission(pages, key));
  };

  const buildFormValues = (role) => {
    const pages = role?.pages || role?.resource || [];
    const hasAll = Array.isArray(pages) && pages.includes('all');
    const activeKeys = hasAll ? allPageKeys : pageKeysFromRole(role);

    const values = { all: hasAll };
    allFieldNames.forEach((name) => {
      if (name === 'all') return;
      values[name] = hasAll || activeKeys.includes(name);
    });
    return values;
  };

  useEffect(() => {
    if (selectedRole) {
      const values = buildFormValues(selectedRole);
      form.setFieldsValue(values);
      setMasterToggle(values.all);
      setCompanyIds(normalizeCompanyIds(selectedRole.company));
    } else {
      form.resetFields();
      setMasterToggle(false);
      setCompanyIds([]);
    }
  }, [selectedRoleId, roles, form]);

  const handleMasterToggle = (checked) => {
    setMasterToggle(checked);
    const newValues = { all: checked };
    allFieldNames.forEach((name) => {
      newValues[name] = checked;
    });
    form.setFieldsValue(newValues);
  };

  const handleValuesChange = (changedValues, allValues) => {
    if ('all' in changedValues) {
      handleMasterToggle(Boolean(changedValues.all));
    } else {
      const nonAllNames = allFieldNames.filter((name) => name !== 'all');
      const isEveryChecked = nonAllNames.length > 0 && nonAllNames.every((name) => Boolean(allValues[name]));
      if (allValues.all !== isEveryChecked) {
        form.setFieldValue('all', isEveryChecked);
        setMasterToggle(isEveryChecked);
      }
    }
  };

  const onFinish = (values) => {
    if (!selectedRoleId) {
      notification.warning({ message: 'Please select a role first.' });
      return;
    }

    const companiesToSave = companyIds.length
      ? companyIds
      : normalizeCompanyIds(selectedRole?.company);

    if (!companiesToSave.length) {
      notification.warning({
        message: 'Select at least one company for this role.',
        description: 'Users with this role cannot pick a company at login until company access is assigned.',
      });
      return;
    }

    let resource = [];
    if (values.all) {
      resource = ['all'];
    } else {
      resource = allPageKeys.filter((key) => values[key]);
    }

    updateRole(
      {
        id: selectedRoleId,
        payload: {
          name: selectedRole.name,
          resource,
          company: companiesToSave,
        },
      },
      {
        onSuccess: (res) => {
          if (!res.status) {
            notification.error({ message: res.message || 'Update failed' });
          }
        },
        onError: (err) => {
          notification.error({ message: 'Server error: ' + (err.message || 'Unknown') });
        },
      }
    );
  };

  const resetForm = () => {
    if (selectedRole) {
      const values = buildFormValues(selectedRole);
      form.setFieldsValue(values);
      setMasterToggle(values.all);
      setCompanyIds(normalizeCompanyIds(selectedRole.company));
    } else {
      form.resetFields();
      setMasterToggle(false);
      setCompanyIds([]);
    }
    notification.info({
      message: 'Changes discarded',
      style: {
        margin: '0px'
      }
    });
  };

  const handleCreateRole = (values) => {
    const selectedCompanies = values.companyIds?.length
      ? values.companyIds
      : normalizeCompanyIds(values.company);
    createRole(
      { name: values.roleName, resource: [], company: selectedCompanies },
      {
        onSuccess: (res) => {
          if (res.status) {
            setIsCreateModalOpen(false);
            newRoleForm.resetFields();
            setTimeout(() => setSelectedRoleId(res.data?.id), 300);
          } else {
            notification.error({ message: res.message || 'Creation failed' });
          }
        },
        onError: (err) => notification.error({ message: 'Server error: ' + (err.message || 'Unknown') }),
      }
    );
  };

  const handleDeleteRole = () => {
    if (!selectedRoleId) return;
    confirm({
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-heading, rgba(0, 0, 0, 0.85))', marginBottom: '8px' }}>
            Delete role "{selectedRole?.name}"?
          </div>
          <div>This action cannot be undone.</div>
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        deleteRole(selectedRoleId, {
          onSuccess: (res) => {
            if (res.status) {
              setSelectedRoleId(null);
            } else {
              notification.error({ message: res.message });
            }
          },
        });
      },
    });
  };

  const getPermissionCount = (role) => {
    const pages = role?.pages || role?.resource;
    if (!pages?.length) return 0;
    if (pages.includes('all')) return allPageKeys.length;
    return pageKeysFromRole(role).length;
  };

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) => String(role.name || '').toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const filteredPermissions = useMemo(
    () =>
      permissionGroups.map((groupData) => ({
        ...groupData,
        items: groupData.items.filter((item) =>
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })).filter((groupData) => groupData.items.length > 0),
    [permissionGroups, searchTerm]
  );

  const activePermCount = selectedRole ? getPermissionCount(selectedRole) : 0;

  const createModalTitle = (
    <div className={styles.modalTitle}>
      <span className={styles.modalTitleIcon}><PlusOutlined /></span>
      <div>
        <div className={styles.modalTitleText}>Create New Role</div>
        <Text className={styles.modalTitleSub}>Define a role name and assign company access.</Text>
      </div>
    </div>
  );

  return (
    <Layout className={styles.advancedRollPage}>
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleValuesChange}>
        <Content className={styles.pageContent}>
          <PageHeroHeader
            as="section"
            breadcrumb="ADMINISTRATION"
            title="Roll & Permission Management"
            icon={<SafetyCertificateOutlined />}
            actions={(
              <Space wrap>
                <Button className={pageHeroHeaderStyles.actionBtn} icon={<ReloadOutlined />} onClick={resetForm} disabled={!selectedRoleId}>
                  Discard
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={isSaving}
                  disabled={!selectedRoleId}
                >
                  Save Permissions
                </Button>
              </Space>
            )}
          />

          <section className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Roles</span>
              <strong className={styles.statValue}>{roles.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Active Permissions</span>
              <strong className={styles.statValue}>
                {selectedRoleId ? `${activePermCount} / ${allPageKeys.length}` : '—'}
              </strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Companies Linked</span>
              <strong className={styles.statValue}>
                {selectedRoleId ? companyIds.length : '—'}
              </strong>
            </div>
            <div className={styles.searchWrap}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search permissions by module name..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </section>

          <Row gutter={[16, 16]} className={styles.mainRow} align="stretch">
            <Col xs={24} xl={7} className={styles.roleCol}>
              <Card
                className={styles.rolePanel}
                title={(
                  <Space className={styles.panelTitle}>
                    <ClusterOutlined />
                    Roles
                    <span className={styles.countBadge}>{roles.length}</span>
                  </Space>
                )}
                extra={(
                  <Tooltip title="Create new role">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      className={styles.newRoleBtn}
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      New
                    </Button>
                  </Tooltip>
                )}
              >
                <Input
                  allowClear
                  size="small"
                  prefix={<SearchOutlined />}
                  placeholder="Filter roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className={styles.roleSearch}
                />

                <Spin spinning={isRolesLoading} wrapperClassName={styles.spinWrap}>
                  <div className={styles.roleList}>
                    {filteredRoles.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No roles found" />
                    ) : (
                      filteredRoles.map((role) => {
                        const isSelected = role.id === selectedRoleId;
                        const isSuper = role.id === 1;
                        const permCount = getPermissionCount(role);

                        return (
                          <button
                            key={role.id}
                            type="button"
                            className={`${styles.roleCard} ${isSelected ? styles.roleCardActive : ''}`}
                            onClick={() => setSelectedRoleId(role.id)}
                          >
                            <div className={styles.roleCardTop}>
                              <span className={`${styles.roleAvatar} ${isSuper ? styles.roleAvatarSuper : ''}`}>
                                {isSuper ? <CrownOutlined /> : <ClusterOutlined />}
                              </span>
                              {isSelected && <CheckCircleOutlined className={styles.selectedMark} />}
                            </div>
                            <div className={styles.roleName} title={role.name}>{role.name}</div>
                            <Tag className={styles.permTag}>{permCount} permissions</Tag>
                          </button>
                        );
                      })
                    )}
                  </div>
                </Spin>

                {selectedRoleId && selectedRoleId !== 1 && (
                  <Button
                    danger
                    block
                    icon={<DeleteOutlined />}
                    loading={isDeleting}
                    onClick={handleDeleteRole}
                    className={styles.deleteRoleBtn}
                  >
                    Delete Selected Role
                  </Button>
                )}
              </Card>
            </Col>

            <Col xs={24} xl={17} className={styles.configCol}>
              {!selectedRoleId ? (
                <Card className={styles.emptyConfig}>
                  <div className={styles.emptyIcon}>
                    <SafetyCertificateOutlined />
                  </div>
                  <Title level={4}>Select a role to configure</Title>
                  <Text type="secondary">
                    Choose a role from the left panel to manage company access and module permissions.
                  </Text>
                </Card>
              ) : (
                <>
                  <Card className={styles.companyCard} title={(
                    <Space>
                      <BankOutlined />
                      Company Access
                      <Tag className={styles.companyCountTag}>{companyIds.length} selected</Tag>
                    </Space>
                  )}>
                    <div className={styles.companyGrid}>
                      <Checkbox.Group
                        value={companyIds}
                        onChange={(vals) => setCompanyIds(vals.map(Number))}
                        className={styles.companyCheckGroup}
                      >
                        {companyOptions.map((c) => (
                          <label key={c.id} className={styles.companyChip}>
                            <Checkbox value={c.id} />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </Checkbox.Group>
                    </div>
                  </Card>

                  <Card className={styles.permissionsCard}>
                    <div className={styles.contextInfoBox}>
                      <ClusterOutlined className={styles.infoIcon} />
                      <div>
                        <Text strong className={styles.infoTitle}>
                          Configure access for <Tag color="processing">{selectedRole?.name}</Tag>
                        </Text>
                        <Text type="secondary" className={styles.infoSubtitle}>
                          Checked permissions grant access. Unchecked permissions deny access for this role.
                        </Text>
                      </div>
                    </div>

                    {filteredPermissions.length === 0 ? (
                      <div className={styles.emptySearch}>No permissions match your search.</div>
                    ) : (
                      filteredPermissions.map((permissionGroup, index) => (
                        <div key={permissionGroup.group} className={styles.groupSection}>
                          <div className={styles.groupHeader}>
                            <Text strong className={styles.groupName}>
                              {permissionGroup.group}
                            </Text>

                            {permissionGroup.showMasterToggle && (
                              <Space className={styles.masterToggleRow}>
                                <Text type="secondary" className={styles.masterToggleText}>
                                  Grant all access
                                </Text>
                                <Switch
                                  size="small"
                                  checked={masterToggle}
                                  onChange={handleMasterToggle}
                                />
                              </Space>
                            )}
                          </div>

                          <div className={styles.permissionGrid}>
                            <DynamicForm fields={permissionGroup.items} forceFullWidth={false} />
                          </div>

                          {index < filteredPermissions.length - 1 && (
                            <div className={styles.groupDivider} />
                          )}
                        </div>
                      ))
                    )}
                  </Card>
                </>
              )}
            </Col>
          </Row>
        </Content>
      </Form>

      <Modal
        title={createModalTitle}
        open={isCreateModalOpen}
        onCancel={() => { setIsCreateModalOpen(false); newRoleForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setIsCreateModalOpen(false); newRoleForm.resetFields(); }} danger>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            loading={isCreating}
            icon={<PlusOutlined />}
            onClick={() => newRoleForm.submit()}
            style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff" }}
          >
            Create Role
          </Button>,
        ]}
        destroyOnClose
        centered
        className={styles.createModal}
        width="min(520px, calc(100vw - 32px))"
      >
        <Form form={newRoleForm} layout="vertical" onFinish={handleCreateRole} className={styles.createForm}>
          <Form.Item
            label="Role Name"
            name="roleName"
            rules={[{ required: true, message: 'Role name required' }, { min: 2 }]}
          >
            <Input placeholder="e.g. Manager, Accountant, Viewer" />
          </Form.Item>

          <Form.Item
            label="Companies"
            name="companyIds"
            rules={[{ required: true, message: 'Select at least one company' }]}
          >
            <Checkbox.Group className={styles.createCompanyGroup}>
              {companyOptions.map((c) => (
                <label key={c.id} className={styles.companyChip}>
                  <Checkbox value={c.id} />
                  <span>{c.name}</span>
                </label>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdvancedRollPage;
