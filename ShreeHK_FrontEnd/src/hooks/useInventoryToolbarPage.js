import { useState, useCallback } from "react";
import { toastWarning } from "../utils/toastNotify";
import useFiltersFormFields from "./useFiltersFormFields";
import useInventoryList from "./useInventoryList";
import useInventoryHoldActions from "./useInventoryHoldActions";
import useInventoryChangePriceActions from "./useInventoryChangePriceActions";
import useInventoryLabelActions from "./useInventoryLabelActions";
import useInventoryIExportActions from "./useInventoryIExportActions";
import useInventoryExportActions from "./useInventoryExportActions";
import useInventoryMailActions from "./useInventoryMailActions";
import { resolveDiaPair } from "../utils/resolveDiaPair";

const DEFAULT_FILTER_FIELDS = ["stockChecks", "fwRadio"];

const DEFAULT_FILTER_CONFIG = {
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

/**
 * Shared inventory list + toolbar bulk actions (On Hand / Barcode / Box / Parcel / Pair).
 */
export default function useInventoryToolbarPage({
  queryKey,
  baseFilters = {},
  mapRow,
  filterFields = DEFAULT_FILTER_FIELDS,
  filterConfig = DEFAULT_FILTER_CONFIG,
  useFilterForm = true,
  onRefreshSuccess,
} = {}) {
  const [activeType, setActiveType] = useState("label");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionModal, setBulkActionModal] = useState({ open: false, actionKey: null });
  const [searchText, setSearchText] = useState("");
  const [stoneDetailModal, setStoneDetailModal] = useState({ open: false, data: null });

  const filterHook = useFiltersFormFields(filterFields, filterConfig);
  const filterForm = useFilterForm ? filterHook.form : null;

  const list = useInventoryList({
    queryKey,
    baseFilters,
    filterForm: useFilterForm ? filterForm : undefined,
    searchText,
    mapRow,
  });

  const afterSuccess = useCallback(() => {
    setSelectedRowKeys([]);
    list.refresh();
    onRefreshSuccess?.();
  }, [list, onRefreshSuccess]);

  const hold = useInventoryHoldActions({ onSuccess: afterSuccess });
  const changePrice = useInventoryChangePriceActions({ onSuccess: afterSuccess });
  const label = useInventoryLabelActions();
  const iExport = useInventoryIExportActions();
  const exportAction = useInventoryExportActions({ onSuccess: afterSuccess });
  const mail = useInventoryMailActions({ onSuccess: afterSuccess });

  const onTypeAction = useCallback(
    (key) => {
      const normalizedKey = key === "unhold" ? "unHold" : key;
      if (normalizedKey === "changePrice") {
        if (!selectedRowKeys.length) {
          toastWarning("Please select at least one item");
          return true;
        }
        setBulkActionModal({ open: true, actionKey: "changePrice" });
        return true;
      }
      return hold.handleHoldAction(normalizedKey, selectedRowKeys);
    },
    [hold, selectedRowKeys],
  );

  const handleBulkActionSubmit = useCallback(
    async (values, actionKey) => {
      const key = actionKey || bulkActionModal.actionKey;
      if (key === "changePrice") {
        const ok = await changePrice.submitChangePrice(selectedRowKeys, values);
        if (ok) setBulkActionModal({ open: false, actionKey: null });
        return;
      }
      if (key === "mail") {
        const ok = await mail.submitMail(selectedRowKeys, values);
        if (ok) setBulkActionModal({ open: false, actionKey: null });
      }
    },
    [bulkActionModal.actionKey, changePrice, mail, selectedRowKeys],
  );

  const handleReset = useCallback(() => {
    setActiveType("label");
    setSearchText("");
    if (useFilterForm) filterHook.handleClear();
    list.refresh();
  }, [filterHook, list, useFilterForm]);

  const handleLabelClick = useCallback(() => {
    if (!selectedRowKeys.length) {
      toastWarning("Please Select Item");
      return true;
    }
    const stockChecks = filterForm?.getFieldValue("stockChecks") || [];
    label.printLabel(selectedRowKeys, { copies: 1 }, { diaPair: resolveDiaPair({ stockChecks }) });
    return true;
  }, [filterForm, label, selectedRowKeys]);

  const handleToolbarAction = useCallback(
    (key) => {
      if (!selectedRowKeys.length) {
        toastWarning("Please Select Item");
        return;
      }
      if (key === "export") {
        exportAction.submitExport(selectedRowKeys, {
          fileName: "Defult_Stock_List",
          sheetName: "Stock List",
        });
        return;
      }
      if (key === "iExport") {
        iExport.submitIExport(selectedRowKeys, { fileName: "Import_Format", format: "xlsx" });
        return;
      }
      if (key === "mail") {
        setBulkActionModal({ open: true, actionKey: "mail" });
      }
    },
    [exportAction, iExport, selectedRowKeys],
  );

  const openStoneDetail = useCallback((record) => {
    setStoneDetailModal({ open: true, data: record });
  }, []);

  return {
    activeType,
    setActiveType,
    selectedRowKeys,
    setSelectedRowKeys,
    bulkActionModal,
    setBulkActionModal,
    searchText,
    setSearchText,
    stoneDetailModal,
    setStoneDetailModal,
    openStoneDetail,
    filterForm,
    renderFilters: useFilterForm ? filterHook.renderFilters : null,
    ...list,
    hold,
    changePrice,
    exportAction,
    mail,
    onTypeAction,
    handleBulkActionSubmit,
    handleReset,
    handleLabelClick,
    handleToolbarAction,
  };
}
