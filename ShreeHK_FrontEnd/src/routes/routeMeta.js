/** Route meta helpers — menus, tabs, post-login path (Phase 1.14). */

import {
  userLacksRoleAccess,
  canAccessRoute,
  filterRoutesByAccess,
} from "./routeAcl";

export const flattenRoutes = (routes, flatRoutes = []) => {
  routes.forEach((item) => {
    if (item.element) {
      flatRoutes.push(item);
    }
    if (item.children) {
      flattenRoutes(item.children, flatRoutes);
    }
  });
  return flatRoutes;
};

export const filterHiddenFromNav = (routes) =>
  routes
    .filter((route) => !route.hideFromNav)
    .map((route) => {
      if (!route.children) return route;
      return { ...route, children: filterHiddenFromNav(route.children) };
    });

/** Bind once in Routes.jsx with allProtectedRoutes from routes.config.jsx. */
export const createRouteMetaApi = (allProtectedRoutes) => {
  const getPostLoginPath = (user) => {
    if (userLacksRoleAccess(user)) return "/forbidden";
    if (canAccessRoute({ path: "/dashboard", permissionKey: "core.dashboard" }, user)) return "/dashboard";
    const flat = flattenRoutes(filterRoutesByAccess(allProtectedRoutes, user));
    const first = flat.find(
      (r) => r.path && r.element && !r.hideFromNav && r.path !== "/forbidden" && !String(r.path).includes(":")
    );
    if (first?.path) return first.path;
    const anyPermissible = flat.find(
      (r) => r.path && r.element && r.path !== "/forbidden" && !String(r.path).includes(":")
    );
    return anyPermissible?.path || "/forbidden";
  };

  const getAuthorizedRouteMeta = (user) => {
    const routes = filterRoutesByAccess(allProtectedRoutes, user);
    return {
      routes: filterHiddenFromNav(routes),
      flatRoutes: flattenRoutes(routes),
    };
  };

  const getAuthorizedFlattenRoutes = (user) =>
    flattenRoutes(filterRoutesByAccess(allProtectedRoutes, user));

  return {
    getPostLoginPath,
    getAuthorizedRouteMeta,
    getAuthorizedFlattenRoutes,
  };
};
