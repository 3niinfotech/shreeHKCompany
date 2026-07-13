import React from "react";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";
import { getUserDataFields } from "../../utils/activityLogFormatters";

/** Inline preview — mutation data only */
const ActivityDataPreview = ({ record }) => {
  const fields = getUserDataFields(record);

  if (!fields.length) {
    return <span className={styles.mutedCell}>Expand row for before/after data</span>;
  }

  return (
    <div className={styles.dataPreviewList}>
      {fields.slice(0, 6).map((f) => (
        <div key={f.key} className={styles.dataPreviewRow}>
          <span className={styles.dataPreviewLabel}>{f.label}:</span>
          <span className={styles.dataPreviewValue}>{f.value}</span>
        </div>
      ))}
      {fields.length > 6 ? (
        <span className={styles.dataPreviewMore}>+{fields.length - 6} more — expand row</span>
      ) : null}
    </div>
  );
};

export default ActivityDataPreview;
