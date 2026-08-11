import React, { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import DynamicFormField from '../../../hooks/DynamicFormField';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';
import { BaseModal } from '../modals';
import { Table, Button, Input, Space, Card, Form, Spin } from 'antd';
import { AccountBookOutlined, ReloadOutlined } from '@ant-design/icons';
import PageHeroHeader from '../PageHeroHeader';
import styles from '../../../assets/scss/pages/master/company.module.scss';
import useThemeColors from '../../../hooks/useThemeColors';
import useTableBodyScrollHeight from '../../../hooks/useTableBodyScrollHeight';
import { cssVar } from '../../../theme';
import { useNavigate } from 'react-router-dom';

const AccountingMasterTemplate = ({
    title,
    columns = [],
    dataSource = [],
    formFields,
    onSave,
    onDelete,
    onEdit,
    initialValues,
    rowKey = "id",
    modalWidth = 800,
    searchPlaceholder = "Search records...",
    loading = false,
    onLoadMore,
    hasMore = false,
    addPagePath,
    onRefresh,
    refreshLoading = false,
}) => {
    const theme = useThemeColors();
    const tableRef = useRef(null);
    const [form] = Form.useForm();
    const Navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', mode: 'add' });
    const [searchText, setSearchText] = useState("");

    const processedData = useMemo(() => {
        const rawData = Array.isArray(dataSource) ? dataSource : Object.values(dataSource || {});
        if (!searchText) return rawData;
        return rawData.filter((item) =>
            Object.values(item || {}).some((val) =>
                String(val).toLowerCase().includes(searchText.toLowerCase())
            )
        );
    }, [searchText, dataSource]);

    const tableHeight = useTableBodyScrollHeight(tableRef, [processedData.length, loading]);

    const handleTableScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 20) {
            if (!loading && hasMore && onLoadMore) {
                onLoadMore();
            }
        }
    };

    const handleAddClick = () => {
        if (addPagePath) {
            onEdit?.(null);
            Navigate(addPagePath);
        }
    };

    const handleEditClick = (record) => {
        setModalConfig({
            title: `Edit ${title}: ${record.name || record.party || ''}`,
            mode: 'edit'
        });
        onEdit?.(record);
        setTimeout(() => setIsModalOpen(true), 0);
    };

    const handleInternalSave = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);
            await onSave(values, modalConfig.mode);
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setModalLoading(false);
        }
    };

    const safeColumns = Array.isArray(columns) ? columns : [];
    const finalColumns = [
        ...safeColumns,
        {
            title: 'Action',
            key: 'action',
            width: 100,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <Edit2 size={16} style={{ cursor: 'pointer', color: cssVar('color-text-link') }} onClick={() => handleEditClick(record)} />
                    <Trash2
                        size={16}
                        style={{ cursor: 'pointer', color: cssVar('color-error') }}
                        onClick={() => onDelete?.(record)}
                    />
                </div>
            ),
        },
    ];

    useEffect(() => {
        if (isModalOpen) {
            if (initialValues && modalConfig.mode === 'edit') {
                form.setFieldsValue(initialValues);
            } else {
                form.resetFields();
            }
        }
    }, [isModalOpen, initialValues, modalConfig.mode, form]);

    return (
        <div className={styles.pageWrapper}>
            <Card variant="none" className={styles.cardContainer}>
                <PageHeroHeader
                    breadcrumb="ACCOUNTING"
                    title={`${title} Accounting`}
                    icon={<AccountBookOutlined />}
                    actions={(
                        <Space wrap>
                            <Input
                                placeholder={searchPlaceholder}
                                prefix={<Search size={16} color={theme.textMuted} />}
                                onChange={(e) => setSearchText(e.target.value)}
                                allowClear
                                style={{ width: 250 }}
                            />
                            {onRefresh && (
                                <Button icon={<ReloadOutlined />} loading={refreshLoading || loading} onClick={onRefresh}>
                                    Refresh
                                </Button>
                            )}
                            <Button type="primary" icon={<Plus size={16} />} onClick={handleAddClick}>
                                Create {title}
                            </Button>
                        </Space>
                    )}
                />

                <div className={`${styles.tableContainer} erp-table-container`} ref={tableRef} style={{ marginTop: '20px' }}>
                    <Table
                        columns={finalColumns}
                        dataSource={processedData}
                        rowKey={rowKey}
                        pagination={false}
                        scroll={{ y: tableHeight, x: 'max-content' }}
                        size="small"
                        bordered
                        onScroll={handleTableScroll}
                        footer={() => (
                            <div style={{ textAlign: 'center', padding: '5px' }}>
                                {loading ? <Spin size="small" tip="Loading..." /> :
                                    hasMore ? "Scroll for more" : `Total ${processedData.length} records`}
                            </div>
                        )}
                    />
                    <BaseModal
                        title={modalConfig.title}
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleInternalSave}
                        loading={modalLoading}
                        width={modalWidth}
                        content={
                            <Form form={form} layout="vertical">
                                {Array.isArray(formFields) ? <DynamicFormField fields={formFields} /> : formFields}
                            </Form>
                        }
                    />
                </div>
            </Card>
        </div>

    );
};

export default AccountingMasterTemplate;
