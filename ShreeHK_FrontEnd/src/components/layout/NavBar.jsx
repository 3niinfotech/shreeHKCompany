// import React, { useState } from 'react';
// import { Menu, ConfigProvider, Drawer, Button } from 'antd';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { Menu as MenuIcon, X } from 'lucide-react';
// import * as LucideIcons from 'lucide-react';
// import { authProtectedRoutes } from '../../routes/Routes';
// import styles from '../../assets/scss/layout/navbar.module.scss';

// const NavBar = () => {
//     const navigate = useNavigate();
//     const location = useLocation();
//     const [visible, setVisible] = useState(false);

//     const renderIcon = (iconName) => {
//         if (!iconName) return null;
//         const IconComponent = LucideIcons[iconName];
//         if (IconComponent) {
//             return <IconComponent size={18} strokeWidth={2} style={{ marginRight: 8 }} />;
//         }
//         return null;
//     };

//     const getMenuItems = (routes = authProtectedRoutes, parentIndex = 0) =>
//         routes.map((item, index) => {
//             const hasChildren = item.children && item.children.length > 0;

//             const itemKey =
//                 item.path && item.path !== "/"
//                     ? item.path
//                     : `parent-${item.name}-${parentIndex}-${index}`;

//             return {
//                 key: itemKey,
//                 label: item.name,
//                 icon: item.icon ? renderIcon(item.icon) : null,

//                 // ✅ FIX: recursive children
//                 children: hasChildren
//                     ? getMenuItems(item.children, index)
//                     : null,

//                 onClick: hasChildren
//                     ? null
//                     : () => {
//                         navigate(item.path);
//                         setVisible(false);
//                     }
//             };
//         });

//     return (
//         <ConfigProvider
//             theme={{
//                 components: {
//                     Menu: {
//                         horizontalItemHoverColor: '#6658DD',
//                         horizontalItemSelectedColor: '#6658DD',
//                         itemSelectedColor: '#6658DD',
//                         itemHoverColor: '#6658DD',
//                     },
//                 },
//             }}
//         >
//             <div className={styles.navWrapper}>
//                 {/* Desktop Menu: Mobile par hide ho jayega */}
//                 <div className={styles.desktopMenu}>
//                     <Menu
//                         mode="horizontal"
//                         subMenuOpenDelay={0}
//                         items={getMenuItems()}
//                         triggerSubMenuAction="hover"
//                         selectedKeys={selectedKeys}
//                         style={{ border: 'none', lineHeight: '46px', flex: 1 }}
//                     />
//                 </div>

//                 {/* Mobile Hamburger: Sirf mobile par dikhega */}
//                 <div className={styles.mobileToggle}>
//                     <Button
//                         type="text"
//                         icon={<MenuIcon color="#005c3d" />}
//                         onClick={() => setVisible(true)}
//                     />
//                 </div>

//                 {/* Mobile Drawer (Sidebar) */}
//                 <Drawer
//                     title="Menu"
//                     placement="left"
//                     onClose={() => setVisible(false)}
//                     open={visible}
//                     styles={{ body: { padding: 0 }, width: "280px" }}
//                 >
//                     <Menu
//                         mode="inline"
//                         items={getMenuItems()}
//                         selectedKeys={selectedKeys}
//                         style={{ border: 'none' }}
//                     />
//                 </Drawer>
//             </div>
//         </ConfigProvider>
//     );
// };

// export default NavBar;


import React, { useState, useMemo } from 'react';
import { Menu, ConfigProvider, Drawer, Button } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, X, House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield, NotebookPen, CheckSquare, ClipboardList } from 'lucide-react';
import { getAuthorizedRouteMeta } from '../../routes/Routes';
import { prefetchRoute, prefetchRouteTree } from '../../routes/routePrefetch';
import useAuthStore from '../../store/Auth.Store';
import useThemeColors from '../../hooks/useThemeColors';
import styles from '../../assets/scss/layout/navbar.module.scss';

const preventNavTextCaret = (event) => {
    if (event.target.closest(".ant-menu-item, .ant-menu-submenu-title, .ant-tabs-tab")) {
        event.preventDefault();
    }
};

const ICON_MAP = { House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield, NotebookPen, CheckSquare, ClipboardList };

/** Highlight top-level nav when pathname matches a child route */
const resolveNavSelectedKeys = (pathname, routes = []) => {
    const keys = new Set();

    if (!pathname || pathname === '/' || pathname === '/dashboard') {
        keys.add('/dashboard');
        return [...keys];
    }

    keys.add(pathname);

    const walk = (items, ancestors = []) => {
        items.forEach((item) => {
            const chain = item.path ? [...ancestors, item.path] : ancestors;
            if (item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`))) {
                chain.forEach((p) => keys.add(p));
            }
            if (item.children?.length) walk(item.children, chain);
        });
    };

    walk(routes);
    return [...keys];
};

const NavBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const themeColors = useThemeColors();
    const user = useAuthStore((state) => state.user);
    const storePermissions = useAuthStore((state) => state.permissions);
    const userWithPerms = useMemo(
        () => ({
            ...user,
            permissions: user?.permissions ?? storePermissions ?? [],
        }),
        [user, storePermissions]
    );
    const { routes: authorizedRoutes } = useMemo(
        () => getAuthorizedRouteMeta(userWithPerms),
        [userWithPerms]
    );

    const renderIcon = (iconName) => {
        if (!iconName) return null;
        const IconComponent = ICON_MAP[iconName];
        if (IconComponent) {
            return <IconComponent size={18} strokeWidth={2} style={{ marginRight: 8 }} />;
        }
        return null;
    };

    // ✅ FIX: getMenuItems ko useMemo mein wrap karo
    // Pehle yeh function har render pe naya array banata tha
    // Ant Design Menu har baar naye items dekhke re-render karta tha → flicker + delay
    // useMemo se yeh sirf ek baar calculate hoga, jab tak routes change na ho
    const buildMenuItems = (routes = authorizedRoutes, parentIndex = 0) =>
        routes.filter((item) => item.name && !item.hideFromNav).map((item, index) => {
            const hasChildren = item.children && item.children.length > 0;

            const itemKey =
                item.path && item.path !== "/"
                    ? item.path
                    : `parent-${item.name}-${parentIndex}-${index}`;

            return {
                key: itemKey,
                label: item.name,
                icon: item.icon ? renderIcon(item.icon) : null,

                children: hasChildren
                    ? buildMenuItems(item.children, index)
                    : null,

                onMouseEnter: () => prefetchRouteTree(item),

                onClick: hasChildren
                    ? null
                    : () => {
                        prefetchRoute(item.path);
                        navigate(item.path);
                        setVisible(false);
                    }
            };
        });

    // ✅ useMemo: menu items sirf ek baar build honge - no flicker on re-render
    const menuItems = useMemo(() => buildMenuItems(authorizedRoutes), [authorizedRoutes]);

    const selectedKeys = useMemo(
        () => resolveNavSelectedKeys(location.pathname, authorizedRoutes),
        [location.pathname, authorizedRoutes],
    );

    return (
        <ConfigProvider
            theme={{
                components: {
                    Menu: {
                        horizontalItemHoverColor: themeColors.navActive,
                        horizontalItemSelectedColor: themeColors.navActive,
                        itemSelectedColor: themeColors.navActive,
                        itemHoverColor: themeColors.navActive,
                    },
                },
            }}
        >
            <div className={styles.navWrapper}>
                {/* Desktop Menu: Mobile par hide ho jayega */}
                <div className={styles.desktopMenu}>
                    <Menu
                        mode="horizontal"
                        subMenuOpenDelay={0}
                        items={menuItems}
                        triggerSubMenuAction="hover"
                        selectedKeys={selectedKeys}
                        onOpenChange={(openKeys) => {
                            openKeys.forEach((key) => prefetchRoute(key));
                        }}
                        onMouseDown={preventNavTextCaret}
                        style={{ border: 'none', lineHeight: '46px', flex: 1 }}
                    />
                </div>

                {/* Mobile Hamburger: Sirf mobile par dikhega */}
                <div className={styles.mobileToggle}>
                    <Button
                        type="text"
                        icon={<MenuIcon color={themeColors.navActive} />}
                        onClick={() => setVisible(true)}
                    />
                </div>

                {/* Mobile Drawer (Sidebar) */}
                <Drawer
                    title="Menu"
                    placement="left"
                    onClose={() => setVisible(false)}
                    open={visible}
                    styles={{ body: { padding: 0 }, width: "280px" }}
                >
                    <Menu
                        mode="inline"
                        items={menuItems}
                        selectedKeys={selectedKeys}
                        onMouseDown={preventNavTextCaret}
                        style={{ border: 'none' }}
                    />
                </Drawer>
            </div>
        </ConfigProvider>
    );
};

export default NavBar;