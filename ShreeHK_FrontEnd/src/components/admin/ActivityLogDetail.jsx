import React from "react";
import { Tag, Typography } from "antd";
import {
  ArrowRightOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  extractBusinessData,
  getDisplayChanges,
  buildActivityNarrative,
  getActionHeadline,
  getActionTone,
  formatActionTypeLabel,
} from "../../utils/activityLogFormatters";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const { Text, Paragraph } = Typography;

const TONE_ICON = {
  add: PlusCircleOutlined,
  edit: EditOutlined,
  delete: DeleteOutlined,
  memo: FileTextOutlined,
  default: EditOutlined,
};

const ChangeList = ({ items, mode }) => {
  if (!items?.length) return null;

  if (mode === "added") {
    return (
      <div className={styles.snapshotCard}>
        <Text className={styles.snapshotCardTitle}>Naya data add hua</Text>
        <div className={styles.fieldList}>
          {items.map((item) => (
            <div key={item.key} className={styles.fieldListItem}>
              <span className={styles.fieldListLabel}>{item.label}</span>
              <span className={styles.fieldListValueNew}>{item.after}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "removed") {
    return (
      <div className={`${styles.snapshotCard} ${styles.snapshotCardDelete}`}>
        <Text className={styles.snapshotCardTitle}>Ye data delete hua</Text>
        <div className={styles.fieldList}>
          {items.map((item) => (
            <div key={item.key} className={styles.fieldListItem}>
              <span className={styles.fieldListLabel}>{item.label}</span>
              <span className={styles.fieldListValueOld}>{item.before}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.changeList}>
      {items.map((item) => (
        <div key={item.key} className={styles.changeListItem}>
          <span className={styles.changeListLabel}>{item.label}</span>
          <div className={styles.changeListValues}>
            <span className={styles.fieldListValueOld}>{item.before || "—"}</span>
            <ArrowRightOutlined className={styles.changeArrow} />
            <span className={styles.fieldListValueNew}>{item.after || "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ActivityLogDetail = ({ record, compact = false }) => {
  const [showTechnical, setShowTechnical] = React.useState(false);

  if (!record) return null;

  const { pageMeta, actionType } = extractBusinessData(record);
  const tone = getActionTone(actionType);
  const Icon = TONE_ICON[tone] || TONE_ICON.default;
  const narrative = buildActivityNarrative(record);
  const { mode, items } = getDisplayChanges(record);
  const headline = getActionHeadline(actionType);

  return (
    <div className={`${styles.detailWrap} ${styles[`detailWrap--${tone}`]}`}>
      <div className={styles.storyCard}>
        <div className={styles.storyIconWrap}>
          <Icon className={styles.storyIcon} />
        </div>
        <div className={styles.storyBody}>
          <div className={styles.storyHeadline}>
            <Tag className={`${styles.actionTag} ${styles[`actionTag--${tone}`]}`}>
              {formatActionTypeLabel(actionType)}
            </Tag>
            <Text strong>{headline}</Text>
            {record.recordReference ? (
              <Tag color="gold" className={styles.refTag}>{record.recordReference}</Tag>
            ) : null}
          </div>
          <Paragraph className={styles.storyNarrative} ellipsis={compact ? { rows: 2 } : false}>
            {narrative || record.description || "No details available"}
          </Paragraph>
          <div className={styles.storyMeta}>
            <Text type="secondary">
              {record.userName}
              {record.userRole ? ` · ${record.userRole}` : ""}
            </Text>
            {record.moduleName ? (
              <Text type="secondary"> · {record.moduleName}</Text>
            ) : null}
            {record.createdAt ? (
              <Text type="secondary">
                {" · "}
                {dayjs(record.createdAt).format("DD-MM-YYYY hh:mm A")}
              </Text>
            ) : null}
            {pageMeta?.label ? (
              <Text type="secondary"> · Page: {pageMeta.label}</Text>
            ) : null}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className={styles.detailSection}>
          <Text className={styles.detailSectionTitle}>
            {mode === "changes" && "What Is Change"}
            {mode === "compare" && "Data comparison"}
            {mode === "added" && "Added data"}
            {mode === "removed" && "Removed data"}
          </Text>
          <ChangeList items={items} mode={mode} />
        </div>
      ) : (
        <Text type="secondary" className={styles.noDataHint}>
          Is action ka detail data capture nahi hua. Dubara save/update karke check karein.
        </Text>
      )}

      {!compact ? (
        <>
          <div className={styles.detailMeta}>
            {record.ipAddress ? <Text type="secondary">IP: {record.ipAddress}</Text> : null}
            {record.status ? (
              <Tag color={record.status === "SUCCESS" ? "green" : "orange"}>{record.status}</Tag>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.technicalToggle}
            onClick={() => setShowTechnical((v) => !v)}
          >
            {showTechnical ? "Hide" : "Show"} technical JSON
          </button>

          {showTechnical ? (
            <div className={styles.diffColumns}>
              <div className={styles.diffPanel}>
                <Text strong>Before (raw)</Text>
                <pre className={styles.rawJson}>
                  {record.oldValue ? JSON.stringify(record.oldValue, null, 2) : "—"}
                </pre>
              </div>
              <div className={styles.diffPanel}>
                <Text strong>After (raw)</Text>
                <pre className={styles.rawJson}>
                  {record.newValue ? JSON.stringify(record.newValue, null, 2) : "—"}
                </pre>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default ActivityLogDetail;
