import { useState, useCallback, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, ConfigProvider, Input } from "antd";
import {
  Gem,
  ChevronUp,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import TabBar from "./TabBar";
import useAuthorizedMenuItems from "../../hooks/useAuthorizedMenuItems";
import useAuthUser from "../../hooks/useAuthUser";
import useAuthStore from "../../store/Auth.Store";
import useTabsStore from "../../store/Tabs.Store";
import useUIStore from "../../store/Ui.Store";
import { getDashboardMenuTheme } from "../../theme";
import { resolveTabFromPath } from "../../utils/tabRouteMeta";
import { getPostLoginPath } from "../../routes/Routes";
import { prefetchRoute } from "../../routes/routePrefetch";
import RoleAccessGuard from "./RoleAccessGuard";
import { resolveCompanyLogoUrl } from "../../utils/companyLogo";
import logoHeader from "../../assets/loader/softWare_Header_white.svg";
import styles from "../../assets/scss/layout/dashboardLayout.module.scss";

const { Sider, Content } = Layout;

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [navSearchText, setNavSearchText] = useState("");
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const menuTheme = useMemo(
    () => getDashboardMenuTheme(isDarkMode ? "dark" : "light"),
    [isDarkMode]
  );
  const menuItems = useAuthorizedMenuItems();
  const userWithPerms = useAuthUser();
  const companyLogo = useAuthStore((state) => state.companyLogo);
  const companyName = useAuthStore((state) => state.companyName);
  const openTab = useTabsStore((state) => state.openTab);

  const logoUrl = useMemo(() => resolveCompanyLogoUrl(companyLogo), [companyLogo]);

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
      prefetchRoute(path);
      const meta = resolveTabFromPath(path, userWithPerms);
      openTab({ key: meta.key, label: meta.label, path: meta.path });
      if (location.pathname !== path) {
        navigate(path);
      }
    },
    [userWithPerms, openTab, navigate, location.pathname]
  );

  const filteredMenuItems = useMemo(() => {
    if (!navSearchText.trim()) return menuItems;

    const term = navSearchText.trim().toLowerCase();

    const matchesTerm = (text) => {
      if (!text) return false;
      if (typeof text === "string") return text.toLowerCase().includes(term);
      if (typeof text === "object" && text?.props?.children) {
        return String(text.props.children).toLowerCase().includes(term);
      }
      return String(text).toLowerCase().includes(term);
    };

    const filterItems = (items) => {
      if (!items || !Array.isArray(items)) return [];
      return items
        .map((item) => {
          if (item.type === "divider") return null;

          const labelStr = item.label || item.name || "";
          const keyStr = String(item.key || "");
          const matchesSelf = matchesTerm(labelStr) || matchesTerm(keyStr);

          if (item.children && item.children.length > 0) {
            const matchingChildren = filterItems(item.children);
            if (matchingChildren.length > 0) {
              return {
                ...item,
                children: matchingChildren,
              };
            }
            if (matchesSelf) {
              return item;
            }
          } else if (matchesSelf) {
            return item;
          }
          return null;
        })
        .filter(Boolean);
    };

    return filterItems(menuItems);
  }, [menuItems, navSearchText]);

  const openKeys = useMemo(() => {
    if (!navSearchText.trim()) return undefined;
    const keys = [];
    const collectKeys = (items) => {
      items?.forEach((item) => {
        if (item.children && item.children.length > 0) {
          keys.push(item.key);
          collectKeys(item.children);
        }
      });
    };
    collectKeys(filteredMenuItems);
    return keys;
  }, [navSearchText, filteredMenuItems]);

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
                <img
                  src={logoUrl || logoHeader}
                  alt={companyName || "ShreeHK"}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = logoHeader;
                  }}
                />
              </span>
              {!collapsed && <span className={styles.brandText}>{"ShreeHK"}</span>}
            </Link>
          </div>

          <div className={styles.sidebarBody}>
            {!collapsed && (
              <div className={styles.navSearchContainer}>
                <Input
                  placeholder="Search navigation..."
                  prefix={<Search size={14} style={{ color: "var(--color-neutral)", opacity: 0.65, marginRight: 4 }} />}
                  allowClear
                  value={navSearchText}
                  onChange={(e) => setNavSearchText(e.target.value)}
                  size="small"
                />
              </div>
            )}

            <Menu
              mode="inline"
              theme={isDarkMode ? "dark" : "light"}
              items={filteredMenuItems}
              selectedKeys={selectedKeys}
              {...(openKeys ? { openKeys } : {})}
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
