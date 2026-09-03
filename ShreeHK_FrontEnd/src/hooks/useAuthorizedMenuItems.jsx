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
            onMouseDown: hasChildren
              ? null
              : (event) => {
                  if (event.button !== 0 || !item.path) return;
                  prefetchRoute(item.path);
                  goToPath(item.path);
                  onItemClick?.();
                },
            onClick: hasChildren ? null : () => onItemClick?.(),
          };
        }),
    [goToPath, onItemClick]
  );

  return useMemo(
    () => buildMenuItems(authorizedRoutes),
    [authorizedRoutes, buildMenuItems],
  );
}
