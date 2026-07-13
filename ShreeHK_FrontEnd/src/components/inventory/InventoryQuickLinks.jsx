import React from "react";
import { Space, Button, Dropdown } from "antd";
import { Link } from "react-router-dom";
import {
  HistoryOutlined,
  EditOutlined,
  CloudSyncOutlined,
  BarChartOutlined,
  SwapOutlined,
  DiffOutlined,
  ScanOutlined,
} from "@ant-design/icons";
import {
  buildStoneHistoryUrl,
  buildStoneUpdateUrl,
  buildTransferHistoryUrl,
} from "../../utils/inventorySkuNavigation";
import { openLegacyPdf } from "../../utils/legacyPrint";

/**
 * Quick navigation from My Inventory to related ERP modules.
 */
const InventoryQuickLinks = ({
  selectedSku,
  selectedCount = 0,
  onCompare,
  onRefreshRapnet,
  onWebsiteSync,
  syncLoading = false,
}) => {
  const sku = selectedSku?.trim();

  const reportMenu = {
    items: [
      {
        key: "stone-history",
        label: sku ? (
          <Link to={buildStoneHistoryUrl(sku)}>Stone History — {sku}</Link>
        ) : (
          <Link to="/report/stone-history">Stone History</Link>
        ),
      },
      {
        key: "transfer-history",
        label: sku ? (
          <Link to={buildTransferHistoryUrl(sku)}>Transfer History — {sku}</Link>
        ) : (
          <Link to="/report/stone-tranfer-history">Transfer History</Link>
        ),
      },
      { key: "group-report", label: <Link to="/report/group-report">Group Report</Link> },
    ],
  };

  return (
    <Space wrap size={8} className="inventory-quick-links">
      {sku ? (
        <Button size="small" icon={<EditOutlined />}>
          <Link to={buildStoneUpdateUrl(sku)}>Stone Update</Link>
        </Button>
      ) : null}
      <Button size="small" icon={<HistoryOutlined />}>
        <Link to={sku ? buildStoneHistoryUrl(sku) : "/report/stone-history"}>
          History
        </Link>
      </Button>
      <Dropdown menu={reportMenu} trigger={["click"]}>
        <Button size="small" icon={<BarChartOutlined />}>Reports</Button>
      </Dropdown>
      <Button size="small" icon={<SwapOutlined />}>
        <Link to={sku ? buildTransferHistoryUrl(sku) : "/report/stone-tranfer-history"}>
          Transfer
        </Link>
      </Button>
      <Button size="small" icon={<DiffOutlined />} disabled={selectedCount < 2} onClick={onCompare}>
        Compare ({selectedCount})
      </Button>
      <Button size="small">
        <Link to="/master/bulk-update">Bulk Update</Link>
      </Button>
      <Button size="small">
        <Link to="/master/rapnet-pricelist">RapNet</Link>
      </Button>
      <Button
        size="small"
        icon={<CloudSyncOutlined />}
        loading={syncLoading}
        onClick={onRefreshRapnet}
      >
        Refresh RapNet Flags
      </Button>
      <Button size="small" loading={syncLoading} onClick={onWebsiteSync}>
        Mark Website Sync
      </Button>
      <Button size="small" icon={<ScanOutlined />}>
        <Link to="/inventory/cycle-count">Cycle Count</Link>
      </Button>
      {sku ? (
        <Button
          size="small"
          onClick={() => openLegacyPdf("print/stone-label.php", { sku })}
        >
          Print Label (Legacy)
        </Button>
      ) : null}
    </Space>
  );
};

export default InventoryQuickLinks;
