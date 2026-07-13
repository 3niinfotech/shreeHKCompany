import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield } from "lucide-react";
import { getAuthorizedRouteMeta } from "../routes/Routes";
import useAuthStore from "../store/Auth.Store";

const ICON_MAP = { House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield };

const renderIcon = (iconName) => {
  if (!iconName) return null;
  const IconComponent = ICON_MAP[iconName];
  if (IconComponent) {
    return <IconComponent size={18} strokeWidth={2} style={{ marginRight: 8 }} />;
  }
  return null;
};

const USER_MGMT_ICONS = {
  "Manage User": "Users",
  Roll: "Shield",
};

export default function useAuthorizedMenuItems(onItemClick) {
  const navigate = useNavigate();
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

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      onItemClick?.();
    },
    [navigate, onItemClick]
  );

  const buildMenuItems = useCallback(
    (routes, parentIndex = 0) =>
      routes
        .filter((item) => item.name && !item.hideFromNav)
        .map((item, index) => {
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
            onClick: hasChildren
              ? null
              : () => {
                  if (item.path) handleNavigate(item.path);
                },
          };
        }),
    [handleNavigate]
  );

  return useMemo(() => {
    const items = buildMenuItems(authorizedRoutes);

    const adminRoute = authorizedRoutes.find((r) => r.name === "Admin");
    if (adminRoute?.children?.length > 0) {
      const userMgmtChildren = adminRoute.children
        .filter((child) => child.name)
        .map((child) => ({
          key: `user-mgmt-${child.path}`,
          label: child.name,
          icon: renderIcon(USER_MGMT_ICONS[child.name] || "User"),
          onClick: () => {
            if (child.path) handleNavigate(child.path);
          },
        }));

      if (userMgmtChildren.length > 0) {
        items.push({ type: "divider", key: "user-mgmt-divider" });
        items.push({
          type: "group",
          label: "USER MANAGEMENT",
          key: "user-management-group",
          children: userMgmtChildren,
        });
      }
    }

    return items;
  }, [authorizedRoutes, buildMenuItems, handleNavigate]);
}
