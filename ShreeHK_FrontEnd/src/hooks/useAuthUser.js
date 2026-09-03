import { useMemo } from "react";
import useAuthStore from "../store/Auth.Store";
import { normalizeAuthUser } from "../utils/authUtils";

/**
 * Canonical auth user for ACL, menus, and routing.
 * Merges persisted user + top-level store permissions, then normalizes roll/role.
 * Matches AppRoutes.jsx userWithPerms pattern (steps 1.4+ will adopt this hook).
 */
export default function useAuthUser() {
  const user = useAuthStore((state) => state.user);
  const storePermissions = useAuthStore((state) => state.permissions);

  return useMemo(
    () =>
      normalizeAuthUser({
        ...user,
        permissions: user?.permissions ?? storePermissions ?? [],
      }),
    [user, storePermissions]
  );
}
