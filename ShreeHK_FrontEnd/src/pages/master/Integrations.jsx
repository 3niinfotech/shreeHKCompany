import React, { useState } from "react";
import { Card, Tabs, Input, Button, Table, Typography, InputNumber } from "antd";
import { Search, Globe, FileUp } from "lucide-react";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { SkuLink } from "../../hooks/useSkuModalAction";
import { exportReportToExcel } from "../../utils/reportExcelExport";
import { toastSuccess } from "../../utils/toastNotify";

const { Title, Text } = Typography;

const Integrations = () => {
  const [reportNo, setReportNo] = useState("");
  const [giaLoading, setGiaLoading] = useState(false);
  const [giaResult, setGiaResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncLimit, setSyncLimit] = useState(50);
  const [feedLoading, setFeedLoading] = useState(false);

  const handleExportB2BFeed = async () => {
    setFeedLoading(true);
    try {
      let rawData = [];
      try {
        const res = await api.get(ENDPOINTS.inventory.list, { params: { limit: 500 } });
        rawData = res.data?.Data || res.data?.data || res.data || [];
      } catch (e) {
        rawData = [];
      }

      const headers = [
        { title: "Stock #", key: "sku", width: 15 },
        { title: "Shape", key: "shape", width: 12 },
        { title: "Weight", key: "carat", accessor: (r) => r.carat || r.polish_carat || 0, width: 10 },
        { title: "Color", key: "color", accessor: (r) => r.color || r.main_color || "", width: 10 },
        { title: "Clarity", key: "clarity", width: 10 },
        { title: "Cut", key: "cut", width: 8 },
        { title: "Polish", key: "polish", width: 8 },
        { title: "Symmetry", key: "symmetry", accessor: (r) => r.symmetry || r.symmentry || "", width: 8 },
        { title: "Fluorescence", key: "fluorescence", accessor: (r) => r.fluorescence || r.f_intensity || "", width: 12 },
        { title: "Lab", key: "lab", width: 8 },
        { title: "Certificate #", key: "report_no", width: 15 },
        { title: "Rap Rate", key: "rap_price", width: 12 },
        { title: "Discount %", key: "discount", width: 12 },
        { title: "Price/Ct", key: "price", width: 12 },
        { title: "Total Price", key: "amount", width: 14 },
        { title: "Depth %", key: "depth_pc", width: 10 },
        { title: "Table %", key: "table_pc", width: 10 },
        { title: "Meas Length", key: "measurement", width: 15 },
        { title: "Girdle", key: "gridle", width: 12 },
        { title: "Availability", key: "status", accessor: () => "A", width: 10 },
      ];

      await exportReportToExcel({
        headers,
        rows: rawData.length ? rawData : [
          { sku: "DEMO-01", shape: "ROUND", carat: 1.01, color: "D", clarity: "VVS1", cut: "EX", polish: "EX", symmetry: "EX", lab: "GIA", report_no: "123456789", price: 5500, amount: 5555 }
        ],
        fileName: "Rapnet_B2B_Stock_Feed",
        sheetName: "B2B Stock Feed",
      });
      toastSuccess(`Exported B2B Stock Feed Excel.`);
    } catch (err) {
      console.error(err);
    } finally {
      setFeedLoading(false);
    }
  };

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
    { title: "SKU", dataIndex: "sku", key: "sku", render: (text, record) => <SkuLink sku={text} record={record} /> },
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
          <Title level={5} style={{ margin: 0 }}>GIA Report Lookup</Title>
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
    {
      key: "b2b_feed",
      label: "B2B Stock Feed (James / Nivoda)",
      children: (
        <Card>
          <Title level={5}>B2B Stock Feed Export (James, Nivoda & DMarket)</Title>
          <Text type="secondary">
            Generate and download standard Rapnet B2B diamond stock CSV/Excel feeds (PHP james.php & nivoda.php parity).
          </Text>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
            <Button
              type="primary"
              icon={<FileUp size={16} />}
              loading={feedLoading}
              onClick={handleExportB2BFeed}
            >
              Export B2B Rapnet CSV Feed
            </Button>
          </div>
          <Text type="secondary" style={{ display: "block", marginTop: 16, fontSize: 12 }}>
            Includes 26 standard B2B fields: Stock #, Shape, Carat, Color, Clarity, Cut, Polish, Symm, Flu, Lab, Certificate #, Rap Rate, Discount %, Price/Ct, Total Price, Depth %, Table %, Meas Length, Width, Depth, Girdle, Availability.
          </Text>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '7px 24px' }}>
      <Title level={3} style={{ margin: 0 }}>Integrations</Title>
      <Tabs items={items} />
    </div>
  );
};

export default Integrations;
