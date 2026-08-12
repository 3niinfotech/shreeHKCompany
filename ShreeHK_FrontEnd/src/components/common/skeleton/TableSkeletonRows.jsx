import styles from "../../../assets/scss/components/common/skeleton.module.scss";

const SKELETON_KEY = "_skeletonKey";

function cellWidth(column, rowIndex) {
  const base = typeof column?.width === "number" ? Math.min(column.width - 24, 140) : null;
  const fallbacks = ["72%", "58%", "85%", "64%", "48%", "76%"];
  if (base && base > 24) {
    const wobble = 0.65 + ((rowIndex + (column.key?.length || 0)) % 4) * 0.08;
    return Math.round(base * wobble);
  }
  return fallbacks[rowIndex % fallbacks.length];
}

function SkeletonCell({ column, rowIndex }) {
  const align = column?.align || "left";
  const justify =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  const width = cellWidth(column, rowIndex);

  return (
    <div className={styles.cell} style={{ justifyContent: justify }}>
      <span className={styles.cellBar} style={{ width }} />
    </div>
  );
}

/**
 * Build Ant Design Table-compatible columns + dataSource for skeleton rows.
 * Headers stay visible; body cells render layout-matched bars.
 */
export function buildTableSkeleton(columns = [], { rowCount = 8, rowKey = SKELETON_KEY } = {}) {
  const safeColumns = Array.isArray(columns) ? columns : [];

  const skeletonColumns = safeColumns.map((col) => {
    if (!col || col.key === "action" || col.dataIndex === "action") {
      return {
        ...col,
        render: (_, __, index) => <SkeletonCell column={col} rowIndex={index} />,
      };
    }
    return {
      ...col,
      render: (_, __, index) => <SkeletonCell column={col} rowIndex={index} />,
      // Keep sorter/filters off during skeleton to avoid interaction
      sorter: undefined,
      filters: undefined,
      onFilter: undefined,
      onHeaderCell: undefined,
      onCell: undefined,
    };
  });

  const dataSource = Array.from({ length: rowCount }, (_, i) => ({
    [rowKey]: `skeleton-row-${i}`,
    __isSkeleton: true,
  }));

  return { columns: skeletonColumns, dataSource, rowKey };
}

export function TableSkeletonCell({ column, rowIndex = 0 }) {
  return <SkeletonCell column={column} rowIndex={rowIndex} />;
}

export default buildTableSkeleton;
