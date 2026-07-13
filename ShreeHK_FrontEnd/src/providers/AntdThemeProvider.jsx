import { ConfigProvider } from "antd";
import useUIStore from "../store/Ui.Store";
import { getAntdThemeConfig } from "../theme";

export default function AntdThemeProvider({ children }) {
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const mode = isDarkMode ? "dark" : "light";

  return (
    <ConfigProvider theme={getAntdThemeConfig(mode, viewMode)}>
      {children}
    </ConfigProvider>
  );
}
