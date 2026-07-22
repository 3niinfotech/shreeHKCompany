import React, { useEffect, useRef, useState } from "react";
import { Layout, Modal } from "antd";
import TopbarSearch from "../sub_component/TopBarSearch";
import ProfileDropdown from "../sub_component/ProfileDropdown";
import NotificationDropdown from "../sub_component/NotificationDropdown";
import NavBar from "./NavBar";
import SkuActionModal from "../../hooks/useSkuModalAction";
import styles from "../../assets/scss/layout/header.module.scss";
import { Link, useNavigate } from "react-router-dom";
import { Gem, Menu, Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

const { Header: AntHeader } = Layout;

const HEALTH_DEDUPE_MS = 1500;
let healthInFlight = false;
let lastHealthCheckAt = 0;

const ConnectionStatusPill = ({ isOnline }) => (
  <div
    className={`${styles.connectionStatus} ${isOnline ? styles.online : styles.offline}`}
    title={isOnline ? "Internet and server connected" : "Internet or server unavailable"}
    role="status"
    aria-live="polite"
    aria-label={isOnline ? "Connection status: online" : "Connection status: offline"}
  >
    <span className={styles.statusIndicator} aria-hidden="true">
      <span className={styles.statusPulseRing} />
      <span className={styles.statusPulseRing} />
      <span className={styles.statusDot} />
    </span>
    <span className={styles.statusLabel}>{isOnline ? "Online" : "Offline"}</span>
  </div>
);

const NetworkStatusModal = ({ open, type, onRetry, onDismiss, autoCloseMs }) => {
  const isOnline = type === "online";

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      centered
      mask={{ closable: false }}
      width={440}
      classNames={{ root: styles.networkModalRoot }}
      destroyOnHidden
    >
      <div className={`${styles.networkModalBody} ${isOnline ? styles.online : styles.offline}`}>
        <div className={styles.networkModalHero}>
          <div className={styles.networkModalIconWrap} aria-hidden="true">
            <span className={styles.networkModalPulse} />
            <span className={styles.networkModalPulse} />
            <div className={styles.networkModalIcon}>
              {isOnline ? <CheckCircle2 size={38} strokeWidth={2.2} /> : <WifiOff size={38} strokeWidth={2.2} />}
            </div>
          </div>
          <span className={styles.networkModalBadge}>
            {isOnline ? "Connection Restored" : "No Connection"}
          </span>
        </div>

        <div className={styles.networkModalContent}>
          <div className={styles.networkModalTitle}>
            {isOnline ? "You're Back Online" : "You are Offline"}
          </div>
          <div className={styles.networkModalSubTitle}>
            {isOnline
              ? "Internet connection restored. Your session is active and data will sync normally."
              : "We can't reach the server right now. Check your network or VPN, then try again."}
          </div>

          {!isOnline && (
            <ul className={styles.networkModalTips}>
              <li>Verify Wi‑Fi or mobile data is enabled</li>
              <li>Confirm the backend server is running</li>
              <li>Wait a moment — we'll retry automatically</li>
            </ul>
          )}

          {isOnline && autoCloseMs > 0 && (
            <div className={styles.networkModalProgressTrack} aria-hidden="true">
              <span
                className={styles.networkModalProgressBar}
                style={{ animationDuration: `${autoCloseMs}ms` }}
              />
            </div>
          )}

          <div className={styles.networkModalActions}>
            {!isOnline && (
              <>
                <button type="button" className={styles.networkModalBtnPrimary} onClick={onRetry}>
                  <RefreshCw size={16} />
                  Retry Connection
                </button>
                {/* <button type="button" className={styles.networkModalBtnGhost} onClick={onDismiss}>
                  Dismiss
                </button> */}
              </>
            )}
            {isOnline && (
              <button type="button" className={styles.networkModalBtnPrimary} onClick={onDismiss}>
                <Wifi size={16} />
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const Header = ({
  handleLeftMenuCallBack,
  hideLogo = false,
  hideNavBar = false,
  showMenuToggle = false,
  onMenuToggle,
}) => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [modalConfig, setModalConfig] = useState({ visible: false, data: null });
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [statusModal, setStatusModal] = useState({ open: false, type: "offline" });
  const RECONNECT_AUTO_CLOSE_MS = 2500;
  const previousOnlineRef = useRef(navigator.onLine);
  const offlineTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const checkServerHealth = async () => {
    if (!navigator.onLine) {
      setIsServerOnline(false);
      return;
    }

    const now = Date.now();
    if (healthInFlight || now - lastHealthCheckAt < HEALTH_DEDUPE_MS) {
      return;
    }

    healthInFlight = true;
    lastHealthCheckAt = now;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch("/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      setIsServerOnline(res.ok);
    } catch {
      setIsServerOnline(false);
    } finally {
      clearTimeout(timeout);
      healthInFlight = false;
    }
  };

  useEffect(() => {
    const markOnline = () => {
      setIsBrowserOnline(true);
      checkServerHealth();
    };
    const markOffline = () => {
      setIsBrowserOnline(false);
      setIsServerOnline(false);
    };

    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);

    checkServerHealth();
    const intervalId = setInterval(checkServerHealth, 20000);

    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isOnline = isBrowserOnline && isServerOnline;

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;

    if (!isOnline) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (!offlineTimerRef.current) {
        offlineTimerRef.current = setTimeout(() => {
          setStatusModal({ open: true, type: "offline" });
          offlineTimerRef.current = null;
        }, 3000);
      }
    } else {
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      if (!wasOnline) {
        setStatusModal({ open: true, type: "online" });
        reconnectTimerRef.current = setTimeout(() => {
          setStatusModal((prev) => ({ ...prev, open: false }));
          reconnectTimerRef.current = null;
        }, RECONNECT_AUTO_CLOSE_MS);
      } else {
        setStatusModal((prev) => ({ ...prev, open: false }));
      }
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(
    () => () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    },
    []
  );

  const handleSkuSearch = (sku) => {
    setModalConfig({ visible: true, data: { sku } });
  };

  const handleInventoryFilterFromSearch = (suggestion) => {
    navigate("/inventory/my-inventory", {
      state: { inventorySmartFilter: suggestion },
    });
  };

  const handleSkuAction = () => {
    setModalConfig({ visible: false, data: null });
  };

  const handleMenuToggle = () => {
    if (typeof onMenuToggle === "function") {
      onMenuToggle();
      return;
    }
    if (typeof handleLeftMenuCallBack === "function") {
      handleLeftMenuCallBack();
    }
  };

  return (
    <div className={styles.headerStyle}>
      <AntHeader
        className={`${styles.appHeader} ${hideLogo ? styles.appHeaderCompact : ""}`}
      >
        <div className={styles.headerLeft}>
          {showMenuToggle && (
            <button
              type="button"
              className={styles.menuToggle}
              onClick={handleMenuToggle}
              aria-label="Toggle sidebar"
            >
              <Menu size={22} strokeWidth={2} />
            </button>
          )}

          {!hideLogo && (
            <Link to="/" className={styles.logoLink}>
              <span className={styles.logoIcon}>
                <Gem size={20} strokeWidth={2.2} />
              </span>
              <span className={styles.logoText}>Smart DIA</span>
            </Link>
          )}

          <div className={styles.headerSearch}>
            <TopbarSearch
              inputRef={searchInputRef}
              onSkuSearch={handleSkuSearch}
              onInventoryFilter={handleInventoryFilterFromSearch}
            />
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* <ConnectionStatusPill isOnline={isOnline} /> */}
          <NotificationDropdown
            buttonClassName={styles.notificationBtn}
            badgeClassName={styles.notificationBadge}
          />
          <ProfileDropdown />
        </div>
      </AntHeader>
      {!hideNavBar && <NavBar />}

      <SkuActionModal
        visible={modalConfig.visible}
        skuData={modalConfig.data}
        onClose={() => setModalConfig({ visible: false, data: null })}
        onAction={handleSkuAction}
      />

      <NetworkStatusModal
        open={statusModal.open}
        type={statusModal.type}
        autoCloseMs={statusModal.type === "online" ? RECONNECT_AUTO_CLOSE_MS : 0}
        onRetry={() => {
          checkServerHealth();
        }}
        onDismiss={() => setStatusModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default Header;
