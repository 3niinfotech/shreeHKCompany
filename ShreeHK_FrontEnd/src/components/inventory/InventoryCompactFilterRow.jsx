import React from "react";
import { Form, Input, Select, Radio, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "../../assets/scss/components/inventoryFilterPanel.module.scss";

/**
 * Single-row compact filters: carat range, search, GIA, Lab, Out Stock, Group, Category, F/W.
 * Presentation only — parent owns form state and handlers.
 */
const InventoryCompactFilterRow = ({
  form,
  fields = [],
  caratFrom,
  caratTo,
  onCaratFromChange,
  onCaratToChange,
  onSearch,
  searchLoading = false,
}) => {
  const fieldByName = (name) => fields.find((f) => f.name === name);
  const hasCaratValue =
    String(caratFrom ?? "").trim() !== "" || String(caratTo ?? "").trim() !== "";

  const renderSelect = (name, placeholder, wide = false) => {
    const field = fieldByName(name);
    if (!field) return null;
    return (
      <Form.Item name={name} className={styles.compactFilterItem} key={name}>
        <Select
          placeholder={placeholder || field.label}
          allowClear
          options={field.options}
          className={wide ? styles.compactSelectWide : styles.compactSelect}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
    );
  };

  return (
    <Form form={form} layout="inline" component={false} className={styles.compactFilterForm}>
      <div className={styles.caratGroup}>
        <Input
          className={styles.caratInput}
          placeholder="From Carat"
          value={caratFrom}
          onChange={(e) => onCaratFromChange?.(e.target.value)}
          allowClear
        />
        <Input
          className={styles.caratInput}
          placeholder="To Carat"
          value={caratTo}
          onChange={(e) => onCaratToChange?.(e.target.value)}
          allowClear
        />
      </div>

      {hasCaratValue ? (
        <Button
          type="primary"
          icon={<SearchOutlined />}
          className={styles.searchBtn}
          onClick={onSearch}
          loading={searchLoading}
        >
          Search
        </Button>
      ) : null}

      {renderSelect("inStock", "GIA")}
      {renderSelect("lab", "Lab")}
      {renderSelect("outStock", "Out Stock")}
      {renderSelect("type", "Group")}
      {renderSelect("category", "Category", true)}

      {fieldByName("stoneTypeFw") ? (
        <Form.Item name="stoneTypeFw" className={styles.compactFilterItem}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            className={styles.fwToggle}
            options={[
              { label: "F", value: "F" },
              { label: "W", value: "W" },
            ]}
          />
        </Form.Item>
      ) : null}
    </Form>
  );
};

export default InventoryCompactFilterRow;
