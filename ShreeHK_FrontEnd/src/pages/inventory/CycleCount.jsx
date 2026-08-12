import React, { useState, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { Card, Input, Button, Table, Tag, Space, Typography, message } from "antd";
import { ScanOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import { SkuLink } from "../../hooks/useSkuModalAction";
import styles from "../../assets/scss/pages/inventory/cycleCount.module.scss";

const { Text } = Typography;

/**
 * Physical stock audit — scan SKUs and compare against on-hand inventory.
 */
const CycleCount = () => {
  const [scanValue, setScanValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState([]);
  const [expectedSkus, setExpectedSkus] = useState(new Set());

  const loadExpected = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.product.inventory, {
        params: { limit: 5000, offset: 0, available: "On Hand Stock" },
      });
      const rows = res.data?.Data || [];
      setExpectedSkus(new Set(rows.map((r) => String(r.sku || "").trim().toLowerCase()).filter(Boolean)));
    } catch {
      message.error("Failed to load expected stock list");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = () => {
    const sku = scanValue.trim();
    if (!sku) return;
    const key = sku.toLowerCase();
    const found = expectedSkus.has(key);
    setScanned((prev) => {
      if (prev.some((r) => r.sku.toLowerCase() === key)) return prev;
      return [{ id: `${Date.now()}-${sku}`, sku, found, scannedAt: new Date().toLocaleTimeString() }, ...prev];
    });                                                  
    setScanValue("");
  };

  const missingCount = [...expectedSkus].filter(
    (sku) => !scanned.some((r) => r.sku.toLowerCase() === sku),
  ).length;

  const tableRef = useRef(null);
  const tableHeight = useTableBodyScrollHeight(tableRef, [scanned.length, loading]);

  const columns = [
    { title: "SKU", dataIndex: "sku", key: "sku", render: (text, record) => <SkuLink sku={text} record={record} /> },
    {
      title: "Status",
      dataIndex: "found",
      key: "found",
      render: (found) =>
        found ? (
          <Tag icon={<CheckOutlined />} color="success">Matched</Tag>
        ) : (
          <Tag icon={<CloseOutlined />} color="error">Not in stock</Tag>
        ),
    },
    { title: "Scanned At", dataIndex: "scannedAt", key: "scannedAt", render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format("DD-MM-YYYY") : (v || "-")) },
  ];

  return (
    <div className={styles.cycleCountPage}>
      <PageHeroHeader
        breadcrumb="INVENTORY"
        title="Cycle Count / Stock Audit"
        icon={<ScanOutlined />}
        actions={(
          <Button icon={<ReloadOutlined />} onClick={loadExpected} loading={loading}>
            Refresh
          </Button>
        )}
      />
      <Card className={styles.scanCard}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">
            Load on-hand SKUs, then scan or type each barcode/SKU. Compare physical count vs system.
          </Text>
          <Space wrap>
            <Button onClick={loadExpected} loading={loading}>
              Load Expected Stock ({expectedSkus.size || "—"})
            </Button>
            <Tag color="blue">Scanned: {scanned.length}</Tag>
            <Tag color={missingCount ? "orange" : "green"}>
              Missing from scan: {expectedSkus.size ? missingCount : "—"}
            </Tag>
          </Space>
          <Space.Compact style={{ maxWidth: 480, width: "100%", gap: 8 }}>
            <Input
              placeholder="Scan or enter SKU / barcode"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onPressEnter={handleScan}
              autoFocus
            />
            <Button type="primary" icon={<ScanOutlined />} onClick={handleScan}>
              Add Scan
            </Button>
          </Space.Compact>
        </Space>
      </Card>
      <div ref={tableRef} className={`${styles.tableSection} erp-table-container`}>
        <Table
          size="small"
          bordered
          rowKey="id"
          columns={columns}
          dataSource={scanned}
          pagination={{ pageSize: 50 }}
          scroll={{ x: "max-content", y: tableHeight }}
        />
      </div>
    </div>
  );
};

export default CycleCount;
