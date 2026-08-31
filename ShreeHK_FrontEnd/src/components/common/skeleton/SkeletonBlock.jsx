import styles from "../../../assets/scss/components/common/skeleton.module.scss";

const PRESETS = {
  text: { width: "72%", height: 12, shape: "block" },
  heading: { width: "42%", height: 18, shape: "block" },
  button: { width: 88, height: 32, shape: "block" },
  avatar: { width: 36, height: 36, shape: "circle" },
  icon: { width: 28, height: 28, shape: "block" },
  input: { width: "100%", height: 32, shape: "block" },
  chart: { width: "100%", height: 220, shape: "block" },
};

/**
 * Lightweight theme-aware skeleton block.
 * Prefer this over raw antd Skeleton for layout-matched placeholders.
 */
export function SkeletonBlock({
  variant = "text",
  width,
  height,
  shape,
  className = "",
  style,
  ...rest
}) {
  const preset = PRESETS[variant] || PRESETS.text;
  const resolvedShape = shape || preset.shape || "block";
  const shapeClass =
    resolvedShape === "circle"
      ? styles.blockCircle
      : resolvedShape === "round"
        ? styles.blockRound
        : styles.block;

  return (
    <span
      className={`${shapeClass} ${className}`.trim()}
      style={{
        width: width ?? preset.width,
        height: height ?? preset.height,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
}

export function SkeletonStatCard({ className = "" }) {
  return (
    <div className={`${styles.statCard} ${className}`.trim()} aria-hidden="true">
      <div className={styles.statTop}>
        <div className={styles.cardBody} style={{ flex: 1 }}>
          <SkeletonBlock variant="text" width="55%" height={12} />
          <SkeletonBlock variant="heading" width="40%" height={22} />
          <SkeletonBlock variant="text" width="70%" height={10} />
        </div>
        <SkeletonBlock variant="icon" width={36} height={36} />
      </div>
      <div className={styles.statFooter}>
        <SkeletonBlock variant="text" width="45%" height={10} />
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 3, withAvatar = false, className = "" }) {
  return (
    <div className={`${styles.card} ${className}`.trim()} aria-hidden="true">
      {(withAvatar || lines > 0) && (
        <div className={styles.cardHeader}>
          {withAvatar ? <SkeletonBlock variant="avatar" /> : null}
          <div className={styles.cardBody} style={{ flex: 1 }}>
            <SkeletonBlock variant="heading" width="48%" />
            <SkeletonBlock variant="text" width="70%" height={10} />
          </div>
        </div>
      )}
      <div className={styles.cardBody}>
        {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
          <SkeletonBlock
            key={i}
            variant="text"
            width={`${88 - (i % 3) * 12}%`}
            height={10}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 220, className = "" }) {
  return (
    <div
      className={`${styles.chart} ${className}`.trim()}
      style={{ height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonFilterRow({ fields = 4, className = "" }) {
  return (
    <div className={`${styles.filterRow} ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonBlock key={i} variant="input" width={i === fields - 1 ? 96 : 140} />
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 6, className = "" }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className={styles.formField}>
          <SkeletonBlock variant="text" width="28%" height={10} />
          <SkeletonBlock variant="input" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5, withAvatar = true, className = "" }) {
  return (
    <div className={`${styles.listRows} ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.listRow}>
          {withAvatar ? <SkeletonBlock variant="avatar" width={32} height={32} /> : null}
          <div className={styles.cardBody} style={{ flex: 1 }}>
            <SkeletonBlock variant="text" width={`${62 + (i % 3) * 8}%`} height={12} />
            <SkeletonBlock variant="text" width={`${40 + (i % 2) * 10}%`} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTree({ rows = 8, className = "" }) {
  const indents = [0, 16, 16, 32, 0, 16, 32, 16];
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.treeRow}>
          <span className={styles.treeIndent} style={{ width: indents[i % indents.length] }} />
          <SkeletonBlock variant="icon" width={14} height={14} />
          <SkeletonBlock variant="text" width={`${58 + (i % 4) * 8}%`} height={12} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail({ fields = 8, className = "" }) {
  return (
    <div className={`${styles.detailGrid} ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className={styles.formField}>
          <SkeletonBlock variant="text" width="36%" height={10} />
          <SkeletonBlock variant="input" height={28} />
        </div>
      ))}
    </div>
  );
}

/** Compact list placeholder for dropdowns / popovers */
export function SkeletonDropdownPanel({ rows = 4, className = "" }) {
  return (
    <div className={`${styles.dropdownPanel} ${className}`.trim()} aria-hidden="true">
      <SkeletonList rows={rows} withAvatar />
    </div>
  );
}

export default SkeletonBlock;
