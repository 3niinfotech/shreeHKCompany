import React from "react";
import { Modal, Button, Table, Typography } from "antd";
import { CheckCircle2, Receipt, Printer, Calendar, User, Building } from "lucide-react";

const { Text } = Typography;

/**
 * Standard, corporate ERP Sale Success Modal.
 * Clean, static layout without animations or AI gimmicks.
 */
const SaleSuccessModal = ({
  open,
  onClose,
  onPrint,
  actionType = "sale",
  data = {},
}) => {
  const {
    invoiceNo = "",
    entryNo = "",
    date = "",
    partyName = "",
    companyName = "",
    items = [],
    totalPcs = 0,
    totalCarat = 0,
    totalAmount = 0,
  } = data;

  const isMemo = actionType === "memo";
  const actionLabel = isMemo
    ? "Memo"
    : actionType === "consign"
    ? "Consignment"
    : actionType === "lab"
    ? "Lab"
    : actionType === "export"
    ? "Export"
    : "Sale";

  const titleText = isMemo
    ? "Placed On Memo Successfully"
    : `${actionLabel} Completed Successfully`;

  const subtitleText = isMemo
    ? "Memo transaction has been recorded into the system"
    : `${actionLabel} transaction has been recorded into the system`;

  const itemsTableTitle = isMemo
    ? "Memo Diamond Item(s)"
    : `${actionLabel} Diamond Item(s)`;

  const printButtonText = isMemo ? "Print Memo" : "Print Invoice";
  const invoiceLabel = isMemo ? "Memo No" : "Invoice No";

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
          {val || r.name || r.diamond_no || "—"}
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
      render: (_, r) => `${r.color || "—"} / ${r.clarity || r.mainClarity || "—"}`,
    },
    {
      title: "Pcs",
      dataIndex: "polishPcs",
      width: 60,
      align: "center",
      render: (v, r) => v ?? r.pcs ?? 1,
    },
    {
      title: "Carat",
      dataIndex: "polishCarat",
      width: 80,
      align: "center",
      render: (v, r) => {
        const val = Number(v ?? r.carat ?? 0);
        return val ? val.toFixed(2) : "—";
      },
    },
    {
      title: "Price ($/ct)",
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
              {titleText}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 400, color: "#64748b", marginTop: 2 }}>
              {subtitleText}
            </div>
          </div>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose} style={{ minWidth: 80 }}>
          Close
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<Printer size={15} style={{ marginRight: 4, verticalAlign: "middle" }} />}
          onClick={onPrint}
          style={{
            backgroundColor: "var(--color-primary, #1e3a8a)",
            borderColor: "var(--color-primary, #1e3a8a)",
            fontWeight: 600,
            minWidth: 120,
          }}
        >
          {printButtonText}
        </Button>,
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
        {/* Info Grid */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "10px 14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px 16px",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} /> Date
            </div>
            <div style={{ fontWeight: 600, color: "#1e293b" }}>{date || "—"}</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Receipt size={12} /> {invoiceLabel}
            </div>
            <div style={{ fontWeight: 600, color: "#1e293b" }}>{invoiceNo || "Auto-Generated"}</div>
          </div>
          {entryNo ? (
            <div>
              <div style={{ color: "#64748b", fontSize: "11px", marginBottom: 2 }}>Outward No</div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>{entryNo}</div>
            </div>
          ) : null}
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <User size={12} /> Customer / Party
            </div>
            <div style={{ fontWeight: 600, color: "#1e293b" }}>{partyName || "—"}</div>
          </div>
          {companyName ? (
            <div>
              <div style={{ color: "#64748b", fontSize: "11px", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <Building size={12} /> Company
              </div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>{companyName}</div>
            </div>
          ) : null}
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

        {/* Items Table */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: 6 }}>
            {itemsTableTitle}
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

export default SaleSuccessModal;
