import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toastWarning } from "../../../utils/toastNotify";
import useAuthStore from "../../../store/Auth.Store";
import useAuthUser from "../../../hooks/useAuthUser";
import useUIStore from "../../../store/Ui.Store";
import { getAuthorizedRouteMeta, getPostLoginPath } from "../../../routes/Routes";
import { HOME_TAB_CONFIG, MAX_TABS } from "../config/tabConfig";
import { resolveTabMeta } from "../registry/tabRegistry";

const TabContext = createContext(null);

export const TabProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userWithPerms = useAuthUser();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const branchId = useAuthStore((state) => state.branchId);
  const companyId = useAuthStore((state) => state.companyId);
  const yearId = useAuthStore((state) => state.yearId);
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";

  const { flatRoutes: authorizedRoutes } = useMemo(
    () => getAuthorizedRouteMeta(userWithPerms),
    [userWithPerms]
  );

  const homePath = useMemo(() => getPostLoginPath(userWithPerms), [userWithPerms]);

  // Initial tab is the Home tab
  const initialHomeTab = useMemo(
    () => ({
      ...HOME_TAB_CONFIG,
      path: homePath || "/dashboard",
      pathname: homePath || "/dashboard",
      location: {
        pathname: homePath || "/dashboard",
        search: "",
        hash: "",
        state: null,
        key: HOME_TAB_CONFIG.key,
      },
    }),
    [homePath]
  );

  const [tabs, setTabs] = useState(() => [initialHomeTab]);
  const [activeKey, setActiveKey] = useState(() => {
    const isReload = (() => {
      try {
        const navEntries = performance.getEntriesByType?.("navigation");
        if (navEntries && navEntries.length > 0) {
          return navEntries[0].type === "reload";
        }
        return window.performance?.navigation?.type === 1;
      } catch (e) {
        return false;
      }
    })();
    if (isReload) return HOME_TAB_CONFIG.key;
    const currentKey = `${location.pathname}${location.search || ""}`;
    return currentKey === "/" || currentKey === "/dashboard"
      ? HOME_TAB_CONFIG.key
      : currentKey;
  });

  const scrollPositionsRef = useRef(new Map());
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // 1. OPEN TAB
  const openTab = useCallback(
    (tabInput) => {
      const pathname = tabInput.pathname || tabInput.path || "/dashboard";
      const search = tabInput.search || "";
      const key = tabInput.key || `${pathname}${search}`;
      const isHome = pathname === "/" || pathname === "/dashboard" || key === HOME_TAB_CONFIG.key;

      if (isHome) {
        setActiveKey(HOME_TAB_CONFIG.key);
        return;
      }

      setTabs((prevTabs) => {
        const existingIndex = prevTabs.findIndex((t) => t.key === key);
        if (existingIndex !== -1) {
          const existing = prevTabs[existingIndex];
          // Update location / label if changed
          const updated = [...prevTabs];
          updated[existingIndex] = {
            ...existing,
            label: tabInput.label || existing.label,
            location: {
              pathname,
              search,
              hash: tabInput.hash || "",
              state: tabInput.state || existing.location?.state || null,
              key,
            },
          };
          return updated;
        }

        // Limit check
        if (prevTabs.length >= MAX_TABS) {
          toastWarning(`Maximum limit of ${MAX_TABS} tabs reached. Please close unused tabs.`);
          return prevTabs;
        }

        const meta = resolveTabMeta(pathname, search, userWithPerms, authorizedRoutes);
        const newTab = {
          key,
          path: key,
          pathname,
          search,
          hash: tabInput.hash || "",
          label: tabInput.label || meta.label,
          closable: tabInput.closable !== false,
          location: {
            pathname,
            search,
            hash: tabInput.hash || "",
            state: tabInput.state || null,
            key,
          },
          openedAt: Date.now(),
        };

        return [...prevTabs, newTab];
      });

      setActiveKey(key);
    },
    [userWithPerms, authorizedRoutes]
  );

  // 2. SWITCH TAB
  const switchTab = useCallback(
    (key) => {
      const currentTabs = tabsRef.current;
      const targetTab = currentTabs.find((t) => t.key === key);
      if (!targetTab) return;

      setActiveKey(key);
      const targetPath = targetTab.key === HOME_TAB_CONFIG.key ? homePath : targetTab.path;
      const currentFull = `${location.pathname}${location.search || ""}`;
      if (currentFull !== targetPath) {
        navigate(targetPath);
      }
    },
    [homePath, location.pathname, location.search, navigate]
  );

  // 3. CLOSE TAB
  const closeTab = useCallback(
    (key) => {
      if (key === HOME_TAB_CONFIG.key) return;

      // Clean up scroll position
      scrollPositionsRef.current.delete(key);

      setTabs((prevTabs) => {
        const index = prevTabs.findIndex((t) => t.key === key);
        if (index === -1) return prevTabs;

        const isClosingActive = activeKeyRef.current === key;
        const newTabs = prevTabs.filter((t) => t.key !== key);

        if (isClosingActive) {
          // Determine next tab to focus
          const nextIndex = Math.max(0, index - 1);
          const nextTab = newTabs[nextIndex] || initialHomeTab;
          const nextKey = nextTab.key;

          setActiveKey(nextKey);
          const nextPath = nextKey === HOME_TAB_CONFIG.key ? homePath : nextTab.path;
          navigate(nextPath);
        }

        return newTabs;
      });
    },
    [homePath, initialHomeTab, navigate]
  );

  // 4. CLOSE OTHERS
  const closeOthers = useCallback(
    (key) => {
      setTabs((prevTabs) => {
        const filtered = prevTabs.filter(
          (t) => t.key === HOME_TAB_CONFIG.key || t.key === key
        );
        return filtered;
      });
      if (key) {
        switchTab(key);
      }
    },
    [switchTab]
  );

  // 5. CLOSE TABS TO THE RIGHT
  const closeToRight = useCallback(
    (key) => {
      setTabs((prevTabs) => {
        const targetIndex = prevTabs.findIndex((t) => t.key === key);
        if (targetIndex === -1) return prevTabs;
        return prevTabs.filter(
          (t, idx) => idx <= targetIndex || t.key === HOME_TAB_CONFIG.key
        );
      });
      switchTab(key);
    },
    [switchTab]
  );

  // 6. CLOSE ALL TABS
  const closeAll = useCallback(() => {
    scrollPositionsRef.current.clear();
    setTabs([initialHomeTab]);
    setActiveKey(HOME_TAB_CONFIG.key);
    navigate(homePath);
  }, [initialHomeTab, homePath, navigate]);

  // 7. URL-DRIVEN SYNC: Listen to top-level URL navigation
  useEffect(() => {
    if (viewMode !== "dashboard" || !isAuthenticated) return;

    const pathname = location.pathname;
    const search = location.search || "";
    const fullKey = `${pathname}${search}`;

    // Skip auth / public routes
    if (pathname.startsWith("/auth/") || pathname === "/login") return;

    if (pathname === "/" || pathname === "/dashboard") {
      if (activeKeyRef.current !== HOME_TAB_CONFIG.key) {
        setActiveKey(HOME_TAB_CONFIG.key);
      }
      return;
    }

    const currentTabs = tabsRef.current;
    const existing = currentTabs.find((t) => t.key === fullKey);

    if (existing) {
      if (activeKeyRef.current !== fullKey) {
        setActiveKey(fullKey);
      }
    } else {
      // New tab requested via URL navigation (sidebar, link, browser back/forward)
      openTab({
        key: fullKey,
        path: fullKey,
        pathname,
        search,
        hash: location.hash,
        state: location.state,
      });
    }
  }, [location.pathname, location.search, location.hash, location.state, viewMode, isAuthenticated, openTab]);

  // 8. RESET ON LOGOUT OR COMPANY/BRANCH SWITCH
  useEffect(() => {
    if (!isAuthenticated) {
      scrollPositionsRef.current.clear();
      setTabs([initialHomeTab]);
      setActiveKey(HOME_TAB_CONFIG.key);
    }
  }, [isAuthenticated, initialHomeTab]);

  useEffect(() => {
    // When branch, company or year changes, reset tabs so fresh data loads for the new context
    scrollPositionsRef.current.clear();
    setTabs([initialHomeTab]);
    setActiveKey(HOME_TAB_CONFIG.key);
  }, [branchId, companyId, yearId, initialHomeTab]);

  const value = useMemo(
    () => ({
      tabs,
      activeKey,
      openTab,
      switchTab,
      closeTab,
      closeOthers,
      closeToRight,
      closeAll,
      scrollPositionsRef,
      homePath,
      authorizedRoutes,
    }),
    [
      tabs,
      activeKey,
      openTab,
      switchTab,
      closeTab,
      closeOthers,
      closeToRight,
      closeAll,
      homePath,
      authorizedRoutes,
    ]
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};

export const useTabs = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabs must be used within a TabProvider");
  }
  return context;
};

export default TabContext;
