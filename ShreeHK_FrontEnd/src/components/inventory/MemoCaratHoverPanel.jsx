import React from "react";
import { Typography } from "antd";
import { FileTextOutlined, HistoryOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const fmtCarat = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (value) => {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  return raw || "—";
};

const fmtAction = (action) => {
  if (!action) return "—";
  return String(action).replace(/_/g, " ").toUpperCase();
};

const buildOutwardInvoiceUrl = ({ invoiceno, type = "memo" }) => {
  const params = new URLSearchParams();
  if (invoiceno) params.set("invoiceno", String(invoiceno));
  if (type) params.set("type", String(type));
  return `/outward?${params.toString()}`;
};

const stopRowClick = (event) => {
  event.stopPropagation();
};

const MemoCaratHoverPanel = ({ items = [], history = [], totalCarat = 0 }) => {
  const navigate = useNavigate();

  const goToInvoice = (event, { invoiceno, type }) => {
    event.preventDefault();
    event.stopPropagation();
    if (!invoiceno) return;
    navigate(buildOutwardInvoiceUrl({ invoiceno, type }));
  };

  if (!items.length && !history.length) {
    return (
      <div
        className="memo-carat-popover"
        onClick={stopRowClick}
        onMouseDown={stopRowClick}
      >
        <Text type="secondary">No memo details found.</Text>
      </div>
    );
  }

  return (
    <div
      className="memo-carat-popover"
      onClick={stopRowClick}
      onMouseDown={stopRowClick}
    >
      <div className="memo-carat-popover__header">
        <div className="memo-carat-popover__title-wrap">
          <FileTextOutlined className="memo-carat-popover__icon" />
          <span className="memo-carat-popover__title">On Memo Details</span>
        </div>
        <span className="memo-carat-popover__total">{fmtCarat(totalCarat)} ct</span>
      </div>

      {items.length > 0 ? (
        <>
          <div className="memo-carat-popover__table-head">
            <span>SKU</span>
            <span>Carat</span>
            <span>Party</span>
            <span>Invoice</span>
          </div>

          <div className="memo-carat-popover__list">
            {items.map((item) => (
              <div key={item.id} className="memo-carat-popover__row">
                <span className="memo-carat-popover__sku" title={item.sku}>
                  {item.sku || "—"}
                </span>
                <span className="memo-carat-popover__carat">{fmtCarat(item.polishCarat)}</span>
                <span className="memo-carat-popover__party" title={item.partyName}>
                  {item.partyName || "—"}
                </span>
                <span className="memo-carat-popover__invoice">
                  {item.invoiceno ? (
                    <button
                      type="button"
                      className="memo-carat-popover__invoice-link"
                      title="Open memo invoice"
                      onClick={(event) =>
                        goToInvoice(event, {
                          invoiceno: item.invoiceno,
                          type: item.outward || "memo",
                        })
                      }
                    >
                      {item.invoiceno}
                    </button>
                  ) : (
                    <span>—</span>
                  )}
                  {item.memoDate ? <small>{fmtDate(item.memoDate)}</small> : null}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {history.length > 0 ? (
        <div className="memo-carat-popover__history">
          <div className="memo-carat-popover__history-head">
            <HistoryOutlined />
            <span>History</span>
          </div>
          <div className="memo-carat-popover__history-list">
            {history.map((entry) => (
              <div key={entry.id} className="memo-carat-popover__history-row">
                <div className="memo-carat-popover__history-meta">
                  <span className="memo-carat-popover__history-date">{fmtDate(entry.date)}</span>
                  <span className={`memo-carat-popover__history-action memo-carat-popover__history-action--${entry.action || "default"}`}>
                    {fmtAction(entry.action)}
                  </span>
                  {entry.type ? (
                    <span className={`memo-carat-popover__history-type memo-carat-popover__history-type--${entry.type}`}>
                      {String(entry.type).toUpperCase()}
                    </span>
                  ) : null}
                </div>
                <div className="memo-carat-popover__history-body">
                  <span className="memo-carat-popover__history-sku" title={entry.sku}>
                    {entry.sku || "—"}
                  </span>
                  <span className="memo-carat-popover__history-desc" title={entry.description}>
                    {entry.description || entry.narration || "—"}
                  </span>
                </div>
                <div className="memo-carat-popover__history-stats">
                  <span>{fmtCarat(entry.carat)} ct</span>
                  {entry.invoice ? (
                    <button
                      type="button"
                      className="memo-carat-popover__invoice-link"
                      title="Open invoice"
                      onClick={(event) =>
                        goToInvoice(event, {
                          invoiceno: entry.invoice,
                          type: entry.action === "consign" ? "consign" : "memo",
                        })
                      }
                    >
                      Inv: {entry.invoice}
                    </button>
                  ) : null}
                  {entry.partyName ? <span>{entry.partyName}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MemoCaratHoverPanel;
