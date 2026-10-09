import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { House, Settings, Package, Repeat, Book, BarChart, ExternalLink, User, Users, Shield, NotebookPen } from "lucide-react";
import { getAuthorizedRouteMeta } from "../routes/Routes";
import { prefetchRoute, prefetchRouteTree } from "../routes/routePrefetch";
import useAuthUser from "./useAuthUser";

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
  const userWithPerms = useAuthUser();
  const { routes: authorizedRoutes } = useMemo(
    () => getAuthorizedRouteMeta(userWithPerms),
    [userWithPerms]
  );

  const goToPath = useCallback(
    (path) => {
      if (path) navigate(path);
    },
    [navigate]
  );

  const buildMenuItems = useCallback(
    (routes, parentIndex = 0) =>
      routes
        .filter((item) => item.name && !item.hideFromNav)
        .map((item, index) => {
          const childItems = Array.isArray(item.children) && item.children.length
            ? buildMenuItems(item.children, index)
            : [];
          const hasChildren = childItems.length > 0;
          // Menu-only parents use *-menu paths; never navigate those.
          const isMenuOnlyParent =
            hasChildren || (typeof item.path === "string" && item.path.endsWith("-menu"));

          const itemKey =
            item.path && item.path !== "/"
              ? item.path
              : `parent-${item.name}-${parentIndex}-${index}`;

          const menuItem = {
            key: itemKey,
            label: item.name,
            icon: item.icon ? renderIcon(item.icon) : undefined,
            onMouseEnter: () => prefetchRouteTree(item),
          };

          if (hasChildren) {
            menuItem.children = childItems;
            return menuItem;
          }

          menuItem.onMouseDown = (event) => {
            if (event.button !== 0 || !item.path || isMenuOnlyParent) return;
            prefetchRoute(item.path);
            goToPath(item.path);
            onItemClick?.();
          };
          menuItem.onClick = () => onItemClick?.();
          return menuItem;
        }),
    [goToPath, onItemClick]
  );

  return useMemo(
    () => buildMenuItems(authorizedRoutes),
    [authorizedRoutes, buildMenuItems],
  );
}
