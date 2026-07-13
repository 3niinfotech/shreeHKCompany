import { Segmented, Typography } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import useUIStore from "../../store/Ui.Store";

const { Text } = Typography;

const ThemeModeToggle = () => {
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const setThemeMode = useUIStore((state) => state.setThemeMode);
  const themeMode = isDarkMode ? "dark" : "light";

  return (
    <div>
      <Text strong>Appearance</Text>
      <div style={{ marginTop: 8 }}>
        <Segmented
          value={themeMode}
          onChange={setThemeMode}
          options={[
            { label: "Light", value: "light", icon: <SunOutlined /> },
            { label: "Dark", value: "dark", icon: <MoonOutlined /> },
          ]}
        />
      </div>
      <Text style={{ display: "block", marginTop: 8 }} type="secondary">
        Choose light or dark mode for the application interface.
      </Text>
    </div>
  );
};

export default ThemeModeToggle;
