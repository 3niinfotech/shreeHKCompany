import React, { useState, useEffect, useCallback } from "react";
import { Card, Typography, Button, Input, Space, Tag, Alert, Row, Col, Badge, Divider, Tooltip, Spin } from "antd";
import { Zap, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Key, Lock, Server, Info } from "lucide-react";
import { api } from "../../../api/client/axiosInstance";
import { ENDPOINTS } from "../../../api/endpoints";
import { toastApiSuccess, toastApiError, toastError } from "../../../utils/toastNotify";
import useAuthUser from "../../../hooks/useAuthUser";
import { hasPagePermission } from "../../../config/permissionRegistry";

const { Title, Text, Paragraph } = Typography;

const LabIntegrationTab = () => {
  const authUser = useAuthUser();
  const canManageLab = hasPagePermission(authUser?.permissions, "lab.manage");

  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [testingLab, setTestingLab] = useState(null);
  const [testResults, setTestResults] = useState({});

  // Credential forms state (per lab)
  const [credInputs, setCredInputs] = useState({
    GIA: { apiKey: "", apiSecret: "", baseUrl: "" },
    IGI: { apiKey: "", apiSecret: "", baseUrl: "" },
  });
  const [savingLab, setSavingLab] = useState(null);

  // Load provider statuses
  const fetchProviderStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.labIntegration.providerStatuses);
      if (res.data?.status && Array.isArray(res.data.providers)) {
        setProviders(res.data.providers);
      }
    } catch (err) {
      console.error("[LabIntegrationTab] Error fetching provider statuses:", err);
      // Non-blocking toast if user lacks permission
      if (canManageLab) {
        toastApiError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [canManageLab]);

  useEffect(() => {
    fetchProviderStatuses();
  }, [fetchProviderStatuses]);

  // Handle Connection Test
  const handleTestConnection = async (labKey) => {
    if (!canManageLab) {
      toastError("Permission Denied: 'lab.manage' permission is required to test lab connections.");
      return;
    }

    setTestingLab(labKey);
    try {
      const res = await api.post(ENDPOINTS.labIntegration.testConnection, { lab: labKey });
      const data = res.data;
      setTestResults((prev) => ({
        ...prev,
        [labKey]: {
          testStatus: data.testStatus || (data.status ? (data.isMock ? "MOCK" : "SUCCESS") : "FAILED"),
          message: data.message,
          latencyMs: data.latencyMs,
          isMock: Boolean(data.isMock),
          testedAt: new Date().toLocaleTimeString(),
        },
      }));

      if (data.status) {
        toastApiSuccess(data);
      } else {
        toastError(data.message || `${labKey} test connection failed`);
      }

      // Refresh DB provider status list
      fetchProviderStatuses();
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || "Connection test failed";
      setTestResults((prev) => ({
        ...prev,
        [labKey]: {
          testStatus: "FAILED",
          message: errMsg,
          testedAt: new Date().toLocaleTimeString(),
        },
      }));
      toastApiError(err);
      fetchProviderStatuses();
    } finally {
      setTestingLab(null);
    }
  };

  // Handle Save Credentials
  const handleSaveCredentials = async (labKey) => {
    if (!canManageLab) {
      toastError("Permission Denied: 'lab.manage' permission is required to update credentials.");
      return;
    }

    const payload = credInputs[labKey];
    if (!payload.apiKey?.trim()) {
      toastError(`Please enter an API Key for ${labKey}`);
      return;
    }

    setSavingLab(labKey);
    try {
      const res = await api.post(ENDPOINTS.labIntegration.saveCredential, {
        lab: labKey,
        apiKey: payload.apiKey.trim(),
        apiSecret: payload.apiSecret ? payload.apiSecret.trim() : null,
        baseUrl: payload.baseUrl ? payload.baseUrl.trim() : null,
      });

      toastApiSuccess(res.data);
      // Clear sensitive secret from local input
      setCredInputs((prev) => ({
        ...prev,
        [labKey]: { ...prev[labKey], apiKey: "", apiSecret: "" },
      }));
      fetchProviderStatuses();
    } catch (err) {
      toastApiError(err);
    } finally {
      setSavingLab(null);
    }
  };

  const giaStatus = providers.find((p) => p.lab === "GIA") || {
    lab: "GIA",
    mode: "MOCK_MODE",
    isConfigured: false,
    isActive: true,
  };

  const igiStatus = providers.find((p) => p.lab === "IGI") || {
    lab: "IGI",
    mode: "DISABLED_STUB",
    isConfigured: false,
    isActive: false,
  };

  const giaTest = testResults.GIA || {
    testStatus: giaStatus.lastTestStatus,
    message: giaStatus.lastTestError,
    testedAt: giaStatus.lastTestedAt ? new Date(giaStatus.lastTestedAt).toLocaleTimeString() : null,
  };

  const igiTest = testResults.IGI || {
    testStatus: igiStatus.lastTestStatus,
    message: igiStatus.lastTestError,
    testedAt: igiStatus.lastTestedAt ? new Date(igiStatus.lastTestedAt).toLocaleTimeString() : null,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Overview & Security Banner */}
      <Card size="small" style={{ borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Space direction="vertical" size={2}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={20} color="#1e3a8a" />
                <Title level={5} style={{ margin: 0, color: "#1e3a8a" }}>
                  Diamond Laboratory Integrations & Auto-Fetch
                </Title>
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Automated official report verification for GIA & IGI certificates. API credentials are encrypted with AES-256-GCM vault security.
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Space direction="vertical" size={4} align="end">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Daily Lookup Cap: </Text>
                <Tag color="blue" style={{ fontWeight: 600 }}>500 lookups/day</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                *Cache hits & mock simulations do not count towards daily quota
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {!canManageLab && (
        <Alert
          type="info"
          showIcon
          icon={<Info size={16} />}
          message="Read-Only View"
          description="You do not have 'lab.manage' permission. Provider statuses can be viewed, but credential changes and connection tests are restricted to Lab Administrators."
        />
      )}

      {loading && providers.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" tip="Loading lab provider statuses..." />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {/* GIA PROVIDER CARD */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <Space align="center">
                    <Server size={18} color="#0284c7" />
                    <span style={{ fontWeight: 600 }}>GIA (Gemological Institute of America)</span>
                  </Space>
                  {giaStatus.mode === "MOCK_MODE" ? (
                    <Tag color="orange" style={{ fontWeight: 700, borderRadius: 12, padding: "2px 10px" }}>
                      MOCK DATA ACTIVE
                    </Tag>
                  ) : giaStatus.isConfigured ? (
                    <Tag color="green" style={{ fontWeight: 600, borderRadius: 12, padding: "2px 10px" }}>
                      LIVE API CONFIGURED
                    </Tag>
                  ) : (
                    <Tag color="default">NOT CONFIGURED</Tag>
                  )}
                </div>
              }
              bordered
              style={{ borderRadius: 8, height: "100%" }}
            >
              {giaStatus.mode === "MOCK_MODE" && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<AlertTriangle size={18} color="#ea580c" />}
                  message={<span style={{ fontWeight: 600 }}>MOCK SIMULATION MODE ACTIVE</span>}
                  description={
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Live GIA API credentials are not set. Lookups will generate realistic mock grading reports for development and testing. Mock data is flagged with prominent badges and cannot permanently write to stone inventory.
                    </div>
                  }
                  style={{ marginBottom: 16, borderRadius: 6 }}
                />
              )}

              {/* Status & Test Results Section */}
              <div
                style={{
                  padding: 12,
                  background: "#f1f5f9",
                  borderRadius: 6,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13, display: "block" }}>Connection Status:</Text>
                  <Space style={{ marginTop: 4 }}>
                    {giaTest.testStatus === "MOCK" && (
                      <Tag color="gold" style={{ fontWeight: 600 }}>MOCK RESPONSIVE</Tag>
                    )}
                    {giaTest.testStatus === "SUCCESS" && (
                      <Tag color="success" style={{ fontWeight: 600 }}>CONNECTED (LIVE)</Tag>
                    )}
                    {giaTest.testStatus === "FAILED" && (
                      <Tag color="error" style={{ fontWeight: 600 }}>TEST FAILED</Tag>
                    )}
                    {!giaTest.testStatus && (
                      <Tag color="default">Not Tested Yet</Tag>
                    )}

                    {giaTest.latencyMs != null && (
                      <Text type="secondary" style={{ fontSize: 12 }}>({giaTest.latencyMs} ms)</Text>
                    )}
                    {giaTest.testedAt && (
                      <Text type="secondary" style={{ fontSize: 11 }}>at {giaTest.testedAt}</Text>
                    )}
                  </Space>
                  {giaTest.message && (
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                      {giaTest.message}
                    </Text>
                  )}
                </div>

                <Button
                  type="primary"
                  icon={<Zap size={14} />}
                  loading={testingLab === "GIA"}
                  disabled={!canManageLab}
                  onClick={() => handleTestConnection("GIA")}
                  style={{ background: "#1e3a8a" }}
                >
                  Test Connection
                </Button>
              </div>

              {/* Credentials Configuration Form */}
              <Divider orientation="left" plain style={{ margin: "12px 0", fontSize: 13, fontWeight: 600 }}>
                API Credentials (Vault Encrypted)
              </Divider>

              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: 500 }}>API Key / Client ID:</Text>
                    {giaStatus.isConfigured && (
                      <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Active Key Saved</Tag>
                    )}
                  </div>
                  <Input.Password
                    prefix={<Key size={14} color="#64748b" />}
                    placeholder={giaStatus.isConfigured ? "•••••••••••••••• (Saved)" : "Enter official GIA API Key"}
                    value={credInputs.GIA.apiKey}
                    onChange={(e) =>
                      setCredInputs((prev) => ({
                        ...prev,
                        GIA: { ...prev.GIA, apiKey: e.target.value },
                      }))
                    }
                    disabled={!canManageLab}
                  />
                </div>

                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                    API Secret (Optional):
                  </Text>
                  <Input.Password
                    prefix={<Lock size={14} color="#64748b" />}
                    placeholder="Enter API Secret (if required)"
                    value={credInputs.GIA.apiSecret}
                    onChange={(e) =>
                      setCredInputs((prev) => ({
                        ...prev,
                        GIA: { ...prev.GIA, apiSecret: e.target.value },
                      }))
                    }
                    disabled={!canManageLab}
                  />
                </div>

                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                    Base URL (Optional override):
                  </Text>
                  <Input
                    placeholder="Default official GIA endpoint"
                    value={credInputs.GIA.baseUrl}
                    onChange={(e) =>
                      setCredInputs((prev) => ({
                        ...prev,
                        GIA: { ...prev.GIA, baseUrl: e.target.value },
                      }))
                    }
                    disabled={!canManageLab}
                  />
                </div>

                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <Button
                    type="default"
                    loading={savingLab === "GIA"}
                    disabled={!canManageLab || !credInputs.GIA.apiKey}
                    onClick={() => handleSaveCredentials("GIA")}
                  >
                    Save GIA Credentials
                  </Button>
                </div>
              </Space>
            </Card>
          </Col>

          {/* IGI PROVIDER CARD */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <Space align="center">
                    <Server size={18} color="#64748b" />
                    <span style={{ fontWeight: 600 }}>IGI (International Gemological Institute)</span>
                  </Space>
                  <Tag color="default" style={{ fontWeight: 600, borderRadius: 12, padding: "2px 10px" }}>
                    DISABLED / STUB
                  </Tag>
                </div>
              }
              bordered
              style={{ borderRadius: 8, height: "100%", background: "#fafafa" }}
            >
              <Alert
                type="info"
                showIcon
                icon={<Info size={18} color="#0284c7" />}
                message="Official IGI API Integration Pending"
                description={
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    The IGI provider is registered as a safe disabled stub in the ERP system. Direct API credentials and automated lookups will be activated once official IGI B2B API specs are confirmed.
                  </div>
                }
                style={{ marginBottom: 16, borderRadius: 6 }}
              />

              {/* Status & Test Results Section */}
              <div
                style={{
                  padding: 12,
                  background: "#f1f5f9",
                  borderRadius: 6,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13, display: "block" }}>Connection Status:</Text>
                  <Space style={{ marginTop: 4 }}>
                    <Tag color="default">Not Configured (Disabled Stub)</Tag>
                  </Space>
                  {igiTest.message && (
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                      {igiTest.message}
                    </Text>
                  )}
                </div>

                <Button
                  type="default"
                  icon={<Zap size={14} />}
                  loading={testingLab === "IGI"}
                  disabled={!canManageLab}
                  onClick={() => handleTestConnection("IGI")}
                >
                  Test Connection
                </Button>
              </div>

              {/* Disabled Placeholder Form */}
              <Divider orientation="left" plain style={{ margin: "12px 0", fontSize: 13, fontWeight: 600 }}>
                API Credentials (Disabled)
              </Divider>

              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                    API Key / Client ID:
                  </Text>
                  <Input.Password
                    prefix={<Key size={14} color="#94a3b8" />}
                    placeholder="IGI API credentials currently disabled"
                    disabled
                  />
                </div>

                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                    API Secret:
                  </Text>
                  <Input.Password
                    prefix={<Lock size={14} color="#94a3b8" />}
                    placeholder="IGI API secret currently disabled"
                    disabled
                  />
                </div>

                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <Button type="default" disabled>
                    Save IGI Credentials
                  </Button>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default LabIntegrationTab;
