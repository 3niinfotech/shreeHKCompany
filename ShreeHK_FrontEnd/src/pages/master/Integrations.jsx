import React, { useState } from "react";
import { Card, Tabs, Input, Button, Table, Typography, InputNumber } from "antd";
import { Search, Globe } from "lucide-react";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";

const { Title, Text } = Typography;

const Integrations = () => {
  const [reportNo, setReportNo] = useState("");
  const [giaLoading, setGiaLoading] = useState(false);
  const [giaResult, setGiaResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncLimit, setSyncLimit] = useState(50);

  const handleGiaLookup = async () => {
    if (!reportNo.trim()) return;
    setGiaLoading(true);
    try {
      const res = await api.get(ENDPOINTS.integration.giaLookup, {
        params: { reportNo: reportNo.trim() },
      });
      setGiaResult(res.data);
      toastApiSuccess(res.data);
    } catch (err) {
      toastApiError(err);
    } finally {
      setGiaLoading(false);
    }
  };

  const handleWebsiteSync = async () => {
    setSyncLoading(true);
    try {
      const res = await api.post(ENDPOINTS.integration.websiteSync, { limit: syncLimit });
      setSyncResult(res.data);
      toastApiSuccess(res.data);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSyncLoading(false);
    }
  };

  const giaColumns = [
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Lab", dataIndex: "lab", key: "lab" },
    { title: "Report #", dataIndex: "report_no", key: "report_no" },
    { title: "Shape", dataIndex: "shape", key: "shape" },
    { title: "Color", dataIndex: "color", key: "color" },
    { title: "Clarity", dataIndex: "clarity", key: "clarity" },
  ];

  const items = [
    {
      key: "gia",
      label: "GIA Lookup",
      children: (
        <Card>
          <Title level={5}>GIA Report Lookup</Title>
          <Text type="secondary">Search inventory by certificate report number (PHP gia.php parity).</Text>
          <div style={{ display: "flex", gap: 8, marginTop: 16, maxWidth: 480 }}>
            <Input
              placeholder="Report number"
              value={reportNo}
              onChange={(e) => setReportNo(e.target.value)}
              onPressEnter={handleGiaLookup}
            />
            <Button type="primary" icon={<Search size={16} />} loading={giaLoading} onClick={handleGiaLookup}>
              Lookup
            </Button>
          </div>
          {giaResult?.message && (
            <Text type="secondary" style={{ display: "block", marginTop: 12 }}>{giaResult.message}</Text>
          )}
          {giaResult?.Data?.length > 0 && (
            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey={(r) => r.sku || r.report_no}
              columns={giaColumns}
              dataSource={giaResult.Data}
              pagination={false}
            />
          )}
        </Card>
      ),
    },
    {
      key: "website",
      label: "Website Sync",
      children: (
        <Card>
          <Title level={5}>Website Product Sync</Title>
          <Text type="secondary">
            Batch flag eligible stones for website upload (PHP siteSynchro parity — flags only; external push is separate).
          </Text>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
            <span>Batch size</span>
            <InputNumber min={1} max={200} value={syncLimit} onChange={(v) => setSyncLimit(v || 50)} />
            <Button type="primary" icon={<Globe size={16} />} loading={syncLoading} onClick={handleWebsiteSync}>
              Run Sync
            </Button>
          </div>
          {syncResult?.processed != null && (
            <Text style={{ display: "block", marginTop: 16 }}>
              Processed: {syncResult.processed} stone(s)
            </Text>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Integrations</Title>
      <Tabs items={items} />
    </div>
  );
};

export default Integrations;
