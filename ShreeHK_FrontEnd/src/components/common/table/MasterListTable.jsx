import { Edit2, Trash2, Plus, Search } from "lucide-react";
import { Table, Button, Input, Space, Card, Typography } from "antd";
import { useMemo, useRef } from "react";
import { AppstoreOutlined } from "@ant-design/icons";
import useThemeColors from "../../../hooks/useThemeColors";
import useTableBodyScrollHeight from "../../../hooks/useTableBodyScrollHeight";
import PageHeroHeader from "../PageHeroHeader";
import useTableSkeleton from "../skeleton/useTableSkeleton";
import styles from "../../../assets/scss/pages/master/company.module.scss";

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
