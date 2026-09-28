import React, { useState, useRef } from "react";
import { Modal, Input, Button, Table, Tag, Space, Alert, Progress } from "antd";
import {
  ScanOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { api } from "../../api/client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";
import { playScanSuccessSound, playWarningSound, playErrorSound } from "../../utils/audioBeep";
import { toastSuccess, toastWarning } from "../../utils/toastNotify";

const BatchStockAuditModal = ({ open, onClose }) => {
  const [inputSku, setInputSku] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const stats = React.useMemo(() => {
    let verified = 0;
    let onHoldOrMemo = 0;
    let notFound = 0;

    scannedItems.forEach((item) => {
      if (item.status === "VERIFIED") verified++;
      else if (item.status === "HOLD_MEMO") onHoldOrMemo++;
      else if (item.status === "NOT_FOUND") notFound++;
    });

    return { total: scannedItems.length, verified, onHoldOrMemo, notFound };
  }, [scannedItems]);

  const handleScanSubmit = async (e) => {
    e?.preventDefault();
    const sku = inputSku.trim().toUpperCase();
    if (!sku) return;

    // Check duplicate in current scan session
    if (scannedItems.some((x) => x.sku === sku)) {
      toastWarning(`SKU "${sku}" already scanned in this session`);
      playWarningSound();
      setInputSku("");
      return;
    }

    setLoading(true);
    setInputSku("");

    try {
      // Look up stone details
      const res = await api.get(ENDPOINTS.product.detail, {
        params: { id: sku, by: "p.sku" },
      });

      const stone = res.data?.Data || res.data?.data || null;

      if (stone && (stone.id || stone.sku)) {
        let status = "VERIFIED";
        let note = "On Hand in Office";

        if (stone.hold) {
          status = "HOLD_MEMO";
          note = `Stone is on HOLD (Hold by: ${stone.hold_by || "User"})`;
          playWarningSound();
        } else if (stone.outward) {
          status = "HOLD_MEMO";
          note = `Stone is currently on ${stone.outward.toUpperCase()}`;
          playWarningSound();
        } else {
          playScanSuccessSound();
        }

        const newItem = {
          key: stone.id || sku,
          sku: stone.sku || sku,
          carat: stone.polish_carat || stone.carat || "-",
          shape: stone.shape || "-",
          color: stone.color || "-",
          clarity: stone.clarity || "-",
          location: stone.location || stone.loc || "Office",
          status,
          note,
          scannedAt: new Date().toLocaleTimeString(),
        };

        setScannedItems((prev) => [newItem, ...prev]);
      } else {
        playErrorSound();
        const notFoundItem = {
          key: sku,
          sku,
          carat: "-",
          shape: "-",
          color: "-",
          clarity: "-",
          location: "-",
          status: "NOT_FOUND",
          note: "SKU not found in active inventory",
          scannedAt: new Date().toLocaleTimeString(),
        };
        setScannedItems((prev) => [notFoundItem, ...prev]);
      }
    } catch (err) {
      playErrorSound();
      const errItem = {
        key: sku,
        sku,
        carat: "-",
        shape: "-",
        color: "-",
        clarity: "-",
        location: "-",
        status: "NOT_FOUND",
        note: "Lookup error / Not found",
        scannedAt: new Date().toLocaleTimeString(),
      };
      setScannedItems((prev) => [errItem, ...prev]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleExportAudit = () => {
    if (!scannedItems.length) {
      toastWarning("No scanned items to export");
      return;
    }

    const headers = ["SKU", "Carat", "Shape", "Color", "Clarity", "Location", "Audit Status", "Notes", "Scanned At"];
    const rows = scannedItems.map((r) => [
      r.sku,
      r.carat,
      r.shape,
      r.color,
      r.clarity,
      r.location,
      r.status,
      r.note,
      r.scannedAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess("Audit verification exported!");
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ScanOutlined style={{ color: "var(--color-primary, #1e3a8a)", fontSize: 18 }} />
          <span>Rapid Batch Stock Verification & Barcode Audit</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={850}
      destroyOnClose
    >
      {/* Rapid Scanner Input Bar */}
      <div
        style={{
          padding: "16px 18px",
          background: "color-mix(in srgb, var(--color-primary, #1e3a8a) 4%, transparent)",
          borderRadius: 10,
          border: "1.5px dashed color-mix(in srgb, var(--color-primary, #1e3a8a) 25%, transparent)",
          marginBottom: 16,
        }}
      >
        <form onSubmit={handleScanSubmit} style={{ display: "flex", gap: 10 }}>
          <Input
            ref={inputRef}
            size="large"
            autoFocus
            prefix={<ScanOutlined style={{ color: "var(--color-primary)" }} />}
            placeholder="Scan barcode or type SKU and press Enter..."
            value={inputSku}
            onChange={(e) => setInputSku(e.target.value)}
            disabled={loading}
            style={{ fontWeight: 600, letterSpacing: "0.5px" }}
          />
          <Button type="primary" size="large" loading={loading} htmlType="submit" style={{ minWidth: 100 }}>
            Scan
          </Button>
        </form>
      </div>

      {/* Live Audit Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ padding: "10px 14px", background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Total Scanned</div>
          <strong style={{ fontSize: 18 }}>{stats.total}</strong>
        </div>
        <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#166534" }}>Verified In Office</div>
          <strong style={{ fontSize: 18, color: "#16a34a" }}>{stats.verified}</strong>
        </div>
        <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#92400e" }}>On Hold / Out-Memo</div>
          <strong style={{ fontSize: 18, color: "#d97706" }}>{stats.onHoldOrMemo}</strong>
        </div>
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#991b1b" }}>Not Found / Unknown</div>
          <strong style={{ fontSize: 18, color: "#dc2626" }}>{stats.notFound}</strong>
        </div>
      </div>

      {/* Scanned Items Table */}
      <Table
        size="small"
        pagination={{ pageSize: 8, size: "small" }}
        rowKey="key"
        dataSource={scannedItems}
        locale={{ emptyText: "No packets scanned yet. Point scanner or enter SKU above." }}
        columns={[
          { title: "SKU", dataIndex: "sku", key: "sku", width: 110, render: (v) => <strong>{v}</strong> },
          { title: "Carat", dataIndex: "carat", key: "carat", width: 75, align: "right" },
          { title: "Shape", dataIndex: "shape", key: "shape", width: 85 },
          { title: "Grade", key: "grade", width: 90, render: (_, r) => `${r.color}/${r.clarity}` },
          { title: "Location", dataIndex: "location", key: "location", width: 90 },
          {
            title: "Audit Status",
            dataIndex: "status",
            key: "status",
            width: 140,
            render: (status, r) => {
              if (status === "VERIFIED") {
                return (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Verified
                  </Tag>
                );
              }
              if (status === "HOLD_MEMO") {
                return (
                  <Tag color="warning" icon={<WarningOutlined />}>
                    Hold / Memo
                  </Tag>
                );
              }
              return (
                <Tag color="error" icon={<CloseCircleOutlined />}>
                  Unknown
                </Tag>
              );
            },
          },
          { title: "Remarks / Location Note", dataIndex: "note", key: "note" },
          { title: "Time", dataIndex: "scannedAt", key: "time", width: 85, align: "right" },
        ]}
      />

      {/* Footer Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <Button
          danger
          size="small"
          icon={<ReloadOutlined />}
          disabled={!scannedItems.length}
          onClick={() => setScannedItems([])}
        >
          Reset Session
        </Button>
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={!scannedItems.length}
            onClick={handleExportAudit}
            style={{ background: "#16a34a", borderColor: "#16a34a" }}
          >
            Export Audit Report
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default BatchStockAuditModal;
