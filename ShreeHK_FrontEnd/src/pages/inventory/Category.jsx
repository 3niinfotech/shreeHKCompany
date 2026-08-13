import React, { useState, useCallback, useMemo, useRef } from "react";
import { Tree, Input, Button, Card, Row, Col, Space, Typography, Tag } from "antd";
import { toastWarning } from "../../utils/toastNotify";
import { FolderOutlined, ReloadOutlined } from "@ant-design/icons";
import {
    Search,
    Printer,
    Download,
    Lock,
    Unlock,
    ChevronRight,
    Info,
} from "lucide-react";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import useInventoryList from "../../hooks/useInventoryList";
import useInventoryHoldActions from "../../hooks/useInventoryHoldActions";
import useInventoryExportActions from "../../hooks/useInventoryExportActions";
import useInventoryLabelActions from "../../hooks/useInventoryLabelActions";
import { assignProductCategory, fetchCategoryStats } from "../../api/services/productService";
import { cssVar } from "../../theme";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import { SkuLink } from "../../hooks/useSkuModalAction";
import { SkeletonTree, SkeletonAwareTable } from "../../components/common/skeleton";
import styles from "../../assets/scss/pages/inventory/categories.module.scss";

const { DirectoryTree } = Tree;
const { Text } = Typography;

const listColumns = [
    { title: "SKU", dataIndex: "sku", key: "sku", width: 100, render: (text, record) => <SkuLink sku={text} record={record} /> },
    { title: "Lab", dataIndex: "lab", key: "lab", width: 70 },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 90 },
    { title: "Carat", dataIndex: "polish_carat", key: "polish_carat", width: 80, align: "right" },
    { title: "Price", dataIndex: "price", key: "price", width: 90, align: "right" },
    { title: "Location", dataIndex: "location", key: "location", width: 110, render: renderLocationWithFlag },
];

const CategorizeInventory = () => {
    const [selectedKey, setSelectedKey] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [treeSearch, setTreeSearch] = useState("");
    const [assigning, setAssigning] = useState(false);
    const tableRef = useRef(null);

    const { data: treeResponse, isLoading: treeLoading } = useFetchApi(
        "CategorizeTree",
        ENDPOINTS.product.categorizeTree,
    );

    const { data: statsResponse } = useFetchApi(
        `CategoryStats_${selectedKey || "none"}`,
        ENDPOINTS.product.categorizeStats,
        { categoryId: selectedKey },
        "GET",
        { enabled: Boolean(selectedKey) },
    );

    const {
        tableData,
        isLoading: listLoading,
        refresh,
    } = useInventoryList({
        queryKey: `CategorizeInventory_${selectedKey || "all"}`,
        baseFilters: selectedKey
            ? { category: [selectedKey], available: "On Hand Stock" }
            : { available: "On Hand Stock" },
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

    const stats = statsResponse?.Data || { total: 0, pcs: 0, carat: 0, amount: 0 };
    const tableScrollY = useTableBodyScrollHeight(tableRef, [tableData.length, selectedKey]);

    const onSelect = (keys) => {
        setSelectedKey(keys[0] || null);
        setSelectedRowKeys([]);
    };

    const handleAssignCategory = async () => {
        if (!selectedKey || !selectedRowKeys.length) {
            toastWarning("Select category and at least one stone");
            return;
        }
        setAssigning(true);
        try {
            const res = await assignProductCategory({
                productIds: selectedRowKeys,
                categoryId: selectedKey,
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

            <Row gutter={16} className={styles.contentRow}>
                <Col span={8} className={styles.treeCol}>
                    <Card className={styles.treeCard} title={<Text strong style={{ fontSize: "14px" , fontWeight:"800"}}>Inventory Hierarchy</Text>}>
                        <Input
                            placeholder="Quick search folders..."
                            prefix={<Search size={16} style={{ color: cssVar("color-text-muted") }} />}
                            className={styles.folderSearch}
                            allowClear
                            value={treeSearch}
                            onChange={(e) => setTreeSearch(e.target.value)}
                        />
                        {treeLoading ? (
                            <div className={styles.treeLoading}>
                                <SkeletonTree rows={10} />
                            </div>
                        ) : (
                            <DirectoryTree
                                multiple={false}
                                selectedKeys={selectedKey ? [selectedKey] : []}
                                onSelect={onSelect}
                                treeData={treeData}
                                expandAction="doubleClick"
                                switcherIcon={<ChevronRight size={14} />}
                                className={styles.inventoryTree}
                            />
                        )}
                    </Card>
                </Col>

                <Col span={16} className={styles.detailCol}>
                    <Card
                        className={styles.detailsCard}
                        title={
                            <Space>
                                <Info size={18} />
                                <span>Category: {selectedKey || "All on-hand"}</span>
                            </Space>
                        }
                        extra={
                            <Tag color="blue" className={styles.statsTag}>
                                Items: {stats.total ?? tableData.length} | {Number(stats.carat || 0).toFixed(2)} ct
                            </Tag>
                        }
                    >
                        <div ref={tableRef} className="erp-table-container" style={{ flex: 1, minHeight: 0 }}>
                        <SkeletonAwareTable
                            className={styles.modernTable}
                            rowKey="id"
                            size="small"
                            columns={listColumns}
                            dataSource={tableData}
                            loading={listLoading}
                            pagination={{ pageSize: 20 }}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: setSelectedRowKeys,
                            }}
                            scroll={{ y: tableScrollY }}
                        />
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default CategorizeInventory;
