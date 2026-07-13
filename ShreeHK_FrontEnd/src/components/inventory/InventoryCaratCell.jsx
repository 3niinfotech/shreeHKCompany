import React from "react";
import { Popover } from "antd";
import MemoCaratHoverPanel from "./MemoCaratHoverPanel";

const stopRowClick = (event) => {
  event.stopPropagation();
};

const InventoryCaratCell = ({ polishCarat, memoCarat = 0, memoItems = [], memoHistory = [] }) => {
  const displayValue =
    polishCarat != null && polishCarat !== "" ? polishCarat : "—";
  const hasMemoBadge = Number(memoCarat) > 0;

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
          totalCarat={memoCarat}
        />
      }
    >
      <span
        className="inventory-memo-carat inventory-memo-carat--interactive"
        title="Hover for memo details"
        onClick={stopRowClick}
        onMouseDown={stopRowClick}
      >
        {memoCarat}
      </span>
    </Popover>
  ) : null;

  return (
    <span
      className={`inventory-carat-cell${hasMemoBadge ? " inventory-carat-cell--has-memo" : ""}`}
      onClick={hasMemoBadge ? stopRowClick : undefined}
      onMouseDown={hasMemoBadge ? stopRowClick : undefined}
    >
      {badge}
      <span className="inventory-carat-value">{displayValue}</span>
    </span>
  );
};

export default InventoryCaratCell;
