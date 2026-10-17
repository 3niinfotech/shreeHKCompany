import React, { useState, useCallback, useMemo } from "react";
import { Input, Button, Card, Space, Typography } from "antd";
import { toastWarning } from "../../utils/toastNotify";
import { FolderOutlined, ReloadOutlined } from "@ant-design/icons";
import {
    Search,
    Printer,
    Download,
    Lock,
    Unlock,
    ChevronRight,
} from "lucide-react";
import { toastApiSuccess, toastApiError } from "../../utils/toastNotify";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import useInventoryList from "../../hooks/useInventoryList";
import useInventoryHoldActions from "../../hooks/useInventoryHoldActions";
import useInventoryExportActions from "../../hooks/useInventoryExportActions";
import useInventoryLabelActions from "../../hooks/useInventoryLabelActions";
import { assignProductCategory } from "../../api/services/productService";
import { cssVar } from "../../theme";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import { SkeletonTree, SkeletonAwareTable } from "../../components/common/skeleton";
import { getCategorizeInventoryColumns } from "./categorizeInventoryColumns";
import styles from "../../assets/scss/pages/inventory/categories.module.scss";

const { Text } = Typography;

function CategoryHierarchyNodes({
    nodes,
    depth,
    selectedKey,
    expandedKeys,
    onCategoryClick,
    onToggleExpand,
    renderTable,
}) {
    if (!nodes?.length) return null;

    return nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isExpanded = expandedKeys.includes(node.key);
        const isSelected = selectedKey === node.key;

        return (
            <div key={node.key} className={styles.treeBranch}>
                <div
                    className={`${styles.treeNodeRow} ${isSelected ? styles.treeNodeRowSelected : ""}`}
                    style={{ paddingLeft: 12 + depth * 18 }}
                    onClick={() => onCategoryClick(node)}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            className={`${styles.treeSwitcher} ${isExpanded ? styles.treeSwitcherOpen : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(node.key);
                            }}
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <span className={styles.treeSwitcherSpacer} />
                    )}
                    <span className={styles.treeNodeTitle}>{node.title}</span>
                </div>

                {isSelected && renderTable(node)}

                {hasChildren && isExpanded && (
                    <CategoryHierarchyNodes
                        nodes={node.children}
                        depth={depth + 1}
                        selectedKey={selectedKey}
                        expandedKeys={expandedKeys}
                        onCategoryClick={onCategoryClick}
                        onToggleExpand={onToggleExpand}
                        renderTable={renderTable}
                    />
                )}
            </div>
        );
    });
}

const CategorizeInventory = () => {
    const [selectedKey, setSelectedKey] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [treeSearch, setTreeSearch] = useState("");
    const [assigning, setAssigning] = useState(false);

    const listColumns = useMemo(() => getCategorizeInventoryColumns(), []);

    const { data: treeResponse, isLoading: treeLoading } = useFetchApi(
        "CategorizeTree",
        ENDPOINTS.product.categorizeTree,
    );

    const selectedCategoryIds = useMemo(() => {
        if (!selectedKey) return [];
        return String(selectedKey)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }, [selectedKey]);

    const {
        tableData,
        isLoading: listLoading,
        refresh,
        tableWrapRef,
        tableScrollY,
        totalItems,
    } = useInventoryList({
        queryKey: `CategorizeInventory_${selectedKey || "none"}`,
        baseFilters: selectedCategoryIds.length
            ? { category: selectedCategoryIds, available: "On Hand Stock" }
            : { category: ["-1"], available: "On Hand Stock" },
    });

    const { handleHoldAction, holdLoading } = useInventoryHoldActions({ onSuccess: refresh });
    const { submitExport, exportLoading } = useInventoryExportActions();
    const { printLabel, labelLoading } = useInventoryLabelActions();

    const treeData = useMemo(() => {
        const data = treeResponse?.Data || [];
        if (!treeSearch.trim()) return data;
        const q = treeSearch.toLowerCase();
        const filterNodes = (nodes) =>
            (nodes || [])
                .map((n) => {
                    const children = filterNodes(n.children);
                    if (String(n.title).toLowerCase().includes(q) || children.length) {
                        return { ...n, children };
                    }
                    return null;
                })
                .filter(Boolean);
        return filterNodes(data);
    }, [treeResponse, treeSearch]);

    const onCategoryClick = useCallback((node) => {
        setSelectedKey((prevSelected) => {
            const closingSame = prevSelected === node.key;
            if (closingSame) {
                setSelectedRowKeys([]);
                if (node.children?.length) {
                    setExpandedKeys((prev) => prev.filter((k) => k !== node.key));
                }
                return null;
            }
            setSelectedRowKeys([]);
            if (node.children?.length) {
                setExpandedKeys((prev) =>
                    prev.includes(node.key) ? prev : [...prev, node.key],
                );
            }
            return node.key;
        });
    }, []);

    const onToggleExpand = useCallback((key) => {
        setExpandedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    }, []);

    const handleAssignCategory = async () => {
        if (!selectedKey || !selectedRowKeys.length) {
            toastWarning("Select category and at least one stone");
            return;
        }
        setAssigning(true);
        try {
            const res = await assignProductCategory({
                productIds: selectedRowKeys,
                categoryId: selectedCategoryIds[0],
            });
            if (res?.ok) {
                toastApiSuccess(res);
                setSelectedRowKeys([]);
                refresh();
            } else {
                toastApiError({ response: { data: res } });
            }
        } catch (err) {
            toastApiError(err);
        } finally {
            setAssigning(false);
        }
    };

    const runWithSelection = useCallback((fn) => {
        if (!selectedRowKeys.length) {
            toastWarning("Please select stones from the list");
            return;
        }
        fn(selectedRowKeys);
    }, [selectedRowKeys]);

    const renderInlineTable = useCallback(() => (
        <div className={styles.inlineTableWrap}>
            <div className={styles.inlineTableMeta}>
                <Text type="secondary">
                    {totalItems > 0
                        ? `${tableData.length} of ${totalItems} stones`
                        : "No stones in this category"}
                </Text>
            </div>
            <div ref={tableWrapRef} className={`erp-table-container ${styles.inlineTable}`}>
                <SkeletonAwareTable
                    className={styles.modernTable}
                    rowKey="id"
                    size="small"
                    columns={listColumns}
                    dataSource={selectedKey ? tableData : []}
                    loading={listLoading && Boolean(selectedKey)}
                    pagination={false}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    }}
                    scroll={{ x: 3400, y: Math.min(tableScrollY || 280, 320) }}
                />
            </div>
        </div>
    ), [
        listColumns,
        listLoading,
        selectedKey,
        selectedRowKeys,
        tableData,
        tableScrollY,
        tableWrapRef,
        totalItems,
    ]);

    return (
        <div className={styles.pageContainer}>
            <PageHeroHeader
                breadcrumb="INVENTORY"
                title="Categorize Inventory"
                icon={<FolderOutlined />}
                actions={(
                    <Space size="small" wrap>
                        <Button icon={<ReloadOutlined />} onClick={refresh} loading={listLoading}>
                            Refresh
                        </Button>
                        <Button
                            icon={<Printer size={16} />}
                            danger
                            loading={labelLoading}
                            onClick={() => runWithSelection((ids) => printLabel(ids, { copies: 1 }))}
                        >
                            Label
                        </Button>
                        <Button.Group>
                            <Button
                                icon={<Lock size={16} />}
                                loading={holdLoading}
                                onClick={() => runWithSelection((ids) => handleHoldAction("hold", ids))}
                            >
                                Hold
                            </Button>
                            <Button
                                icon={<Unlock size={16} />}
                                loading={holdLoading}
                                onClick={() => runWithSelection((ids) => handleHoldAction("unHold", ids))}
                            >
                                Un-Hold
                            </Button>
                        </Button.Group>
                        <Button
                            type="primary"
                            icon={<Download size={16} />}
                            loading={exportLoading}
                            onClick={() => runWithSelection((ids) => submitExport(ids, { fileName: "Categorized_Stock" }))}
                        >
                            Export
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleAssignCategory}
                            loading={assigning}
                            disabled={!selectedKey}
                        >
                            Assign to Category
                        </Button>
                    </Space>
                )}
            />

            <Card className={styles.hierarchyCard} bordered={false}>
                <div className={styles.hierarchyHeader}>
                    <Text strong className={styles.hierarchyTitle}>
                        Inventory Hierarchy
                    </Text>
                    <Input
                        placeholder="Quick search folders..."
                        prefix={<Search size={16} style={{ color: cssVar("color-text-muted") }} />}
                        className={styles.hierarchySearch}
                        allowClear
                        value={treeSearch}
                        onChange={(e) => setTreeSearch(e.target.value)}
                    />
                </div>

                <div className={styles.hierarchyBody}>
                    {treeLoading ? (
                        <div className={styles.treeLoading}>
                            <SkeletonTree rows={10} />
                        </div>
                    ) : (
                        <CategoryHierarchyNodes
                            nodes={treeData}
                            depth={0}
                            selectedKey={selectedKey}
                            expandedKeys={expandedKeys}
                            onCategoryClick={onCategoryClick}
                            onToggleExpand={onToggleExpand}
                            renderTable={renderInlineTable}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CategorizeInventory;
