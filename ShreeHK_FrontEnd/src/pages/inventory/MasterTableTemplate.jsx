import React, { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Edit2, Trash2, Plus, Search, PackagePlus } from 'lucide-react';
import { Table, Button, Input, Space, Card, Typography, Form, Tag, Checkbox } from 'antd';
import DynamicFormField from "../../hooks/DynamicFormField";
import { BaseModal } from "../../components/common/modals";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import { DatabaseOutlined } from "@ant-design/icons";
import styles from '../../assets/scss/pages/inventory/mastertabletemplate.module.scss';
import useThemeColors from '../../hooks/useThemeColors';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import useTableSkeleton from '../../components/common/skeleton/useTableSkeleton';
import { cssVar } from '../../theme';

const { Text } = Typography;

const MasterTableTemplate = ({
    title,
    columns,
    dataSource,
    formFields,
    onSave,
    rowKey = "id",
    modalWidth = 800,
    onDelete,
    extraHeaderContent,
    searchPlaceholder = "Search diamonds...",
    // Optional per-page overrides (keeps defaults for existing pages)
    showStatsBar = true,
    showTotalItemsFooter = true,
    showActionsColumn = true,
    enableRowSelectionFooter = false,
    totalsKeys = { pcs: "pcs", carat: "carat", amount: "amount" },
    renderFooterTotals,
    renderFooterTotalsInTable = false,
    showButton = true,
    onSelectedRowsChange,
    loading = false,
    tableWrapRef,
    searchValue,
    onSearchChange,
    totalCount,
}) => {
    const theme = useThemeColors();
    const internalTableRef = useRef(null);
    const tableWrapRefResolved = tableWrapRef || internalTableRef;
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', mode: 'add' });
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const handleAddClick = () => {
        form.resetFields();
        setModalConfig({ title: `Add ${title} Details`, mode: 'add' });
        setIsModalOpen(true);
    };

    const handleEditClick = (record) => {
        setModalConfig({ title: `Edit ${title}: ${record.Name || ''}`, mode: 'edit' });
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    // --- Totals Calculation Logic (Define this BEFORE return) ---
    const totals = useMemo(() => {
        return dataSource.reduce((acc, curr) => ({
            pcs: acc.pcs + Number(curr?.[totalsKeys.pcs] || 0),
            carat: acc.carat + Number(curr?.[totalsKeys.carat] || 0),
            amount: acc.amount + Number(curr?.[totalsKeys.amount] || 0),
        }), { pcs: 0, carat: 0, amount: 0 });
    }, [dataSource, totalsKeys]);

    const avgPrice = totals.carat > 0 ? totals.amount / totals.carat : 0;

    const selectedRows = useMemo(() => {
        if (!enableRowSelectionFooter) return [];
        return dataSource.filter((row) => selectedRowKeys.includes(row?.[rowKey]));
    }, [dataSource, enableRowSelectionFooter, selectedRowKeys, rowKey]);

    const selectedTotals = useMemo(() => {
        return selectedRows.reduce((acc, curr) => ({
            pcs: acc.pcs + Number(curr?.[totalsKeys.pcs] || 0),
            carat: acc.carat + Number(curr?.[totalsKeys.carat] || 0),
            amount: acc.amount + Number(curr?.[totalsKeys.amount] || 0),
        }), { pcs: 0, carat: 0, amount: 0 });
    }, [selectedRows, totalsKeys]);

    const selectedAvgPrice = selectedTotals.carat > 0 ? selectedTotals.amount / selectedTotals.carat : 0;

    useEffect(() => {
        onSelectedRowsChange?.(selectedRows, selectedRowKeys);
    }, [selectedRows, selectedRowKeys, onSelectedRowsChange]);

    const handleInternalSave = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);
            await onSave(values, modalConfig.mode);
            setModalLoading(false);
            setIsModalOpen(false);
            // toast.success('Operation Successful!');
        } catch (error) {
            console.error("Save Failed:", error);
            setModalLoading(false);
            toast.error('Something went wrong!');
        }
    };

    const finalColumns = useMemo(() => {
        if (!showActionsColumn) return columns;
        return [
            ...columns,
            {
                title: 'Edit / Delete',
                key: 'action',
                width: 150,
                align: 'center',
                render: (_, record) => (
                    <div className={styles.actionIcons}>
                        <Edit2
                            size={18}
                            className={styles.editIcon}
                            onClick={() => handleEditClick(record)}
                        />
                        <Trash2
                            size={18}
                            className={styles.deleteIcon}
                            onClick={() => onDelete?.(record)}
                        />
                    </div>
                ),
            },
        ];
    }, [columns, showActionsColumn]);

    const safeDataSource = Array.isArray(dataSource) ? dataSource : [];
    const {
        columns: tableColumns,
        dataSource: tableData,
        tableLoading,
        showSkeleton,
    } = useTableSkeleton({
        columns: finalColumns,
        dataSource: safeDataSource,
        loading,
        rowCount: 10,
        rowKey: '_skeletonKey',
    });
    const tableHeight = useTableBodyScrollHeight(tableWrapRefResolved, [tableData.length, loading]);

    const rowSelection = enableRowSelectionFooter && !showSkeleton
        ? {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            hideSelectAll: true,
        }
        : undefined;

    const tableFooterSummary =
        typeof renderFooterTotals === "function" && renderFooterTotalsInTable
            ? () => (
                <Table.Summary>
                    <Table.Summary.Row>
                        <Table.Summary.Cell
                            index={0}
                            colSpan={finalColumns.length + (enableRowSelectionFooter ? 1 : 0)}
                        >
                            {renderFooterTotals({
                                totals,
                                selectedTotals,
                                avgPrice,
                                selectedAvgPrice,
                                selectedRowKeys,
                                totalCount: dataSource.length,
                            })}
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                </Table.Summary>
            )
            : undefined;

    return (
        <div className={styles.pageWrapper}>
            <Card variant="none" className={styles.cardContainer}>
                <PageHeroHeader
                    breadcrumb="INVENTORY"
                    title={`${title} Details`}
                    icon={<DatabaseOutlined />}
                    actions={(
                        <Space wrap>
                            <Input
                                placeholder={searchPlaceholder}
                                prefix={<Search size={16} color={theme.textMuted} />}
                                className={styles.searchInput}
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                allowClear
                            />
                            {showButton && (
                                <Button
                                    type="primary"
                                    icon={<Plus size={16} />}
                                    onClick={handleAddClick}
                                    className={styles.addButton}
                                >
                                    Add {title}
                                </Button>
                            )}
                        </Space>
                    )}
                />

                {showStatsBar && (
                    <div className={styles.statsBar}>
                        <Space size="middle">
                            <Text className={styles.recordCount}>
                                Total Record: <b>{totalCount ?? dataSource.length}</b>
                            </Text>
                            <div className={styles.separator} />
                            <Tag color="blue" bordered={false} className={styles.statusTag}>GIA Certified</Tag>
                            <Tag color="red" bordered={false} className={styles.statusTag}>On Memo</Tag>
                            <Tag color="green" bordered={false} className={styles.statusTag}>Send To Lab</Tag>
                            <Checkbox className={styles.nonGiaCheckbox}>Non-GIA</Checkbox>
                        </Space>
                    </div>
                )}

                <div className={`${styles.tableContainer} erp-table-container`} ref={tableWrapRefResolved}>
                    <Table
                        columns={tableColumns}
                        dataSource={tableData}
                        rowKey={showSkeleton ? '_skeletonKey' : rowKey}
                        pagination={false}
                        loading={tableLoading}
                        scroll={{ y: tableHeight, x: "max-content" }}
                        size="small"
                        className="custom-ant-table"
                        rowSelection={rowSelection}
                        summary={showSkeleton ? undefined : tableFooterSummary}
                    />
                </div>

                {typeof renderFooterTotals === "function" && !renderFooterTotalsInTable ? (
                    <div className={styles.totalItemsFooter}>
                        {renderFooterTotals({
                            totals,
                            selectedTotals,
                            avgPrice,
                            selectedAvgPrice,
                            selectedRowKeys,
                            totalCount: dataSource.length,
                        })}
                    </div>
                ) : showTotalItemsFooter ? (
                    <div className={styles.totalItemsFooter}>
                        <Text className={styles.totalText}>
                            Total Items: <b>{dataSource.length}</b>
                        </Text>
                        <Text className={styles.totalText}>Total Carat: <b>{totals.carat.toFixed(2)}</b></Text>
                        <Text className={styles.totalText}>Avg. Price: <b>{avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></Text>
                        <Text className={styles.totalText}>Total Amount: <b style={{ color: cssVar('color-text-heading') }}>{totals.amount.toLocaleString()}</b></Text>
                    </div>
                ) : null}
            </Card>

            <BaseModal
                title={modalConfig.title}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleInternalSave}
                loading={modalLoading}
                width={modalWidth}
                saveBtnText={modalConfig.mode === 'add' ? "Save" : "Update"}
                cancelBtnText="Close"
                content={
                    <Form
                        form={form}
                        layout="vertical"
                        preserve={false}
                    >
                        {Array.isArray(formFields) ? (
                            <DynamicFormField
                                fields={formFields}
                                forceFullWidth={formFields.length <= 2}
                            />
                        ) : (
                            formFields
                        )}
                    </Form>
                }
            />
        </div>
    );
};

export default MasterTableTemplate;