import React from "react";
import { getUnifiedTableRows } from "../../utils/activityLogFormatters";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

/** Inline Pehle / Ab data for the unified activity table */
const ActivityUnifiedDataCell = ({ record, column = "before" }) => {
  const { rows, total, hasMore, mode } = getUnifiedTableRows(record, 12);

  if (mode === "added" && column === "before") {
    return <span className={styles.inlineDataEmpty}>—</span>;
  }
  if (mode === "removed" && column === "after") {
    return <span className={styles.inlineDataEmpty}>—</span>;
  }
  if (mode === "empty") {
    return <span className={styles.inlineDataEmpty}>—</span>;
  }

  if (!rows.length) {
    return <span className={styles.inlineDataEmpty}>—</span>;
  }

  return (
    <div className={styles.inlineDataCell}>
      {rows.map((row) => {
        const value = column === "before" ? row.before : row.after;
        const isEmpty = value === "—";
        const tone =
          mode === "added" && column === "after" ? "new" :
          mode === "removed" && column === "before" ? "old" :
          column === "before" ? "old" : "new";

        return (
          <div
            key={`${row.key}-${column}`}
            className={`${styles.inlineDataRow} ${isEmpty ? styles.inlineDataRowEmpty : ""}`}
          >
            <span className={styles.inlineDataLabel}>{row.label}</span>
            <span className={styles[`inlineDataValue--${tone}`]}>{value}</span>
          </div>
        );
      })}
      {hasMore ? (
        <span className={styles.inlineDataMore}>+{total - rows.length} more fields</span>
      ) : null}
    </div>
  );
};

export default ActivityUnifiedDataCell;
