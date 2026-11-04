import React from "react";
import { Popover } from "antd";
import MemoCaratHoverPanel from "./MemoCaratHoverPanel";

const stopRowClick = (event) => {
  event.stopPropagation();
};

const InventoryPcsCell = ({ polishPcs, memoPcs = 0, memoItems = [], memoHistory = [], onOpenInvoice }) => {
  const displayValue =
    polishPcs != null && polishPcs !== "" ? polishPcs : "—";
  const hasMemoBadge = Number(memoPcs) > 0;

  const badge = hasMemoBadge ? (
    <Popover
      trigger="hover"
      mouseEnterDelay={0.15}
      mouseLeaveDelay={0.25}
      placement="topLeft"
      overlayClassName="memo-carat-popover-overlay"
      content={
        <MemoCaratHoverPanel
          items={memoItems}
          history={memoHistory}
          totalPcs={memoPcs}
          onOpenInvoice={onOpenInvoice}
        />
      }
    >
      <span
        className="inventory-memo-pcs inventory-memo-carat--interactive"
        title="Hover for memo details"
        onClick={stopRowClick}
        onMouseDown={stopRowClick}
      >
        {memoPcs}
      </span>
    </Popover>
  ) : null;

  return (
    <span
      className={`inventory-pcs-cell${hasMemoBadge ? " inventory-pcs-cell--has-memo" : ""}`}
      onClick={hasMemoBadge ? stopRowClick : undefined}
      onMouseDown={hasMemoBadge ? stopRowClick : undefined}
    >
      {badge}
      <span className="inventory-pcs-value">{displayValue}</span>
    </span>
  );
};

export default React.memo(InventoryPcsCell);

