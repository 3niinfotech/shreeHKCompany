import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeAuthUser } from "../utils/authUtils";
import { api } from "../api/axiosInstance";
import { ENDPOINTS } from "../constants/endpoints";

/** Coarse granularity keeps persisted writes and subscriber re-renders infrequent. */
const ACTIVITY_WRITE_INTERVAL_MS = 30 * 1000;

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
      companyLogo: null,
      companyAddress: null,
      companyNumber: null,
      companyCity: null,
      companyState: null,
      companyPincode: null,
      companyCountry: null,
      companyEmail: null,
      companyWebsite: null,
      companyRapnetId: null,
      dbName: null,
      showContextPicker: false,
      lastActiveAt: null,

      setShowContextPicker: (show) => set({ showContextPicker: show }),

      markActivity: () => {
        if (!get().isAuthenticated) return;
        const now = Date.now();
        const previous = get().lastActiveAt;
        if (previous && now - previous < ACTIVITY_WRITE_INTERVAL_MS) return;
        set({ lastActiveAt: now });
      },

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
          companyLogo: context.companyLogo ?? get().companyLogo ?? null,
          companyAddress: context.companyAddress ?? get().companyAddress ?? null,
          companyNumber: context.companyNumber ?? context.companyTel ?? get().companyNumber ?? null,
          companyCity: context.companyCity ?? get().companyCity ?? null,
          companyState: context.companyState ?? get().companyState ?? null,
          companyPincode: context.companyPincode ?? get().companyPincode ?? null,
          companyCountry: context.companyCountry ?? get().companyCountry ?? null,
          companyEmail: context.companyEmail ?? get().companyEmail ?? null,
          companyWebsite: context.companyWebsite ?? get().companyWebsite ?? null,
          companyRapnetId: context.companyRapnetId ?? get().companyRapnetId ?? null,
          dbName: context.dbName ?? get().dbName ?? null,
          showContextPicker: context.showContextPicker ?? get().showContextPicker ?? false,
          lastActiveAt: Date.now(),
        });
      },

      setSessionContext: (context = {}) => {
        const {
          token,
          companyId,
          yearId,
          companyName,
          companyShortcutName,
          companyLogo,
          companyAddress,
          companyNumber,
          companyTel,
          companyCity,
          companyState,
          companyPincode,
          companyCountry,
          companyEmail,
          companyWebsite,
          companyRapnetId,
          dbName,
        } = context;
        const updates = {};
        if (token) updates.token = token;
        if (companyId != null) updates.companyId = companyId;
        if (yearId != null) updates.yearId = yearId;
        if (companyName != null) updates.companyName = companyName;
        if (companyShortcutName != null) updates.companyShortcutName = companyShortcutName;
        if (companyLogo !== undefined) updates.companyLogo = companyLogo;
        if (companyAddress !== undefined) updates.companyAddress = companyAddress;
        if (companyNumber !== undefined || companyTel !== undefined) updates.companyNumber = companyNumber ?? companyTel;
        if (companyCity !== undefined) updates.companyCity = companyCity;
        if (companyState !== undefined) updates.companyState = companyState;
        if (companyPincode !== undefined) updates.companyPincode = companyPincode;
        if (companyCountry !== undefined) updates.companyCountry = companyCountry;
        if (companyEmail !== undefined) updates.companyEmail = companyEmail;
        if (companyWebsite !== undefined) updates.companyWebsite = companyWebsite;
        if (companyRapnetId !== undefined) updates.companyRapnetId = companyRapnetId;
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
          companyLogo: null,
          companyAddress: null,
          companyNumber: null,
          companyCity: null,
          companyState: null,
          companyPincode: null,
          companyCountry: null,
          companyEmail: null,
          companyWebsite: null,
          companyRapnetId: null,
          dbName: null,
          showContextPicker: false,
          lastActiveAt: null,
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
