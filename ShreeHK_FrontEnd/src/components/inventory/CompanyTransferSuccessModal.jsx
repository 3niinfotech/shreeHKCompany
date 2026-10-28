import React from "react";
import { Modal, Button, Table, Typography, Tag } from "antd";
import { CheckCircle2, ArrowRight, Printer, Calendar, Building, FileText } from "lucide-react";

const { Text } = Typography;

/**
 * Standard, corporate ERP Company Transfer Success Modal.
 * Clean, static layout without animations or AI gimmicks.
 */
const CompanyTransferSuccessModal = ({
  open,
  onClose,
  onPrint,
  data = {},
}) => {
  const {
    transferNo = "",
    transferDate = "",
    sourceCompanyName = "",
    targetCompanyName = "",
    sourceInvoiceNo = "",
    targetInvoiceNo = "",
    notes = "",
    items = [],
    totalPcs = 0,
    totalCarat = 0,
    totalAmount = 0,
    sourceOutwardId = null,
  } = data;

  const columns = [
    {
      title: "#",
      width: 45,
      align: "center",
      render: (_, __, idx) => idx + 1,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      width: 130,
      render: (val, r) => (
        <Text strong style={{ color: "var(--color-navy, #1e293b)" }}>
          {val || r.name || "—"}
        </Text>
      ),
    },
    {
      title: "Shape",
      dataIndex: "shape",
      width: 75,
      align: "center",
      render: (v) => v || "—",
    },
    {
      title: "Color / Clar",
      width: 100,
      align: "center",
      render: (_, r) => `${r.color || "—"} / ${r.clarity || "—"}`,
    },
    {
      title: "Pcs",
      dataIndex: "pcs",
      width: 60,
      align: "center",
      render: (v) => v || 1,
    },
    {
      title: "Carat",
      dataIndex: "carat",
      width: 80,
      align: "center",
      render: (v) => {
        const val = Number(v || 0);
        return val ? val.toFixed(2) : "—";
      },
    },
    {
      title: "Rate ($/ct)",
      dataIndex: "price",
      width: 100,
      align: "right",
      render: (v) => (
        <span style={{ color: "#16a34a", fontWeight: 500 }}>
          ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: "Amount ($)",
      dataIndex: "amount",
      width: 110,
      align: "right",
      render: (v) => (
        <span style={{ color: "#16a34a", fontWeight: 600 }}>
          ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      centered
      destroyOnHidden
      maskClosable={false}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              backgroundColor: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} style={{ color: "#16a34a" }} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-navy, #1e293b)", lineHeight: 1.2 }}>
              Company Inter-Transfer Confirmed
            </div>
            <div style={{ fontSize: "12px", fontWeight: 400, color: "#64748b", marginTop: 2 }}>
              Stock transfer between companies has been successfully processed
            </div>
          </div>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose} style={{ minWidth: 80 }}>
          Close
        </Button>,
        sourceOutwardId && onPrint ? (
          <Button
            key="print"
            type="primary"
            icon={<Printer size={15} style={{ marginRight: 4, verticalAlign: "middle" }} />}
            onClick={() => onPrint(sourceOutwardId)}
            style={{
              backgroundColor: "var(--color-primary, #1e3a8a)",
              borderColor: "var(--color-primary, #1e3a8a)",
              fontWeight: 600,
              minWidth: 130,
            }}
          >
            Print Sale Bill
          </Button>
        ) : null,
      ]}
      styles={{
        content: {
          borderRadius: 8,
          padding: "20px 24px",
        },
        body: {
          paddingTop: 14,
        },
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Transfer Route Banner */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Building size={14} style={{ color: "#64748b" }} />
              <span style={{ fontSize: "12px", color: "#64748b" }}>From:</span>
              <Tag style={{ margin: 0, fontWeight: 600, fontSize: "12px" }}>
                {sourceCompanyName || "Source Company"}
              </Tag>
            </div>
            <ArrowRight size={14} style={{ color: "var(--color-primary, #1e3a8a)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>To:</span>
              <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: "12px" }}>
                {targetCompanyName || "Destination Company"}
              </Tag>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px" }}>
            {transferDate ? (
              <span style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Calendar size={12} /> {transferDate}
              </span>
            ) : null}
            {transferNo ? (
              <Tag color="geekblue" style={{ margin: 0, fontWeight: 600 }}>
                {transferNo}
              </Tag>
            ) : null}
          </div>
        </div>

        {/* Invoices Generated Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 600, textTransform: "uppercase" }}>
              Sale Bill (Source Outward)
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#166534", marginTop: 2 }}>
              {sourceInvoiceNo || "Auto-Generated"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 600, textTransform: "uppercase" }}>
              Purchase Bill (Target Inward)
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e40af", marginTop: 2 }}>
              {targetInvoiceNo || "Auto-Generated"}
            </div>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Total Stones
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
              {totalPcs || items.length || 0} pcs
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Total Weight
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
              {Number(totalCarat || 0).toFixed(2)} ct
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#15803d", textTransform: "uppercase", fontWeight: 600 }}>
              Total Amount
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#16a34a", marginTop: 2 }}>
              ${Number(totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {notes ? (
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={13} />
            <span>Note: {notes}</span>
          </div>
        ) : null}

        {/* Items Table */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: 6 }}>
            Transferred Diamond Item(s)
          </div>
          <Table
            dataSource={items}
            columns={columns}
            rowKey={(r, i) => r.id || r.sku || i}
            size="small"
            bordered
            pagination={items.length > 5 ? { pageSize: 5, size: "small" } : false}
            scroll={{ y: 200 }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default CompanyTransferSuccessModal;
