import { useMemo } from "react";
import { buildTableSkeleton } from "./TableSkeletonRows";

/**
 * When loading and the table has no real rows, return skeleton columns/data.
 * When rows already exist, keep real data and optionally signal overlay loading.
 */
export default function useTableSkeleton({
  columns,
  dataSource,
  loading = false,
  rowCount = 8,
  rowKey = "_skeletonKey",
}) {
  const safeData = Array.isArray(dataSource) ? dataSource : [];
  const hasRows = safeData.length > 0;
  const showSkeleton = Boolean(loading) && !hasRows;
  const showOverlay = Boolean(loading) && hasRows;

  const skeleton = useMemo(
    () => buildTableSkeleton(columns, { rowCount, rowKey }),
    [columns, rowCount, rowKey]
  );

  return {
    showSkeleton,
    showOverlay,
    columns: showSkeleton ? skeleton.columns : columns,
    dataSource: showSkeleton ? skeleton.dataSource : safeData,
    /** Never use Ant Design table spin — skeleton or stale rows only */
    tableLoading: false,
  };
}
