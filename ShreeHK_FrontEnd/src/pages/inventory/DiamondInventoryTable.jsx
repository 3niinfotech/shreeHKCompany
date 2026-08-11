import React, { useEffect, useState, useRef, useMemo, useCallback, useLayoutEffect, useContext, startTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SelectionContext } from "./SelectionContext";
import SkuActionModal from "../../hooks/useSkuModalAction";
import { Table, Button, Dropdown, Tag, Form, message } from "antd";
import { DownOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import InventorySmartSearch from "../../components/inventory/InventorySmartSearch";
import { useQueryClient } from "@tanstack/react-query";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { api } from "../../api/axiosInstance";
import { sendToOutward } from "../../api/services/outwardService";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import InventoryFilterPanel from "../../components/inventory/InventoryFilterPanel";
import InventoryFilterGroups from "../../components/inventory/InventoryFilterGroups";
import InventoryCompactFilterRow from "../../components/inventory/InventoryCompactFilterRow";
import InventoryActionPanel from "../../components/inventory/InventoryActionPanel";
import InventoryBulkActionModal from "../../components/inventory/InventoryBulkActionModal";
import OnMemoModal from "../../components/inventory/OnMemoModal";
import AddToPackageModal from "../../components/inventory/AddToPackageModal";
import InventoryStoneDetailModal from "../../components/inventory/InventoryStoneDetailModal";
import InventoryQuickLinks from "../../components/inventory/InventoryQuickLinks";
import InventorySummaryToolbar from "../../components/inventory/InventorySummaryToolbar";
import InventoryCompareModal from "../../components/inventory/InventoryCompareModal";
import InventoryFilterPresets from "../../components/inventory/InventoryFilterPresets";
import ReservationModal from "../../components/inventory/ReservationModal";
import useInventoryHoldActions from "../../hooks/useInventoryHoldActions";
import useInventoryChangePriceActions from "../../hooks/useInventoryChangePriceActions";
import useInventoryLabelA4Actions from "../../hooks/useInventoryLabelA4Actions";
import useInventoryLabelActions from "../../hooks/useInventoryLabelActions";
import useInventoryIExportActions from "../../hooks/useInventoryIExportActions";
import useInventoryExportActions from "../../hooks/useInventoryExportActions";
import useInventoryMailActions from "../../hooks/useInventoryMailActions";
import { resolveDiaPair } from "../../utils/resolveDiaPair";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import AIResultPanel from "../../components/ai/AIResultPanel";
import useAiStockAlert from "../../components/ai/useAiStockAlert";
import { Sparkles } from "lucide-react";
import InventoryCaratCell from "../../components/inventory/InventoryCaratCell";
import { buildInventoryApiFilters } from "../../utils/inventoryApiFilters";
import { StoneActionSuccessModal } from "./components/ShopTopActionFilter";
import "../../assets/scss/pages/inventory/onHand_module.scss";
import "../../assets/scss/pages/inventory/diamondInventoryTable.scss";

const EMPTY_ARRAY = [];
const getRowKey = (record) => String(record.id);
const TABLE_LOCALE = { emptyText: "No data found" };

const SelectionCheckbox = React.memo(function SelectionCheckbox({ id }) {
  const context = useContext(SelectionContext);
  const isSelectedInContext = context?.selectedRowKeysSet?.has(String(id)) ?? false;
  const [checked, setChecked] = useState(isSelectedInContext);

  useLayoutEffect(() => {
    setChecked(isSelectedInContext);
  }, [isSelectedInContext]);

  const handleChange = (e) => {
    const nextChecked = e.target.checked;
    setChecked(nextChecked);
    if (context?.handleToggleRowSelection) {
      startTransition(() => {
        context.handleToggleRowSelection(id, nextChecked);
      });
    }
  };

  return (
    <input
      type="checkbox"
      className="inventory-custom-checkbox"
      checked={checked}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
});

const SelectAllCheckbox = React.memo(function SelectAllCheckbox() {
  const context = useContext(SelectionContext);
  const isAllSelectedInContext = context?.isAllSelected ?? false;
  const isIndeterminate = context?.isIndeterminate ?? false;
  const [checked, setChecked] = useState(isAllSelectedInContext);
  const checkboxRef = useRef(null);

  useLayoutEffect(() => {
    setChecked(isAllSelectedInContext);
  }, [isAllSelectedInContext]);

  useLayoutEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleChange = (e) => {
    const nextChecked = e.target.checked;
    setChecked(nextChecked);
    if (context?.handleSelectAllToggle) {
      startTransition(() => {
        context.handleSelectAllToggle(nextChecked);
      });
    }
  };

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      className="inventory-custom-checkbox"
      checked={checked}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
});

const MemoizedInventoryRow = React.memo((props) => <tr {...props} />);

const InventoryTableFooter = React.memo(function InventoryTableFooter({ showTotalStats, selectedStats }) {
  return (
    <div className="inventory-table-footer-totals">
      <div className="inventory-footer-group inventory-footer-group--total">
        <span className="inventory-footer-stat">
          TOTAL : <b>{Number(showTotalStats.totalPcs || 0).toLocaleString()}</b>
        </span>
        <span className="inventory-footer-stat">
          Carat Total : <b>{showTotalStats.totalCts}</b>
        </span>
        <span className="inventory-footer-stat">
          Amount Total : <b>{showTotalStats.askAmt}</b>
        </span>
      </div>
      <div className="inventory-footer-group inventory-footer-group--selected">
        <span className="inventory-footer-divider" aria-hidden="true" />
        <span className="inventory-footer-stat">
          Select Pcs : <b>{selectedStats.totalPcs}</b>
        </span>
        <span className="inventory-footer-stat">
          Select Carats : <b>{selectedStats.totalCts}</b>
        </span>
        <span className="inventory-footer-stat">
          Select Price : <b>{selectedStats.askRate}</b>
        </span>
        <span className="inventory-footer-stat">
          Select Amount : <b>{selectedStats.askAmt}</b>
        </span>
      </div>
    </div>
  );
});

const getInventoryRowClass = (record) => {
  let className = "";
  const outward = String(record?.outward ?? "").trim().toLowerCase();
  const lab = String(record?.lab ?? "").trim();

  if (outward === "lab") {
    className = "inventory-row-green";
  }
  if (lab !== "") {
    className = "inventory-row-blue";
  }
  if (outward === "memo" || outward === "consign") {
    className = "inventory-row-red";
  }
  if (record?.hold) {
    className = "inventory-row-grey";
  }

  return className;
};

function computeSelectedStockCalculationStats(selectedRows) {
  const rows = Array.isArray(selectedRows) ? selectedRows : [];
  if (rows.length === 0) {
    return {
      totalPcs: 0,
      totalCts: "0.00",
      aRap: "0.00",
      askDisc: "0.00",
      askRate: "0.00",
      askAmt: "0.00",
    };
  }

  let count = 0;
  let carat = 0;
  let rapTotal = 0;
  let askingTotal = 0;
  let amount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const c = Number(row.polishCarat ?? row.carat ?? row.Carat ?? 0);
    const r = Number(row.rapPrice ?? row.rap ?? row.Rap ?? 0);
    const p = Number(row.price ?? row.Asking ?? row.Rate ?? 0);
    const a = Number(row.amount ?? row.Amount ?? 0);

    count += 1;
    carat += c;
    rapTotal += r * c;
    askingTotal += p * c;
    amount += a;
  }

  const safeAvg = (total, divisor) =>
    divisor ? (total / divisor).toFixed(2) : "0.00";

  const calAvgDisc = (askingTotal, rapTotal) =>
    rapTotal ? (((askingTotal * 100) / rapTotal) - 100).toFixed(2) : "0.00";

  return {
    totalPcs: count,
    totalCts: carat.toFixed(2),
    aRap: safeAvg(rapTotal, carat),
    askDisc: calAvgDisc(askingTotal, rapTotal),
    askRate: safeAvg(askingTotal, carat),
    askAmt: amount.toFixed(2),
  };
}



const INVENTORY_FILTER_GROUPS = [
  { key: "shape", title: "Shape", start: 0, end: 1 },
  { key: "clarity", title: "Clarity", start: 1, end: 2 },
  { key: "color", title: "Color", start: 2, end: 3 },
  { key: "intensity", title: "Intensity", start: 3, end: 4 },
  { key: "overtone", title: "Overtone", start: 4, end: 5 },
  { key: "fluorescence", title: "Fluorescence", start: 5, end: 6 },
  { key: "package", title: "Package", start: 6, end: 7 },
  { key: "location", title: "Location", start: 7, end: 8 },
  { key: "group", title: "Group", start: 8, end: 9 },
  { key: "subGroup", title: "Sub Group", start: 9, end: 10 },
];

const FANCY_COLOR_OPTIONS = [
  "Yellow", "Blue", "Pink", "Green", "Orange", "Gray", "Purple", "Violet", "Brown",
].map((value) => ({ label: value, value }));

const WHITE_COLOR_OPTIONS = Array.from({ length: 23 }, (_, index) => {
  const value = String.fromCharCode(68 + index);
  return { label: value, value };
});

const SHAPE_OPTIONS = [
  "round", "cushion", "oval", "heart", "marquise", "emerald",
  "radiant", "pear", "rose", "princess", "other",
].map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));

const CLARITY_OPTIONS = [
  "FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "SI3", "I1", "I2", "I3",
].map((value) => ({ label: value, value }));

const INTENSITY_OPTIONS = [
  "Faint", "Very Light", "Light", "Fancy Light", "Fancy", "Fancy Intense",
  "Fancy Vivid", "Fancy Deep", "Fancy Dark",
].map((value) => ({ label: value, value }));

const TABLE_BODY_MIN_HEIGHT = 160;

const INVENTORY_ENTRY_ROUTES = {
  memo: '/transaction/out-memo/entry',
  sale: '/transaction/sale/entry',
  lab: '/transaction/gia-memo/entry',
  export: '/outward',
  consign: '/outward',
};

const measureTableBodyScrollHeight = (containerEl) => {
  if (!containerEl) return TABLE_BODY_MIN_HEIGHT;

  const containerHeight = containerEl.getBoundingClientRect().height;
  if (containerHeight <= 0) return TABLE_BODY_MIN_HEIGHT;

  const tableHeader = containerEl.querySelector(".ant-table-header");
  const tableFooter = containerEl.querySelector(".ant-table-footer");
  const stickyScroll = containerEl.querySelector(".ant-table-sticky-scroll");

  let reserved = 0;
  if (tableHeader instanceof HTMLElement) reserved += tableHeader.offsetHeight;
  if (tableFooter instanceof HTMLElement) reserved += tableFooter.offsetHeight;
  if (stickyScroll instanceof HTMLElement) reserved += stickyScroll.offsetHeight;

  const bodyHeight = Math.floor(containerHeight - reserved);
  return bodyHeight > TABLE_BODY_MIN_HEIGHT ? bodyHeight : TABLE_BODY_MIN_HEIGHT;
};

const InventoryHeaderActions = React.memo(function InventoryHeaderActions({
  selectedCount,
  onAction,
  menuItems,
  handleDownloadMenuClick,
  exportLoading,
  iExportLoading,
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <InventoryActionPanel
        selectedCount={selectedCount}
        onAction={onAction}
      />
      <Dropdown
        menu={{
          items: menuItems,
          onClick: handleDownloadMenuClick,
        }}
      >
        <Button
          size="small"
          icon={<DownOutlined />}
          loading={exportLoading || iExportLoading}
        >
          Download
        </Button>
      </Dropdown>
    </span>
  );
});

const InventoryQuickLinksWrapper = React.memo(function InventoryQuickLinksWrapper({
  selectedRows,
  selectedCount,
  onCompare,
  onRefreshRapnet,
  onWebsiteSync,
  syncLoading,
}) {
  return (
    <InventoryQuickLinks
      selectedSku={selectedRows[0]?.sku}
      selectedCount={selectedCount}
      onCompare={onCompare}
      onRefreshRapnet={onRefreshRapnet}
      onWebsiteSync={onWebsiteSync}
      syncLoading={syncLoading}
    />
  );
});

const DiamondInventoryTable = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [offset, setOffset] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({});
  const [tableData, setTableData] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [tableHeight, setTableHeight] = useState(600);
  const [modalConfig, setModalConfig] = useState({ visible: false, data: null });
  const [stoneDetailModal, setStoneDetailModal] = useState({ open: false, data: null });
  const [bulkActionModal, setBulkActionModal] = useState({ open: false, actionKey: null });
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [consignModalOpen, setConsignModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [filterForm] = Form.useForm();
  const [advancedFilterForm] = Form.useForm();
  const stoneTypeFw = Form.useWatch("stoneTypeFw", filterForm) || "";
  const [caratFrom, setCaratFrom] = useState("");
  const [caratTo, setCaratTo] = useState("");
  const {
    loading: aiAlertLoading,
    result: aiAlertResult,
    error: aiAlertError,
    panelOpen: aiPanelOpen,
    setPanelOpen: setAiPanelOpen,
    runStockAlert,
  } = useAiStockAlert();
  const [successModal, setSuccessModal] = useState({
    open: false,
    actionType: "sale",
    stone: {},
    count: 0,
  });

  const selectedRowKeysSet = useMemo(() => new Set(selectedRowKeys.map(String)), [selectedRowKeys]);

  const isAllSelected = useMemo(
    () => tableData.length > 0 && selectedRowKeys.length === tableData.length && tableData.every((r) => selectedRowKeysSet.has(String(r.id))),
    [tableData, selectedRowKeysSet, selectedRowKeys.length]
  );

  const isIndeterminate = useMemo(
    () => selectedRowKeys.length > 0 && !isAllSelected,
    [selectedRowKeys.length, isAllSelected]
  );

  const handleToggleRowSelection = useCallback((id, checked) => {
    const strId = String(id);
    setSelectedRowKeys((prev) => {
      if (checked) {
        if (prev.includes(strId)) return prev;
        return [...prev, strId];
      } else {
        if (!prev.includes(strId)) return prev;
        return prev.filter((item) => String(item) !== strId);
      }
    });
  }, []);

  const handleSelectAllToggle = useCallback((checked) => {
    if (checked) {
      setSelectedRowKeys(tableData.map((r) => String(r.id)));
    } else {
      setSelectedRowKeys([]);
    }
  }, [tableData]);

  const showSuccessModal = (actionType, rows) => {
    const first = rows[0] || {};
    setSuccessModal({
      open: true,
      actionType,
      count: rows.length,
      stone: {
        name: rows.length === 1 ? first.sku : undefined,
        SKU: rows.length === 1 ? first.sku : `${rows.length} items`,
        Carat: rows
          .reduce((sum, r) => sum + (Number(r.polishCarat) || 0), 0)
          .toFixed(2) + " ct",
        Shape: rows.length === 1 ? first.shape : undefined,
      },
    });
  };

  useEffect(() => {
    advancedFilterForm.setFieldsValue({ color: undefined });
  }, [stoneTypeFw, advancedFilterForm]);

  useEffect(() => {
    const entry = new URLSearchParams(location.search).get('entry');
    if (entry && INVENTORY_ENTRY_ROUTES[entry]) {
      navigate(INVENTORY_ENTRY_ROUTES[entry], { replace: true });
    }
  }, [location.search, navigate]);

  const handleSkuAction = (actionType, data) => {
    setModalConfig({ visible: false, data: null });
  };

  const { data: summaryRes } = useFetchApi(
    "myInventorySummary",
    ENDPOINTS.product.inventorySummary,
    {},
  );
  const summaryTotals = summaryRes?.Data?.totals;

  const limit = 100;
  const inventoryQueryParams = useMemo(
    () => ({ limit, offset, ...appliedFilters }),
    [limit, offset, appliedFilters],
  );

  const queryClient = useQueryClient();

  const {
    holdModal: holdActionState,
    holdLoading,
    closeHoldModal,
    submitHoldModal,
    handleHoldAction,
  } = useInventoryHoldActions({
    onSuccess: () => {
      setSelectedRowKeys([]);
      setOffset(1);
      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    },
  });

  const { changePriceLoading, submitChangePrice } = useInventoryChangePriceActions({
    onSuccess: () => {
      setSelectedRowKeys([]);
      setOffset(1);
      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    },
  });

  const { labelA4Loading, printLabelA4 } = useInventoryLabelA4Actions({
    onSuccess: () => {
      setSelectedRowKeys([]);
    },
  });

  const { labelLoading, printLabel } = useInventoryLabelActions({
    onSuccess: () => {
      setSelectedRowKeys([]);
    },
  });

  const { iExportLoading, submitIExport } = useInventoryIExportActions({
    onSuccess: () => {
      setSelectedRowKeys([]);
    },
  });

  const { exportLoading, submitExport } = useInventoryExportActions({
    onSuccess: () => {
      setSelectedRowKeys([]);
    },
  });

  const { mailLoading, submitMail } = useInventoryMailActions({
    onSuccess: () => {
      setSelectedRowKeys([]);
    },
  });

  const { data: productData, isLoading, isFetching: isInventoryFetching, refetch: refetchInventory } = useFetchApi(
    "GetProductData",
    ENDPOINTS.product.inventory,
    inventoryQueryParams,
    'GET',
    { placeholderData: undefined, refetchOnMount: 'always' }
  );

  const { data: categoryData } = useFetchApi(
    "inventoryCategoryOptions",
    ENDPOINTS.category.list,
    { limit: 500, offset: 0 },
  );

  const categoryOptions = useMemo(() => {
    const rows = categoryData?.Data;
    if (!Array.isArray(rows)) return [];
    return rows.map((item) => ({
      label: item.name,
      value: String(item.id),
    }));
  }, [categoryData]);

  const compactFilterFields = useMemo(() => [
    {
      name: "inStock", label: "GIA", type: "select", span: 2, width: "45px",
      options: [
        { label: "GIA", value: "GIA" }, { label: "Non-GIA", value: "NON-GIA" },
        { label: "All Stock", value: "ALL STOCK" }, { label: "On Hand GIA", value: "ON HAND GIA" },
        { label: "On Hand Non-GIA", value: "ON HAND NON-GIA" }, { label: "On Hand Stock", value: "ON HAND STOCK" }
      ]
    },
    {
      name: "lab", label: "Lab", type: "select", span: 2, width: "45px",
      options: [
        { label: "GIA", value: "GIA" }, { label: "IGI", value: "IGI" },
        { label: "CGL", value: "CGL" }, { label: "AGT", value: "AGT" }
      ]
    },
    {
      name: "outStock", label: "Out Stock", type: "select", span: 2, width: "45px",
      options: [
        { label: "GIA - Out Memo", value: "GIA - Out Memo" }, { label: "GIA - On Hold", value: "GIA - On Hold" },
        { label: "NON-GIA - Memo", value: "NON-GIA - Memo" }, { label: "NON-GIA - On Hold", value: "NON-GIA - On Hold" },
        { label: "ALL STOCK - Memo", value: "ALL STOCK - Memo" }, { label: "ALL STOCK - On Hold", value: "ALL STOCK - On Hold" },
        { label: "Lab", value: "Lab" }
      ]
    },
    {
      name: "type", label: "Group", type: "select", span: 2, width: "45px",
      options: [
        { label: "Single", value: "single" }, { label: "Box", value: "box" },
        { label: "Parcel", value: "parcel" }, { label: "Pair", value: "pair" }
      ]
    },
    {
      name: "category", label: "Category", type: "select", span: 2, width: "45px",
      options: categoryOptions,
    },
    { name: "stoneTypeFw", label: "Stone Type", type: "radio", span: 2 },
  ], [categoryOptions]);

  const filterFields = useMemo(() => [
    {
      name: "shape", label: "Shape", type: "select", span: 2, width: "45px",
      options: SHAPE_OPTIONS,
    },
    {
      name: "clarity", label: "Clarity", type: "select", span: 2, width: "45px",
      options: CLARITY_OPTIONS,
    },
    {
      name: "color", label: "Color", type: "select", span: 2, width: "45px",
      options: stoneTypeFw === "W" ? WHITE_COLOR_OPTIONS : FANCY_COLOR_OPTIONS,
    },
    {
      name: "intensity", label: "Intensity", type: "select", span: 2, width: "45px",
      options: INTENSITY_OPTIONS,
    },
    {
      name: "overtone", label: "Overtone", type: "select", span: 2, width: "45px",
      options: [
        { label: "Bluish", value: "Bluish" }, { label: "Brownish", value: "Brownish" },
        { label: "Grayish", value: "Grayish" }, { label: "Greenish", value: "Greenish" },
        { label: "None", value: "None" }, { label: "Orangey", value: "Orangey" },
        { label: "Pinkish", value: "Pinkish" }, { label: "Purplish", value: "Purplish" },
        { label: "Reddish", value: "Reddish" }, { label: "Yellowish", value: "Yellowish" }
      ]
    },
    {
      name: "fluorescence", label: "Fluorescence", type: "select", span: 2, width: "45px",
      options: [
        { label: "STG", value: "STG" }, { label: "NON", value: "NON" },
        { label: "MED", value: "MED" }, { label: "FNT", value: "FNT" },
        { label: "VST", value: "VST" }
      ]
    },
    {
      name: "package", label: "Package", type: "select", span: 2, width: "45px",
      options: [
        { label: "SB", value: "SB" }, { label: "BAGS JEWEL", value: "BAGS JEWEL" },
        { label: "BIG SB", value: "BIG SB" }, { label: "BRC", value: "BRC" },
        { label: "SMALL BRC", value: "SMALL BRC" }, { label: "BOX", value: "BOX" },
        { label: "BAGS", value: "BAGS" }, { label: "S BOX", value: "S BOX" }
      ]
    },
    {
      name: "location", label: "Location", type: "select", span: 2, width: "45px",
      options: [
        { label: "HK", value: "HK" }, { label: "Hong Kong", value: "Hong Kong" },
        { label: "NY", value: "NY" }, { label: "Mumbai", value: "Mumbai" },
        { label: "Antwerp", value: "Antwerp" }
      ]
    },
    {
      name: "group", label: "Group", type: "select", span: 2, width: "45px",
      options: [
        { label: "TRAY-12", value: "TRAY-12" }, { label: "TRAY-11", value: "TRAY-11" },
        { label: "TRAY-7", value: "TRAY-7" }, { label: "A+", value: "A+" },
        { label: "YELLOW", value: "YELLOW" }, { label: "PINK", value: "PINK" },
        { label: "LC", value: "LC" }, { label: "ROUGH DIAMOND", value: "ROUGH DIAMOND" }
      ]
    },
    {
      name: "subGroup", label: "Sub Group", type: "select", span: 2, width: "45px",
      options: [
        { label: "SB", value: "SB" }, { label: "FVOY-01", value: "FVOY-01" },
        { label: "2017/6", value: "2017/6" }, { label: "BIG SB", value: "BIG SB" },
        { label: "BAGS", value: "BAGS" }, { label: "S BOX", value: "S BOX" }
      ]
    }
  ], [stoneTypeFw]);

  const handleMemoSubmit = async (payload) => {
    const result = await sendToOutward(payload);
    if (!result?.status) {
      throw new Error(result?.message || "");
    }
    toastApiSuccess(result);
    showSuccessModal("memo", selectedRows);
    setMemoModalOpen(false);
    setSelectedRowKeys([]);
    setOffset(1);
    queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    queryClient.invalidateQueries({ queryKey: ["OutwardList"] });
    queryClient.invalidateQueries({ queryKey: ["getIncrement"] });
  };

  const handleSaleSubmit = async (payload) => {
    const result = await sendToOutward(payload);
    if (!result?.status) {
      throw new Error(result?.message || "");
    }
    toastApiSuccess(result);
    showSuccessModal("sale", selectedRows);
    setSellModalOpen(false);
    setSelectedRowKeys([]);
    setOffset(1);
    queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    queryClient.invalidateQueries({ queryKey: ["OutwardList"] });
    queryClient.invalidateQueries({ queryKey: ["getIncrement"] });
  };

  const handleConsignSubmit = async (payload) => {
    const result = await sendToOutward(payload);
    if (!result?.status) {
      throw new Error(result?.message || "");
    }
    toastApiSuccess(result);
    showSuccessModal("consign", selectedRows);
    setConsignModalOpen(false);
    setSelectedRowKeys([]);
    setOffset(1);
    queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    queryClient.invalidateQueries({ queryKey: ["OutwardList"] });
    queryClient.invalidateQueries({ queryKey: ["getIncrement"] });
  };

  const handleRefreshRapnetFlags = async () => {
    setSyncLoading(true);
    try {
      const res = await api.post(ENDPOINTS.integration.refreshRapnetStock);
      if (res.data?.status === false) toastApiError({ response: { data: res.data } });
      else toastApiSuccess(res.data);
      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    } catch (err) {
      toastApiError(err);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleWebsiteSync = async () => {
    setSyncLoading(true);
    try {
      const res = await api.post(ENDPOINTS.integration.websiteSync, {
        limit: Math.min(selectedRowKeys.length || 50, 200),
      });
      if (res.data?.status === false) toastApiError({ response: { data: res.data } });
      else toastApiSuccess(res.data);
      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    } catch (err) {
      toastApiError(err);
    } finally {
      setSyncLoading(false);
    }
  };

  const pageRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    const updateTableHeight = () => {
      if (!tableRef.current) return;
      setTableHeight(measureTableBodyScrollHeight(tableRef.current));
    };

    updateTableHeight();
    const timer = window.setTimeout(updateTableHeight, 120);
    const rafId = window.requestAnimationFrame(updateTableHeight);
    window.addEventListener("resize", updateTableHeight);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateTableHeight);
      if (tableRef.current) resizeObserver.observe(tableRef.current);
      if (pageRef.current) resizeObserver.observe(pageRef.current);
      const filterEl = pageRef.current?.querySelector(".inventory-filter-wrapper");
      if (filterEl) resizeObserver.observe(filterEl);
    }

    return () => {
      window.removeEventListener("resize", updateTableHeight);
      window.clearTimeout(timer);
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (tableRef.current) {
        setTableHeight(measureTableBodyScrollHeight(tableRef.current));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tableData.length, isLoading, isFetching]);

  useEffect(() => {
    if (productData?.Data?.length > 0) {
      const mapped = productData.Data.map((item, index) => ({
        id: String(item.id), no: (offset - 1) * 100 + index + 1, mfgCode: item.mfg_code,
        groupType: item.group_type, sku: item.sku, lab: item.lab,
        outward: item.outward ?? "",
        hold: item.hold === 1 || item.hold === true || item.hold === "1",
        certificate: item.report_no, shape: item.shape, polishPcs: item.polish_pcs,
        polishCarat: item.polish_carat,
        memoCarat: Number(item.memo_carat) || 0,
        memoItems: (item.memo_items || []).map((memoItem) => ({
          id: memoItem.id,
          sku: memoItem.sku,
          polishCarat: memoItem.polish_carat,
          polishPcs: memoItem.polish_pcs,
          outward: memoItem.outward,
          price: memoItem.price,
          amount: memoItem.amount,
          entryno: memoItem.entryno,
          invoiceno: memoItem.invoiceno,
          reference: memoItem.reference,
          memoDate: memoItem.memo_date,
          outwardId: memoItem.outward_id,
          partyName: memoItem.party_name,
        })),
        memoHistory: (item.memo_history || []).map((historyItem) => ({
          id: historyItem.id,
          productId: historyItem.product_id,
          sku: historyItem.sku,
          action: historyItem.action,
          description: historyItem.description,
          date: historyItem.date,
          carat: historyItem.carat,
          pcs: historyItem.pcs,
          amount: historyItem.amount,
          price: historyItem.price,
          invoice: historyItem.invoice,
          type: historyItem.type,
          narration: historyItem.narration,
          partyName: historyItem.party_name,
        })),
        mainClarity: item.in_house_clarity,
        clarity: item.clarity,
        argyleColor: item.argyle_color,
        rapPrice: item.rap_price,
        cost: item.cost,
        price: item.price,
        amount: item.amount,
        size: item.size,
        fluorescence: item.f_intensity,
        cut: item.cut,
        polish: item.polish,
        symmetry: item.symmentry,
        table: item.table_pc,
        depth: item.depth_pc,
        measurement: item.mesurment,
        girdle: item.gridle,
        mining: item.mining,
        origin: item.origin,
        intensity: item.intensity,
        overTone: item.overtone,
        color: item.color,
        location: item.location,
        package: item.package,
        bgm: item.bgm,
        eyeClean: item.eyeclean,
        group: item.main_group,
        subGroup: item.sub_group,
        remark: item.remark,
        rapnetUpload: item.rapnet_upload,
        siteUpload: item.site_upload,
      }));
      setTableData(prev => {
        const existingIds = new Set(prev.map(d => d.id));
        const newItems = mapped.filter(d => !existingIds.has(d.id));
        return offset === 1 ? mapped : [...prev, ...newItems];
      });
    } else if (offset === 1 && !isInventoryFetching && !isLoading) {
      setTableData([]);
    }
    setIsFetching(false);
  }, [productData, offset, isInventoryFetching, isLoading]);

  useEffect(() => {
    const scrollContainer = tableRef.current?.querySelector('.ant-table-body') || tableRef.current;
    if (!scrollContainer) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
          if (scrollTop + clientHeight >= scrollHeight - 50 && !isFetching && tableData.length < (productData?.TotalData?.TotalItems || Infinity)) {
            setIsFetching(true);
            setOffset(prev => prev + 1);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, [tableData, isFetching, productData]);

  const handleOpenSkuModal = useCallback((record) => {
    setModalConfig({ visible: true, data: record });
  }, []);

  const columns = useMemo(() => [
    {
      title: <SelectAllCheckbox />,
      key: "selection_custom",
      dataIndex: "id",
      width: 36,
      align: "center",
      fixed: "left",
      className: "ant-table-selection-column",
      shouldCellUpdate: () => true,
      render: (id) => <SelectionCheckbox id={String(id)} />,
    },
    { title: "No", key: "no", dataIndex: "no", width: 52, align: "center", fixed: "left", shouldCellUpdate: () => false },
    { title: "Type", key: "groupType", dataIndex: "groupType", width: 96, align: "center", ellipsis: true, fixed: "left", shouldCellUpdate: () => false },
    {
      title: "SKU", key: "sku", dataIndex: "sku", width: 102, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      render: (text, record) => (
        <a
          className="inventory-sku-link"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenSkuModal(record);
          }}
        >
          {text}
        </a>
      ),
    },
    {
      title: "Lab", key: "lab", dataIndex: "lab", width: 58, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'GIA', value: 'gia' }, { text: 'IGI', value: 'IGI' },
        { text: 'CGL', value: 'CGL' }, { text: 'AGT', value: 'AGT' },
      ],
      onFilter: (value, record) => record.lab === value,
      render: (lab) => {
        const colorMap = { GIA: "blue", gia: "blue", IGI: "green", CGL: "orange", AGT: "purple" };
        return <Tag color={colorMap[lab] || "default"} className="inventory-lab-tag">{lab}</Tag>;
      }
    },
    {
      title: "Cert #", key: "certificate", dataIndex: "certificate", width: 118, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      render: (text) => text ? (
        <a href={`https://www.gia.edu/report-check?reportno=${text}`} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : null
    },
    {
      title: "Shape", key: "shape", dataIndex: "shape", width: 84, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'Round', value: 'Round' }, { text: 'Cushion', value: 'Cushion' },
        { text: 'Oval', value: 'Oval' }, { text: 'Heart', value: 'Heart' },
        { text: 'Marquise', value: 'Marquise' }, { text: 'Emerald', value: 'Emerald' },
        { text: 'Radiant', value: 'Radiant' }, { text: 'Pear', value: 'Pear' },
        { text: 'Rose', value: 'Rose' }, { text: 'Princess', value: 'Princess' },
        { text: 'Other', value: 'Other' },
      ],
      onFilter: (value, record) => record.shape === value,
    },
    { title: "PCS", key: "polishPcs", dataIndex: "polishPcs", width: 84, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    {
      title: "Crt.",
      key: "polishCarat",
      dataIndex: "polishCarat",
      width: 72,
      align: "right",
      shouldCellUpdate: () => false,
      sorter: (a, b) => (Number(a.polishCarat) || 0) - (Number(b.polishCarat) || 0),
      render: (value, record) => (
        <InventoryCaratCell
          polishCarat={value}
          memoCarat={record.memoCarat}
          memoItems={record.memoItems}
          memoHistory={record.memoHistory}
        />
      ),
    },
    { title: "Color", key: "color", dataIndex: "color", width: 58, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Argyle Color", key: "argyleColor", dataIndex: "argyleColor", width: 109, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "In-House Clarity", key: "mainClarity", dataIndex: "mainClarity", width: 130, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    {
      title: "Clarity", key: "clarity", dataIndex: "clarity", width: 92, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'FL', value: 'FL' }, { text: 'IF', value: 'IF' },
        { text: 'VVS1', value: 'VVS1' }, { text: 'VVS2', value: 'VVS2' },
        { text: 'VS1', value: 'VS1' }, { text: 'VS2', value: 'VS2' },
        { text: 'SI1', value: 'SI1' }, { text: 'SI2', value: 'SI2' },
        { text: 'SI3', value: 'SI3' }, { text: 'I1', value: 'I1' },
        { text: 'I2', value: 'I2' }, { text: 'I3', value: 'I3' },
      ],
      onFilter: (value, record) => record.clarity === value,
    },
    {
      title: "Rap Price",
      key: "rapPrice",
      dataIndex: "rapPrice",
      width: 92,
      align: "center",
      shouldCellUpdate: () => false,
      className: "inventory-finance-col inventory-rap-col",
      render: (v) =>
        v ? (
          <span className="inventory-finance-value inventory-rap-value">${Number(v).toLocaleString()}</span>
        ) : (
          <span className="inventory-finance-empty">-</span>
        ),
      sorter: (a, b) => (Number(a.rapPrice) || 0) - (Number(b.rapPrice) || 0),
    },
    {
      title: "Cost",
      key: "cost",
      dataIndex: "cost",
      width: 88,
      align: "center",
      shouldCellUpdate: () => false,
      className: "inventory-finance-col inventory-cost-col",
      render: (v) =>
        v ? (
          <span className="inventory-finance-value inventory-cost-value">${Number(v).toLocaleString()}</span>
        ) : (
          <span className="inventory-finance-empty">-</span>
        ),
      sorter: (a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0),
    },
    {
      title: "Price/Crt",
      key: "price",
      dataIndex: "price",
      width: 92,
      align: "center",
      shouldCellUpdate: () => false,
      className: "inventory-finance-col inventory-price-col",
      render: (v) => (
        <span className="inventory-finance-value inventory-price-value">${Number(v || 0).toLocaleString()}</span>
      ),
      sorter: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
    },
    {
      title: "Amount",
      key: "amount",
      dataIndex: "amount",
      width: 100,
      align: "right",
      shouldCellUpdate: () => false,
      className: "inventory-finance-col inventory-amount-col",
      render: (v) => (
        <span className="inventory-finance-value inventory-amount-value">${Number(v || 0).toLocaleString()}</span>
      ),
      sorter: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
    },
    { title: "Size", key: "size", dataIndex: "size", width: 68, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Flour.", key: "fluorescence", dataIndex: "fluorescence", width: 68, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Cut", key: "cut", dataIndex: "cut", width: 56, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Pol.", key: "polish", dataIndex: "polish", width: 52, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Sym.", key: "symmetry", dataIndex: "symmetry", width: 52, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Table%", key: "table", dataIndex: "table", width: 68, align: "center", shouldCellUpdate: () => false, sorter: (a, b) => (Number(a.table) || 0) - (Number(b.table) || 0) },
    { title: "Depth%", key: "depth", dataIndex: "depth", width: 68, align: "center", shouldCellUpdate: () => false, sorter: (a, b) => (Number(a.depth) || 0) - (Number(b.depth) || 0) },
    { title: "Meas.", key: "measurement", dataIndex: "measurement", width: 112, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Girdle", key: "girdle", dataIndex: "girdle", width: 76, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Mining", key: "mining", dataIndex: "mining", width: 76, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Origin", key: "origin", dataIndex: "origin", width: 76, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    {
      title: "Intensity", key: "intensity", dataIndex: "intensity", width: 98, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'Faint', value: 'Faint' }, { text: 'Very Light', value: 'Very Light' },
        { text: 'Light', value: 'Light' }, { text: 'Fancy Light', value: 'Fancy Light' },
        { text: 'Fancy', value: 'Fancy' }, { text: 'Fancy Intense', value: 'Fancy Intense' },
        { text: 'Fancy Vivid', value: 'Fancy Vivid' }, { text: 'Fancy Deep', value: 'Fancy Deep' },
        { text: 'Fancy Dark', value: 'Fancy Dark' },
      ],
      onFilter: (value, record) => record.intensity === value,
    },
    {
      title: "Overtone", key: "overTone", dataIndex: "overTone", width: 90, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'Bluish', value: 'Bluish' }, { text: 'Brownish', value: 'Brownish' },
        { text: 'Grayish', value: 'Grayish' }, { text: 'Greenish', value: 'Greenish' },
        { text: 'None', value: 'None' }, { text: 'Orangey', value: 'Orangey' },
        { text: 'Pinkish', value: 'Pinkish' }, { text: 'Purplish', value: 'Purplish' },
        { text: 'Reddish', value: 'Reddish' }, { text: 'Yellowish', value: 'Yellowish' },
      ],
      onFilter: (value, record) => record.overTone === value,
    },
    { title: "Color", key: "color", dataIndex: "color", width: 90, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Location", key: "location", dataIndex: "location", width: 112, ellipsis: true, render: renderLocationWithFlag, align: "center", shouldCellUpdate: () => false },
    {
      title: "Package", key: "package", dataIndex: "package", width: 88, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'SB', value: 'SB' }, { text: 'BAGS', value: 'BAGS' },
        { text: 'JEWEL', value: 'JEWEL' }, { text: 'BIG SB', value: 'BIG SB' },
        { text: 'BRC', value: 'BRC' }, { text: 'SMALL BRC', value: 'SMALL BRC' },
        { text: 'BOX', value: 'BOX' }, { text: 'BAGS S BOX', value: 'BAGS S BOX' },
      ],
      onFilter: (value, record) => record.package === value,
    },
    { title: "BGM", key: "bgm", dataIndex: "bgm", width: 56, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    { title: "Eye Clean", key: "eyeClean", dataIndex: "eyeClean", width: 86, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    {
      title: "Main Group", key: "group", dataIndex: "group", width: 114, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      filters: [
        { text: 'A+', value: 'A+' }, { text: 'BA', value: 'BA' },
        { text: 'YELLOW', value: 'YELLOW' }, { text: 'PINK', value: 'PINK' },
        { text: 'LC', value: 'LC' }, { text: 'DC', value: 'DC' },
        { text: 'B-E', value: 'B-E' }, { text: 'ROUGH DIA.', value: 'ROUGH DIA.' },
        { text: 'GH', value: 'GH' },
      ],
      onFilter: (value, record) => record.group === value,
    },
    { title: "Sub Group", key: "subGroup", dataIndex: "subGroup", width: 96, ellipsis: true, align: "center", shouldCellUpdate: () => false },
    {
      title: "Remark", key: "remark", dataIndex: "remark", width: 200, ellipsis: true, align: "center", shouldCellUpdate: () => false,
      render: (t) => <div className="inventory-remark-cell">{t}</div>
    },
  ], [handleOpenSkuModal]);

  const ACTION_KEY_MAP = {
    onMemo: "memo",
    sale: "sell",
    export: "export",
  };

  const openBulkActionModal = (key) => {
    const mapped = ACTION_KEY_MAP[key] || key;
    if (mapped === "reset" || key === "reset") {
      setSelectedRowKeys([]);
      return;
    }
    if (key === "onMemo" || mapped === "memo") {
      if (selectedRowKeys.length === 0) {
        message.warning("Please select at least one diamond");
        return;
      }
      setMemoModalOpen(true);
      return;
    }
    if (key === "consignment" || key === "consign") {
      if (selectedRowKeys.length === 0) {
        message.warning("Please select at least one diamond");
        return;
      }
      setConsignModalOpen(true);
      return;
    }
    if (key === "reservation") {
      if (selectedRowKeys.length === 0) {
        message.warning("Please select at least one diamond");
        return;
      }
      setReservationModalOpen(true);
      return;
    }
    if (key === "sale" || mapped === "sell" || key === "sell") {
      if (selectedRowKeys.length === 0) {
        message.warning("Please select at least one diamond");
        return;
      }
      const nonMemoRows = selectedRows.filter(
        (row) => String(row?.outward || "").toLowerCase() !== "memo",
      );
      if (nonMemoRows.length) {
        message.warning("Sale is allowed only for memo diamonds");
        return;
      }
      setSellModalOpen(true);
      return;
    }
    if (key === "hold" || key === "unHold") {
      handleHoldAction(key, selectedRowKeys);
      return;
    }
    if (key === "addPackage") {
      if (selectedRowKeys.length === 0) {
        message.warning("Please select at least one diamond");
        return;
      }
      setPackageModalOpen(true);
      return;
    }
    setBulkActionModal({ open: true, actionKey: mapped });
  };

  const closeBulkActionModal = () => {
    setBulkActionModal({ open: false, actionKey: null });
  };

  const handleBulkActionSubmit = async (values, actionKey) => {
    const key = actionKey || bulkActionModal.actionKey;
    if (key === "hold" || key === "unHold") {
      await submitHoldModal(values, key);
      return;
    }
    if (key === "export") {
      const ok = await submitExport(selectedRowKeys, values);
      if (!ok) return;
    } else if (key === "changePrice") {
      const ok = await submitChangePrice(selectedRowKeys, values);
      if (!ok) return;
    } else if (key === "labelA4") {
      const diaPair = resolveDiaPair({ appliedFilters });
      const ok = await printLabelA4(selectedRowKeys, values, { diaPair });
      if (!ok) return;
    } else if (key === "label") {
      const diaPair = resolveDiaPair({ appliedFilters });
      const ok = await printLabel(selectedRowKeys, values, { diaPair });
      if (!ok) return;
    } else if (key === "iExport") {
      const ok = await submitIExport(selectedRowKeys, values);
      if (!ok) return;
    } else if (key === "mail") {
      const ok = await submitMail(selectedRowKeys, values);
      if (!ok) return;
    } else if (key === "consignment") {
      if (selectedRowKeys.length === 0) return;
      setConsignModalOpen(true);
      closeBulkActionModal();
      return;
    } else {
      message.info(`${key} flow submitted (${selectedRowKeys.length} selected)`);
    }
    closeBulkActionModal();
  };

  const DOWNLOAD_EXCEL_PRESETS = {
    export: { fileName: "Stock_List", sheetName: "Stock List", mode: "export" },
    iExport: { fileName: "Import_Format", mode: "iExport" },
    sell: { fileName: "Sell_Diamond", sheetName: "Sell Diamond", mode: "export" },
    memo: { fileName: "Memo_Diamond", sheetName: "Memo Diamond", mode: "export" },
    consignment: { fileName: "Consignment_Diamond", sheetName: "Consignment", mode: "export" },
  };

  const handleDownloadMenuClick = async ({ key }) => {
    if (!selectedRowKeys.length) {
      message.warning("Please select at least one diamond");
      return;
    }

    const preset = DOWNLOAD_EXCEL_PRESETS[key];
    if (!preset) return;

    if (preset.mode === "iExport") {
      await submitIExport(selectedRowKeys, { fileName: preset.fileName, format: "xlsx" });
      return;
    }

    await submitExport(selectedRowKeys, {
      fileName: preset.fileName,
      sheetName: preset.sheetName,
    });
  };

  const menuItems = [
    { key: "export", label: "Export Excel", icon: <DownloadOutlined /> },
    { key: "iExport", label: "I.Export Excel", icon: <DownloadOutlined /> },
    { key: "sell", label: "Sell Diamond Excel", icon: <DownloadOutlined /> },
    { key: "memo", label: "Memo Diamond Excel", icon: <DownloadOutlined /> },
    { key: "consignment", label: "Consignment Excel", icon: <DownloadOutlined /> },
  ];

  const handleInventoryPanelAction = (key) => {
    openBulkActionModal(key);
  };

  const applyInventoryFilters = (overrides = {}) => {
    const compactValues = filterForm.getFieldsValue();
    let advancedValues = advancedFilterForm.getFieldsValue();

    if (overrides.advancedValues) {
      advancedValues = { ...advancedValues, ...overrides.advancedValues };
      advancedFilterForm.setFieldsValue(overrides.advancedValues);
    }

    const nextSearchText =
      overrides.searchText !== undefined ? overrides.searchText : searchText;
    const nextCaratFrom =
      overrides.caratFrom !== undefined ? overrides.caratFrom : caratFrom;
    const nextCaratTo =
      overrides.caratTo !== undefined ? overrides.caratTo : caratTo;

    if (overrides.searchText !== undefined) setSearchText(overrides.searchText);
    if (overrides.caratFrom !== undefined) setCaratFrom(overrides.caratFrom);
    if (overrides.caratTo !== undefined) setCaratTo(overrides.caratTo);

    const nextFilters = buildInventoryApiFilters({
      compactValues,
      advancedValues,
      searchText: nextSearchText,
      caratFrom: nextCaratFrom,
      caratTo: nextCaratTo,
    });

    setOffset(1);
    setIsFetching(false);
    setAppliedFilters(nextFilters);
    setSelectedRowKeys([]);
  };

  const handleSearchSuggestionSelect = (suggestion) => {
    const { type, value } = suggestion;

    switch (type) {
      case "shape":
        applyInventoryFilters({
          searchText: "",
          advancedValues: { shape: value },
        });
        break;
      case "carat": {
        const caratStr = String(value);
        applyInventoryFilters({
          searchText: "",
          caratFrom: caratStr,
          caratTo: caratStr,
        });
        break;
      }
      default:
        applyInventoryFilters({ searchText: value });
        break;
    }
  };

  useEffect(() => {
    const suggestion = location.state?.inventorySmartFilter;
    if (!suggestion?.type) return;

    handleSearchSuggestionSelect(suggestion);
    window.history.replaceState({}, document.title, window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when navigated from header search
  }, [location.state?.inventorySmartFilter]);

  const resetInventoryFilters = () => {
    filterForm.resetFields();
    advancedFilterForm.resetFields();
    setSearchText("");
    setCaratFrom("");
    setCaratTo("");
    setOffset(1);
    setIsFetching(false);
    setAppliedFilters({});
    setSelectedRowKeys([]);
  };

  const filteredTableData = tableData;
  const tableDataById = useMemo(
    () => new Map(tableData.map((row) => [String(row.id), row])),
    [tableData],
  );
  const selectedRows = useMemo(() => {
    if (!selectedRowKeys.length) return EMPTY_ARRAY;
    return selectedRowKeys.map((id) => tableDataById.get(String(id))).filter(Boolean);
  }, [selectedRowKeys, tableDataById]);

  const showTotalStats = useMemo(() => {
    const computed = computeSelectedStockCalculationStats(tableData);
    const td = productData?.TotalData;
    return {
      totalPcs: td?.TotalItems ?? computed.totalPcs,
      totalCts:
        td?.TotalCarat != null
          ? Number(td.TotalCarat).toFixed(2)
          : computed.totalCts,
      askRate: computed.askRate,
      askAmt:
        td?.TotalAmount != null
          ? Number(td.TotalAmount).toFixed(2)
          : computed.askAmt,
    };
  }, [tableData, productData]);

  const selectedStats = useMemo(
    () => computeSelectedStockCalculationStats(selectedRows),
    [selectedRows],
  );

  const totalItemsDisplay =
    productData?.TotalData?.TotalItems?.toLocaleString() ??
    tableData.length.toLocaleString();

  const openStoneDetailModal = useCallback((record, event) => {
    const target = event?.target;
    if (!target) return;
    if (typeof target.closest === "function") {
      if (target.closest(".ant-table-selection-column, .ant-checkbox-wrapper, .ant-checkbox, input[type='checkbox']")) {
        return;
      }
      const ignoreClick = target.closest(
        "a, button, input, textarea, label, .ant-btn, .ant-dropdown-trigger, .inventory-memo-carat, .inventory-carat-cell--has-memo, .memo-carat-popover, .memo-carat-popover-overlay, .ant-popover",
      );
      if (ignoreClick) return;
    }
    setStoneDetailModal({ open: true, data: record });
  }, []);

  const handleOnRow = useCallback((record) => ({
    onClick: (event) => openStoneDetailModal(record, event),
  }), [openStoneDetailModal]);

  const tableComponents = useMemo(() => ({
    body: {
      row: MemoizedInventoryRow,
    },
  }), []);

  const renderTableFooter = useCallback(() => (
    <InventoryTableFooter showTotalStats={showTotalStats} selectedStats={selectedStats} />
  ), [showTotalStats, selectedStats]);

  const tableScroll = useMemo(
    () => ({ x: "max-content", y: tableHeight }),
    [tableHeight]
  );

  const selectionContextValue = useMemo(() => ({
    selectedRowKeysSet,
    handleToggleRowSelection,
    isAllSelected,
    isIndeterminate,
    handleSelectAllToggle,
  }), [selectedRowKeysSet, handleToggleRowSelection, isAllSelected, isIndeterminate, handleSelectAllToggle]);

  const handleOpenCompareModal = useCallback(() => setCompareModalOpen(true), []);

  return (
    <SelectionContext.Provider value={selectionContextValue}>
      <div ref={pageRef} className="inventory-page-wrapper page-shell">
        <div className="inventory-filter-wrapper">
          <InventoryFilterPanel
            totalLabel={
              <>
                Total: <b>{totalItemsDisplay}</b>
              </>
            }
            searchSlot={
              <InventorySmartSearch
                className="search-input"
                value={searchText}
                onChange={setSearchText}
                onSearch={applyInventoryFilters}
                onSuggestionSelect={handleSearchSuggestionSelect}
                placeholder="SKU · Mfg · Report No (comma for multiple)"
              />
            }
            compactFilters={
              <InventoryCompactFilterRow
                form={filterForm}
                fields={compactFilterFields}
                caratFrom={caratFrom}
                caratTo={caratTo}
                onCaratFromChange={setCaratFrom}
                onCaratToChange={setCaratTo}
                onSearch={applyInventoryFilters}
              />
            }
            headerActionsLeft={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Button size="small" type="primary" onClick={applyInventoryFilters}>
                  Apply
                </Button>
                <Button size="small" onClick={resetInventoryFilters}>
                  Reset
                </Button>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={isLoading || isInventoryFetching}
                  onClick={async () => {
                    setOffset(1);
                    if (offset === 1) {
                      await refetchInventory();
                    } else {
                      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
                    }
                    queryClient.invalidateQueries({ queryKey: ["myInventorySummary"] });
                  }}
                >
                  Refresh
                </Button>
                {/* <Button
                  size="small"
                  icon={<Sparkles size={14} />}
                  onClick={runStockAlert}
                  loading={aiAlertLoading}
                >
                  AI Alert Check
                </Button> */}
              </span>
            }
            headerActions={
              <InventoryHeaderActions
                selectedCount={selectedRowKeys.length}
                onAction={handleInventoryPanelAction}
                menuItems={menuItems}
                handleDownloadMenuClick={handleDownloadMenuClick}
                exportLoading={exportLoading}
                iExportLoading={iExportLoading}
              />
            }
            advancedFilters={
              <Form form={advancedFilterForm} layout="vertical" component={false}>
                <InventoryFilterPresets
                  pageKey="my-inventory"
                  compactForm={filterForm}
                  advancedForm={advancedFilterForm}
                  onApply={applyInventoryFilters}
                />
                <InventoryFilterGroups
                  groups={INVENTORY_FILTER_GROUPS}
                  allFields={filterFields}
                />
              </Form>
            }
          />
          <InventorySummaryToolbar totals={summaryTotals}>
            <InventoryQuickLinksWrapper
              selectedRows={selectedRows}
              selectedCount={selectedRowKeys.length}
              onCompare={handleOpenCompareModal}
              onRefreshRapnet={handleRefreshRapnetFlags}
              onWebsiteSync={handleWebsiteSync}
              syncLoading={syncLoading}
            />
          </InventorySummaryToolbar>
          <AIResultPanel
            title="AI Stock Alerts"
            loading={aiAlertLoading}
            result={aiAlertResult}
            error={aiAlertError}
            open={aiPanelOpen}
            onOpenChange={setAiPanelOpen}
          />
        </div>

        <div
          ref={tableRef}
          className="erp-table-container"
          style={{ height: tableHeight, overflowY: 'hidden', overflowX: 'hidden' }}
        >
          <Table
            className="diamond-inventory-table"
            columns={columns}
            dataSource={filteredTableData}
            rowKey={getRowKey}
            size="small"
            tableLayout="fixed"
            rowClassName={getInventoryRowClass}
            onRow={handleOnRow}
            loading={isFetching || isLoading}
            pagination={false}
            bordered
            scroll={tableScroll}
            components={tableComponents}
            locale={TABLE_LOCALE}
            footer={renderTableFooter}
          />
        </div>

        <SkuActionModal
          visible={modalConfig.visible}
          skuData={modalConfig.data}
          onClose={() => setModalConfig({ visible: false, data: null })}
          onAction={handleSkuAction}
        />

        <InventoryStoneDetailModal
          open={stoneDetailModal.open}
          stone={stoneDetailModal.data}
          onClose={() => setStoneDetailModal({ open: false, data: null })}
        />

        <InventoryBulkActionModal
          open={bulkActionModal.open || holdActionState.open}
          actionKey={
            holdActionState.open ? holdActionState.actionKey : bulkActionModal.actionKey
          }
          selectedCount={
            holdActionState.open
              ? (holdActionState.selectedIds?.length ?? 0)
              : selectedRowKeys.length
          }
          loading={
            holdLoading ||
            changePriceLoading ||
            labelA4Loading ||
            labelLoading ||
            iExportLoading ||
            exportLoading ||
            mailLoading
          }
          onClose={() => {
            if (holdActionState.open) closeHoldModal();
            else closeBulkActionModal();
          }}
          onSubmit={handleBulkActionSubmit}
        />

        <OnMemoModal
          open={memoModalOpen}
          onClose={() => setMemoModalOpen(false)}
          selectedRows={memoModalOpen ? selectedRows : EMPTY_ARRAY}
          actionType="memo"
          onSubmit={handleMemoSubmit}
        />

        <OnMemoModal
          open={sellModalOpen}
          onClose={() => setSellModalOpen(false)}
          selectedRows={sellModalOpen ? selectedRows : EMPTY_ARRAY}
          actionType="sell"
          onSubmit={handleSaleSubmit}
        />

        <OnMemoModal
          open={consignModalOpen}
          onClose={() => setConsignModalOpen(false)}
          selectedRows={consignModalOpen ? selectedRows : EMPTY_ARRAY}
          actionType="consign"
          onSubmit={handleConsignSubmit}
        />

        <InventoryCompareModal
          open={compareModalOpen}
          rows={compareModalOpen ? selectedRows : EMPTY_ARRAY}
          onClose={() => setCompareModalOpen(false)}
        />

        <ReservationModal
          open={reservationModalOpen}
          selectedIds={reservationModalOpen ? selectedRowKeys : EMPTY_ARRAY}
          onClose={() => setReservationModalOpen(false)}
          onSuccess={() => {
            setSelectedRowKeys([]);
            queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
          }}
        />

        <AddToPackageModal
          open={packageModalOpen}
          onClose={() => setPackageModalOpen(false)}
          productIds={packageModalOpen ? selectedRowKeys : EMPTY_ARRAY}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
            setSelectedRowKeys([]);
          }}
        />

        <StoneActionSuccessModal
          isOpen={successModal.open}
          onClose={() => setSuccessModal((s) => ({ ...s, open: false }))}
          actionType={successModal.actionType}
          stone={successModal.stone}
          count={successModal.count}
        />
      </div>
    </SelectionContext.Provider>
  );
};

export default DiamondInventoryTable;