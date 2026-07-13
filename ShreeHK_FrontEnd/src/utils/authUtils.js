/** Auth user normalization — shared by store and routes (avoids importing Routes.jsx in Auth.Store). */

export const normalizeAuthUser = (userData) => {
  if (!userData) return null;
  const roll =
    userData.roll != null && Number(userData.roll) > 0 ? Number(userData.roll) : null;
  const permissions = Array.isArray(userData.permissions) ? userData.permissions : [];
  return {
    ...userData,
    roll,
    permissions: roll ? permissions : [],
    role: roll === 1 ? "super_admin" : "admin",
    has_role: roll != null,
  };
};
