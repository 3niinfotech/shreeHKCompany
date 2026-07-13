import { Collapse, Spin, Typography } from "antd";
import styles from "../../assets/scss/components/ai/aiComponents.module.scss";

const { Text } = Typography;

const AIResultPanel = ({
  title = "AI Result",
  loading = false,
  result = "",
  error = "",
  open = true,
  onOpenChange,
}) => {
  if (!loading && !result && !error) return null;

  const items = [
    {
      key: "ai-result",
      label: title,
      children: loading ? (
        <Spin size="small" />
      ) : error ? (
        <Text type="danger">{error}</Text>
      ) : (
        <div className={styles.panelBody}>{result}</div>
      ),
    },
  ];

  return (
    <div className={styles.panel}>
      <Collapse
        activeKey={open ? ["ai-result"] : []}
        onChange={(keys) => onOpenChange?.(keys.includes("ai-result"))}
        items={items}
      />
    </div>
  );
};

export default AIResultPanel;
