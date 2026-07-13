import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/Auth.Store";
import { userLacksRoleAccess } from "../../routes/Routes";

const ALLOWED_WITHOUT_ROLE = ["/forbidden", "/my-account", "/settings"];

/**
 * Users without an assigned roll may only access forbidden / profile routes — not dashboard.
 */
export default function RoleAccessGuard({ children }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const storePermissions = useAuthStore((state) => state.permissions);

  const userWithPerms = {
    ...user,
    permissions: user?.permissions ?? storePermissions ?? [],
  };

  if (userLacksRoleAccess(userWithPerms) && !ALLOWED_WITHOUT_ROLE.includes(location.pathname)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
