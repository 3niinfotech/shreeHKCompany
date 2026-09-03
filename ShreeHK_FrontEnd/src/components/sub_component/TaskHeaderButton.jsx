import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dropdown, Empty } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { SkeletonDropdownPanel } from "../common/skeleton";
import { NotebookPen, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import { playNotificationSound } from "../../utils/soundNotify";
import styles from "../../assets/scss/components/notificationDropdown.module.scss";

const POLLING_MS = 10000;

const isTaskPending = (task) => Number(task?.completed) !== 1;

const preventDropdownClose = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const TaskPanel = ({ tasks, loading, onTaskClick, onViewAll }) => {
  const pendingTasks = tasks.filter(isTaskPending);

  return (
    <div
      className={styles.panel}
      onMouseDown={preventDropdownClose}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderMain}>
          <div className={styles.panelTitleRow}>
            <span className={styles.panelTitle}>Assigned Tasks</span>
            {pendingTasks.length > 0 ? (
              <span className={styles.unreadPill}>{pendingTasks.length} pending</span>
            ) : null}
          </div>
          <p className={styles.panelSubtitle}>
            {pendingTasks.length > 0
              ? "Tasks assigned to you by Admin"
              : "No pending tasks assigned"}
          </p>
        </div>
        <button
          type="button"
          className={styles.markAllBtn}
          onClick={onViewAll}
        >
          <span>View All</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className={styles.list}>
        {loading && tasks.length === 0 ? (
          <SkeletonDropdownPanel rows={4} />
        ) : null}

        {!loading && tasks.length === 0 ? (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIcon}>
              <NotebookPen size={22} />
            </div>
            <Empty description="No tasks assigned yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : null}

        {tasks.map((item) => {
          const isPending = isTaskPending(item);
          const assignedBy = item.created_by_name?.trim() || item.assigned_to_name?.trim() || "Admin";

          return (
            <article
              key={item.id}
              className={`${styles.item} ${!isPending ? styles.itemRead : styles.itemUnread}`}
              style={{ cursor: "pointer" }}
              onClick={() => onTaskClick(item)}
            >
              <div className={`${styles.itemIcon} ${isPending ? styles.itemIcon_price : styles.itemIcon_default}`}>
                <NotebookPen size={16} strokeWidth={2.2} />
              </div>
              <div className={styles.itemBody}>
                <div className={styles.itemTop}>
                  <h4 className={styles.itemTitle} style={{ fontWeight: isPending ? 600 : 400 }}>
                    {item.text}
                  </h4>
                  {item.priority && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor:
                          item.priority === "High"
                            ? "#fef2f2"
                            : item.priority === "Medium"
                              ? "#fffbeb"
                              : "#ecfdf5",
                        color:
                          item.priority === "High"
                            ? "#ef4444"
                            : item.priority === "Medium"
                              ? "#d97706"
                              : "#10b981",
                      }}
                    >
                      {item.priority}
                    </span>
                  )}
                </div>
                <div className={styles.itemMessages}>
                  <p className={styles.itemMessage} style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    <strong>Assigned by:</strong> {assignedBy}
                  </p>
                  {item.target_date && (
                    <p className={styles.itemMessage} style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      Target Date: {item.target_date}
                    </p>
                  )}
                </div>
              </div>
              {isPending ? <span className={styles.unreadDot} aria-hidden /> : null}
            </article>
          );
        })}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.loadMoreBtn}
          onClick={onViewAll}
        >
          Open Task Manager
        </button>
      </div>
    </div>
  );
};

const TaskHeaderButton = ({ buttonClassName, badgeClassName }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const hasFetchedOnceRef = useRef(false);
  const previousPendingCountRef = useRef(0);

  const syncQuickNotesCache = useCallback((data) => {
    queryClient.setQueriesData({ queryKey: ["quickNotes"] }, (old) => {
      if (old && typeof old === "object" && Array.isArray(old.Data)) {
        return { ...old, status: true, Data: data };
      }
      return {
        status: true,
        Message: "Quick notes loaded successfully",
        Data: data,
      };
    });
  }, [queryClient]);

  const fetchTasks = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.quickNotes.list);
      const data = Array.isArray(res?.data?.Data) ? res.data.Data : [];
      const pendingCount = data.filter(isTaskPending).length;

      if (hasFetchedOnceRef.current && pendingCount > previousPendingCountRef.current) {
        playNotificationSound();
      }

      previousPendingCountRef.current = pendingCount;
      hasFetchedOnceRef.current = true;
      setTasks(data);
      // Push latest poll into React Query so Task Manager / Dashboard UI updates too
      syncQuickNotesCache(data);
    } catch {
      // Keep task button usable even if API fails.
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [syncQuickNotesCache]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, POLLING_MS);

    const onFocus = () => fetchTasks();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchTasks]);

  const pendingCount = tasks.filter(isTaskPending).length;

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      fetchTasks();
    }
  };

  const handleTaskClick = () => {
    setOpen(false);
    navigate("/task-manager");
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate("/task-manager");
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      trigger={["click"]}
      placement="bottomRight"
      classNames={{ root: styles.popupRoot }}
      popupRender={() => (
        <TaskPanel
          tasks={tasks}
          loading={loading}
          onTaskClick={handleTaskClick}
          onViewAll={handleViewAll}
        />
      )}
    >
      <button
        type="button"
        className={[
          buttonClassName || "",
          open ? styles.triggerActive : "",
          pendingCount > 0 ? styles.hasUnread : "",
        ].filter(Boolean).join(" ")}
        aria-label="Task Manager"
        title="Task Manager"
        onClick={(e) => e.preventDefault()}
      >
        <NotebookPen size={20} strokeWidth={2} />
        {pendingCount > 0 ? (
          <span className={`${badgeClassName || ""} ${styles.badgePulse}`.trim()}>
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        ) : null}
      </button>
    </Dropdown>
  );
};

export default React.memo(TaskHeaderButton);
