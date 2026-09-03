import { Navigate, useLocation } from "react-router-dom";
import { userLacksRoleAccess } from "../../routes/Routes";
import { ROLE_EXEMPT_PATHS } from "../../routes/roleExemptPaths";
import useAuthUser from "../../hooks/useAuthUser";

/**
 * Users without an assigned roll may only access forbidden / profile routes — not dashboard.
 */
export default function RoleAccessGuard({ children }) {
  const location = useLocation();
  const userWithPerms = useAuthUser();

  if (userLacksRoleAccess(userWithPerms) && !ROLE_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
