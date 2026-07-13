import { useMemo } from "react";
import dayjs from "dayjs";
import {
  ArrowDown,
  ArrowUp,
  Diamond,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";
import useUIStore from "../../store/Ui.Store";
import useRapaportLive from "../../hooks/useRapaportLive";
import RapaportLiveChart from "./RapaportLiveChart";
import styles from "../../assets/scss/components/rapaport/rapaportPanel.module.scss";

const INTERVALS = ["1H", "4H", "1D", "1W", "1M"];

const formatPrice = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const FloatingRapaportPanel = () => {
  const panelOpen = useUIStore((s) => s.rapaportPanelOpen);
  const panelExpanded = useUIStore((s) => s.rapaportPanelExpanded);
  const interval = useUIStore((s) => s.rapaportInterval);
  const toggleRapaportPanel = useUIStore((s) => s.toggleRapaportPanel);
  const toggleRapaportPanelExpanded = useUIStore((s) => s.toggleRapaportPanelExpanded);
  const setRapaportInterval = useUIStore((s) => s.setRapaportInterval);

  const { live, history, isFetching, refreshAll } = useRapaportLive();

  const status = live?.status || "WAITING";
  const isWaiting = status === "WAITING" || live?.price == null;
  const changePct = live?.changePct ?? 0;
  const isUp = Number(changePct) >= 0;

  const statusClass = useMemo(() => {
    if (status === "LIVE") return styles.liveRow;
    if (status === "STALE") return `${styles.liveRow} ${styles.liveRowStale}`;
    return `${styles.liveRow} ${styles.liveRowWaiting}`;
  }, [status]);

  const statusLabel = status === "LIVE" ? "LIVE" : status === "STALE" ? "STALE" : "WAITING";

  const lastSync = live?.lastUpdated
    ? dayjs(live.lastUpdated).format("DD MMM YYYY, HH:mm:ss")
    : "—";

  const benchmarkLabel = live?.benchmark
    ? `${live.benchmark.shape || "—"} · ${live.benchmark.color || "—"} · ${live.benchmark.clarity || "—"}`
    : "Round · D · VS1";

  return (
    <div className={styles.root} aria-live="polite">
      {!panelOpen ? (
        <button
          type="button"
          className={styles.tab}
          onClick={toggleRapaportPanel}
          aria-label="Open Rapaport Live panel"
          title="Rapaport Live"
        >
          <Diamond size={18} strokeWidth={1.75} />
          <span className={styles.tabLabel}>RAP LIVE</span>
        </button>
      ) : null}

      <aside
        className={`${styles.panel} ${panelOpen ? styles.panelOpen : ""} ${
          panelExpanded ? styles.panelExpanded : ""
        }`}
        aria-hidden={!panelOpen}
      >
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.titleBlock}>
              <h3 className={styles.title}>Rapaport Live</h3>
              <p className={styles.subtitle}>Benchmark · {benchmarkLabel}</p>
              <span className={statusClass}>
                <span className={styles.liveDot} />
                {statusLabel}
              </span>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => refreshAll()}
                aria-label="Refresh Rapaport data"
                title="Refresh"
              >
                <RefreshCw size={16} className={isFetching ? "spin" : ""} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={toggleRapaportPanelExpanded}
                aria-label={panelExpanded ? "Collapse panel" : "Expand panel"}
                title={panelExpanded ? "Collapse" : "Expand"}
              >
                {panelExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={toggleRapaportPanel}
                aria-label="Close Rapaport panel"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {isWaiting ? (
            <div className={styles.waiting}>Waiting for Live Rapaport Data...</div>
          ) : (
            <>
              <div className={styles.priceHero}>
                <div className={styles.priceValue}>{formatPrice(live.price)}</div>
                <div className={`${styles.changeRow} ${isUp ? styles.changeUp : styles.changeDown}`}>
                  {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  <span>{formatPct(changePct)}</span>
                  <span style={{ opacity: 0.7, fontWeight: 500 }}>Rap % / Discount</span>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Daily High</span>
                  <span className={styles.metaValue}>{formatPrice(live.dailyHigh)}</span>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Daily Low</span>
                  <span className={styles.metaValue}>{formatPrice(live.dailyLow)}</span>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Premium / Discount</span>
                  <span className={styles.metaValue}>{formatPct(live.premiumDiscount)}</span>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Volume</span>
                  <span className={styles.metaValue}>—</span>
                </div>
              </div>

              <div className={styles.chartSection}>
                <div className={styles.intervalRow}>
                  {INTERVALS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.intervalBtn} ${
                        interval === key ? styles.intervalBtnActive : ""
                      }`}
                      onClick={() => setRapaportInterval(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <RapaportLiveChart
                  points={history?.points || []}
                  changePct={changePct}
                  height={panelExpanded ? 300 : 260}
                  dailyHigh={live.dailyHigh}
                  dailyLow={live.dailyLow}
                />
              </div>

              <div className={styles.indicators}>
                <div className={styles.indicator}>
                  <ArrowUp size={12} color="#00b386" />
                  <span>High {formatPrice(live.dailyHigh)}</span>
                </div>
                <div className={styles.indicator}>
                  <ArrowDown size={12} color="#eb4d5c" />
                  <span>Low {formatPrice(live.dailyLow)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className={styles.footer}>
          <span>Last Sync: {lastSync}</span>
          <span>
            Connection: {live?.connectionStatus === "connected" ? "Connected" : "Disconnected"}
          </span>
          <span className={styles.footerBrand}>Powered by Rapaport</span>
        </footer>
      </aside>
    </div>
  );
};

export default FloatingRapaportPanel;
