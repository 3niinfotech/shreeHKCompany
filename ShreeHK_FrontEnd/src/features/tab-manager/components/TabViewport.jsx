import { useRef, useEffect, Suspense, memo } from "react";
import { Routes, Route } from "react-router-dom";
import { ConfigProvider } from "antd";
import { useTabs } from "../context/useTabs";
import PageSkeleton from "../../../components/common/skeleton/PageSkeleton";

/**
 * Individual Tab Panel
 * Renders within its own isolated Routes location and AntD portal container.
 */
const TabPanel = memo(function TabPanel({
  tab,
  isActive,
  authorizedRoutes,
  scrollPositionsRef,
}) {
  const panelRef = useRef(null);
  const wasActiveRef = useRef(isActive);

  // Scroll Save & Restore
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    if (isActive) {
      // Tab became active: restore saved scroll position
      const saved = scrollPositionsRef.current.get(tab.key);
      if (saved) {
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = saved.top;
            el.scrollLeft = saved.left;
          }
          if (saved.tableScrollTop) {
            const tableBody = el.querySelector(".ant-table-body");
            if (tableBody) tableBody.scrollTop = saved.tableScrollTop;
          }
        });
      }

      // Trigger window resize event so charts, tables, and virtual grids re-measure
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);

      wasActiveRef.current = true;
      return () => clearTimeout(timer);
    } else if (wasActiveRef.current) {
      // Tab was active and is now becoming inactive: save scroll position
      const tableBody = el.querySelector(".ant-table-body");
      scrollPositionsRef.current.set(tab.key, {
        top: el.scrollTop || 0,
        left: el.scrollLeft || 0,
        tableScrollTop: tableBody?.scrollTop || 0,
      });
      wasActiveRef.current = false;
    }
  }, [isActive, tab.key, scrollPositionsRef]);

  // Ant Design Modal & Drawer Portal binding (confined to tab panel so they hide on tab switch)
  const getContainer = () => panelRef.current || document.body;

  return (
    <div
      ref={panelRef}
      id={`tabpanel-${tab.key}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab.key}`}
      tabIndex={0}
      data-tab-key={tab.key}
      style={{
        display: isActive ? "flex" : "none",
        flex: "1 1 auto",
        minHeight: 0,
        width: "100%",
        height: "100%",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <ConfigProvider
        modal={{ getContainer }}
        drawer={{ getContainer }}
      >
        <Routes location={tab.location}>
          {authorizedRoutes.map((r, i) => (
            <Route
              key={`route-${tab.key}-${r.path}-${i}`}
              path={r.path}
              element={<Suspense fallback={<PageSkeleton />}>{r.element}</Suspense>}
            />
          ))}
        </Routes>
      </ConfigProvider>
    </div>
  );
});

export const TabViewport = () => {
  const { tabs, activeKey, authorizedRoutes, scrollPositionsRef } = useTabs();

  return (
    <div
      className="tab-viewport-container"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {tabs.map((tab) => (
        <TabPanel
          key={tab.key}
          tab={tab}
          isActive={tab.key === activeKey}
          authorizedRoutes={authorizedRoutes}
          scrollPositionsRef={scrollPositionsRef}
        />
      ))}
    </div>
  );
};

export default TabViewport;
