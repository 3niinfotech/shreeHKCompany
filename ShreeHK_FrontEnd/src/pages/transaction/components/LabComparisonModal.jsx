import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Alert,
  Divider,
  Tooltip,
  Badge,
  Checkbox,
  Row,
  Col,
  Card,
  Image,
  Spin,
  Typography,
} from "antd";
import {
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  Eye,
  RefreshCw,
  Info,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import BaseModal from "../../../components/common/modals/BaseModal";
import { api } from "../../../api/client/axiosInstance";
import { ENDPOINTS } from "../../../api/endpoints";
import { toastApiError, toastSuccess, toastError } from "../../../utils/toastNotify";

const { Text, Title } = Typography;

// Field definitions for standard diamond specification comparison
const COMPARISON_FIELDS = [
  { key: "shape", label: "Shape", erpKeys: ["shape"] },
  { key: "color", label: "Color", erpKeys: ["color", "main_color"] },
  { key: "clarity", label: "Clarity", erpKeys: ["clarity"] },
  { key: "cut", label: "Cut", erpKeys: ["cut"] },
  { key: "polish", label: "Polish", erpKeys: ["polish"] },
  { key: "symmentry", label: "Symmetry", erpKeys: ["symmentry", "symmetry"] },
  { key: "f_intensity", label: "Fluorescence", erpKeys: ["f_intensity", "fluorescence"] },
  { key: "table_pc", label: "Table %", erpKeys: ["table_pc", "table"] },
  { key: "depth_pc", label: "Depth %", erpKeys: ["depth_pc", "depth"] },
  { key: "mesurment", label: "Measurement", erpKeys: ["mesurment", "measurement"] },
  { key: "gridle", label: "Girdle", erpKeys: ["gridle", "girdle"] },
];

// Helper: extract value from stoneData by aliases
const getErpValue = (stoneData, keys) => {
  if (!stoneData) return "—";
  for (const k of keys) {
    const val = stoneData[k];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return "—";
};

// Helper: extract value from normalized lab ERP mapping
const getLabValue = (key, mapped) => {
  if (!mapped) return "—";
  const val = mapped[key];
  if (val !== undefined && val !== null && String(val).trim() !== "") {
    return String(val).trim();
  }
  return "—";
};

const LabComparisonModal = ({
  isOpen,
  onClose,
  stoneData,
  onAppliedSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form input state
  const [lab, setLab] = useState(stoneData?.lab || "GIA");
  const [reportNumber, setReportNumber] = useState(
    stoneData?.report_no || stoneData?.reportNumber || ""
  );

  // Fetch state
  const [fetching, setFetching] = useState(false);
  const [labResult, setLabResult] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Selected fields for selective apply
  const [selectedFields, setSelectedFields] = useState(new Set());

  // Auto-fill from stoneData when modal opens
  useEffect(() => {
    if (isOpen && stoneData) {
      const initialLab = stoneData.lab && stoneData.lab !== "NONE" ? stoneData.lab : "GIA";
      const initialRep = stoneData.report_no || stoneData.reportNumber || "";
      setLab(initialLab);
      setReportNumber(initialRep);
      setLabResult(null);
      setFetchError(null);
      setSelectedFields(new Set());
    }
  }, [isOpen, stoneData]);

  // Handle Fetch Official Lab Report
  const handleFetchLabData = async () => {
    const repNo = String(reportNumber || "").trim();
    if (!repNo) {
      toastError("Please enter a valid certificate report number.");
      return;
    }

    setFetching(true);
    setFetchError(null);
    setLabResult(null);
    setSelectedFields(new Set());

    try {
      const res = await api.post(ENDPOINTS.labIntegration.fetch, {
        lab,
        reportNumber: repNo,
        forceRefresh: false,
      });

      if (res.data?.status && res.data?.data) {
        const cert = res.data.data;
        const isMock = Boolean(res.data.isMock);
        setLabResult({ ...cert, isMock });

        // Auto-select fields that differ or are new in lab data
        const initialSelected = new Set();
        COMPARISON_FIELDS.forEach((f) => {
          const erpVal = getErpValue(stoneData, f.erpKeys);
          const labVal = getLabValue(f.key, cert.erpMapped);
          if (labVal !== undefined && labVal !== null && String(labVal).trim() !== "") {
            // Auto-check if mismatched or if ERP was blank
            if (!erpVal || String(erpVal).trim().toLowerCase() !== String(labVal).trim().toLowerCase()) {
              initialSelected.add(f.key);
            }
          }
        });
        setSelectedFields(initialSelected);
      } else {
        setFetchError({
          statusCode: res.data?.statusCode || 404,
          message: res.data?.message || `Report #${repNo} was not found on official records.`,
        });
      }
    } catch (err) {
      const status = err?.response?.status || err?.response?.data?.statusCode || 500;
      const msg = err?.response?.data?.message || err.message || "Failed to fetch from lab service.";
      setFetchError({
        statusCode: status,
        message: msg,
      });
    } finally {
      setFetching(false);
    }
  };

  // Toggle field selection
  const handleToggleField = (fieldKey) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (selectedFields.size === COMPARISON_FIELDS.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(COMPARISON_FIELDS.map((f) => f.key)));
    }
  };

  // TanStack React Query Mutation for Applying Selected Fields
  const applyMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(ENDPOINTS.labIntegration.applyToStone, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toastSuccess("Official lab certificate specifications applied successfully!");
      // Invalidate stone and inventory queries for instant refetch
      queryClient.invalidateQueries({ queryKey: ["productDetails"] });
      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
      queryClient.invalidateQueries({ queryKey: ["myInventorySummary"] });

      if (onAppliedSuccess) onAppliedSuccess(data);
      onClose();
    },
    onError: (err) => {
      toastApiError(err);
    },
  });

  const handleApplySelected = () => {
    if (!labResult) return;

    if (labResult.isMock) {
      toastError("Mock lab data cannot be saved to stone inventory (Simulation mode preview only).");
      return;
    }

    if (selectedFields.size === 0) {
      toastError("Please select at least one field to apply.");
      return;
    }

    const payload = {
      productId: stoneData?.id,
      lab,
      reportNumber: reportNumber.trim(),
      fields: Array.from(selectedFields),
      labData: labResult,
    };

    applyMutation.mutate(payload);
  };

  // Generate Comparison Table Rows
  const tableRows = useMemo(() => {
    if (!labResult) return [];

    return COMPARISON_FIELDS.map((f) => {
      const erpVal = getErpValue(stoneData, f.erpKeys);
      const labVal = getLabValue(f.key, labResult.erpMapped);

      const isBlankErp = erpVal === "—";
      const isBlankLab = labVal === "—";
      const isMatch = !isBlankErp && !isBlankLab && erpVal.toLowerCase() === labVal.toLowerCase();
      const isMismatch = !isBlankErp && !isBlankLab && erpVal.toLowerCase() !== labVal.toLowerCase();
      const isNew = isBlankErp && !isBlankLab;

      return {
        key: f.key,
        label: f.label,
        erpVal,
        labVal,
        isMatch,
        isMismatch,
        isNew,
        canApply: !isBlankLab,
      };
    });
  }, [labResult, stoneData]);

  // Comparison Table Columns
  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={
            selectedFields.size > 0 && selectedFields.size < COMPARISON_FIELDS.length
          }
          checked={
            COMPARISON_FIELDS.length > 0 &&
            selectedFields.size === COMPARISON_FIELDS.length
          }
          onChange={handleToggleSelectAll}
          disabled={!labResult || labResult.isMock}
        />
      ),
      dataIndex: "select",
      key: "select",
      width: 45,
      render: (_, record) => (
        <Checkbox
          checked={selectedFields.has(record.key)}
          disabled={!record.canApply || labResult?.isMock}
          onChange={() => handleToggleField(record.key)}
        />
      ),
    },
    {
      title: "Field Name",
      dataIndex: "label",
      key: "label",
      width: 140,
      render: (text) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: "Current ERP Value",
      dataIndex: "erpVal",
      key: "erpVal",
      width: 160,
      render: (text, record) => (
        <span
          style={{
            color: record.isMismatch ? "#dc2626" : "inherit",
            fontWeight: record.isMismatch ? 600 : 400,
            textDecoration: record.isMismatch ? "line-through" : "none",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Official Lab Value",
      dataIndex: "labVal",
      key: "labVal",
      width: 170,
      render: (text, record) => (
        <span
          style={{
            color: record.isMismatch || record.isNew ? "#16a34a" : "inherit",
            fontWeight: record.isMismatch || record.isNew ? 600 : 400,
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Comparison Status",
      key: "status",
      width: 130,
      render: (_, record) => {
        if (record.isMatch) {
          return (
            <Tag color="success" icon={<CheckCircle2 size={12} style={{ marginRight: 3 }} />}>
              Match
            </Tag>
          );
        }
        if (record.isMismatch) {
          return (
            <Tag color="error" icon={<AlertTriangle size={12} style={{ marginRight: 3 }} />}>
              Mismatch
            </Tag>
          );
        }
        if (record.isNew) {
          return <Tag color="blue">New Spec</Tag>;
        }
        return <Tag color="default">N/A</Tag>;
      },
    },
  ];

  // Render Error Box based on HTTP Status Codes
  const renderErrorAlert = () => {
    if (!fetchError) return null;

    if (fetchError.statusCode === 429) {
      return (
        <Alert
          type="error"
          showIcon
          icon={<AlertTriangle size={18} color="#dc2626" />}
          message="Daily Lookup Quota Exceeded (HTTP 429)"
          description="Your company has reached its daily limit of 500 live lookups. Cached certificate lookups remain accessible. Please try again tomorrow or contact system administrator."
          style={{ borderRadius: 6 }}
        />
      );
    }

    if (fetchError.statusCode === 404) {
      return (
        <Alert
          type="warning"
          showIcon
          icon={<XCircle size={18} color="#ea580c" />}
          message={`Report #${reportNumber} Not Found`}
          description={`No grading report found in ${lab} official records. Please double-check the report number and laboratory.`}
          style={{ borderRadius: 6 }}
        />
      );
    }

    if (fetchError.statusCode === 400 && fetchError.message.includes("not configured")) {
      return (
        <Alert
          type="info"
          showIcon
          icon={<Info size={18} color="#0284c7" />}
          message={`${lab} Provider Not Configured`}
          description={`${lab} live API credentials have not been configured yet. Administrators can configure credentials or enable simulation in Master -> Integrations.`}
          style={{ borderRadius: 6 }}
        />
      );
    }

    return (
      <Alert
        type="error"
        showIcon
        message="Failed to Fetch Certificate"
        description={fetchError.message}
        style={{ borderRadius: 6 }}
      />
    );
  };

  const modalContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stone Context & Search Bar */}
      <Card size="small" style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>STONE SKU</Text>
            <Text strong style={{ fontSize: 15, color: "#1e3a8a" }}>
              {stoneData?.sku || "N/A"}
            </Text>
          </Col>
          <Col xs={24} md={5}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>LABORATORY</Text>
            <Select
              value={lab}
              onChange={setLab}
              style={{ width: "100%" }}
              options={[
                { value: "GIA", label: "GIA" },
                { value: "IGI", label: "IGI (Stub)" },
              ]}
              disabled={fetching}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>REPORT / CERTIFICATE #</Text>
            <Input
              placeholder="e.g. 2225891234"
              value={reportNumber}
              onChange={(e) => setReportNumber(e.target.value)}
              onPressEnter={handleFetchLabData}
              disabled={fetching}
            />
          </Col>
          <Col xs={24} md={5} style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="primary"
              icon={<Search size={15} />}
              loading={fetching}
              onClick={handleFetchLabData}
              style={{ width: "100%", background: "#1e3a8a" }}
            >
              Fetch from Lab
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Error View */}
      {renderErrorAlert()}

      {/* Loading Skeleton View */}
      {fetching && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <Spin size="large" tip={`Querying official ${lab} database...`} />
        </div>
      )}

      {/* Success / Comparison View */}
      {labResult && (
        <>
          {/* MOCK DATA Warning Banner */}
          {labResult.isMock && (
            <Alert
              type="warning"
              showIcon
              icon={<AlertTriangle size={18} color="#ea580c" />}
              message={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, letterSpacing: "0.3px" }}>
                    MOCK DATA (SIMULATION PREVIEW)
                  </span>
                  <Tag color="orange" style={{ fontWeight: 700, margin: 0 }}>MOCK RESPONSE</Tag>
                </div>
              }
              description={
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  This report was generated via the GIA mock provider adapter (LAB_ALLOW_MOCK=true).
                  <b> The "Apply" button is strictly disabled</b> to protect your ERP database and stone inventory from mock mutation.
                </div>
              }
              style={{ borderRadius: 6, border: "1px solid #fed7aa", background: "#fff7ed" }}
            />
          )}

          {/* Quick Header with PDF & Plot Links */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              background: "#f1f5f9",
              borderRadius: 6,
            }}
          >
            <Space>
              <ShieldCheck size={18} color="#0284c7" />
              <Text strong style={{ fontSize: 13 }}>
                Verified Official Specs: {lab} #{labResult.reportNumber || reportNumber}
              </Text>
              {!labResult.isMock && <Tag color="success">AUTHENTIC REPORT</Tag>}
            </Space>

            <Space size={8}>
              {labResult.pdfReportUrl && (
                <Button
                  size="small"
                  type="link"
                  icon={<FileText size={14} />}
                  href={labResult.pdfReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Official PDF
                </Button>
              )}
              {labResult.plotImageUrl && (
                <Tooltip title="View official stone plot diagram">
                  <Image
                    src={labResult.plotImageUrl}
                    alt="Plot Diagram"
                    width={26}
                    height={26}
                    style={{ objectFit: "contain", cursor: "pointer", border: "1px solid #cbd5e1", borderRadius: 4 }}
                    preview={{ mask: <Eye size={12} /> }}
                  />
                </Tooltip>
              )}
            </Space>
          </div>

          {/* Side-by-Side Comparison Table */}
          <Table
            size="small"
            bordered
            pagination={false}
            columns={columns}
            dataSource={tableRows}
            onRow={(record) => ({
              style: {
                backgroundColor: record.isMismatch ? "#fef2f2" : record.isNew ? "#f0fdf4" : undefined,
              },
            })}
            style={{ borderRadius: 6, overflow: "hidden" }}
          />

          {/* Unmapped / Extra Laboratory Attributes Section */}
          {labResult.unmappedFields && Object.keys(labResult.unmappedFields).length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <Info size={14} color="#64748b" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    Additional Lab Attributes (Informational Only - Not Mapped to ERP)
                  </span>
                </Space>
              }
              style={{ background: "#fafafa", borderRadius: 6 }}
            >
              <Row gutter={[12, 8]}>
                {Object.entries(labResult.unmappedFields).map(([k, v]) => (
                  <Col xs={12} sm={8} md={6} key={k}>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{k}</Text>
                    <Text style={{ fontSize: 12 }}>
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </Text>
                  </Col>
                ))}
              </Row>
            </Card>
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
          <span>Lab Certificate Auto-Fetch & Specification Comparison</span>
        </Space>
      }
      subtitle="Compare current ERP stone specifications with official grading laboratory records."
      isOpen={isOpen}
      onClose={onClose}
      width={900}
      content={modalContent}
      saveBtnText={
        labResult?.isMock
          ? "Apply Disabled (Mock Preview Only)"
          : `Apply Selected (${selectedFields.size} field${selectedFields.size === 1 ? "" : "s"})`
      }
      saveDisabled={!labResult || labResult.isMock || selectedFields.size === 0 || applyMutation.isPending}
      loading={applyMutation.isPending}
      onSave={handleApplySelected}
      cancelBtnText="Close"
    />
  );
};

export default LabComparisonModal;
