import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button, Typography, Tag } from "antd";
import {
  DatabaseOutlined,
  HistoryOutlined,
  EditOutlined,
  SwapOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  buildStoneHistoryUrl,
  buildTransferHistoryUrl,
} from "../utils/inventorySkuNavigation";
import "../assets/scss/hooks/useSkuModal.scss";

const { Text } = Typography;

const SkuModalContext = createContext(null);

export const SkuActionModal = ({ visible, skuData, onClose, onAction }) => {
  const navigate = useNavigate();

  if (!skuData) return null;

  const actionCards = [
    {
      key: "inventory",
      label: "Inventory",
      icon: <DatabaseOutlined />,
      redirect: "/inventory/my-inventory",
    },
    { key: "history", label: "History", icon: <HistoryOutlined /> },
    {
      key: "update",
      label: "Update Stock",
      icon: <EditOutlined />,
      redirect: "/transaction/stone-update",
    },
    { key: "transfer", label: "Inter Transfer", icon: <SwapOutlined /> },
  ];

  const handleCardClick = (item) => {
    if (item.key === "inventory") {
      onClose();
      navigate("/inventory/my-inventory", {
        state: {
          inventorySmartFilter: { type: "sku", value: skuData.sku },
        },
      });
      return;
    }
    if (item.redirect) {
      onClose();
      const separator = item.redirect.includes("?") ? "&" : "?";
      navigate(
        `${item.redirect}${separator}skuupdate=${encodeURIComponent(skuData.sku)}`
      );
      return;
    }
    if (item.key === "history") {
      onClose();
      navigate(buildStoneHistoryUrl(skuData.sku));
      return;
    }
    if (item.key === "transfer") {
      onClose();
      navigate(buildTransferHistoryUrl(skuData.sku));
      return;
    }
    onAction?.(item.key, skuData);
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={505}
      closable={false}
      className="sku-action-modal"
      destroyOnClose
      transitionName=""
      maskTransitionName=""
    >
      <div className="sku-action-modal__header">
        <Text
          type="secondary"
          style={{ fontSize: "12px", display: "block", marginBottom: "2px" }}
        >
          What you want to do with
        </Text>

        <div className="sku-title" style={{ margin: "0" }}>
          {skuData.sku}
        </div>

        <Tag
          color="blue"
          style={{ borderRadius: "4px", fontWeight: "bold", marginTop: "6px" }}
        >
          AVAILABLE
        </Tag>
      </div>

      <div className="sku-action-modal__body">
        <div className="sku-action-modal__grid">
          {actionCards.map((item) => (
            <div
              key={item.key}
              className="sku-action-modal__card"
              onClick={() => handleCardClick(item)}
            >
              <div className="icon-wrapper">{item.icon}</div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sku-action-modal__footer">
        <Button
          type="text"
          icon={<CloseOutlined />}
          className="cancel-btn"
          onClick={onClose}
          style={{ background: "red", color: "white" }}
        >
          Cancel & Return
        </Button>
      </div>
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
    [openSkuModal, closeSkuModal]
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
 * Clickable SKU cell — bold + theme primary color; opens SkuActionModal.
 */
export const SkuLink = ({
  sku,
  record,
  children,
  className = "",
  stopPropagation = true,
}) => {
  const ctx = useContext(SkuModalContext);
  const [localOpen, setLocalOpen] = useState(false);

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

  const handleClick = (e) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (ctx?.openSkuModal) {
      ctx.openSkuModal(skuData);
      return;
    }
    setLocalOpen(true);
  };

  return (
    <>
      <a
        href="#sku"
        role="button"
        className={`sku-table-link inventory-sku-link ${className}`.trim()}
        onClick={handleClick}
        title={display}
      >
        {children ?? display}
      </a>
      {!ctx && (
        <SkuActionModal
          visible={localOpen}
          skuData={skuData}
          onClose={() => setLocalOpen(false)}
          onAction={() => setLocalOpen(false)}
        />
      )}
    </>
  );
};

/** Drop-in Ant Design column render for SKU fields */
export const renderSkuLink = (text, record) => (
  <SkuLink sku={text} record={record} />
);

export default SkuActionModal;
