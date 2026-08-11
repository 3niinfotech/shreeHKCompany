import React, { useState, useCallback, useMemo } from "react";
import { message } from "antd";
import MasterTableTemplate from "./MasterTableTemplate";
import useFiltersFormFields from "../../hooks/useFiltersFormFields";
import useInventoryList from "../../hooks/useInventoryList";
import useInventoryHoldActions from "../../hooks/useInventoryHoldActions";
import useInventoryChangePriceActions from "../../hooks/useInventoryChangePriceActions";
import useInventoryLabelActions from "../../hooks/useInventoryLabelActions";
import useInventoryIExportActions from "../../hooks/useInventoryIExportActions";
import useInventoryExportActions from "../../hooks/useInventoryExportActions";
import useInventoryMailActions from "../../hooks/useInventoryMailActions";
import { resolveDiaPair } from "../../utils/resolveDiaPair";
import { LinkOutlined, ReloadOutlined } from "@ant-design/icons";
import InventoryBulkActionModal from "../../components/inventory/InventoryBulkActionModal";
import PairManagementModal from "../../components/inventory/PairManagementModal";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import InventoryPageToolbar from "../../components/inventory/InventoryPageToolbar";
import {
    BadgeDollarSign,
    Download,
    FileSpreadsheet,
    Lock,
    Mail,
    Printer,
    RefreshCcw,
    Sparkles,
    Unlock,
} from "lucide-react";
import { Button, Tag } from "antd";
import AIResultPanel from "../../components/ai/AIResultPanel";
import useAiStockAlert from "../../components/ai/useAiStockAlert";
import InventoryStoneDetailModal from "../../components/inventory/InventoryStoneDetailModal";
import InventoryFilterPresets from "../../components/inventory/InventoryFilterPresets";
import InventorySummaryToolbar from "../../components/inventory/InventorySummaryToolbar";
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { cssVar } from "../../theme";

import "../../assets/scss/pages/inventory/onHand_module.scss";

const FILTER_FIELDS = ["stockChecks", "fwRadio"];

const FILTER_CONFIG = {
    stockChecksOptions: [
        { label: "All", value: "All" },
        { label: "NON", value: "NON" },
        { label: "HOLD", value: "HOLD" },
        { label: "SINGLE", value: "SINGLE" },
        { label: "BOX", value: "BOX" },
        { label: "PARCEL", value: "PARCEL" },
        { label: "PAIR", value: "PAIR" },
    ],
    stockChecksDefault: ["All"],
    fwOptions: [
        { label: "F", value: "F" },
        { label: "W", value: "W" },
    ],
    fwDefault: "F",
};

const LABEL_BUTTON = {
    key: "label",
    label: "Label",
    icon: <Printer size={16} />,
    style: { color: cssVar("color-error"), borderColor: cssVar("color-error") },
};

const TYPE_BUTTONS = [
    { key: "hold", label: "Hold", icon: <Lock size={16} /> },
    { key: "unhold", label: "Un-Hold", icon: <Unlock size={16} /> },
    { key: "changePrice", label: "Change Price", icon: <BadgeDollarSign size={16} /> },
];

const ACTION_BUTTONS = {
    export: { key: "export", label: "Export", icon: <Download size={16} />, type: "primary" },
    iExport: { key: "iExport", label: "I.Export", icon: <FileSpreadsheet size={16} /> },
    mail: { key: "mail", label: "Mail", icon: <Mail size={16} /> },
    reset: { key: "reset", label: "Reset", icon: <RefreshCcw size={16} /> },
};

const numCol = (dataIndex, title, w = 88) => ({
    title,
    dataIndex,
    key: dataIndex,
    width: w,
    align: "right",
});

const OnHandStock = () => {
    const [activeType, setActiveType] = useState("label");
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [pairModalOpen, setPairModalOpen] = useState(false);
    const [bulkActionModal, setBulkActionModal] = useState({ open: false, actionKey: null });
    const [searchText, setSearchText] = useState("");
    const [stoneDetailModal, setStoneDetailModal] = useState({ open: false, data: null });

    const columns = useMemo(() => [
        { title: "No.", key: "index", width: 56, fixed: "left", render: (_, __, i) => i + 1 },
        { title: "Type", dataIndex: "group_type", key: "group_type", width: 90, ellipsis: true },
        {
            title: "Sku", dataIndex: "sku", key: "sku", width: 100, ellipsis: true,
            render: (text, record) => (
                <a
                    className="inventory-sku-link"
                    onClick={() => setStoneDetailModal({ open: true, data: mapInventoryRowCamel(record) })}
                >
                    {text}
                </a>
            ),
        },
        { title: "Lab", dataIndex: "lab", key: "lab", width: 64, ellipsis: true },
        { title: "Certificate", dataIndex: "report_no", key: "report_no", width: 120, ellipsis: true },
        { title: "Shape", dataIndex: "shape", key: "shape", width: 88, ellipsis: true },
        numCol("polish_pcs", "Pcs", 64),
        numCol("polish_carat", "Carat", 72),
        { title: "Full Color", dataIndex: "main_color", key: "main_color", width: 96, ellipsis: true },
        { title: "Argyle Color", dataIndex: "argyle_color", key: "argyle_color", width: 110, ellipsis: true },
        { title: "In House Cla", dataIndex: "in_house_clarity", key: "in_house_clarity", width: 110, ellipsis: true },
        { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 80, ellipsis: true },
        numCol("rap_price", "Rap", 88),
        numCol("cost", "Cost", 88),
        numCol("price", "Price", 88),
        numCol("amount", "Amount", 96),
        { title: "Size", dataIndex: "size", key: "size", width: 72, ellipsis: true },
        { title: "Fluorescence", dataIndex: "f_intensity", key: "f_intensity", width: 110, ellipsis: true },
        { title: "Cut", dataIndex: "cut", key: "cut", width: 72, ellipsis: true },
        { title: "Polish", dataIndex: "polish", key: "polish", width: 72, ellipsis: true },
        { title: "Symm", dataIndex: "symmentry", key: "symmentry", width: 72, ellipsis: true },
        numCol("table_pc", "Table", 72),
        numCol("depth_pc", "Depth", 72),
        { title: "Msurmnt", dataIndex: "mesurment", key: "mesurment", width: 100, ellipsis: true },
        { title: "Gridle", dataIndex: "gridle", key: "gridle", width: 88, ellipsis: true },
        { title: "Mining", dataIndex: "mining", key: "mining", width: 88, ellipsis: true },
        { title: "Origin", dataIndex: "origin", key: "origin", width: 88, ellipsis: true },
        { title: "Intensity", dataIndex: "intensity", key: "intensity", width: 96, ellipsis: true },
        { title: "Overtone", dataIndex: "overtone", key: "overtone", width: 88, ellipsis: true },
        { title: "Color", dataIndex: "color", key: "color", width: 72, ellipsis: true },
        { title: "Location", dataIndex: "location", key: "location", width: 120, ellipsis: true, render: renderLocationWithFlag },
        { title: "Package", dataIndex: "package", key: "package", width: 88, ellipsis: true },
        { title: "BGM", dataIndex: "bgm", key: "bgm", width: 72, ellipsis: true },
        { title: "Eye Clean", dataIndex: "eyeclean", key: "eyeclean", width: 96, ellipsis: true },
        {
            title: "RapNet",
            dataIndex: "rapnet_upload",
            key: "rapnet_upload",
            width: 72,
            render: (v) => (Number(v) === 1 ? "Yes" : "No"),
        },
        {
            title: "Website",
            dataIndex: "site_upload",
            key: "site_upload",
            width: 72,
            render: (v) => (Number(v) === 1 ? "Yes" : "No"),
        },
    ], []);
    const {
        loading: aiAlertLoading,
        result: aiAlertResult,
        error: aiAlertError,
        panelOpen: aiPanelOpen,
        setPanelOpen: setAiPanelOpen,
        runStockAlert,
    } = useAiStockAlert();

    const { data: summaryRes } = useFetchApi(
        "onHandInventorySummary",
        ENDPOINTS.product.inventorySummary,
        {}
    );
    const summary = summaryRes?.Data;
    const summaryTotals = summary?.totals;

    const { form: filterForm, handleClear, renderFilters } = useFiltersFormFields(
        FILTER_FIELDS,
        FILTER_CONFIG,
    );

    const {
        tableData,
        isLoading,
        isFetchingMore,
        totalItems,
        tableWrapRef,
        refresh,
    } = useInventoryList({
        queryKey: "OnHandStock",
        filterForm,
        searchText,
    });

    const tableDataWithActions = tableData;

    const {
        holdModal: holdActionState,
        holdLoading,
        closeHoldModal,
        submitHoldModal,
        handleHoldAction,
    } = useInventoryHoldActions({ onSuccess: () => { setSelectedRowKeys([]); refresh(); } });
    const { changePriceLoading, submitChangePrice } = useInventoryChangePriceActions({
        onSuccess: () => { setSelectedRowKeys([]); refresh(); },
    });
    const { printLabel } = useInventoryLabelActions();
    const { submitIExport } = useInventoryIExportActions();
    const { exportLoading, submitExport } = useInventoryExportActions({
        onSuccess: () => { setSelectedRowKeys([]); refresh(); },
    });
    const { mailLoading, submitMail } = useInventoryMailActions({
        onSuccess: () => { setSelectedRowKeys([]); refresh(); },
    });

    const onTypeAction = useCallback(
        (key) => {
            const normalizedKey = key === "unhold" ? "unHold" : key;
            if (normalizedKey === "changePrice") {
                if (!selectedRowKeys.length) {
                    message.warning("Please select at least one item");
                    return true;
                }
                setBulkActionModal({ open: true, actionKey: "changePrice" });
                return true;
            }
            return handleHoldAction(normalizedKey, selectedRowKeys);
        },
        [handleHoldAction, selectedRowKeys],
    );

    const handleBulkActionSubmit = useCallback(
        async (values, actionKey) => {
            const key = actionKey || bulkActionModal.actionKey;
            if (key === "changePrice") {
                const ok = await submitChangePrice(selectedRowKeys, values);
                if (ok) {
                    setBulkActionModal({ open: false, actionKey: null });
                }
                return;
            }
            if (key === "mail") {
                const ok = await submitMail(selectedRowKeys, values);
                if (ok) {
                    setBulkActionModal({ open: false, actionKey: null });
                }
            }
        },
        [bulkActionModal.actionKey, selectedRowKeys, submitChangePrice, submitMail]
    );

    const onSelectedRowsChange = useCallback((rows, keys) => {
        setSelectedRows(rows || []);
        setSelectedRowKeys(keys || []);
    }, []);

    const handleReset = () => {
        setActiveType("label");
        setSearchText("");
        handleClear();
        refresh();
    };

    const handleLabelClick = useCallback(() => {
        if (!selectedRowKeys.length) {
            message.warning("Please Select Item");
            return true;
        }
        const stockChecks = filterForm.getFieldValue("stockChecks") || [];
        const diaPair = resolveDiaPair({ stockChecks });
        printLabel(selectedRowKeys, { copies: 1 }, { diaPair });
        return true;
    }, [filterForm, printLabel, selectedRowKeys]);

    const handleToolbarAction = useCallback(
        (key) => {
            if (!selectedRowKeys.length) {
                message.warning("Please Select Item");
                return;
            }
            if (key === "export") {
                submitExport(selectedRowKeys, {
                    fileName: "Defult_Stock_List",
                    sheetName: "Stock List",
                });
                return;
            }
            if (key === "iExport") {
                submitIExport(selectedRowKeys, {
                    fileName: "Import_Format",
                    format: "xlsx",
                });
                return;
            }
            if (key === "mail") {
                setBulkActionModal({ open: true, actionKey: "mail" });
            }
        },
        [selectedRowKeys, submitExport, submitIExport]
    );

    return (
        <>
            <InventorySummaryToolbar totals={summaryTotals} />
            <div className="inventory-page-toolbar-wrap">
                {/* <InventoryFilterPresets
                    pageKey="on-hand-stock"
                    compactForm={filterForm}
                    onApply={() => refresh()}
                /> */}
                <InventoryPageToolbar
                    tableCount={totalItems || tableData.length}
                    activeType={activeType}
                    setActiveType={setActiveType}
                    filterForm={filterForm}
                    renderFilters={renderFilters}
                    onReset={handleReset}
                    labelButton={LABEL_BUTTON}
                    typeButtons={TYPE_BUTTONS}
                    actionButtons={ACTION_BUTTONS}
                    onTypeAction={onTypeAction}
                    onLabelClick={handleLabelClick}
                    onToolbarAction={handleToolbarAction}
                    extraToolbarActions={
                        <>
                            <Button icon={<ReloadOutlined />} onClick={refresh} loading={isLoading || isFetchingMore}>
                                Refresh
                            </Button>
                            <Button
                                icon={<LinkOutlined />}
                                onClick={() => setPairModalOpen(true)}
                                style={{ color: cssVar("color-primary"), borderColor: cssVar("color-primary") }}
                            >
                                Manage Pairs
                            </Button>
                        </>
                    }
                />
                {/* <AIResultPanel
                    title="AI Stock Alerts"
                    loading={aiAlertLoading}
                    result={aiAlertResult}
                    error={aiAlertError}
                    open={aiPanelOpen}
                    onOpenChange={setAiPanelOpen}
                /> */}
            </div>
            <InventoryBulkActionModal
                open={holdActionState.open}
                actionKey={holdActionState.actionKey}
                selectedCount={holdActionState.selectedIds?.length ?? 0}
                loading={holdLoading}
                onClose={closeHoldModal}
                onSubmit={submitHoldModal}
            />
            <InventoryBulkActionModal
                open={bulkActionModal.open}
                actionKey={bulkActionModal.actionKey}
                selectedCount={selectedRowKeys.length}
                loading={changePriceLoading || mailLoading || exportLoading}
                onClose={() => setBulkActionModal({ open: false, actionKey: null })}
                onSubmit={handleBulkActionSubmit}
            />
            <PairManagementModal
                open={pairModalOpen}
                selectedRows={selectedRows}
                onClose={() => setPairModalOpen(false)}
                onSuccess={() => {
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    refresh();
                }}
            />
            <MasterTableTemplate
                title="OnHand Stock"
                columns={columns}
                dataSource={tableDataWithActions}
                rowKey="id"
                searchPlaceholder="Search OnHandStocks..."
                searchValue={searchText}
                onSearchChange={setSearchText}
                loading={isLoading || isFetchingMore}
                tableWrapRef={tableWrapRef}
                totalCount={totalItems || tableData.length}
                showStatsBar={false}
                showTotalItemsFooter={false}
                showActionsColumn={false}
                enableRowSelectionFooter={true}
                onSelectedRowsChange={onSelectedRowsChange}
                totalsKeys={{ pcs: "polish_pcs", carat: "polish_carat", amount: "amount" }}
                renderFooterTotalsInTable={true}
                showButton={false}
                renderFooterTotals={({ totals, selectedTotals, avgPrice, selectedAvgPrice }) => {
                    const fmtInt = (n) => Number(n || 0).toLocaleString();
                    const fmt2 = (n) =>
                        Number(n || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                        });

                    return (
                        <div className="onhand-footer-badges">
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--pcs">
                                Pcs:<b>{fmtInt(totals.pcs)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--carat">
                                Carat:<b>{fmt2(totals.carat)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--amount">
                                Avg.Price:<b>{fmt2(avgPrice)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--amount">
                                Amount:<b>{fmtInt(totals.amount)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--select">
                                Select Pcs:<b>{fmtInt(selectedTotals.pcs)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--select">
                                Select Carats:<b>{fmt2(selectedTotals.carat)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--select">
                                Select Price:<b>{fmt2(selectedAvgPrice)}</b>
                            </Tag>
                            <Tag bordered className="onhand-stat-badge onhand-stat-badge--select">
                                Select Amount:<b>{fmtInt(selectedTotals.amount)}</b>
                            </Tag>
                        </div>
                    );
                }}
            />
            <InventoryStoneDetailModal
                open={stoneDetailModal.open}
                onClose={() => setStoneDetailModal({ open: false, data: null })}
                stone={stoneDetailModal.data}
            />
        </>
    );
};

export default OnHandStock;
