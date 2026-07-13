import { Segmented, Typography } from "antd";
import useUIStore from "../../store/Ui.Store";

const { Text } = Typography;

const ApplicationViewToggle = () => {
  const viewMode = useUIStore((state) => state.viewMode);
  const setViewMode = useUIStore((state) => state.setViewMode);

  return (
    <div>
      <Text strong>Application View</Text>
      <div style={{ marginTop: 8 }}>
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: "Web View", value: "web" },
            { label: "Dashboard View", value: "dashboard" },
          ]}
        />
      </div>
      <Text style={{ display: "block", marginTop: 8 }} type="secondary">
        Web View keeps the current layout. Dashboard View uses a fixed sidebar and top admin bar.
      </Text>
    </div>
  );
};

export default ApplicationViewToggle;
