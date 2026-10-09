import React, { useCallback } from "react";
import { INVENTORY_PRIMARY_ACTION_ITEMS } from "./InventoryActionPanel";

/**
 * Primary stock actions shown beside On Hand Pcs / Carat / Amount.
 */
const InventoryPrimaryActions = ({ onAction }) => {
  const handleClick = useCallback(
    (key) => {
      onAction?.(key);
    },
    [onAction],
  );

  return (
    <div className="inventory-primary-actions" role="group" aria-label="Primary inventory actions">
      {INVENTORY_PRIMARY_ACTION_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            className={`inventory-primary-action-btn inventory-primary-action-btn--${item.variant}`}
            onClick={() => handleClick(item.key)}
          >
            <Icon size={14} strokeWidth={2.25} aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(InventoryPrimaryActions);
