import React, { useEffect, useState, useMemo, useRef, createElement } from 'react';
import DynamicFormField from '../../../hooks/DynamicFormField';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';
import FormModal from '../modals/FormModal';
import { Pencil, CircleCheck } from 'lucide-react';
import { Table, Button, Input, Space, Card, Form, Spin } from 'antd';
import '../../../assets/scss/masterEdit.scss';
import { AccountBookOutlined, ReloadOutlined } from '@ant-design/icons';
import PageHeroHeader from '../PageHeroHeader';
import styles from '../../../assets/scss/pages/master/company.module.scss';
import useThemeColors from '../../../hooks/useThemeColors';
import useTableBodyScrollHeight from '../../../hooks/useTableBodyScrollHeight';
import useTableSkeleton from '../skeleton/useTableSkeleton';
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
    const [modalConfig, setModalConfig] = useState({ title: '', subtitle: '', mode: 'add' });
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

    const handleAddClick = () => {
        if (addPagePath) {
            onEdit?.(null);
            Navigate(addPagePath);
        }
    };

    const handleEditClick = (record) => {
        setModalConfig({
            title: `Edit ${title}`,
            subtitle: record.name || record.party || '',
            mode: 'edit',
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
    const finalColumns = useMemo(() => [
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
    ], [safeColumns, onDelete, title]);

    const {
        columns: tableColumns,
        dataSource: tableData,
        tableLoading,
        showSkeleton,
    } = useTableSkeleton({
        columns: finalColumns,
        dataSource: processedData,
        loading,
        rowCount: 10,
        rowKey: '_skeletonKey',
    });

    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, loading]);

    const handleTableScroll = (e) => {
        if (showSkeleton) return;
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 20) {
            if (!loading && hasMore && onLoadMore) {
                onLoadMore();
            }
        }
    };

    useEffect(() => {
        if (isModalOpen) {
            if (initialValues && modalConfig.mode === 'edit') {
                form.setFieldsValue(initialValues);
            } else {
                form.resetFields();
            }
        }
    }, [isModalOpen, initialValues, modalConfig.mode, form]);

    const isLoadMore = loading && processedData.length > 0;

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

                <div className={`${styles.tableContainer} erp-table-container`} ref={tableRef}>
                    <Table
                        columns={tableColumns}
                        dataSource={tableData}
                        rowKey={showSkeleton ? '_skeletonKey' : rowKey}
                        pagination={false}
                        scroll={{ y: tableHeight, x: 'max-content' }}
                        size="small"
                        bordered
                        loading={tableLoading}
                        onScroll={handleTableScroll}
                        footer={() => (
                            <div style={{ textAlign: 'center', padding: '5px' }}>
                                {isLoadMore ? <Spin size="small" tip="Loading..." /> :
                                    hasMore ? "Scroll for more" : `Total ${processedData.length} records`}
                            </div>
                        )}
                    />
                    <FormModal
                        variant="edit"
                        title={modalConfig.title}
                        subtitle={modalConfig.subtitle}
                        headerIcon={createElement(Pencil, { size: 16, strokeWidth: 2 })}
                        saveIcon={createElement(CircleCheck, { size: 15, strokeWidth: 2.25 })}
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleInternalSave}
                        loading={modalLoading}
                        width={modalWidth}
                        saveBtnText="Update"
                        cancelBtnText="Close"
                        form={form}
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
