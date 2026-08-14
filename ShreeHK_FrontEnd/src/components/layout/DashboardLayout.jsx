import { useState, useCallback, useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Layout, Menu, ConfigProvider } from "antd";
import {
  Gem,
  ChevronUp,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import TabBar from "./TabBar";
import useAuthorizedMenuItems from "../../hooks/useAuthorizedMenuItems";
import useAuthStore from "../../store/Auth.Store";
import useTabsStore from "../../store/Tabs.Store";
import useUIStore from "../../store/Ui.Store";
import { getDashboardMenuTheme } from "../../theme";
import { resolveTabFromPath } from "../../utils/tabRouteMeta";
import { getPostLoginPath } from "../../routes/Routes";
import RoleAccessGuard from "./RoleAccessGuard";
import styles from "../../assets/scss/layout/dashboardLayout.module.scss";

const { Sider, Content } = Layout;

const DashboardLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const menuTheme = useMemo(
    () => getDashboardMenuTheme(isDarkMode ? "dark" : "light"),
    [isDarkMode]
  );
  const menuItems = useAuthorizedMenuItems();
  const user = useAuthStore((state) => state.user);
  const storePermissions = useAuthStore((state) => state.permissions);
  const openTab = useTabsStore((state) => state.openTab);

  const userWithPerms = useMemo(
    () => ({
      ...user,
      permissions: user?.permissions ?? storePermissions ?? [],
    }),
    [user, storePermissions]
  );

  const homePath = useMemo(() => getPostLoginPath(userWithPerms), [userWithPerms]);

  const selectedKeys = useMemo(() => {
    const keys = [location.pathname];
    if (location.pathname.startsWith("/admin/")) {
      keys.push(`user-mgmt-${location.pathname}`);
    }
    return keys;
  }, [location.pathname]);

  const handleMenuSelect = useCallback(
    ({ key }) => {
      let path = key;
      if (key.startsWith("user-mgmt-")) {
        path = key.replace("user-mgmt-", "");
      }
      if (!path.startsWith("/")) return;
      const meta = resolveTabFromPath(path, user);
      openTab({ key: meta.key, label: meta.label, path: meta.path });
    },
    [user, openTab]
  );

  return (
    <ConfigProvider theme={menuTheme}>
      <Layout className={styles.dashboardLayout}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={240}
          className={styles.dashboardSider}
          theme={isDarkMode ? "dark" : "light"}
          trigger={null}
        >
          <div className={styles.brand}>
            <Link to={homePath}>
              <span className={styles.brandIcon}>
                <Gem size={18} />
              </span>
              {!collapsed && <span className={styles.brandText}>ShreeHK</span>}
            </Link>
            {/* {!collapsed && (
              <span className={styles.brandBadge}>
                <ChevronUp size={14} />
              </span>
            )} */}
          </div>

          <div className={styles.sidebarBody}>
            <Menu
              mode="inline"
              theme={isDarkMode ? "dark" : "light"}
              items={menuItems}
              selectedKeys={selectedKeys}
              onSelect={handleMenuSelect}
              onMouseDown={(event) => {
                if (event.target.closest(".ant-menu-item, .ant-menu-submenu-title")) {
                  event.preventDefault();
                }
              }}
              className={styles.sideMenu}
            />

            {/* {!collapsed && (
              <div className={styles.helpCard}>
                <div className={styles.helpDecor} aria-hidden="true" />
                <div className={styles.helpTitle}>Need Help?</div>
                <div className={styles.helpSub}>We&apos;re here to help you</div>
                <button className={styles.helpBtn}>
                  <Headphones size={15} />
                  <a href="/contact-support">Contact Support</a>
                </button>
              </div>
            )} */}
          </div>

          <div
            className={styles.collapseToggle}
            onClick={() => setCollapsed((c) => !c)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              setCollapsed((c) => !c)
            }
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <>
                <PanelLeftClose size={18} />
                <span>Collapse</span>
              </>
            )}
          </div>
        </Sider>

        <Layout className={styles.dashboardMain}>
          <Header hideLogo hideNavBar showMenuToggle onMenuToggle={() => setCollapsed((c) => !c)} />
          <TabBar />
          <Content className={`${styles.dashboardContent} app-page-root`}>
            <RoleAccessGuard>
              <div className={styles.pageOutlet}>
                <Outlet />
              </div>
            </RoleAccessGuard>
          </Content>
          <Footer />
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default DashboardLayout;
