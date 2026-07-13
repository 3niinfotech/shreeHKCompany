import { useMemo } from "react";
import useUIStore from "../store/Ui.Store";
import { getThemeColorValues } from "../theme";
import { cssVar } from "../theme/applyTheme";

/**
 * Resolved theme color values for charts, icons, and inline styles.
 * Recomputes when light/dark or web/dashboard view changes.
 */
export default function useThemeColors() {
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";

  return useMemo(() => {
    const mode = isDarkMode ? "dark" : "light";
    const colors = getThemeColorValues(mode, viewMode);
    return {
      ...colors,
      css: cssVar,
      navActive: colors.navActive,
    };
  }, [isDarkMode, viewMode]);
}
