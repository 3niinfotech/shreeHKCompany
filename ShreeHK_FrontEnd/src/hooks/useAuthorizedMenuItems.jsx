import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield, NotebookPen } from "lucide-react";
import { getAuthorizedRouteMeta } from "../routes/Routes";
import { prefetchRoute, prefetchRouteTree } from "../routes/routePrefetch";
import useAuthStore from "../store/Auth.Store";

const ICON_MAP = { House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield, NotebookPen };

const renderIcon = (iconName) => {
  if (!iconName) return null;
  const IconComponent = ICON_MAP[iconName];
  if (IconComponent) {
    return <IconComponent size={18} strokeWidth={2} style={{ marginRight: 8 }} />;
  }
  return null;
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
            onMouseEnter: () => prefetchRouteTree(item),
            onClick: hasChildren
              ? null
              : () => {
                  if (item.path) {
                    prefetchRoute(item.path);
                    handleNavigate(item.path);
                  }
                },
          };
        }),
    [handleNavigate]
  );

  return useMemo(
    () => buildMenuItems(authorizedRoutes),
    [authorizedRoutes, buildMenuItems],
  );
}
