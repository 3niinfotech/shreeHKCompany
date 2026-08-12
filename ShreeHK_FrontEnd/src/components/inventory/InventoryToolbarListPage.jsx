import React, { useMemo } from "react";
import { Button, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
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
import MasterTableTemplate from "../../pages/inventory/MasterTableTemplate";
import InventoryPageToolbar from "./InventoryPageToolbar";
import InventoryBulkActionModal from "./InventoryBulkActionModal";
import { SkuLink } from "../../hooks/useSkuModalAction";
import useInventoryToolbarPage from "../../hooks/useInventoryToolbarPage";
import { cssVar } from "../../theme";
import "../../assets/scss/pages/inventory/onHand_module.scss";

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

const SYNC_COLUMNS = [
  {
    title: "RapNet",
    dataIndex: "rapnetUpload",
    key: "rapnetUpload",
    width: 72,
    render: (v) => (Number(v) === 1 ? "Yes" : "No"),
  },
  {
    title: "Website",
    dataIndex: "siteUpload",
    key: "siteUpload",
    width: 72,
    render: (v) => (Number(v) === 1 ? "Yes" : "No"),
  },
];

/**
 * Inventory list with standard toolbar (hold, label, export, stone detail).
 */
const InventoryToolbarListPage = ({
  title,
  queryKey,
  baseFilters = {},
  mapRow,
  columns: baseColumns,
  searchPlaceholder = "Search...",
  showSyncColumns = true,
  showStatsBar = false,
  extraToolbarActions = null,
  footerExtras = null,
  useFilterForm = true,
  onSelectedRowsChange,
}) => {
  const toolbar = useInventoryToolbarPage({
    queryKey,
    baseFilters,
    mapRow,
    useFilterForm,
  });

  const columns = useMemo(() => {
    const skuColIndex = baseColumns.findIndex((c) => c.dataIndex === "sku" || c.key === "sku");
    const mapped = baseColumns.map((col, idx) => {
      if (idx !== skuColIndex && col.dataIndex !== "sku") return col;
      return {
        ...col,
        render: (text, record) => <SkuLink sku={text} record={record} />,
      };
    });
    if (!showSyncColumns) return mapped;
    const hasSync = mapped.some((c) => c.key === "rapnetUpload");
    return hasSync ? mapped : [...mapped, ...SYNC_COLUMNS];
  }, [baseColumns, showSyncColumns]);

  return (
    <>
      <div className="inventory-page-toolbar-wrap">
        <InventoryPageToolbar
          tableCount={toolbar.totalItems || toolbar.tableData.length}
          activeType={toolbar.activeType}
          setActiveType={toolbar.setActiveType}
          filterForm={toolbar.filterForm}
          renderFilters={toolbar.renderFilters}
          onReset={toolbar.handleReset}
          labelButton={LABEL_BUTTON}
          typeButtons={TYPE_BUTTONS}
          actionButtons={ACTION_BUTTONS}
          onTypeAction={toolbar.onTypeAction}
          onLabelClick={toolbar.handleLabelClick}
          onToolbarAction={toolbar.handleToolbarAction}
          extraToolbarActions={(
            <>
              <Button icon={<ReloadOutlined />} onClick={() => toolbar.refresh?.()} loading={toolbar.isLoading || toolbar.isFetchingMore}>
                Refresh
              </Button>
              {extraToolbarActions}
            </>
          )}
        />
      </div>
      {footerExtras}
      <InventoryBulkActionModal
        open={toolbar.hold.holdModal.open}
        actionKey={toolbar.hold.holdModal.actionKey}
        selectedCount={toolbar.hold.holdModal.selectedIds?.length ?? 0}
        loading={toolbar.hold.holdLoading}
        onClose={toolbar.hold.closeHoldModal}
        onSubmit={toolbar.hold.submitHoldModal}
      />
      <InventoryBulkActionModal
        open={toolbar.bulkActionModal.open}
        actionKey={toolbar.bulkActionModal.actionKey}
        selectedCount={toolbar.selectedRowKeys.length}
        loading={
          toolbar.changePrice.changePriceLoading ||
          toolbar.mail.mailLoading ||
          toolbar.exportAction.exportLoading
        }
        onClose={() => toolbar.setBulkActionModal({ open: false, actionKey: null })}
        onSubmit={toolbar.handleBulkActionSubmit}
      />
      <MasterTableTemplate
        title={title}
        columns={columns}
        dataSource={toolbar.tableData}
        rowKey="id"
        searchPlaceholder={searchPlaceholder}
        searchValue={toolbar.searchText}
        onSearchChange={toolbar.setSearchText}
        loading={toolbar.isLoading || toolbar.isFetchingMore}
        tableWrapRef={toolbar.tableWrapRef}
        totalCount={toolbar.totalItems || toolbar.tableData.length}
        showStatsBar={showStatsBar}
        showTotalItemsFooter={false}
        showActionsColumn={false}
        enableRowSelectionFooter
        onSelectedRowsChange={(rows, keys) => {
          toolbar.setSelectedRowKeys(keys || []);
          onSelectedRowsChange?.(rows, keys);
        }}
        totalsKeys={{ pcs: "pcs", carat: "carat", amount: "amount" }}
        renderFooterTotalsInTable
        showButton={false}
      />
    </>
  );
};

export default InventoryToolbarListPage;
