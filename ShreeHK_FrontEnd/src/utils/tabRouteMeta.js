import { getAuthorizedFlattenRoutes, userLacksRoleAccess } from "../routes/Routes";

const HOME_TAB = { key: "home", label: "Home", path: "/" };

const pathToRegex = (routePath) => {
  const pattern = routePath
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${pattern}$`);
};

/**
 * Resolve tab metadata for a URL path using authorized routes (same ACL as menu).
 */
export const resolveTabFromPath = (pathname, user, authorizedRoutes) => {
  const normalized = pathname === "" ? "/" : pathname;

  if (normalized === "/") {
    if (userLacksRoleAccess(user)) {
      return { key: "forbidden", label: "Access Denied", path: "/forbidden" };
    }
    return { ...HOME_TAB };
  }

  const routes = authorizedRoutes ?? getAuthorizedFlattenRoutes(user);
  const exact = routes.find((route) => route.path === normalized);
  if (exact) {
    return { key: normalized, label: exact.name, path: normalized };
  }

  const dynamic = routes.find(
    (route) => route.path?.includes(":") && pathToRegex(route.path).test(normalized)
  );
  if (dynamic) {
    return { key: normalized, label: dynamic.name, path: normalized };
  }

  const segment = normalized.split("/").filter(Boolean).pop() || "Page";
  const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
  return { key: normalized, label, path: normalized };
};

export { HOME_TAB };
