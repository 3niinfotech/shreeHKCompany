import { useMemo, useCallback } from "react";
import { Tabs, Dropdown } from "antd";
import { Home, X, XCircle, ArrowRightToLine, RefreshCw } from "lucide-react";
import { useTabs } from "../context/useTabs";
import { HOME_TAB_CONFIG } from "../config/tabConfig";
import styles from "../../../assets/scss/layout/tabBar.module.scss";

export const TabBar = () => {
  const {
    tabs,
    activeKey,
    switchTab,
    closeTab,
    closeOthers,
    closeToRight,
    closeAll,
  } = useTabs();

  // Context menu items for right click
  const getContextMenuItems = useCallback(
    (tab) => {
      const isHome = tab.key === HOME_TAB_CONFIG.key;
      const tabIndex = tabs.findIndex((t) => t.key === tab.key);
      const hasTabsToRight = tabIndex < tabs.length - 1;
      const hasOtherTabs = tabs.length > (isHome ? 1 : 2);

      return [
        {
          key: "close",
          label: "Close Tab",
          icon: <X size={14} />,
          disabled: isHome || tab.closable === false,
          onClick: () => closeTab(tab.key),
        },
        {
          type: "divider",
        },
        {
          key: "close-others",
          label: "Close Other Tabs",
          icon: <XCircle size={14} />,
          disabled: !hasOtherTabs,
          onClick: () => closeOthers(tab.key),
        },
        {
          key: "close-right",
          label: "Close Tabs to the Right",
          icon: <ArrowRightToLine size={14} />,
          disabled: !hasTabsToRight,
          onClick: () => closeToRight(tab.key),
        },
        {
          key: "close-all",
          label: "Close All Tabs",
          icon: <RefreshCw size={14} />,
          disabled: tabs.length <= 1,
          onClick: closeAll,
        },
      ];
    },
    [tabs, closeTab, closeOthers, closeToRight, closeAll]
  );

  // Handle Middle-Click to close tab
  const handleTabMouseDown = useCallback(
    (tab) => (e) => {
      // Middle click
      if (e.button === 1 && tab.key !== HOME_TAB_CONFIG.key && tab.closable !== false) {
        e.preventDefault();
        e.stopPropagation();
        closeTab(tab.key);
      }
    },
    [closeTab]
  );

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => {
        const isHome = tab.key === HOME_TAB_CONFIG.key;
        const menuItems = getContextMenuItems(tab);

        const tabLabelNode = (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["contextMenu"]}
          >
            <span
              className={`${styles.tabLabel} ${isHome ? styles.tabLabelHome : ""}`}
              title={tab.label}
              onMouseDown={handleTabMouseDown(tab)}
              role="tab"
              aria-selected={tab.key === activeKey}
              aria-controls={`tabpanel-${tab.key}`}
              id={`tab-${tab.key}`}
            >
              {isHome && <Home size={14} className={styles.tabIcon} aria-hidden />}
              <span className={styles.tabText}>{tab.label}</span>
            </span>
          </Dropdown>
        );

        return {
          key: tab.key,
          label: tabLabelNode,
          closable: !isHome && tab.closable !== false,
        };
      }),
    [tabs, activeKey, getContextMenuItems, handleTabMouseDown]
  );

  const handleChange = (key) => {
    switchTab(key);
  };

  const handleEdit = (targetKey, action) => {
    if (action === "remove") {
      closeTab(targetKey);
    }
  };

  return (
    <div
      className={styles.tabBar}
      role="tablist"
      aria-label="Application tabs"
      onMouseDown={(e) => {
        if (e.target.closest(".ant-tabs-tab")) {
          // prevent text caret selection
          e.preventDefault();
        }
      }}
    >
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
