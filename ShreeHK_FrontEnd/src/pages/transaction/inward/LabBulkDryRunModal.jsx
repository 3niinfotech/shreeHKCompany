import React from "react";
import { Modal, Button, Progress, Alert, Space, Typography, Row, Col, Card, Tag } from "antd";
import { Zap, ShieldCheck, Database, Layers, AlertCircle, ArrowRight } from "lucide-react";
import BaseModal from "../../../components/common/modals/BaseModal";

const { Text, Title } = Typography;

const LabBulkDryRunModal = ({
  isOpen,
  onClose,
  dryRunData,
  onConfirmVerify,
  onSkipVerify,
  isVerifying = false,
  progress = 0,
}) => {
  const {
    total = 0,
    cachedCount = 0,
    estimatedLiveLookups = 0,
    dailyCap = 500,
    dailyLookupsRemaining = 500,
  } = dryRunData || {};

  const isQuotaExceeded = estimatedLiveLookups > dailyLookupsRemaining;

  const modalFooter = isVerifying ? null : [
    <Button key="cancel" onClick={onClose}>
      Cancel
    </Button>,
    <Button key="skip" type="default" onClick={onSkipVerify}>
      Load Without Verification
    </Button>,
    <Button
      key="verify"
      type="primary"
      style={{ background: "#1e3a8a" }}
      icon={<Zap size={15} />}
      disabled={isQuotaExceeded && estimatedLiveLookups > 0}
      onClick={onConfirmVerify}
    >
      Proceed with Lab Verification
    </Button>,
  ];

  const modalContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {isVerifying ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            Verifying Certificates with Laboratory Registry...
          </Title>
          <Progress
            percent={progress}
            status="active"
            strokeColor={{ from: "#108ee9", to: "#87d068" }}
            style={{ marginBottom: 12 }}
          />
          <Text type="secondary">
            Fetching official grading specs, detecting discrepancies, and matching carat tolerances...
          </Text>
        </div>
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            icon={<ShieldCheck size={20} color="#0284c7" />}
            message="Estimated Live Lookups Required"
            description={
              <div>
                Auto-verification will check <b>{total} stone(s)</b> with certificates. Live lookups will consume your company's daily quota.
              </div>
            }
            style={{ borderRadius: 8 }}
          />

          <Row gutter={[12, 12]}>
            <Col span={8}>
              <Card size="small" style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>TOTAL CERTIFICATES</Text>
                <Title level={4} style={{ margin: "4px 0", color: "#1e293b" }}>{total}</Title>
                <Tag color="blue">Imported</Tag>
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" style={{ textAlign: "center", background: "#f0fdf4", borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>INSTANT CACHE HITS</Text>
                <Title level={4} style={{ margin: "4px 0", color: "#16a34a" }}>{cachedCount}</Title>
                <Tag color="green">Free & Instant</Tag>
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" style={{ textAlign: "center", background: "#eff6ff", borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>ESTIMATED LIVE LOOKUPS</Text>
                <Title level={4} style={{ margin: "4px 0", color: "#2563eb" }}>{estimatedLiveLookups}</Title>
                <Tag color="geekblue">API Calls</Tag>
              </Card>
            </Col>
          </Row>

          <Card size="small" style={{ background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Space>
                <Database size={16} color="#64748b" />
                <Text style={{ fontSize: 12 }}>Company Daily Quota Remaining:</Text>
              </Space>
              <Text strong style={{ color: isQuotaExceeded ? "#dc2626" : "#16a34a" }}>
                {dailyLookupsRemaining} of {dailyCap} lookups remaining today
              </Text>
            </div>
          </Card>

          {isQuotaExceeded && (
            <Alert
              type="error"
              showIcon
              icon={<AlertCircle size={18} color="#dc2626" />}
              message="Daily Lookup Quota Insufficient"
              description={`Estimated live lookups (${estimatedLiveLookups}) exceed your company's remaining daily allowance (${dailyLookupsRemaining}). You can choose 'Load Without Verification' to import stones without querying lab APIs.`}
              style={{ borderRadius: 6 }}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <BaseModal
      title={
        <Space align="center">
          <ShieldCheck size={20} color="#1e3a8a" />
          <span>Confirm Lab Certificate Auto-Verification</span>
        </Space>
      }
      subtitle="Estimated live API lookups and quota usage check."
      isOpen={isOpen}
      onClose={onClose}
      width={600}
      content={modalContent}
      footer={modalFooter}
    />
  );
};

export default LabBulkDryRunModal;
