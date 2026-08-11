import React, { useCallback, useEffect, useState } from "react";
import { Card, Table, Typography, Tag, Alert, Button, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

const { Title, Text, Paragraph } = Typography;

const statusColor = {
  separate_app: "orange",
  legacy_disabled: "default",
};

const LegacyAppsScope = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLegacyApps = useCallback(() => {
    setLoading(true);
    api
      .get(ENDPOINTS.legacyApps)
      .then((res) => setRows(res.data?.Data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLegacyApps();
  }, [loadLegacyApps]);

  const columns = [
    { title: "App", dataIndex: "name", key: "name" },
    { title: "Legacy Path", dataIndex: "legacyPath", key: "legacyPath" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={statusColor[status] || "blue"}>{String(status).replace(/_/g, " ")}</Tag>
      ),
    },
    { title: "Recommendation", dataIndex: "recommendation", key: "recommendation" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }} wrap>
        <Title level={3} style={{ margin: 0 }}>Legacy Apps — Migration Scope</Title>
        <Button icon={<ReloadOutlined />} onClick={loadLegacyApps} loading={loading}>
          Refresh
        </Button>
      </Space>
      <Paragraph type="secondary">
        EMS, SMS, and Jewelry modules remain outside the Node/React DAI ERP rewrite. Use this page to
        document scope decisions for stakeholders.
      </Paragraph>
      <Alert
        style={{ marginBottom: 16 }}
        type="warning"
        showIcon
        message="Out of scope for current migration"
        description="These PHP applications should stay on legacy deployment unless a separate product initiative is approved."
      />
      <Card>
        <Table
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      </Card>
      <Text type="secondary" style={{ display: "block", marginTop: 16 }}>
        Config source: backend/config/legacyApps.js
      </Text>
    </div>
  );
};

export default LegacyAppsScope;
