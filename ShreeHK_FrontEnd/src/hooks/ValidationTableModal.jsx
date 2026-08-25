import React from "react";
import { Table } from "antd";
import WarningActionModal from "../components/common/modals/WarningActionModal";
import { Info, Check, AlertCircle } from "lucide-react";
import { SkuLink } from "./useSkuModalAction";

const EXIST_COLUMNS = [
    {
        title: "No.",
        dataIndex: "no",
        width: 60,
        render: (_, __, index) => <span style={{ color: "#334155" }}>{index + 1}</span>,
    },
    {
        title: "SKU",
        dataIndex: "sku",
        width: 160,
        render: (text, record) => (
            <span style={{ fontWeight: 600 }}>
                <SkuLink sku={text} record={record} />
            </span>
        ),
    },
    {
        title: "Pcs",
        dataIndex: "polish_pcs",
        width: 80,
        align: "center",
        render: (val, r) => <span style={{ color: "#475569" }}>{val || r.pPcs || "-"}</span>,
    },
    {
        title: "Carat",
        dataIndex: "polish_carat",
        width: 90,
        align: "center",
        render: (val, r) => <span style={{ color: "#475569" }}>{val || r.pCarat || "-"}</span>,
    },
    {
        title: "Price",
        dataIndex: "price",
        width: 100,
        align: "center",
        render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
    },
    {
        title: "Amount",
        dataIndex: "amount",
        width: 110,
        align: "center",
        render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
    },
];

const ValidationTableModal = ({
    isVisible,
    onClose,
    onSave,
    existData = [],
    items = [],
    message,
    loading = false,
}) => {
    const duplicates = Array.isArray(existData) ? existData : [];
    const hasDuplicates = duplicates.length > 0;
    const normalizedItems = Array.isArray(items) ? items.filter((i) => i.sku) : [];
    const tableDataSource = hasDuplicates ? duplicates : normalizedItems;
    const itemCount = tableDataSource.length;

    const bannerBg = hasDuplicates ? "#FEF2F2" : "#F0FBF6";
    const bannerBorder = hasDuplicates ? "#FEE2E2" : "#E6F7EF";
    const bannerTitleColor = hasDuplicates ? "#991B1B" : "#047857";
    const bannerSubtitleColor = hasDuplicates ? "#7F1D1D" : "#4B5563";
    const pillBg = hasDuplicates ? "#FEE2E2" : "#D1F5EA";
    const pillTextColor = hasDuplicates ? "#991B1B" : "#047857";

    const defaultTitle = hasDuplicates
        ? "Existing products found"
        : "No existing products found";
    const defaultSubtitle = hasDuplicates
        ? "Some SKUs already exist in stock. Duplicate SKUs will get a suffix."
        : "The following items are safe to proceed. You can save this inward entry.";

    return (
        <WarningActionModal
            isVisible={isVisible}
            onClose={onClose}
            onSave={onSave}
            saveLoading={loading}
            hasDuplicates={hasDuplicates}
        >
            {/* Top Banner */}
            <div
                style={{
                    backgroundColor: bannerBg,
                    border: `1px solid ${bannerBorder}`,
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    {hasDuplicates ? (
                        <AlertCircle size={22} style={{ color: "#DC2626", marginTop: "2px", flexShrink: 0 }} />
                    ) : (
                        <Info size={22} style={{ color: "#10B981", marginTop: "2px", flexShrink: 0 }} />
                    )}
                    <div>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: bannerTitleColor }}>
                            {message || defaultTitle}
                        </div>
                        <div style={{ fontSize: "13px", color: bannerSubtitleColor, marginTop: "2px" }}>
                            {defaultSubtitle}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: pillBg,
                        color: pillTextColor,
                        borderRadius: "9999px",
                        padding: "6px 14px",
                        fontWeight: 600,
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexShrink: 0,
                    }}
                >
                    {hasDuplicates ? (
                        <>
                            <AlertCircle size={14} style={{ color: pillTextColor }} />
                            <span>{itemCount} {itemCount === 1 ? "Duplicate" : "Duplicates"}</span>
                        </>
                    ) : (
                        <>
                            <div
                                style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    backgroundColor: "#10B981",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Check size={12} style={{ color: "#FFFFFF", strokeWidth: 3 }} />
                            </div>
                            <span>{itemCount} {itemCount === 1 ? "Item" : "Items"}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Custom Table styling wrapper */}
            <div
                className="custom-warning-table-wrapper"
                style={{
                    border: "1px solid #EEF2FF",
                    borderRadius: "12px",
                    overflow: "hidden",
                }}
            >
                <style>{`
                    .custom-warning-table-wrapper .ant-table-thead > tr > th {
                        background-color: #F4F5FF !important;
                        color: #1E293B !important;
                        font-weight: 700 !important;
                        font-size: 13px !important;
                        border-bottom: 1px solid #E2E8F0 !important;
                        padding: 12px 16px !important;
                    }
                    .custom-warning-table-wrapper .ant-table-tbody > tr > td {
                        padding: 12px 16px !important;
                        border-bottom: 1px solid #F1F5F9 !important;
                        font-size: 14px !important;
                    }
                    .custom-warning-table-wrapper .ant-table-tbody > tr:last-child > td {
                        border-bottom: none !important;
                    }
                `}</style>
                <Table
                    columns={EXIST_COLUMNS}
                    dataSource={tableDataSource.map((row, index) => ({
                        ...row,
                        key: row.sku || index,
                    }))}
                    pagination={false}
                    size="small"
                    scroll={{ x: "max-content" }}
                />
            </div>
        </WarningActionModal>
    );
};

export default ValidationTableModal;
