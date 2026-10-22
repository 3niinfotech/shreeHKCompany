import { useEffect, useState } from "react";
import useAuthStore from "../store/Auth.Store";
import { api } from "../api/client/axiosInstance";
import { ENDPOINTS } from "../api/endpoints";

export const useActiveSessionContext = () => {
  const companyId = useAuthStore((s) => s.companyId);
  const companyName = useAuthStore((s) => s.companyName);
  const companyShortcutName = useAuthStore((s) => s.companyShortcutName);
  const branchId = useAuthStore((s) => s.branchId);
  const branchName = useAuthStore((s) => s.branchName);
  const branchShortcutStore = useAuthStore((s) => s.branchShortcut);
  const yearId = useAuthStore((s) => s.yearId);
  const yearLabelStore = useAuthStore((s) => s.yearLabel);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [resolvedBranchShortcut, setResolvedBranchShortcut] = useState(
    branchShortcutStore || branchName || companyShortcutName || ""
  );
  const [resolvedYearLabel, setResolvedYearLabel] = useState(
    yearLabelStore || (yearId ? String(yearId) : "")
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    if (branchShortcutStore) {
      setResolvedBranchShortcut(branchShortcutStore);
    }
    if (yearLabelStore) {
      setResolvedYearLabel(yearLabelStore);
    }
    if (branchShortcutStore && yearLabelStore) {
      return;
    }

    let cancelled = false;

    api.get(ENDPOINTS.portal.companyYears)
      .then((res) => {
        if (cancelled) return;
        const years = res.data?.Years || res.data?.years || [];
        const branches = res.data?.Branches || res.data?.branches || [];
        const combos = res.data?.Data || [];

        // 1. Resolve fiscal year label (e.g. "2026-27")
        if (!yearLabelStore && yearId) {
          const matchYear = years.find((y) => String(y.yearId) === String(yearId));
          const foundYearLabel = matchYear?.yearLabel || matchYear?.year || String(yearId);
          if (foundYearLabel) {
            setResolvedYearLabel(foundYearLabel);
            useAuthStore.getState().setSessionContext({ yearLabel: foundYearLabel });
          }
        }

        // 2. Resolve branch shortcut (e.g. "HK", "UAE")
        if (!branchShortcutStore) {
          let shortcut = null;
          if (branchId) {
            const b = branches.find((x) => String(x.branchId) === String(branchId));
            shortcut = b?.shortcutName || b?.branchShortcut || b?.branchName;
          }
          if (!shortcut && companyId) {
            const c = combos.find((x) => String(x.companyId) === String(companyId));
            shortcut = c?.branchShortcut || c?.shortcutName || c?.branchName;
          }
          if (!shortcut && branchName) {
            shortcut = branchName;
          }
          if (!shortcut && companyShortcutName) {
            shortcut = companyShortcutName;
          }
          if (shortcut) {
            setResolvedBranchShortcut(shortcut);
            useAuthStore.getState().setSessionContext({ branchShortcut: shortcut });
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    yearId,
    yearLabelStore,
    branchId,
    branchName,
    branchShortcutStore,
    companyId,
    companyShortcutName,
  ]);

  const activeBranchShortcut =
    branchShortcutStore || resolvedBranchShortcut || branchName || companyShortcutName || "HK";
  const activeYearLabel = yearLabelStore || resolvedYearLabel || (yearId ? String(yearId) : "");
  const activeCompanyName = companyName || branchName || "ShreeHK";

  return {
    branchShortcut: activeBranchShortcut,
    branchName: branchName || activeBranchShortcut,
    yearLabel: activeYearLabel,
    companyName: activeCompanyName,
    isAuthenticated,
  };
};

export default useActiveSessionContext;
