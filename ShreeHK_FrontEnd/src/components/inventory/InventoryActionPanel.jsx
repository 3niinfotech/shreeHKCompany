import React, { useCallback, useMemo } from "react";
import { Popover, Badge } from "antd";
import {
  Undo2,
  ShoppingCart,
  Printer,
  Tag,
  Lock,
  Unlock,
  BadgeDollarSign,
  FileSpreadsheet,
  Download,
  Mail,
  RefreshCcw,
  ChevronDown,
  Sparkles,
  Package,
  FlaskConical,
  Send,
} from "lucide-react";
import styles from "../../assets/scss/components/inventoryFilterPanel.module.scss";
import useThemeColors from "../../hooks/useThemeColors";

/** Display order: 2-column grid, Reset full width at bottom */
export const INVENTORY_ACTION_ITEMS = [
  { key: "onMemo", label: "On Memo", variant: "onMemo", icon: Undo2 },
  { key: "consignment", label: "Consignment", variant: "consignment", icon: Undo2 },
  { key: "unHold", label: "Un Hold", variant: "unHold", icon: Unlock },
  { key: "sale", label: "Sale", variant: "sale", icon: ShoppingCart },
  { key: "lab", label: "LAB", variant: "lab", icon: FlaskConical },
  { key: "toExport", label: "To Export", variant: "toExport", icon: Send },
  { key: "changePrice", label: "Change Price", variant: "changePrice", icon: BadgeDollarSign },
  { key: "labelA4", label: "Label A4", variant: "labelA4", icon: Printer },
  { key: "iExport", label: "I.Export", variant: "iExport", icon: FileSpreadsheet },
  { key: "label", label: "Label", variant: "label", icon: Tag },
  { key: "export", label: "Export", variant: "export", icon: Download },
  { key: "hold", label: "Hold", variant: "hold", icon: Lock },
  { key: "mail", label: "Mail", variant: "mail", icon: Mail },
  { key: "addPackage", label: "Add Package", variant: "addPackage", icon: Package },
  { key: "reservation", label: "Reserve", variant: "hold", icon: Lock },
  { key: "reset", label: "Reset", variant: "reset", icon: RefreshCcw, fullWidth: true },
];

/**
 * Premium expanded action panel — UI only.
 * Parent supplies onAction(key); selection count controls visibility.
 */
const InventoryActionPanel = ({
  selectedCount = 0,
  onAction,
  triggerLabel = "Actions",
}) => {
  const theme = useThemeColors();
  const [open, setOpen] = React.useState(false);
  const hasSelection = selectedCount > 0;

  const handleClick = useCallback((key) => {
    setOpen(false);
    onAction?.(key);
  }, [onAction]);

  const panelContent = useMemo(() => (
    <div className={styles.actionPanelBody}>
      <div className={styles.actionPanelHeader}>
        <Sparkles size={14} />
        <span>Bulk actions</span>
        <Badge count={selectedCount} showZero color={theme.info} />
      </div>
      <div className={styles.actionPanelGrid}>
        {INVENTORY_ACTION_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`${styles.actionTile} ${styles[`actionTile_${item.variant}`]} ${
                item.fullWidth ? styles.actionTileFull : ""
              }`}
              onClick={() => handleClick(item.key)}
            >
              <span className={styles.actionTileIcon}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className={styles.actionTileLabel}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ), [handleClick, selectedCount, theme.info]);

  return (
    <div className={styles.actionPanelWrap}>
      <Popover
        content={panelContent}
        title={null}
        open={open}
        onOpenChange={(newOpen) => {
          setOpen(newOpen);
        }}
        trigger="click"
        placement="bottomRight"
        overlayClassName={styles.actionPanelOverlay}
        arrow={{ pointAtCenter: true }}
      >
        <button
          type="button"
          className={`${styles.actionPanelTrigger} ${styles.actionPanelTriggerActive}`}
          disabled={false}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span className={styles.actionPanelTriggerText}>
            {triggerLabel}
          </span>
          <ChevronDown
            size={16}
            className={`${styles.actionPanelChevron} ${open ? styles.actionPanelChevronOpen : ""}`}
          />
        </button>
      </Popover>
    </div>
  );
};

export default React.memo(InventoryActionPanel);

