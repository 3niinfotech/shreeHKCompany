import React from "react";
import { Tag } from "antd";

/**
 * On-hand Pcs / Carat / Amount as pill badges (shared by My Inventory & On Hand Stock).
 */
const InventorySummaryBadges = ({ totals, byType = [], showByType = false }) => {
  if (!totals) return null;

  return (
    <>
      <Tag bordered className="onhand-stat-badge onhand-stat-badge--pcs">
        On Hand Pcs: <b>{Number(totals.pcs || 0).toLocaleString()}</b>
      </Tag>
      <Tag bordered className="onhand-stat-badge onhand-stat-badge--carat">
        Carat: <b>{Number(totals.carat || 0).toFixed(2)}</b>
      </Tag>
      <Tag bordered className="onhand-stat-badge onhand-stat-badge--amount">
        Amount: <b>{Number(totals.amount || 0).toLocaleString()}</b>
      </Tag>
      {showByType
        ? byType.map((item) => (
            <Tag
              key={item.label}
              bordered
              className="onhand-stat-badge onhand-stat-badge--type"
              style={
                item.color
                  ? {
                      borderColor: item.color,
                      color: item.color,
                      background: `${item.color}18`,
                    }
                  : undefined
              }
            >
              {item.label}:<b>{item.count}</b>
            </Tag>
          ))
        : null}
    </>
  );
};

export default InventorySummaryBadges;
