/** User/role ACL helpers — extracted from Routes.jsx (Phase 1.12). */

import { hasPagePermission } from "../config/permissionRegistry";
import { ROLE_EXEMPT_PATH_SET } from "./roleExemptPaths";

export const ROLE_ACCESS = {
  SUPER_ADMIN: "super_admin",
};

export const getUserPermissions = (user) => {
  const perms = user?.permissions ?? user?.perms;
  return Array.isArray(perms) ? perms : [];
};

export const getUserRoleValue = (user) => {
  if (!user) return null;
  return user.roll ?? user.userroll ?? user.role_id ?? null;
};

/** DB roll id only — ignore login `role` string ("admin" / "super_admin"). */
export const getAssignedRollId = (user) => {
  const roll = getUserRoleValue(user);
  if (roll === null || roll === undefined || roll === "") return null;
  const num = Number(roll);
  if (Number.isNaN(num) || num === 0) return null;
  return num;
};

export const isSuperAdminUser = (user) => getAssignedRollId(user) === 1;

/**
 * Block app access → show Forbidden only (no dashboard).
 * True when: no roll, OR roll exists but permissions array is empty.
 */
export const userLacksRoleAccess = (user) => {
  if (!user) return true;
  if (isSuperAdminUser(user)) return false;

  const rollId = getAssignedRollId(user);
  if (rollId === null) return true;

  const perms = getUserPermissions(user);
  if (!perms.length) return true;

  return false;
};

export const userHasAssignedRole = (user) => getAssignedRollId(user) !== null;

export const hasRouteAccess = (route, user) => {
  if (!route?.requiredRole) return true;

  if (route.requiredRole === ROLE_ACCESS.SUPER_ADMIN) {
    return isSuperAdminUser(user);
  }

  return true;
};

export const canAccessRoute = (route, user) => {
  if (userLacksRoleAccess(user)) {
    return ROLE_EXEMPT_PATH_SET.has(route.path);
  }

  if (!hasRouteAccess(route, user)) return false;
  if (isSuperAdminUser(user)) return true;
  if (route.alwaysAllow || (route.permissionKey == null && !route.permissionKeys?.length)) return true;
  if (route.permissionKeys?.length) {
    const perms = getUserPermissions(user);
    return route.permissionKeys.some((k) => hasPagePermission(perms, k));
  }
  return hasPagePermission(getUserPermissions(user), route.permissionKey);
};

export const filterRoutesByAccess = (routes, user) =>
  routes
    .map((route) => {
      if (route.children) {
        const children = filterRoutesByAccess(route.children, user);
        if (!children.length) return null;
        return { ...route, children };
      }
      return canAccessRoute(route, user) ? route : null;
    })
    .filter(Boolean);
