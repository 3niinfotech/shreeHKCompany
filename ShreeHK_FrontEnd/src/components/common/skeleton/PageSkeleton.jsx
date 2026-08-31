import {
  SkeletonBlock,
  SkeletonFilterRow,
} from "./SkeletonBlock";
import styles from "../../../assets/scss/components/common/skeleton.module.scss";

/** Standard page placeholder — use for route suspense and full-page data waits (not the boot Loader). */
export default function PageSkeleton({ rows = 8, filters = 3, className = "" }) {
  return (
    <div
      className={`${styles.pageShell} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className={styles.pageHeader}>
        <SkeletonBlock variant="heading" width="240px" height={22} />
        <SkeletonFilterRow fields={filters} />
      </div>
      <div className={styles.pageTable}>
        <div className={styles.pageTableHead}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} variant="text" width="100%" height={12} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className={styles.pageTableRow}>
            {Array.from({ length: 6 }).map((_, colIndex) => (
              <SkeletonBlock
                key={colIndex}
                variant="text"
                width={`${55 + ((rowIndex + colIndex) % 4) * 10}%`}
                height={12}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
