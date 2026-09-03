import { Table } from "antd";
import useTableSkeleton from "./useTableSkeleton";

/**
 * Drop-in Ant Design Table that shows skeleton rows while loading (no table spin overlay).
 */
export default function SkeletonAwareTable({
  columns,
  dataSource,
  loading = false,
  rowKey = "id",
  skeletonRows = 8,
  ...rest
}) {
  const {
    columns: skColumns,
    dataSource: skData,
    tableLoading,
    showSkeleton,
  } = useTableSkeleton({
    columns,
    dataSource,
    loading,
    rowCount: skeletonRows,
    rowKey: "_skeletonKey",
  });

  const resolvedRowKey = showSkeleton
    ? "_skeletonKey"
    : rowKey;

  return (
    <Table
      {...rest}
      columns={skColumns}
      dataSource={skData}
      rowKey={resolvedRowKey}
      loading={tableLoading}
      rowSelection={showSkeleton ? undefined : rest.rowSelection}
      expandable={showSkeleton ? undefined : rest.expandable}
      onRow={showSkeleton ? undefined : rest.onRow}
      summary={showSkeleton ? undefined : rest.summary}
    />
  );
}
