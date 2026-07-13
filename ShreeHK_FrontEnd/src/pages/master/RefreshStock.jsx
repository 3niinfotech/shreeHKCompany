import React, { useState } from "react";
import { Card, Button, Typography } from "antd";
import { RefreshCw } from "lucide-react";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";

const { Title, Text } = Typography;

const RefreshStock = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.integration.refreshRapnetStock);
      setResult(res.data);
      toastApiSuccess(res.data);
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560, margin: "24px auto" }}>
      <Title level={4}>Refresh RapNet Stock</Title>
      <Text type="secondary">Resets rapnet_upload flags on eligible on-hand stones (PHP refresh module parity).</Text>
      <div style={{ marginTop: 24 }}>
        <Button type="primary" icon={<RefreshCw size={16} />} loading={loading} onClick={handleRefresh}>
          Refresh Now
        </Button>
      </div>
      {result?.affectedCount != null && (
        <Text style={{ display: "block", marginTop: 16 }}>Stones flagged: {result.affectedCount}</Text>
      )}
    </Card>
  );
};

export default RefreshStock;
