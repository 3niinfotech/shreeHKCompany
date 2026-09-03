import { Edit2, Trash2, Plus, Search } from "lucide-react";
import { Table, Button, Input, Space, Card, Typography } from "antd";
import { useMemo, useRef, useState } from "react";
import { AppstoreOutlined } from "@ant-design/icons";
import useThemeColors from "../../../hooks/useThemeColors";
import useTableBodyScrollHeight from "../../../hooks/useTableBodyScrollHeight";
import PageHeroHeader from "../PageHeroHeader";
import useTableSkeleton from "../skeleton/useTableSkeleton";
import ExportExcelButton from "../ExportExcelButton";
import styles from "../../../assets/scss/pages/master/company.module.scss";
import { exportReportToExcel } from "../../../utils/reportExcelExport";
import { toastSuccess } from "../../../utils/toastNotify";

const { Text } = Typography;

const MasterListTable = ({
    title,
    columns,
    dataSource,
    rowKey = "id",
    rowSelection,
    extraHeaderActions,
    // searchPlaceholder = "Search Companies...",
    searchPlaceholder,
    searchValue,
    onSearchChange,
    onAdd,
    onEdit,
    onDelete,
    onTableScroll,
    totalItems,
    loading,
    hideCrudActions = false,
    onRow,
    rowClassName,
}) => {
    const theme = useThemeColors();
    const tableRef = useRef(null);
    const safeDataSource = (Array.isArray(dataSource) ? dataSource : []).filter(
        (row) => row != null
    );

    const withActions = useMemo(() => {
        if (hideCrudActions) return columns;
        return [
            ...columns,
            {
                title: "Edit / Delete",
                key: "action",
                width: 150,
                align: "center",
                render: (_, record) => (
                    <div className={styles.actionIcons}>
                        <Edit2
                            size={18}
                            className={styles.editIcon}
                            onClick={() => onEdit?.(record)}
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
    }, [columns, hideCrudActions, onEdit, onDelete]);

    const {
        columns: tableColumns,
        dataSource: tableData,
        tableLoading,
        showSkeleton,
    } = useTableSkeleton({
        columns: withActions,
        dataSource: safeDataSource,
        loading,
        rowCount: 10,
        rowKey: "_skeletonKey",
    });

    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, loading]);

    const resolveRowKey = (record, index) => {
        if (record?.__isSkeleton) return record._skeletonKey ?? `skeleton-${index}`;
        if (record == null) return `row-${index}`;
        if (typeof rowKey === "function") return rowKey(record, index);
        return record[rowKey] ?? `row-${index}`;
    };

    const [exporting, setExporting] = useState(false);

    const handleExportExcel = async () => {
        if (!safeDataSource || !safeDataSource.length) return;
        setExporting(true);
        try {
            const exportHeaders = columns
                .map((col, idx) => ({
                    title: typeof col.title === 'string' ? col.title : (col.key || `Col_${idx}`),
                    key: col.dataIndex || col.key || `col_${idx}`,
                    width: col.width ? Math.min(30, Math.max(12, Math.floor(col.width / 5))) : 20,
                }))
                .filter(h => h.title && h.title !== "Edit / Delete" && h.key !== "action");

            await exportReportToExcel({
                headers: exportHeaders.length ? exportHeaders : [
                    { title: "ID", key: "id", width: 10 },
                    { title: "Name", key: "name", width: 25 },
                    { title: "Description", key: "description", width: 30 }
                ],
                rows: safeDataSource,
                fileName: `${title.replace(/\s+/g, "_")}_Export`,
                sheetName: title.slice(0, 31),
            });
            toastSuccess(`Exported ${safeDataSource.length} ${title} record(s) to Excel.`);
        } catch (err) {
            console.error("Master Export Failed:", err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Card variant="none" className={styles.cardContainer}>
                <PageHeroHeader
                    breadcrumb="MASTER"
                    title={`${title}`}
                    icon={<AppstoreOutlined />}
                    actions={(
                        <Space wrap>
                            <Input
                                placeholder={searchPlaceholder || `Search ${title}...`}
                                prefix={<Search size={16} color={theme.textMuted} />}
                                className={styles.searchInput}
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                allowClear
                            />
                            {/* <ExportExcelButton
                                loading={exporting}
                                onClick={handleExportExcel}
                                disabled={!safeDataSource.length}
                            /> */}
                            {!hideCrudActions && (
                                <Button
                                    type="primary"
                                    icon={<Plus size={16} />}
                                    onClick={onAdd}
                                    className={styles.addButton}
                                >
                                    Add {title}
                                </Button>
                            )}
                            {extraHeaderActions}
                        </Space>
                    )}
                />

                <div className={`${styles.tableContainer} erp-table-container`} ref={tableRef}>
                    <Table
                        columns={tableColumns}
                        dataSource={tableData}
                        rowKey={resolveRowKey}
                        rowSelection={showSkeleton ? undefined : rowSelection}
                        pagination={false}
                        scroll={{ y: tableHeight, x: "max-content" }}
                        size="small"
                        loading={tableLoading}
                        onScroll={showSkeleton ? undefined : onTableScroll}
                        onRow={showSkeleton ? undefined : onRow}
                        rowClassName={showSkeleton ? undefined : rowClassName}
                        className="custom-ant-table"
                    />
                </div>

                <div className={styles.totalItemsFooter}>
                    <Text className={styles.totalText}>
                        Total Items: {totalItems ?? safeDataSource.length}
                        {totalItems != null && ` | Loaded: ${safeDataSource.length}`}
                    </Text>
                </div>
            </Card>
        </div>
    );
};

export default MasterListTable;
