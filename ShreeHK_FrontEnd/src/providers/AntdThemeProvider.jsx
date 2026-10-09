import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import useUIStore from "../store/Ui.Store";
import { getAntdThemeConfig } from "../theme";
import { DATE_DISPLAY_FORMAT } from "../utils/dateDisplayFormat";

const antdLocale = {
  ...enUS,
  DatePicker: {
    ...enUS.DatePicker,
    lang: {
      ...enUS.DatePicker?.lang,
      fieldDateFormat: DATE_DISPLAY_FORMAT,
      fieldDateTimeFormat: `${DATE_DISPLAY_FORMAT} HH:mm:ss`,
      dateFormat: DATE_DISPLAY_FORMAT,
      dateTimeFormat: `${DATE_DISPLAY_FORMAT} HH:mm:ss`,
    },
  },
};

export default function AntdThemeProvider({ children }) {
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const mode = isDarkMode ? "dark" : "light";

  return (
    <ConfigProvider locale={antdLocale} theme={getAntdThemeConfig(mode, viewMode)}>
      {children}
    </ConfigProvider>
  );
}
