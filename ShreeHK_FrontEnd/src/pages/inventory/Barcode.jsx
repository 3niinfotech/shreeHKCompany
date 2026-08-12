import React, { useState, useCallback } from "react";
import { message, Input, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
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
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";
import InventoryBulkActionModal from "../../components/inventory/InventoryBulkActionModal";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import InventoryPageToolbar from "../../components/inventory/InventoryPageToolbar";
import { SkuLink } from "../../hooks/useSkuModalAction";
import {
  BadgeDollarSign,
  Download,
  FileSpreadsheet,
  Lock,
  Mail,
  Printer,
  RefreshCcw,
  Unlock,
} from "lucide-react";
import AIResultPanel from "../../components/ai/AIResultPanel";
import { fetchBarcodeLookup } from "../../api/services/aiService";
import styles from "../../assets/scss/components/ai/aiComponents.module.scss";
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

const Barcode = () => {
  const [activeType, setActiveType] = useState("label");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionModal, setBulkActionModal] = useState({ open: false, actionKey: null });
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodePanelOpen, setBarcodePanelOpen] = useState(true);
  const [scannerMode, setScannerMode] = useState(false);
  const [searchText, setSearchText] = useState("");

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
    queryKey: "BarcodeInventory",
    filterForm,
    searchText,
  });

  const columns = [
    { title: "No.", key: "index", width: 56, fixed: "left", render: (_, __, i) => i + 1 },
    { title: "Type", dataIndex: "group_type", key: "group_type", width: 90, ellipsis: true },
    {
      title: "Sku", dataIndex: "sku", key: "sku", width: 100, ellipsis: true,
      render: (text, record) => <SkuLink sku={text} record={mapInventoryRowCamel(record)} />,
    },
    { title: "Lab", dataIndex: "lab", key: "lab", width: 64, ellipsis: true },
    { title: "Certificate", dataIndex: "report_no", key: "report_no", width: 120, ellipsis: true },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 88, ellipsis: true },
    numCol("polish_pcs", "Pcs", 64),
    numCol("polish_carat", "Carat", 72),
    { title: "Full Color", dataIndex: "main_color", key: "main_color", width: 96, ellipsis: true },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 80, ellipsis: true },
    numCol("price", "Price", 88),
    numCol("amount", "Amount", 96),
    { title: "Location", dataIndex: "location", key: "location", width: 120, ellipsis: true, render: renderLocationWithFlag },
  ];

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
        if (ok) setBulkActionModal({ open: false, actionKey: null });
        return;
      }
      if (key === "mail") {
        const ok = await submitMail(selectedRowKeys, values);
        if (ok) setBulkActionModal({ open: false, actionKey: null });
      }
    },
    [bulkActionModal.actionKey, selectedRowKeys, submitChangePrice, submitMail],
  );

  const onSelectedRowsChange = useCallback((_rows, keys) => {
    setSelectedRowKeys(keys || []);
  }, []);

  const handleReset = () => {
    setActiveType("label");
    setSearchText("");
    setBarcodeInput("");
    handleClear();
    refresh();
  };

  const handleLabelClick = useCallback(() => {
    if (!selectedRowKeys.length) {
      message.warning("Please Select Item");
      return true;
    }
    const stockChecks = filterForm.getFieldValue("stockChecks") || [];
    printLabel(selectedRowKeys, { copies: 1 }, { diaPair: resolveDiaPair({ stockChecks }) });
    return true;
  }, [filterForm, printLabel, selectedRowKeys]);

  const handleToolbarAction = useCallback(
    (key) => {
      if (!selectedRowKeys.length) {
        message.warning("Please Select Item");
        return;
      }
      if (key === "export") {
        submitExport(selectedRowKeys, { fileName: "Defult_Stock_List", sheetName: "Stock List" });
        return;
      }
      if (key === "iExport") {
        submitIExport(selectedRowKeys, { fileName: "Import_Format", format: "xlsx" });
        return;
      }
      if (key === "mail") {
        setBulkActionModal({ open: true, actionKey: "mail" });
      }
    },
    [selectedRowKeys, submitExport, submitIExport],
  );

  const handleBarcodeLookup = async () => {
    const value = barcodeInput.trim();
    if (!value) {
      message.warning("Enter Barcode or SKU");
      return;
    }
    setBarcodeLoading(true);
    setBarcodeError("");
    setBarcodeResult("");
    setBarcodePanelOpen(true);
    try {
      const res = await fetchBarcodeLookup({ barcodeData: value });
      if (res?.success) {
        const matchText = res.matches?.length
          ? `\n\nDB matches: ${JSON.stringify(res.matches, null, 2)}`
          : "";
        setBarcodeResult(`${res.data}${matchText}`);
        const sku = res.matches?.[0]?.sku || value;
        setSearchText(sku);
        if (scannerMode) {
          message.success(`Scanned: ${sku}`);
        }
      } else {
        const msg = res?.message || "AI unavailable, try again";
        setBarcodeError(msg);
        message.error(msg);
      }
    } catch {
      const msg = "AI unavailable, try again";
      setBarcodeError(msg);
      message.error(msg);
      setSearchText(value);
    } finally {
      setBarcodeLoading(false);
      if (scannerMode) setBarcodeInput("");
    }
  };

  const onBarcodeInputEnter = () => {
    handleBarcodeLookup();
  };

  return (
    <>
      <div className={`inventory-page-toolbar-wrap ${scannerMode ? "barcode-scanner-mode" : ""}`}>
        <div className={styles.barcodeRow}>
          <Input
            placeholder="Scan or enter barcode / SKU"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onPressEnter={onBarcodeInputEnter}
            style={{ maxWidth: scannerMode ? "100%" : 320 }}
            autoFocus={scannerMode}
            size={scannerMode ? "large" : "middle"}
          />
          <Button type="primary" onClick={handleBarcodeLookup} loading={barcodeLoading}>
            AI Barcode Lookup
          </Button>
          <Button type={scannerMode ? "primary" : "default"} onClick={() => setScannerMode((v) => !v)}>
            {scannerMode ? "Exit Scanner Mode" : "Scanner Mode"}
          </Button>
        </div>
        <AIResultPanel
          title="AI Barcode Lookup"
          loading={barcodeLoading}
          result={barcodeResult}
          error={barcodeError}
          open={barcodePanelOpen}
          onOpenChange={setBarcodePanelOpen}
        />
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
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={isLoading || isFetchingMore}>
              Refresh
            </Button>
          }
        />
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
      <MasterTableTemplate
        title="Barcode"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        searchPlaceholder="Search by SKU..."
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
          const fmt2 = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          return (
            <div style={{ flexShrink: 0, padding: "8px 14px", fontSize: 12, fontWeight: 600, display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
              <span>Pcs : <b>{fmtInt(totals.pcs)}</b></span>
              <span>Carat : <b>{fmt2(totals.carat)}</b></span>
              <span>Avg.Price : <b>{fmt2(avgPrice)}</b></span>
              <span>Amount : <b>{fmtInt(totals.amount)}</b></span>
              <span>Select Pcs : <b>{fmtInt(selectedTotals.pcs)}</b></span>
              <span>Select Carats : <b>{fmt2(selectedTotals.carat)}</b></span>
            </div>
          );
        }}
      />
    </>
  );
};

export default Barcode;
