import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  Package,
  History,
  PenSquare,
  ArrowLeftRight,
  MapPin,
} from "lucide-react";
import { api } from "../api/client/axiosInstance";
import { ENDPOINTS } from "../api/endpoints";
import {
  buildStoneHistoryUrl,
  buildTransferHistoryUrl,
} from "../utils/inventorySkuNavigation";
import { renderLocationWithFlag } from "../components/inventory/LocationWithFlag";
import "../assets/scss/hooks/useSkuModal.scss";

const pickDetail = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return v;
    }
  }
  return null;
};

const formatPrice = (value) => {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
};

const statusPillClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "AVAILABLE") return "available";
  if (s === "SALE" || s === "EXPORT" || s === "SOLD") return "sale";
  if (s === "HOLD" || s === "ON HOLD") return "hold";
  if (s === "MEMO" || s === "ON MEMO") return "memo";
  if (s === "LAB") return "lab";
  if (s === "CONSIGN" || s === "CONSIGNMENT") return "consign";
  if (s === "NOT FOUND" || s === "NOT_FOUND" || s === "NOT AVAILABLE") return "notfound";
  return "default";
};

const SkuModalContext = createContext(null);
const stoneDetailCache = new Map();

export const SkuActionModal = ({ visible, skuData, onClose, onAction }) => {
  const navigate = useNavigate();
  const sku = skuData?.sku;
  const companyId =
    skuData?.company ?? skuData?.company_id ?? skuData?.companyId;

  const [apiData, setApiData] = useState(() => {
    return sku && stoneDetailCache.has(sku) ? stoneDetailCache.get(sku) : null;
  });

  useEffect(() => {
    if (!visible || !sku) {
      setApiData(null);
      return;
    }

    if (stoneDetailCache.has(sku)) {
      setApiData(stoneDetailCache.get(sku));
    }

    let isMounted = true;

    const params = { sku };
    if (companyId != null && companyId !== "" && Number(companyId) > 0) {
      params.companyId = companyId;
    }

    api
      .get(ENDPOINTS.report.stoneDetail, { params })
      .then((res) => {
        if (isMounted && res?.data) {
          stoneDetailCache.set(sku, res.data);
          if (res.data.detail) {
            setApiData(res.data);
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching stone details for SKU modal:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, sku, companyId]);

  if (!skuData) return null;

  const detail = apiData?.detail || null;
  const isNotFound = Boolean(apiData?.notFound && !skuData?.id && !skuData?.polish_carat && !skuData?.carat);

  const actualStatus = (() => {
    // 1. If backend returned stone detail
    if (detail) {
      if (detail.hold === 1 || detail.hold === "1" || detail.hold === true) {
        return "ON HOLD";
      }
      if (typeof apiData?.status === "string" && apiData.status.trim()) {
        return apiData.status.trim().toUpperCase();
      }
      if (detail.outward) {
        return String(detail.outward).trim().toUpperCase();
      }
      return "AVAILABLE";
    }

    // 2. If stone record was already passed from table row selection
    if (skuData?.id || skuData?.polish_carat || skuData?.carat || skuData?.outward || skuData?.status) {
      if (skuData?.hold === 1 || skuData?.hold === "1" || skuData?.hold === true) {
        return "ON HOLD";
      }
      if (skuData?.outward) {
        return String(skuData.outward).trim().toUpperCase();
      }
      if (skuData?.status) {
        return String(skuData.status).trim().toUpperCase();
      }
      return "AVAILABLE";
    }

    return "AVAILABLE";
  })();

  const statusClass = statusPillClass(actualStatus);

  const d = detail;
  const s = skuData;

  const rawPrice = pickDetail(d?.price, s?.price);
  const formattedPrice = formatPrice(rawPrice);

  const detailRows = [
    {
      label: "Carat",
      value: pickDetail(
        d?.polish_carat,
        d?.carat,
        s?.polish_carat,
        s?.carat,
        s?.polishCarat,
      ),
      highlight: true,
    },
    {
      label: "Color",
      value: pickDetail(d?.main_color, d?.color, s?.main_color, s?.color, s?.mainColor),
    },
    {
      label: "Clarity",
      value: pickDetail(d?.clarity, s?.clarity),
    },
    {
      label: "Fluro",
      value: pickDetail(
        d?.f_intensity,
        d?.fluro,
        d?.fluor_intensity,
        d?.fluorescence,
        s?.f_intensity,
        s?.fluro,
        s?.fluorescence,
      ),
    },
    {
      label: "Lab",
      value: pickDetail(d?.lab, s?.lab),
    },
    {
      label: "Price",
      value: formattedPrice ?? rawPrice,
      highlight: true,
    },
    {
      label: "Cut",
      value: pickDetail(d?.cut, s?.cut),
    },
    {
      label: "Polish",
      value: pickDetail(d?.polish, s?.polish),
    },
    {
      label: "Symmetry",
      value: pickDetail(d?.symmentry, d?.symmetry, s?.symmentry, s?.symmetry),
    },
    {
      label: "Shape",
      value: pickDetail(d?.shape, s?.shape),
    },
    {
      label: "Overtone",
      value: pickDetail(d?.overtone, s?.overtone),
    },
    {
      label: "Intensity",
      value: pickDetail(d?.intensity, s?.intensity),
    },
    {
      label: "Location",
      value: pickDetail(d?.location, d?.loc, s?.location, s?.loc),
      isLocation: true,
      fullWidth: true,
    },
  ];

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
        `${item.redirect}${separator}skuupdate=${encodeURIComponent(skuData.sku)}`,
      );
      return;
    }
    if (item.key === "history") {
      onClose();
      navigate(
        buildStoneHistoryUrl(
          skuData.sku,
          skuData.company ?? skuData.company_id ?? skuData.companyId,
        ),
      );
      return;
    }
    if (item.key === "transfer") {
      onClose();
      navigate(buildTransferHistoryUrl(skuData.sku));
      return;
    }
    onAction?.(item.key, skuData);
  };

  const isEmptyValue = (value) => value == null || value === "";

  const renderFieldValue = (row) => {
    if (isEmptyValue(row.value)) {
      return <span className="sku-detail-value--muted">—</span>;
    }
    if (row.isLocation) {
      return renderLocationWithFlag(row.value);
    }
    return row.value;
  };

  const highlightRows = detailRows.filter((r) => r.highlight && !r.fullWidth);
  const gridRows = detailRows.filter(
    (r) => !r.fullWidth && !r.highlight && !isEmptyValue(r.value),
  );
  const locationRow = detailRows.find((r) => r.label === "Location");
  const hasLocation = locationRow && !isEmptyValue(locationRow.value);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      closable={false}
      maskClosable={false}
      mask={{ closable: false }}
      keyboard
      className="sku-action-modal"
      wrapClassName="sku-action-modal-wrap"
      destroyOnClose
      transitionName=""
      maskTransitionName=""
    >
      <div className="sku-action-modal__shell">
        <header className="sku-action-modal__header">
          <div className="sku-action-modal__identity">
            <div className="sku-action-modal__titleRow">
              <h2 className="sku-title">{skuData.sku}</h2>
            </div>
          </div>
        </header>

        <div className="sku-action-modal__body">
          {highlightRows.length > 0 && (
            <section className="sku-action-modal__metrics" aria-label="Key metrics">
              {highlightRows.map((row) => (
                <div key={`metric-${row.label}`} className="sku-metric">
                  <span className="sku-metric__label">{row.label}</span>
                  <span className="sku-metric__value">{renderFieldValue(row)}</span>
                </div>
              ))}
            </section>
          )}

          <section className="sku-action-modal__detailsPanel" aria-label="Stone details">
            <div className="sku-action-modal__detailsHead">
              <p className="sku-action-modal__sectionLabel">Specifications</p>
              <span className={`sku-status-badge sku-status-badge--${statusClass}`}>
                {actualStatus}
              </span>
            </div>
            {gridRows.length > 0 ? (
              <ul className="sku-spec-sheet">
                {gridRows.map((row) => (
                  <li key={row.label} className="sku-spec-sheet__row">
                    <span className="sku-spec-sheet__label">{row.label}</span>
                    <span className="sku-spec-sheet__value">{renderFieldValue(row)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="sku-spec-sheet__empty"
                style={isNotFound ? { color: "#dc2626", fontWeight: 600 } : undefined}
              >
                {isNotFound ? "Stone not found in system" : "No graded specs available"}
              </p>
            )}

            {hasLocation && (
              <div className="sku-meta-strip sku-meta-strip--single">
                <div className="sku-meta-card">
                  <span className="sku-meta-card__icon" aria-hidden>
                    <MapPin size={15} strokeWidth={2.25} />
                  </span>
                  <div className="sku-meta-card__text">
                    <span className="sku-meta-card__label">Location</span>
                    <span className="sku-meta-card__value sku-meta-card__value--loc">
                      {renderFieldValue(locationRow)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="sku-action-modal__actions" aria-label="Quick actions">
            <p className="sku-action-modal__actionsLabel">Quick actions</p>
            <div className="sku-action-modal__grid">
              {actionCards.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`sku-action-modal__card sku-action-modal__card--${item.accent}`}
                    onClick={() => handleCardClick(item)}
                  >
                    <span className={`sku-action-icon sku-action-icon--${item.accent}`}>
                      <Icon size={18} strokeWidth={2.25} />
                    </span>
                    <span className="sku-action-modal__cardLabel">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="sku-action-modal__footer">
          <Button
            type="text"
            icon={<CloseOutlined />}
            className="sku-action-modal__cancelBtn"
            onClick={onClose}
          >
            Close
          </Button>
        </footer>
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
