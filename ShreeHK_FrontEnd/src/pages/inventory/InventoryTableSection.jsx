import React from "react";
import { Table } from "antd";

const getRowKey = (record) => String(record.id);
const TABLE_LOCALE = { emptyText: "No data found" };
const TABLE_HEADER_FOOTER_RESERVE = 48;
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
  const bodyScrollY = Math.max(tableHeight - TABLE_HEADER_FOOTER_RESERVE, TABLE_BODY_MIN_HEIGHT);

  return (
    <div
      ref={tableRef}
      className="erp-table-container"
      style={{ height: tableHeight, overflowY: "hidden", overflowX: "hidden" }}
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
        loading={overlayLoading}
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
