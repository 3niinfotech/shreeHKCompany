import React from "react";
import InventorySummaryBadges from "./InventorySummaryBadges";
import "../../assets/scss/pages/inventory/onHand_module.scss";

/**
 * One row: summary badges (left) + action buttons / quick links (right).
 */
const InventorySummaryToolbar = ({
  totals,
  byType = [],
  showByType = false,
  children,
}) => {
  if (!totals && !children) return null;

  return (
    <div className="inventory-summary-toolbar">
      <div className="inventory-summary-toolbar__stats">
        <InventorySummaryBadges totals={totals} byType={byType} showByType={showByType} />
      </div>
      {children ? (
        <div className="inventory-summary-toolbar__actions">{children}</div>
      ) : null}
    </div>
  );
};

export default InventorySummaryToolbar;
