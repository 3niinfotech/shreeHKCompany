import React from "react";
import { Table } from "antd";

const getRowKey = (record) => String(record.id);
const TABLE_LOCALE = { emptyText: "No data found" };
/** Header (~40) + footer totals bar (~35) — calibrated for 582px body height */
const TABLE_HEADER_RESERVE = 40;
const TABLE_FOOTER_RESERVE = 35;
const TABLE_BODY_MIN_HEIGHT = 160;

const InventoryTableSection = React.memo(function InventoryTableSection({
  tableRef,
  tableHeight,
  tableColumnsSk,
  tableDataSk,
  isTableSkeleton,
  overlayLoading,
  tableScrollX,
  tableComponents,
  getInventoryRowClass,
  handleOnRow,
  renderTableFooter,
}) {
  const bodyScrollY = Math.max(
    tableHeight - TABLE_HEADER_RESERVE - TABLE_FOOTER_RESERVE,
    TABLE_BODY_MIN_HEIGHT
  );

  return (
    <div
      ref={tableRef}
      className="erp-table-container"
      style={{
        height: tableHeight,
        overflowY: "hidden",
        overflowX: "hidden",
        ["--inventory-table-body-y"]: `${bodyScrollY}px`,
      }}
    >
      <Table
        className="diamond-inventory-table"
        columns={tableColumnsSk}
        dataSource={tableDataSk}
        rowKey={isTableSkeleton ? "_skeletonKey" : getRowKey}
        size="small"
        tableLayout="fixed"
        rowClassName={isTableSkeleton ? undefined : getInventoryRowClass}
        onRow={isTableSkeleton ? undefined : handleOnRow}
        loading={overlayLoading ? { spinning: true, tip: "" } : false}
        pagination={false}
        bordered
        scroll={{ x: tableScrollX ?? "max-content", y: bodyScrollY }}
        components={isTableSkeleton ? undefined : tableComponents}
        locale={TABLE_LOCALE}
        footer={isTableSkeleton ? undefined : renderTableFooter}
      />
    </div>
  );
});

export default InventoryTableSection;
