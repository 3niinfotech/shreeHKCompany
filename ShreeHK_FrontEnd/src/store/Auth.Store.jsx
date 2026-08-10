import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeAuthUser } from "../utils/authUtils";
import { api } from "../api/axiosInstance";
import { ENDPOINTS } from "../constants/endpoints";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      companyId: null,
      yearId: null,
      companyName: null,
      companyShortcutName: null,
      dbName: null,
      showContextPicker: false,

      setShowContextPicker: (show) => set({ showContextPicker: show }),

      getUserInitial: () => {
        const name = get().user?.username || get().user?.name || "Admin";
        return name.charAt(0).toUpperCase();
      },

      login: (userData, token, context = {}) => {
        const existingPerms = get().permissions;
        const mergedUser = {
          ...userData,
          permissions:
            Array.isArray(userData?.permissions) && userData.permissions.length
              ? userData.permissions
              : existingPerms,
        };
        const user = normalizeAuthUser(mergedUser);
        const permissions = user?.permissions ?? [];
        set({
          user,
          token,
          permissions,
          isAuthenticated: true,
          companyId: context.companyId ?? get().companyId ?? null,
          yearId: context.yearId ?? get().yearId ?? null,
          companyName: context.companyName ?? user?.company_name ?? get().companyName ?? null,
          companyShortcutName: context.companyShortcutName ?? get().companyShortcutName ?? null,
          dbName: context.dbName ?? get().dbName ?? null,
          showContextPicker: context.showContextPicker ?? get().showContextPicker ?? false,
        });
      },

      setSessionContext: ({ token, companyId, yearId, companyName, companyShortcutName, dbName }) => {
        const updates = {};
        if (token) updates.token = token;
        if (companyId != null) updates.companyId = companyId;
        if (yearId != null) updates.yearId = yearId;
        if (companyName != null) updates.companyName = companyName;
        if (companyShortcutName != null) updates.companyShortcutName = companyShortcutName;
        if (dbName != null) updates.dbName = dbName;
        set(updates);
      },

      sanitizeUser: () => {
        const current = get().user;
        if (!current) return;

        const normalizedRoll =
          current.roll != null && Number(current.roll) > 0 ? Number(current.roll) : null;
        const expectedRole = normalizedRoll === 1 ? "super_admin" : "admin";

        if (current.roll === normalizedRoll && current.role === expectedRole) {
          return;
        }

        const currentPerms =
          Array.isArray(current.permissions) && current.permissions.length
            ? current.permissions
            : (get().permissions || []);

        const user = normalizeAuthUser({
          ...current,
          permissions: currentPerms,
        });
        set({
          user,
          permissions: user?.permissions ?? currentPerms,
        });
      },

      setPermissions: (permissions = []) =>
        set({
          permissions: Array.isArray(permissions) ? permissions : [],
        }),

      logout: async () => {
        const token = get().token;
        if (token) {
          try {
            await api.post(ENDPOINTS.auth.logout);
          } catch {
            // Clear local session even if server logout fails
          }
        }
        set({
          user: null,
          token: null,
          permissions: [],
          isAuthenticated: false,
          companyId: null,
          yearId: null,
          companyName: null,
          companyShortcutName: null,
          dbName: null,
          showContextPicker: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          const user = normalizeAuthUser(state.user);
          state.user = user;
          state.permissions = user?.permissions ?? [];
        }
      },
    }
  )
);

export default useAuthStore;
