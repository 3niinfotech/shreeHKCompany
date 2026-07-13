import React, { useEffect, useState } from "react";
import { Spin, Tag, Typography, Button, Timeline } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import ActivityLogDetail from "./ActivityLogDetail";
import {
  buildActivityNarrative,
  formatActionTypeLabel,
  getActionTone,
} from "../../utils/activityLogFormatters";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const { Text } = Typography;

const ActivityLogDayDetail = ({
  group,
  canDelete = false,
  onEntryDeleted,
}) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!group?.activityDate) return undefined;

    let cancelled = false;
    setLoading(true);

    const params = { activityDate: group.activityDate, mutationsOnly: "1" };
    if (group.userId != null && group.userId !== "") params.userId = group.userId;
    else if (group.userName) params.userName = group.userName;

    api
      .get(ENDPOINTS.admin.activityLogGroupDetail, { params })
      .then((res) => {
        if (cancelled) return;
        setEntries((res.data?.Data || []).map((row) => ({ ...row, key: row.id })));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [group?.groupKey, group?.activityDate, group?.userId, group?.userName]);

  const handleDeleteEntry = async (entry, e) => {
    e?.stopPropagation();
    if (!entry?.id) return;
    setDeletingId(entry.id);
    try {
      await api.delete(ENDPOINTS.admin.activityLogDelete, {
        params: { deleteId: entry.id },
      });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      onEntryDeleted?.(entry);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.dayDetailLoading}>
        <Spin size="small" />
        <Text type="secondary">Loading day activity…</Text>
      </div>
    );
  }

  if (!entries.length) {
    return <Text type="secondary">No activity for this day.</Text>;
  }

  return (
    <div className={styles.dayDetailWrap}>
      <Text type="secondary" className={styles.dayDetailSummary}>
        {entries.length} action(s) on {dayjs(group.activityDate).format("DD-MM-YYYY")}
      </Text>
      <Timeline
        className={styles.dayTimeline}
        items={entries.map((entry) => {
          const tone = getActionTone(entry.actionType);
          const isOpen = expandedId === entry.id;
          return {
            key: entry.id,
            color: tone === "delete" ? "red" : tone === "add" ? "green" : "blue",
            children: (
              <div
                className={`${styles.dayEntry} ${styles[`dayEntry--${tone}`]} ${isOpen ? styles.dayEntryOpen : ""}`}
                onClick={() => setExpandedId(isOpen ? null : entry.id)}
                onKeyDown={(e) => e.key === "Enter" && setExpandedId(isOpen ? null : entry.id)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.dayEntryHeader}>
                  <Text strong className={styles.dayEntryTime}>
                    {dayjs(entry.createdAt).format("HH:mm:ss")}
                  </Text>
                  <Tag className={`${styles.actionTag} ${styles[`actionTag--${tone}`]}`}>
                    {formatActionTypeLabel(entry.actionType)}
                  </Tag>
                  {entry.recordReference ? (
                    <Tag color="gold">{entry.recordReference}</Tag>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deletingId === entry.id}
                      aria-label="Delete activity entry"
                      onClick={(e) => handleDeleteEntry(entry, e)}
                    />
                  ) : null}
                </div>
                <Text className={styles.dayEntrySummary}>
                  {buildActivityNarrative(entry) || entry.description || "—"}
                </Text>
                {isOpen ? <ActivityLogDetail record={entry} compact /> : null}
              </div>
            ),
          };
        })}
      />
    </div>
  );
};

export default ActivityLogDayDetail;
