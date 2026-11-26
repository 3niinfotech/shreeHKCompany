import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Popover } from "antd";
import {
  Package,
  History,
  PenSquare,
  ArrowLeftRight,
} from "lucide-react";
import {
  buildStoneHistoryUrl,
  buildTransferHistoryUrl,
} from "../utils/inventorySkuNavigation";
import "../assets/scss/hooks/useSkuModal.scss";

const SkuModalContext = createContext(null);

export const SkuActionPopoverContent = ({ skuData, onClose, onAction, onMouseEnter, onMouseLeave }) => {
  const navigate = useNavigate();
  const sku = skuData?.sku || "";

  const actionCards = [
    {
      key: "inventory",
      label: "Inventory",
      Icon: Package,
      accent: "indigo",
      redirect: "/inventory/my-inventory",
    },
    { key: "history", label: "History", Icon: History, accent: "amber" },
    {
      key: "update",
      label: "Update Stock",
      Icon: PenSquare,
      accent: "emerald",
      redirect: "/transaction/stone-update",
    },
    {
      key: "transfer",
      label: "Inter Transfer",
      Icon: ArrowLeftRight,
      accent: "violet",
    },
  ];

  const handleCardClick = (item) => {
    onClose?.();
    if (item.key === "inventory") {
      navigate("/inventory/my-inventory", {
        state: {
          inventorySmartFilter: { type: "sku", value: sku },
        },
      });
      return;
    }
    if (item.redirect) {
      const separator = item.redirect.includes("?") ? "&" : "?";
      navigate(
        `${item.redirect}${separator}skuupdate=${encodeURIComponent(sku)}`,
      );
      return;
    }
    if (item.key === "history") {
      navigate(
        buildStoneHistoryUrl(
          sku,
          skuData?.company ?? skuData?.company_id ?? skuData?.companyId,
        ),
      );
      return;
    }
    if (item.key === "transfer") {
      navigate(buildTransferHistoryUrl(sku));
      return;
    }
    onAction?.(item.key, skuData);
  };

  return (
    <div
      className="sku-popover-box"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sku-popover-header">
        <h4 className="sku-popover-title" title={sku}>
          {sku}
        </h4>
      </div>
      <div className="sku-popover-actions">
        {actionCards.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`sku-popover-btn sku-popover-btn--${item.accent}`}
              onClick={() => handleCardClick(item)}
              title={item.label}
            >
              <span className={`sku-popover-btn__icon sku-popover-btn__icon--${item.accent}`}>
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <span className="sku-popover-btn__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const SkuActionModal = ({ visible, skuData, onClose, onAction }) => {
  if (!skuData) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={360}
      closable={false}
      maskClosable
      keyboard
      className="sku-action-compact-modal"
      destroyOnClose
    >
      <SkuActionPopoverContent
        skuData={skuData}
        onClose={onClose}
        onAction={onAction}
      />
    </Modal>
  );
};

/**
 * App-level provider: one shared SKU action modal for all tables.
 */
export const SkuModalProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [skuData, setSkuData] = useState(null);

  const openSkuModal = useCallback((recordOrSku) => {
    if (recordOrSku == null || recordOrSku === "") return;
    const data =
      typeof recordOrSku === "string" || typeof recordOrSku === "number"
        ? { sku: String(recordOrSku) }
        : { ...recordOrSku, sku: recordOrSku.sku ?? recordOrSku.SKU };
    if (!data?.sku) return;
    setSkuData(data);
    setVisible(true);
  }, []);

  const closeSkuModal = useCallback(() => {
    setVisible(false);
    setSkuData(null);
  }, []);

  const value = useMemo(
    () => ({ openSkuModal, closeSkuModal }),
    [openSkuModal, closeSkuModal],
  );

  return (
    <SkuModalContext.Provider value={value}>
      {children}
      <SkuActionModal
        visible={visible}
        skuData={skuData}
        onClose={closeSkuModal}
        onAction={closeSkuModal}
      />
    </SkuModalContext.Provider>
  );
};

export const useSkuModal = () => {
  const ctx = useContext(SkuModalContext);
  if (!ctx) {
    throw new Error("useSkuModal must be used within SkuModalProvider");
  }
  return ctx;
};

/**
 * Clickable SKU cell — bold + theme primary color; opens Tooltip/Popover directly beside the clicked SKU.
 * Auto-closes when cursor moves away from the popover/link.
 */
export const SkuLink = ({
  sku,
  record,
  children,
  className = "",
  stopPropagation = true,
}) => {
  const [open, setOpen] = useState(false);
  const closeTimerRef = React.useRef(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 250);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  const value = sku ?? record?.sku ?? record?.SKU ?? children;
  const display =
    value === null || value === undefined || value === ""
      ? ""
      : String(value);

  const skuData = useMemo(() => {
    if (!display) return null;
    if (record && typeof record === "object") {
      return { ...record, sku: display };
    }
    return { sku: display };
  }, [record, display]);

  if (!display) return "-";

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          clearCloseTimer();
        }
        setOpen(nextOpen);
      }}
      trigger="click"
      placement="right"
      destroyTooltipOnHide
      overlayClassName="sku-action-popover"
      overlayInnerStyle={{ padding: 0 }}
      content={
        <div
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <SkuActionPopoverContent
            skuData={skuData}
            onClose={() => setOpen(false)}
          />
        </div>
      }
    >
      <span
        style={{ display: "inline-block" }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={() => {
          if (open) scheduleClose();
        }}
      >
        <a
          href="#sku"
          role="button"
          className={`sku-table-link inventory-sku-link ${className}`.trim()}
          onClick={(e) => {
            if (stopPropagation) {
              e.stopPropagation();
              e.preventDefault();
            }
            clearCloseTimer();
            setOpen((prev) => !prev);
          }}
          title={display}
        >
          {children ?? display}
        </a>
      </span>
    </Popover>
  );
};

/** Drop-in Ant Design column render for SKU fields */
export const renderSkuLink = (text, record) => (
  <SkuLink sku={text} record={record} />
);

export default SkuActionModal;
