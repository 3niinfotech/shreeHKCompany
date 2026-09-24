import React, { useMemo } from "react";
import {
  Modal,
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Spin,
  Empty,
  Space,
  Row,
  Col,
} from "antd";
import {
  PrinterOutlined,
  EyeOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useFetchApi } from "../../../api/ApiFunction";
import { ENDPOINTS } from "../../../api/endpoints";
import dayjs from "dayjs";
import { SkuLink } from "../../../hooks/useSkuModalAction";

const { Text, Title } = Typography;

const AdvanceAssignedInvoiceModal = ({
  open,
  onClose,
  record,
  resolvePartyName,
}) => {
  const invoiceId = record?.invoice_id || record?.invoice || "";
  const rawType = record?.type || "outward";
  const isOutward =
    String(rawType).toLowerCase() === "cr" ||
    String(rawType).toLowerCase() === "credit" ||
    String(rawType).toLowerCase() === "outward";
  const type = isOutward ? "outward" : "inward";

  const {
    data: apiResponse,
    isLoading,
    isFetching,
  } = useFetchApi(
    `assignedInvoice_${invoiceId}_${type}`,
    ENDPOINTS.advance.assignedInvoice,
    { invoiceId, type },
    "GET",
    { enabled: Boolean(open && invoiceId) }
  );

  const data = apiResponse?.Data || {};
  const header = data?.header || null;
  const products = data?.products || [];
  const transactions = data?.transactions || [];

  const partyDisplayName =
    header?.party_name ||
    record?.party_name ||
    (resolvePartyName
      ? resolvePartyName(header?.party || record?.party)
      : header?.party || record?.party) ||
    "—";

  // Calculate Product Totals
  const productTotals = useMemo(() => {
    return products.reduce(
      (acc, item) => {
        acc.rPcs += Number(item.rought_pcs || 0);
        acc.rCarat += Number(item.rought_carat || 0);
        acc.pPcs += Number(item.polish_pcs || 0);
        acc.pCarat += Number(item.polish_carat || 0);
        acc.cost += Number(item.cost || 0);
        const price = Number(
          item.sell_price || item.price || item.purchase_price || 0
        );
        acc.price += price;
        const amt = Number(
          item.sell_amount || item.amount || item.purchase_amount || 0
        );
        acc.amount += amt;
        return acc;
      },
      { rPcs: 0, rCarat: 0, pPcs: 0, pCarat: 0, cost: 0, price: 0, amount: 0 }
    );
  }, [products]);

  // Calculate Transaction Totals
  const transactionTotal = useMemo(() => {
    return transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // Format Helpers
  const fmtNum = (val, dec = 2) => {
    if (val == null || val === "" || isNaN(Number(val))) return "—";
    return Number(val).toLocaleString("en-US", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    if (dayjs(d).isValid()) return dayjs(d).format("DD-MM-YYYY");
    return String(d).split("T")[0] || "—";
  };

  const handlePrint = () => {
    window.print();
  };

  // Stone Columns (Ultra-Compact Padding & Font)
  const productColumns = [
    {
      title: "No.",
      width: 48,
      align: "center",
      render: (_, __, i) => (
        <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>{i + 1}</span>
      ),
    },
    {
      title: "SKU / Diamond",
      dataIndex: "sku",
      width: 135,
      render: (text, item) =>
        text ? (
          <div style={{ display: "inline-block", fontSize: 12 }}>
            <SkuLink sku={text} record={item} />
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "R.Pcs",
      dataIndex: "rought_pcs",
      width: 65,
      align: "right",
      render: (v) => v || "—",
    },
    {
      title: "R.Carat",
      dataIndex: "rought_carat",
      width: 75,
      align: "right",
      render: (v) => fmtNum(v, 3),
    },
    {
      title: "P.Pcs",
      dataIndex: "polish_pcs",
      width: 65,
      align: "right",
      render: (v) => v || "—",
    },
    {
      title: "P.Carat",
      dataIndex: "polish_carat",
      width: 75,
      align: "right",
      render: (v) => (
        <Text strong style={{ color: "#0f172a", fontSize: 12 }}>
          {fmtNum(v, 3)}
        </Text>
      ),
    },
    {
      title: "Cost",
      dataIndex: "cost",
      width: 80,
      align: "right",
      render: (v) => fmtNum(v, 2),
    },
    {
      title: "Price",
      dataIndex: "sell_price",
      width: 85,
      align: "right",
      render: (v, item) => {
        const val =
          v != null && Number(v) > 0
            ? v
            : item.price || item.purchase_price;
        return fmtNum(val, 2);
      },
    },
    {
      title: "Amount",
      dataIndex: "sell_amount",
      width: 100,
      align: "right",
      render: (v, item) => {
        const val =
          v != null && Number(v) > 0
            ? v
            : item.amount || item.purchase_amount;
        return (
          <Text strong style={{ color: "#16a34a", fontSize: 12 }}>
            {fmtNum(val, 2)}
          </Text>
        );
      },
    },
    {
      title: "Shape",
      dataIndex: "shape",
      width: 80,
      align: "center",
      render: (v) =>
        v ? (
          <Tag color="blue" style={{ margin: 0, padding: "0 4px", fontSize: 11, lineHeight: "17px" }}>
            {v}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Color",
      dataIndex: "color",
      width: 65,
      align: "center",
      render: (v) =>
        v ? (
          <Tag color="purple" style={{ margin: 0, padding: "0 4px", fontSize: 11, lineHeight: "17px" }}>
            {v}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Clarity",
      dataIndex: "clarity",
      width: 70,
      align: "center",
      render: (v) =>
        v ? (
          <Tag color="cyan" style={{ margin: 0, padding: "0 4px", fontSize: 11, lineHeight: "17px" }}>
            {v}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Cut / Polish / Sym",
      width: 120,
      align: "center",
      render: (_, r) => {
        const parts = [r.cut, r.polish, r.symmetry].filter(Boolean);
        return parts.length > 0 ? parts.join(" • ") : "—";
      },
    },
    {
      title: "Lab",
      dataIndex: "lab",
      width: 65,
      align: "center",
      render: (v) =>
        v ? (
          <Tag color="geekblue" style={{ margin: 0, padding: "0 4px", fontSize: 11, lineHeight: "17px" }}>
            {v}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Location",
      dataIndex: "location",
      width: 80,
      render: (v) => v || "—",
    },
    {
      title: "Remark",
      dataIndex: "remark",
      ellipsis: true,
      render: (v) => v || "—",
    },
  ];

  // Payment Transaction Columns
  const transactionColumns = [
    {
      title: "No.",
      width: 50,
      align: "center",
      render: (_, __, i) => (
        <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>{i + 1}</span>
      ),
    },
    {
      title: "Transaction Date",
      dataIndex: "date",
      width: 130,
      render: (d) => fmtDate(d),
    },
    {
      title: "Subgroup / Book Account",
      dataIndex: "subgroup_name",
      width: 180,
      render: (v, t) => (
        <Tag color="cyan" style={{ fontSize: 11, padding: "0 6px", lineHeight: "18px" }}>
          {v || t.book || "—"}
        </Tag>
      ),
    },
    {
      title: "Party Name",
      dataIndex: "party_name",
      width: 200,
      render: (v, t) => (
        <Text strong style={{ color: "#1e293b", fontSize: 12 }}>
          {v || t.party || "—"}
        </Text>
      ),
    },
    {
      title: "Description / Narration",
      dataIndex: "description",
      render: (desc, t) => {
        const parts = [t.book, desc].filter(Boolean);
        return parts.join(" - ") || "—";
      },
    },
    {
      title: "Paid Amount",
      dataIndex: "amount",
      width: 130,
      align: "right",
      render: (v) => (
        <Text strong style={{ color: "#16a34a", fontSize: 13 }}>
          {fmtNum(v, 2)}
        </Text>
      ),
    },
  ];

  const totalFinalAmount =
    header?.final_amount != null ? Number(header.final_amount) : 0;
  const totalPaidAmount =
    header?.paid_amount != null
      ? Number(header.paid_amount)
      : transactionTotal;
  const totalDueAmount =
    header?.due_amount != null
      ? Number(header.due_amount)
      : Math.max(0, totalFinalAmount - totalPaidAmount);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      closable={false}
      maskClosable={false}
      keyboard={false}
      width={1600}
      rootClassName="advance-assigned-invoice-modal"
      wrapClassName="advance-assigned-invoice-modal"
      style={{ top: 10, maxWidth: "96vw" }}
      centered={false}
      destroyOnHidden
      title={
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 4,
          }}
        >
          {/* Left Header with Icon, Title and Type Tag */}
          <Space align="center" size="middle">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: isOutward
                  ? "linear-gradient(135deg, #0284c7 0%, #1e3a8a 100%)"
                  : "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              <EyeOutlined style={{ fontSize: 18 }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary, #0f172a)",
                  letterSpacing: "-0.01em",
                }}
              >
                Advance Assigned Invoice Details
              </span>
              <Tag
                color={isOutward ? "processing" : "purple"}
                style={{
                  fontWeight: 600,
                  fontSize: 11,
                  borderRadius: 4,
                  padding: "1px 6px",
                  textTransform: "uppercase",
                }}
              >
                {isOutward ? "Sale / Outward" : "Purchase / Inward"}
              </Tag>
            </div>
          </Space>

          {/* Right Header: Print Button */}
          <Button
            type="primary"
            ghost
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            style={{
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Print
          </Button>
        </div>
      }
      footer={[
        <Button
          key="close"
          type="primary"
          onClick={onClose}
          style={{ minWidth: 100, borderRadius: 6 }}
        >
          Close
        </Button>,
      ]}
      styles={{
        header: {
          paddingInlineEnd: 0,
          paddingRight: 0,
          width: "100%",
        },
        body: {
          padding: "14px 20px",
          maxHeight: "calc(100vh - 70px)",
          overflowY: "auto",
        },
      }}
    >
      <style>{`
        .advance-assigned-invoice-modal .ant-modal-header,
        .advance-assigned-invoice-modal .ant-modal-title,
        .advance-assigned-invoice-modal .ant-modal-content > .ant-modal-header {
          padding-inline-end: 0 !important;
          padding-right: 0 !important;
          width: 100% !important;
        }
        .assigned-invoice-compact-table .ant-table-tbody > tr {
          height: 36px !important;
        }
        .assigned-invoice-compact-table .ant-table-cell {
          padding: 5px 8px !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
        }
        .assigned-invoice-compact-table .ant-table-thead > tr > th {
          padding: 7px 8px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          background: #f1f5f9 !important;
          color: #334155 !important;
        }
        .assigned-invoice-compact-table .ant-table-summary .ant-table-cell {
          padding: 6px 8px !important;
          font-size: 12px !important;
        }
      `}</style>

      <Spin
        spinning={isLoading || isFetching}
        tip="Loading Invoice & Stones Details..."
      >
        {!header && !isLoading ? (
          <Empty
            style={{ padding: "40px 0" }}
            description="No assigned invoice found for this advance payment record."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Top Stat Cards Grid */}
            <Row gutter={[10, 10]}>
              {/* Card 1: Party & Reference */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  size="small"
                  bordered
                  style={{
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space direction="vertical" size={5} style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: 3,
                      }}
                    >
                      <UserOutlined style={{ color: "#0284c7" }} />
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}
                      >
                        PARTY & IDENTITY
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Party
                      </span>
                      <Text
                        strong
                        ellipsis={{ tooltip: partyDisplayName }}
                        style={{ color: "#1e293b", fontSize: 12.5, maxWidth: "60%", textAlign: "right" }}
                      >
                        {partyDisplayName}
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Invoice No
                      </span>
                      <Text strong style={{ color: "#0284c7", fontSize: 12 }}>
                        {header?.invoiceno || header?.invoice || invoiceId || "—"}
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Entry No
                      </span>
                      <Text strong style={{ fontSize: 12 }}>{header?.entryno || "—"}</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Reference
                      </span>
                      <Text style={{ fontSize: 12 }}>{header?.reference || "—"}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* Card 2: Dates & Timeline */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  size="small"
                  bordered
                  style={{
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space direction="vertical" size={5} style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: 3,
                      }}
                    >
                      <CalendarOutlined style={{ color: "#6366f1" }} />
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}
                      >
                        DATES & SCHEDULE
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#ede9fe",
                          color: "#6d28d9",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Date
                      </span>
                      <Text strong style={{ fontSize: 12 }}>{fmtDate(header?.date)}</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#ede9fe",
                          color: "#6d28d9",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Invoice Date
                      </span>
                      <Text strong style={{ fontSize: 12 }}>{fmtDate(header?.invoicedate || header?.date)}</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#ede9fe",
                          color: "#6d28d9",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Terms
                      </span>
                      <Tag color="blue" style={{ margin: 0, borderRadius: 4, fontSize: 11 }}>
                        {header?.terms ? `${header.terms} Days` : "0 Days"}
                      </Tag>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#ede9fe",
                          color: "#6d28d9",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Due Date
                      </span>
                      <Text strong style={{ color: "#ea580c", fontSize: 12 }}>
                        {fmtDate(header?.duedate)}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* Card 3: Financial Summary */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  size="small"
                  bordered
                  style={{
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space direction="vertical" size={5} style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: 3,
                      }}
                    >
                      <DollarCircleOutlined style={{ color: "#16a34a" }} />
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}
                      >
                        FINANCIAL SETTLEMENT
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Total Bill
                      </span>
                      <Text strong style={{ color: "#0f172a", fontSize: 12 }}>
                        {fmtNum(totalFinalAmount, 2)}
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Paid Amount
                      </span>
                      <Text strong style={{ color: "#16a34a", fontSize: 12 }}>
                        {fmtNum(totalPaidAmount, 2)}
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Due Amount
                      </span>
                      <Text strong style={{ color: "#dc2626", fontSize: 12 }}>
                        {fmtNum(totalDueAmount, 2)}
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Total Stones Amt
                      </span>
                      <Text strong style={{ color: "#16a34a", fontSize: 12 }}>
                        {fmtNum(productTotals.amount, 2)}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* Card 4: Inventory & Narration */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  size="small"
                  bordered
                  style={{
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space direction="vertical" size={5} style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: 3,
                      }}
                    >
                      <FileTextOutlined style={{ color: "#0284c7" }} />
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}
                      >
                        INVENTORY & NARRATION
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Stones Count
                      </span>
                      <Tag color="cyan" style={{ margin: 0, fontWeight: 600 }}>
                        {products.length} Stones
                      </Tag>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                        }}
                      >
                        Polish Carats
                      </span>
                      <Text strong style={{ color: "#0284c7", fontSize: 12 }}>
                        {fmtNum(productTotals.pCarat, 3)} Cts
                      </Text>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          fontWeight: 600,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 4,
                          alignSelf: "flex-start",
                        }}
                      >
                        Narration
                      </span>
                      <Text
                        ellipsis={{ tooltip: header?.narretion || header?.narration || header?.description || "—" }}
                        style={{ color: "#334155", fontSize: 11.5, marginTop: 2 }}
                      >
                        {header?.narretion ||
                          header?.narration ||
                          header?.description ||
                          "—"}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* Section 1: Attached Stones Breakdown Table */}
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Space size="small">
                    <DatabaseOutlined style={{ color: "#0284c7", fontSize: 16 }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      Attached Stones Breakdown
                    </span>
                    <Tag
                      color="blue"
                      style={{ borderRadius: 10, padding: "0 8px" }}
                    >
                      {products.length} Items
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Click SKU to inspect stone history & certificate details
                  </Text>
                </div>
              }
            >
              <Table
                className="assigned-invoice-compact-table"
                dataSource={products}
                columns={productColumns}
                rowKey={(r, i) => r.id || r.sku || i}
                size="small"
                bordered
                pagination={false}
                scroll={{ x: 1400, y: 185 }}
                summary={() =>
                  products.length > 0 ? (
                    <Table.Summary fixed>
                      <Table.Summary.Row
                        style={{
                          background: "#f1f5f9",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        <Table.Summary.Cell index={0} align="center">
                          Total
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          {products.length} Stones
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          {productTotals.rPcs || "—"}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          {productTotals.rCarat > 0
                            ? fmtNum(productTotals.rCarat, 3)
                            : "—"}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          {productTotals.pPcs || "—"}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Text strong style={{ color: "#0f172a" }}>
                            {fmtNum(productTotals.pCarat, 3)}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          {productTotals.cost > 0
                            ? fmtNum(productTotals.cost, 2)
                            : "—"}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} align="right">
                          {productTotals.price > 0
                            ? fmtNum(productTotals.price, 2)
                            : "—"}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} align="right">
                          <Text strong style={{ color: "#16a34a" }}>
                            {fmtNum(productTotals.amount, 2)}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={9} colSpan={7} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  ) : null
                }
              />
            </Card>

            {/* Section 2: Paid Transactions History Table */}
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Space size="small">
                    <HistoryOutlined style={{ color: "#16a34a", fontSize: 16 }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      Paid Transactions & Accounting Receipts
                    </span>
                    <Tag
                      color="green"
                      style={{ borderRadius: 10, padding: "0 8px" }}
                    >
                      {transactions.length} Records
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Sequential ledger transactions linked to this invoice
                  </Text>
                </div>
              }
            >
              <Table
                className="assigned-invoice-compact-table"
                dataSource={transactions}
                columns={transactionColumns}
                rowKey={(t, i) => t.id || i}
                size="small"
                bordered
                pagination={false}
                scroll={{ x: 1000, y: 185 }}
                locale={{
                  emptyText:
                    "No prior transactions found for this invoice.",
                }}
                summary={() =>
                  transactions.length > 0 ? (
                    <Table.Summary fixed>
                      <Table.Summary.Row
                        style={{
                          background: "#f1f5f9",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        <Table.Summary.Cell
                          index={0}
                          colSpan={5}
                          align="right"
                        >
                          Total Payments Received / Applied:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text
                            strong
                            style={{ color: "#16a34a", fontSize: 14 }}
                          >
                            {fmtNum(transactionTotal, 2)}
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  ) : null
                }
              />
            </Card>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default AdvanceAssignedInvoiceModal;
