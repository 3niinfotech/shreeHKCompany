import { useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "antd";
import { Home } from "lucide-react";
import useTabsStore from "../../store/Tabs.Store";
import useAuthUser from "../../hooks/useAuthUser";
import useUIStore from "../../store/Ui.Store";
import { resolveTabFromPath, HOME_TAB } from "../../utils/tabRouteMeta";
import { getAuthorizedRouteMeta, getPostLoginPath } from "../../routes/Routes";
import { prefetchRoute } from "../../routes/routePrefetch";
import styles from "../../assets/scss/layout/tabBar.module.scss";

const renderTabLabel = (tab) => {
  const isHome = tab.key === HOME_TAB.key;

  return (
    <span
      className={`${styles.tabLabel} ${isHome ? styles.tabLabelHome : ""}`}
      title={tab.label}
    >
      {isHome && <Home size={14} className={styles.tabIcon} aria-hidden />}
      <span className={styles.tabText}>{tab.label}</span>
    </span>
  );
};

const preventTabTextCaret = (event) => {
  if (event.target.closest(".ant-tabs-tab")) {
    event.preventDefault();
  }
};

const TabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userWithPerms = useAuthUser();
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";

  const homePath = useMemo(() => getPostLoginPath(userWithPerms), [userWithPerms]);

  const { flatRoutes: authorizedRoutes } = useMemo(
    () => getAuthorizedRouteMeta(userWithPerms),
    [userWithPerms]
  );

  const tabs = useTabsStore((state) => state.tabs);
  const activeKey = useTabsStore((state) => state.activeKey);
  const openTab = useTabsStore((state) => state.openTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);

  useEffect(() => {
    if (viewMode !== "dashboard") return;

    const meta = resolveTabFromPath(location.pathname, userWithPerms, authorizedRoutes);
    openTab({ key: meta.key, label: meta.label, path: meta.path });
  }, [location.pathname, userWithPerms, viewMode, openTab, authorizedRoutes]);

  const handleTabPointerDown = useCallback(
    (tab) => (event) => {
      if (event.button !== 0) return;
      const targetPath = tab.key === HOME_TAB.key ? homePath : tab.path;
      prefetchRoute(targetPath);
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    },
    [homePath, location.pathname, navigate]
  );

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: (
          <span
            onMouseEnter={() => prefetchRoute(tab.key === HOME_TAB.key ? homePath : tab.path)}
            onMouseDown={handleTabPointerDown(tab)}
          >
            {renderTabLabel(tab)}
          </span>
        ),
        closable: tab.closable !== false,
      })),
    [tabs, homePath, handleTabPointerDown]
  );

  const handleChange = (key) => {
    const tab = tabs.find((t) => t.key === key);
    if (!tab) return;
    setActiveTab(key);
    const targetPath = tab.key === HOME_TAB.key ? homePath : tab.path;
    prefetchRoute(targetPath);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const handleEdit = (targetKey, action) => {
    if (action !== "remove") return;

    const wasActive = activeKey === targetKey;
    closeTab(targetKey);

    if (!wasActive) return;

    const { activeKey: nextKey, tabs: nextTabs } = useTabsStore.getState();
    const nextTab = nextTabs.find((t) => t.key === nextKey);
    if (nextTab) {
      const targetPath = nextTab.key === HOME_TAB.key ? homePath : nextTab.path;
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    }
  };

  if (viewMode !== "dashboard") {
    return null;
  }

  return (
    <div className={styles.tabBar} onMouseDown={preventTabTextCaret}>
      <Tabs
        className={styles.tabsRoot}
        type="editable-card"
        hideAdd
        size="middle"
        tabBarGutter={6}
        activeKey={activeKey}
        onChange={handleChange}
        onEdit={handleEdit}
        items={tabItems}
      />
    </div>
  );
};

export default TabBar;
