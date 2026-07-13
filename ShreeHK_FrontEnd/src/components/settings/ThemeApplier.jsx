import { useEffect } from "react";
import useUIStore from "../../store/Ui.Store";
import useAuthStore from "../../store/Auth.Store";
import { applyTheme } from "../../theme";

const ThemeApplier = () => {
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const root = document.documentElement;
    const mode = isDarkMode ? "dark" : "light";

    root.setAttribute("data-theme", mode);

    const effectiveViewMode =
      isAuthenticated && viewMode === "dashboard" ? "dashboard" : "web";
    root.setAttribute("data-view-mode", effectiveViewMode);
    root.style.colorScheme = mode;

    applyTheme(mode, effectiveViewMode);
  }, [isDarkMode, viewMode, isAuthenticated]);

  return null;
};

export default ThemeApplier;
