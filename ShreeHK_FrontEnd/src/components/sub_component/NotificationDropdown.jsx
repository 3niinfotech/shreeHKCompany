import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dropdown, Empty } from "antd";
import { SkeletonDropdownPanel } from "../common/skeleton";
import { Bell, CheckCheck, IndianRupee, LogIn, Package, Sparkles } from "lucide-react";
import { api } from "../../api/axiosInstance";
import { playNotificationSound } from "../../utils/soundNotify";
import styles from "../../assets/scss/components/notificationDropdown.module.scss";

const POLLING_MS = 10000;
const PAGE_SIZE = 12;

const formatNotificationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const cleanTitle = (title) => {
  if (!title) return "Notification";
  const stripped = String(title).replace(/^[^:]+:\s*/i, "").trim();
  return stripped || title;
};

const formatMessageLines = (message) =>
  String(message || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const getNotificationMeta = (title = "") => {
  const normalized = String(title).toLowerCase();
  if (normalized.includes("login")) {
    return { icon: LogIn, tone: "login" };
  }
  if (normalized.includes("price")) {
    return { icon: IndianRupee, tone: "price" };
  }
  if (normalized.includes("stock") || normalized.includes("inventory")) {
    return { icon: Package, tone: "stock" };
  }
  if (normalized.includes("sold") || normalized.includes("sale")) {
    return { icon: Package, tone: "stock" };
  }
  return { icon: Sparkles, tone: "default" };
};

const preventDropdownClose = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const NotificationPanel = ({
  notifications,
  meta,
  loading,
  markingReadAll,
  onMarkAllRead,
  onLoadMore,
  hasMore,
}) => (
  <div
    className={styles.panel}
    onMouseDown={preventDropdownClose}
    onClick={(e) => e.stopPropagation()}
  >
    <div className={styles.panelHeader}>
      <div className={styles.panelHeaderMain}>
        <div className={styles.panelTitleRow}>
          <span className={styles.panelTitle}>Notifications</span>
          {meta.unreadCount > 0 ? (
            <span className={styles.unreadPill}>{meta.unreadCount} new</span>
          ) : null}
        </div>
        <p className={styles.panelSubtitle}>
          {meta.unreadCount > 0 ? "You have unread alerts" : "You're all caught up"}
        </p>
      </div>
      <button
        type="button"
        className={styles.markAllBtn}
        disabled={!notifications.length || markingReadAll}
        onClick={onMarkAllRead}
      >
        <CheckCheck size={14} />
        <span>{markingReadAll ? "Updating..." : "Mark all read"}</span>
      </button>
    </div>

    <div className={styles.list}>
      {loading && notifications.length === 0 ? (
        <SkeletonDropdownPanel rows={5} />
      ) : null}

      {!loading && notifications.length === 0 ? (
        <div className={styles.emptyWrap}>
          <div className={styles.emptyIcon}>
            <Bell size={22} />
          </div>
          <Empty description="No notifications yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : null}

      {notifications.map((item) => {
        const toneMeta = getNotificationMeta(item.title);
        const Icon = toneMeta.icon;
        const lines = formatMessageLines(item.message);

        return (
          <article
            key={item.id}
            className={`${styles.item} ${item.is_read ? styles.itemRead : styles.itemUnread}`}
          >
            <div className={`${styles.itemIcon} ${styles[`itemIcon_${toneMeta.tone}`]}`}>
              <Icon size={16} strokeWidth={2.2} />
            </div>
            <div className={styles.itemBody}>
              <div className={styles.itemTop}>
                <h4 className={styles.itemTitle}>{cleanTitle(item.title)}</h4>
                <time className={styles.itemTime}>{formatNotificationTime(item.datetine)}</time>
              </div>
              <div className={styles.itemMessages}>
                {lines.length ? (
                  lines.map((line) => (
                    <p key={`${item.id}-${line}`} className={styles.itemMessage}>
                      {line}
                    </p>
                  ))
                ) : (
                  <p className={styles.itemMessage}>-</p>
                )}
              </div>
            </div>
            {!item.is_read ? <span className={styles.unreadDot} aria-hidden /> : null}
          </article>
        );
      })}
    </div>

    {hasMore ? (
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.loadMoreBtn}
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load more notifications"}
        </button>
      </div>
    ) : null}
  </div>
);

const NotificationDropdown = ({ buttonClassName, badgeClassName }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({ totalItems: 0, unreadCount: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingReadAll, setMarkingReadAll] = useState(false);
  const requestInFlightRef = useRef(false);
  const fetchGenerationRef = useRef(0);
  const hasFetchedOnceRef = useRef(false);
  const previousUnreadRef = useRef(0);
  const openRef = useRef(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const getAuthToken = () => {
    try {
      const raw = localStorage.getItem("auth-storage");
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      return parsed?.state?.token || "";
    } catch {
      return "";
    }
  };

  const notifyBrowser = useCallback((item, unreadCount) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const messageLines = formatMessageLines(item?.message);
    const body = messageLines[0] || "You have a new notification.";
    const title = cleanTitle(item?.title) || "New notification";
    const suffix = unreadCount > 1 ? ` (${unreadCount} unread)` : "";

    try {
      const notification = new Notification(`${title}${suffix}`, { body });
      setTimeout(() => notification.close(), 7000);
    } catch {
      // Ignore browser notification errors silently.
    }
  }, []);

  const maybeRequestNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    Notification.requestPermission().catch(() => { });
  }, []);

  const fetchNotifications = useCallback(async ({ offset = 0, append = false, force = false } = {}) => {
    if (!force && requestInFlightRef.current) return;

    const generation = ++fetchGenerationRef.current;
    requestInFlightRef.current = true;
    setLoading(true);
    try {
      const res = await api.get("/notification", {
        params: { limit: PAGE_SIZE, offset },
      });
      if (generation !== fetchGenerationRef.current) return;

      const payload = res.data || {};
      const nextData = Array.isArray(payload.Data) ? payload.Data : [];
      const nextUnreadCount = Number(payload.UnreadCount || 0);
      const previousUnreadCount = previousUnreadRef.current;

      if (hasFetchedOnceRef.current && nextUnreadCount > previousUnreadCount && !openRef.current) {
        notifyBrowser(nextData[0], nextUnreadCount);
        playNotificationSound();
      }

      setNotifications((prev) => (append ? [...prev, ...nextData] : nextData));
      setMeta({
        totalItems: Number(payload.TotalItems || 0),
        unreadCount: nextUnreadCount,
      });
      previousUnreadRef.current = nextUnreadCount;
      hasFetchedOnceRef.current = true;
      setPage(offset);
    } catch {
      // Keep bell usable even if API fails.
    } finally {
      if (generation === fetchGenerationRef.current) {
        requestInFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [notifyBrowser]);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(() => fetchNotifications(), POLLING_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || typeof EventSource === "undefined") return undefined;

    let disposed = false;
    let reconnectTimer = null;
    let source = null;

    const connectStream = () => {
      if (disposed) return;

      const normalizedBase = String(api?.defaults?.baseURL || "");
      const base = normalizedBase.endsWith("/")
        ? normalizedBase.slice(0, -1)
        : normalizedBase;
      const streamUrl = `${base}/notification/stream?token=${encodeURIComponent(token)}`;

      source = new EventSource(streamUrl);
      eventSourceRef.current = source;

      source.addEventListener("notification", (event) => {
        let payload = null;
        try {
          payload = JSON.parse(event?.data || "{}");
        } catch {
          payload = null;
        }
        fetchNotifications({ force: true });
        playNotificationSound();
        if (payload && !openRef.current) {
          const title = payload.title || "New notification";
          const message = payload.message || "";
          notifyBrowser({ title, message }, 1);
        }
      });

      source.onerror = () => {
        source?.close();
        eventSourceRef.current = null;
        fetchNotifications({ force: true });
        if (!disposed) {
          reconnectTimer = window.setTimeout(connectStream, 5000);
        }
      };
    };

    connectStream();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      source?.close();
      eventSourceRef.current = null;
    };
  }, [fetchNotifications, notifyBrowser]);

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      maybeRequestNotificationPermission();
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!notifications.length || markingReadAll) return;

    setMarkingReadAll(true);
    try {
      await api.post("/notification/read-all", {});
      fetchGenerationRef.current += 1;
      setNotifications([]);
      setMeta({ totalItems: 0, unreadCount: 0 });
      previousUnreadRef.current = 0;
      setPage(0);
    } catch {
      // Keep bell usable even if API fails.
    } finally {
      setMarkingReadAll(false);
    }
  };

  const handleLoadMore = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (loading || notifications.length >= meta.totalItems) return;
    await fetchNotifications({ offset: page + 1, append: true });
  };

  const hasMore = notifications.length < meta.totalItems;

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      trigger={["click"]}
      placement="bottomRight"
      classNames={{ root: styles.popupRoot }}
      popupRender={() => (
        <NotificationPanel
          notifications={notifications}
          meta={meta}
          loading={loading}
          markingReadAll={markingReadAll}
          onMarkAllRead={handleMarkAllRead}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      )}
    >
      <button
        type="button"
        className={[
          buttonClassName || "",
          open ? styles.triggerActive : "",
          meta.unreadCount > 0 ? styles.hasUnread : "",
        ].filter(Boolean).join(" ")}
        aria-label="Notifications"
        title="Notifications"
        aria-expanded={open}
        onClick={(e) => e.preventDefault()}
      >
        <Bell size={20} strokeWidth={2} />
        {meta.unreadCount > 0 ? (
          <span className={`${badgeClassName || ""} ${styles.badgePulse}`.trim()}>
            {meta.unreadCount > 99 ? "99+" : meta.unreadCount}
          </span>
        ) : null}
      </button>
    </Dropdown>
  );
};

export default React.memo(NotificationDropdown);
