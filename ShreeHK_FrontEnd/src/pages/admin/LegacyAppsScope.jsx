import React, { useEffect, useState } from "react";
import { Card, Table, Typography, Tag, Alert } from "antd";
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

  useEffect(() => {
    api
      .get(ENDPOINTS.legacyApps)
      .then((res) => setRows(res.data?.Data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

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
      <Title level={3}>Legacy Apps — Migration Scope</Title>
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
