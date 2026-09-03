import { createRouteMetaApi } from "./routeMeta";
import { allProtectedRoutes } from "./routes.config";

const {
  getPostLoginPath,
  getAuthorizedRouteMeta,
  getAuthorizedFlattenRoutes,
} = createRouteMetaApi(allProtectedRoutes);

export {
  isSuperAdminUser,
  getUserRoleValue,
  getUserPermissions,
  getAssignedRollId,
  userHasAssignedRole,
  userLacksRoleAccess,
  canAccessRoute,
  hasRouteAccess,
  filterRoutesByAccess,
  ROLE_ACCESS,
} from "./routeAcl";

export {
  flattenRoutes,
  filterHiddenFromNav,
  createRouteMetaApi,
} from "./routeMeta";

export { publicRoutes, allProtectedRoutes } from "./routes.config";

export { getPostLoginPath, getAuthorizedRouteMeta, getAuthorizedFlattenRoutes };

export { normalizeAuthUser } from "../utils/authUtils";
