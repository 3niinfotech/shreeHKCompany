import React from "react";
import { Space, Input, Button, Card } from "antd";
import { SearchOutlined, ClearOutlined, FilterOutlined } from "@ant-design/icons";

/**
 * Generic Declarative Filter Bar Component
 * Accepts search input, extra filter controls, and action buttons.
 */
export const GenericFilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  extraFilters,
  actions,
  onClear,
  showClear = false,
  className = "",
  style = {},
}) => {
  return (
    <div
      className={`generic-filter-bar ${className}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "16px",
        ...style,
      }}
    >
      <Space wrap size="middle" style={{ flex: 1 }}>
        {onSearchChange && (
          <Input
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            style={{ minWidth: "220px", maxWidth: "320px", borderRadius: "6px" }}
          />
        )}
        {extraFilters}
        {showClear && onClear && (
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
            type="text"
            style={{ color: "#64748b" }}
          >
            Clear Filters
          </Button>
        )}
      </Space>

      {actions && (
        <Space wrap size="middle">
          {actions}
        </Space>
      )}
    </div>
  );
};

export default GenericFilterBar;
