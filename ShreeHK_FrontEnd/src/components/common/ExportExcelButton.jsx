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
}) => (
  <Button
    type="primary"
    size={size}
    icon={<FileExcelOutlined />}
    loading={loading}
    disabled={disabled}
    onClick={onClick}
    className={`${styles.exportBtn} ${className}`.trim()}
  >
    {children}
  </Button>
);

export default ExportExcelButton;
