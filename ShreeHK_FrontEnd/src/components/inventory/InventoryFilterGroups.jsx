import React from "react";
import { Checkbox, Form } from "antd";
import DynamicForm from "../../hooks/DynamicFormField";
import panelStyles from "../../assets/scss/components/inventoryFilterPanel.module.scss";

/**
 * Renders filter field config in grouped cards (presentation only).
 * Uses stack layout so narrow cards do not overlap (span:2 grid is for full-width bars only).
 */
const InventoryFilterGroups = ({ groups, allFields }) => (
  <div className={panelStyles.filterGroups}>
    {groups.map((group) => {
      const fields = allFields.slice(group.start, group.end);
      if (!fields.length) return null;

      const stoneTypeFields = group.showStoneTypeRow
        ? fields.filter((f) => f.type === "checkbox")
        : [];
      const restFields = group.showStoneTypeRow
        ? fields.filter((f) => f.type !== "checkbox")
        : fields;

      return (
        <div key={group.key} className={panelStyles.filterGroup}>
          {/* <span className={panelStyles.filterGroupTitle}>{group.title}</span> */}

          {stoneTypeFields.length > 0 ? (
            <div className={panelStyles.stoneTypeRow}>
              {stoneTypeFields.map((field, index) => (
                <Form.Item
                  key={`${group.key}-stone-${field.label}-${index}`}
                  name={field.name}
                  valuePropName="checked"
                  className={panelStyles.stoneTypeItem}
                >
                  <Checkbox>{field.label}</Checkbox>
                </Form.Item>
              ))}
            </div>
          ) : null}

          <div className={panelStyles.filterGroupBody}>
            <DynamicForm
              fields={(restFields.length ? restFields : fields).map((field) =>
                field.type === "select" ? { ...field, mode: "multiple" } : field
              )}
              layout="stack"
            />
          </div>
        </div>
      );
    })}
  </div>
);

export default InventoryFilterGroups;
