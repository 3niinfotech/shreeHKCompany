import { useCallback, useState } from "react";
import { Button, Card, Spin, Typography } from "antd";
import { toastError } from "../../utils/toastNotify";
import { RefreshCw, Sparkles } from "lucide-react";
import { fetchStockAlert } from "../../api/services/aiService";
import { pickApiMessage } from "../../utils/apiToast";
import styles from "../../assets/scss/components/ai/aiComponents.module.scss";

const { Text } = Typography;

const AIInsightCard = () => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("");

  const loadInsight = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchStockAlert();
      if (res?.success) {
        setInsight(res.data);
      } else {
        const msg = pickApiMessage(res);
        if (msg) toastError(msg);
      }
    } catch (err) {
      const msg = pickApiMessage(err?.response?.data);
      if (msg) toastError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual refresh only — avoids Gemini quota burn on every dashboard load

  return (
    <Card
      className={styles.insightCard}
      title={
        <span>
          <Sparkles size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
          AI Inventory Insights
        </span>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<RefreshCw size={14} />}
          onClick={loadInsight}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      {loading && !insight ? (
        <Spin size="small" />
      ) : insight ? (
        <div className={styles.insightBody}>{insight}</div>
      ) : (
        <Text type="secondary">Click Refresh for AI inventory insights.</Text>
      )}
    </Card>
  );
};

export default AIInsightCard;
