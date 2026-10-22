import React from "react";
import { Table, Tag, Button, Alert, Space, Typography } from "antd";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import BaseModal from "../../../components/common/modals/BaseModal";

const { Text } = Typography;

const LabImportMismatchModal = ({
  isOpen,
  onClose,
  discrepancies = [],
  onAcceptLabSpecs,
  onKeepExcelSpecs,
}) => {
  const hasHighSeverity = discrepancies.some((d) => d.severity === "high");

  const columns = [
    {
      title: "Row",
      dataIndex: "rowNo",
      key: "rowNo",
      width: 60,
      render: (val) => <Text type="secondary">#{val}</Text>,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 140,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Report #",
      dataIndex: "reportNo",
      key: "reportNo",
      width: 150,
      render: (text, record) => (
        <Space size={4}>
          <Text>{record.lab || "GIA"} #{text}</Text>
          {record.isMock && (
            <Tag color="orange" style={{ fontSize: 10, padding: "0 4px" }}>MOCK</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Field",
      dataIndex: "field",
      key: "field",
      width: 120,
      render: (text, record) => (
        <Tag color={record.severity === "high" ? "error" : "warning"}>
          {text}
        </Tag>
      ),
    },
    {
      title: "Excel Value",
      dataIndex: "excelValue",
      key: "excelValue",
      width: 130,
      render: (text) => (
        <span style={{ color: "#dc2626", textDecoration: "line-through", fontWeight: 500 }}>
          {text}
        </span>
      ),
    },
    {
      title: "Official Lab Value",
      dataIndex: "labValue",
      key: "labValue",
      width: 140,
      render: (text) => (
        <span style={{ color: "#16a34a", fontWeight: 700 }}>
          {text}
        </span>
      ),
    },
    {
      title: "Discrepancy",
      key: "diff",
      width: 130,
      render: (_, record) => (
        <Text style={{ fontSize: 12, color: record.severity === "high" ? "#dc2626" : "#d97706" }}>
          {record.diff ? `Diff: ${record.diff}` : "Value mismatch"}
        </Text>
      ),
    },
  ];

  const isAnyMock = (discrepancies || []).some((d) => d.isMock);

  const modalFooter = [
    <Button key="cancel" onClick={onClose}>
      Cancel Import
    </Button>,
    <Button key="keep" type="default" onClick={onKeepExcelSpecs}>
      Keep Excel Values
    </Button>,
    <Button
      key="accept"
      type="primary"
      style={{ background: isAnyMock ? undefined : "#1e3a8a" }}
      icon={<CheckCircle2 size={16} />}
      disabled={isAnyMock}
      title={isAnyMock ? "Disabled for mock simulation data" : undefined}
      onClick={onAcceptLabSpecs}
    >
      {isAnyMock ? "Apply Disabled (Mock Preview Only)" : "Update to Official Lab Specs"}
    </Button>,
  ];

  const modalContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {isAnyMock && (
        <Alert
          type="info"
          showIcon
          message={
            <span>
              <Tag color="orange" style={{ marginRight: 6 }}>MOCK DATA</Tag>
              Simulation Mode Active
            </span>
          }
          description="Discrepancies were evaluated against a mock provider. Per ERP data protection rules, mock values cannot overwrite diamond specifications. Please click 'Keep Excel Values' to import with entered specifications."
          style={{ borderRadius: 8 }}
        />
      )}

      <Alert
        type={hasHighSeverity ? "error" : "warning"}
        showIcon
        icon={<AlertTriangle size={20} color={hasHighSeverity ? "#dc2626" : "#d97706"} />}
        message={
          <span style={{ fontWeight: 700 }}>
            {discrepancies.length} Specification Discrepanc{discrepancies.length === 1 ? "y" : "ies"} Detected
          </span>
        }
        description={
          <div style={{ fontSize: 12, marginTop: 4 }}>
            The imported Excel sheet contains diamond specifications that differ from official laboratory records (e.g., carat weight difference &gt; 0.01ct, color, clarity, or shape). You can automatically synchronize with official lab values or proceed with entered values.
          </div>
        }
        style={{ borderRadius: 8 }}
      />

      <Table
        size="small"
        bordered
        pagination={{ pageSize: 8, size: "small" }}
        columns={columns}
        dataSource={discrepancies.map((d, index) => ({ ...d, key: `disc_${index}` }))}
        onRow={(record) => ({
          style: {
            backgroundColor: record.severity === "high" ? "#fef2f2" : "#fffbeb",
          },
        })}
        style={{ borderRadius: 6, overflow: "hidden" }}
      />
    </div>
  );

  return (
    <BaseModal
      title={
        <Space align="center">
          <ShieldAlert size={20} color="#ea580c" />
          <span>Excel Import: Lab Specification Discrepancies</span>
        </Space>
      }
      subtitle="Review differences between Excel values and official lab records."
      isOpen={isOpen}
      onClose={onClose}
      width={900}
      content={modalContent}
      footer={modalFooter}
    />
  );
};

export default LabImportMismatchModal;
