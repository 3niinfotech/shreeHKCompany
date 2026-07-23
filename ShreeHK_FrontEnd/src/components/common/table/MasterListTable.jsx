import { Edit2, Trash2, Plus, Search } from "lucide-react";
import { Table, Button, Input, Space, Card, Typography } from "antd";
import { useRef } from "react";
import { AppstoreOutlined } from "@ant-design/icons";
import useThemeColors from "../../../hooks/useThemeColors";
import useTableBodyScrollHeight from "../../../hooks/useTableBodyScrollHeight";
import PageHeroHeader from "../PageHeroHeader";
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
    loading,
    hideCrudActions = false,
}) => {
    const theme = useThemeColors();
    const tableRef = useRef(null);
    const safeDataSource = (Array.isArray(dataSource) ? dataSource : []).filter(
        (row) => row != null
    );
    const tableHeight = useTableBodyScrollHeight(tableRef, [safeDataSource.length, loading]);

    const resolveRowKey = (record, index) => {
        if (record == null) return `row-${index}`;
        if (typeof rowKey === "function") return rowKey(record, index);
        return record[rowKey] ?? `row-${index}`;
    };

    const finalColumns = hideCrudActions
        ? columns
        : [
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
                        columns={finalColumns}
                        dataSource={safeDataSource}
                        rowKey={resolveRowKey}
                        rowSelection={rowSelection}
                        pagination={false}
                        scroll={{ y: tableHeight, x: "max-content" }}
                        size="small"
                        loading={loading}
                        className="custom-ant-table"
                    />
                </div>

                <div className={styles.totalItemsFooter}>
                    <Text className={styles.totalText}>
                        Total Items: {safeDataSource.length}
                    </Text>
                </div>
            </Card>
        </div>
    );
};

export default MasterListTable;
