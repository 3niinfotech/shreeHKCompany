import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button, Typography, Tag, Spin } from "antd";
import {
  DatabaseOutlined,
  HistoryOutlined,
  EditOutlined,
  SwapOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { api } from "../api/axiosInstance";
import { ENDPOINTS } from "../constants/endpoints";
import {
  buildStoneHistoryUrl,
  buildTransferHistoryUrl,
} from "../utils/inventorySkuNavigation";
import "../assets/scss/hooks/useSkuModal.scss";

const { Text } = Typography;

const SkuModalContext = createContext(null);

export const SkuActionModal = ({ visible, skuData, onClose, onAction }) => {
  const navigate = useNavigate();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);

  const sku = skuData?.sku;

  useEffect(() => {
    if (!visible || !sku) {
      setApiData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .get(ENDPOINTS.report.stoneDetail, { params: { sku } })
      .then((res) => {
        if (isMounted && res?.data) {
          setApiData(res.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching stone details for SKU modal:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, sku]);

  if (!skuData) return null;

  const detail = apiData?.detail || {};

  const rawStatus =
    typeof apiData?.status === "string"
      ? apiData.status
      : detail?.outward
      ? String(detail.outward).toUpperCase()
      : skuData?.outward
      ? String(skuData.outward).toUpperCase()
      : skuData?.status
      ? String(skuData.status).toUpperCase()
      : "AVAILABLE";

  const actualStatus = rawStatus && rawStatus.trim() ? rawStatus.toUpperCase() : "AVAILABLE";

  const getStatusTagColor = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "AVAILABLE") return "green";
    if (s === "MEMO") return "orange";
    if (s === "SALE" || s === "EXPORT") return "red";
    if (s === "CONSIGN" || s === "CONSIGNMENT") return "purple";
    if (s === "LAB") return "cyan";
    if (s === "HOLD") return "volcano";
    return "blue";
  };

  const carat =
    detail?.polish_carat ??
    detail?.carat ??
    skuData?.polish_carat ??
    skuData?.carat ??
    skuData?.polishCarat ??
    skuData?.Pcarat ??
    "—";

  const color =
    detail?.main_color ??
    detail?.color ??
    skuData?.main_color ??
    skuData?.color ??
    skuData?.mainColor ??
    "—";

  const fluro =
    detail?.f_intensity ??
    detail?.fluro ??
    detail?.fluor_intensity ??
    detail?.fluorescence ??
    skuData?.f_intensity ??
    skuData?.fluro ??
    skuData?.fluor_intensity ??
    skuData?.fluorescence ??
    skuData?.fluro_intensity ??
    "—";

  const clarity = detail?.clarity ?? skuData?.clarity ?? "—";

  const lab = detail?.lab ?? skuData?.lab ?? "—";

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
          color={getStatusTagColor(actualStatus)}
          style={{ borderRadius: "4px", fontWeight: "bold", marginTop: "6px" }}
        >
          {loading ? <Spin size="small" /> : actualStatus}
        </Tag>
      </div>

      <div className="sku-action-modal__body">
        <div className="sku-details-grid">
          <div className="sku-detail-item">
            <span className="sku-detail-label">Carat</span>
            <span className="sku-detail-value">
              {loading ? <Spin size="small" /> : carat}
            </span>
          </div>
          <div className="sku-detail-item">
            <span className="sku-detail-label">Color</span>
            <span className="sku-detail-value">
              {loading ? <Spin size="small" /> : color}
            </span>
          </div>
          <div className="sku-detail-item">
            <span className="sku-detail-label">Fluro</span>
            <span className="sku-detail-value">
              {loading ? <Spin size="small" /> : fluro}
            </span>
          </div>
          <div className="sku-detail-item">
            <span className="sku-detail-label">Status</span>
            <span className="sku-detail-value">
              {loading ? (
                <Spin size="small" />
              ) : (
                <Tag
                  color={getStatusTagColor(actualStatus)}
                  style={{ margin: 0, fontWeight: 600 }}
                >
                  {actualStatus}
                </Tag>
              )}
            </span>
          </div>
          <div className="sku-detail-item">
            <span className="sku-detail-label">Clarity</span>
            <span className="sku-detail-value">
              {loading ? <Spin size="small" /> : clarity}
            </span>
          </div>
          <div className="sku-detail-item">
            <span className="sku-detail-label">Lab</span>
            <span className="sku-detail-value">
              {loading ? <Spin size="small" /> : lab}
            </span>
          </div>
        </div>

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
