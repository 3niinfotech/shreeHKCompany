import { Button } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import styles from "../../assets/scss/components/exportExcelButton.module.scss";

const ExportExcelButton = ({
  onClick,
  loading = false,
  disabled = false,
  size = "middle",
  className = "",
  children = "Export to Excel",
  icon,
  style,
}) => (
  <Button
    type="primary"
    size={size}
    icon={icon !== undefined ? icon : <FileExcelOutlined />}
    loading={loading}
    disabled={disabled}
    onClick={onClick}
    style={{
      backgroundColor: "var(--color-success)",
      borderColor: "var(--color-success)",
      color: "#ffffff",
      ...style,
    }}
    className={`${styles.exportBtn} ${className}`.trim()}
  >
    {children}
  </Button>
);

export default ExportExcelButton;
