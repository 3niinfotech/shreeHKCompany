import React from "react";
import { Button, Form } from "antd";
import { cssVar } from "../../theme";
import InventoryFilterPanel from "./InventoryFilterPanel";

/**
 * Shared compact toolbar for inventory list pages (On Hand, Barcode, etc.).
 * Preserves existing filter form + action button behavior via props.
 */
const InventoryPageToolbar = ({
  tableCount,
  activeType,
  setActiveType,
  filterForm,
  renderFilters,
  onReset,
  labelButton,
  typeButtons,
  actionButtons,
  onTypeAction,
  onLabelClick,
  onToolbarAction,
  extraToolbarActions,
}) => {
  return (
    <InventoryFilterPanel
      totalLabel={
        <>
          Total Record: <b>{tableCount}</b>
        </>
      }
      compactFilters={
        <Form form={filterForm} layout="vertical" component={false}>
          {renderFilters()}
        </Form>
      }
      toolbarActions={
        <>
          <Button
            className="on-hand-type-btn"
            icon={labelButton.icon}
            onClick={() => {
              if (onLabelClick?.()) return;
              setActiveType(labelButton.key);
            }}
            type="default"
            style={{
              background: cssVar("color-bg-surface"),
              ...(labelButton.style || {}),
              boxShadow:
                activeType === labelButton.key
                  ? `0 0 0 2px ${cssVar("color-status-offline-bg")}`
                  : "none",
            }}
          >
            {labelButton.label}
          </Button>

          <Button.Group>
            {typeButtons.map((btn) => {
              const isActive = activeType === btn.key;
              return (
                <Button
                  key={btn.key}
                  className="on-hand-type-btn"
                  icon={btn.icon}
                  onClick={() => {
                    if (onTypeAction?.(btn.key)) return;
                    setActiveType(btn.key);
                  }}
                  type="default"
                  style={{
                    background: cssVar("color-bg-surface"),
                    boxShadow: isActive
                      ? `0 0 0 2px ${cssVar("color-badge-info-bg")}`
                      : "none",
                  }}
                >
                  {btn.label}
                </Button>
              );
            })}
          </Button.Group>

          <Button
            type="primary"
            icon={actionButtons.export.icon}
            onClick={() => onToolbarAction?.(actionButtons.export.key)}
          >
            {actionButtons.export.label}
          </Button>
          <Button
            icon={actionButtons.iExport.icon}
            onClick={() => onToolbarAction?.(actionButtons.iExport.key)}
          >
            {actionButtons.iExport.label}
          </Button>
          <Button
            icon={actionButtons.mail.icon}
            onClick={() => onToolbarAction?.(actionButtons.mail.key)}
          >
            {actionButtons.mail.label}
          </Button>
          <Button icon={actionButtons.reset.icon} onClick={onReset}>
            {actionButtons.reset.label}
          </Button>
          {extraToolbarActions}
        </>
      }
    />
  );
};

export default InventoryPageToolbar;
