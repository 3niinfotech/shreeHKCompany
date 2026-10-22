import { useEffect, lazy, Suspense, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useUIStore from "../../store/Ui.Store";
import useAuthStore from "../../store/Auth.Store";
import useSessionKeepalive from "../../hooks/useSessionKeepalive";
import useActivityTracker from "../../hooks/useActivityTracker";
import useAuthUser from "../../hooks/useAuthUser";
import MainLayout from "./MainLayout";
import DashboardLayout from "./DashboardLayout";
import CompanyYearPicker from "./CompanyYearPicker";
import AuditUiTracker from "./AuditUiTracker";
import useCopyableTableIdentifiers from "../../hooks/useCopyableTableIdentifiers";
import TaskReminderModal from "../dashboard/TaskReminderModal";
import { SkuModalProvider } from "../../hooks/useSkuModalAction";
import { prefetchMasterQueries } from "../../api/prefetchMasterQueries";
import { PAUSE_BACKGROUND_API } from "../../api/pauseBackgroundApi";
import { getAuthorizedRouteMeta } from "../../routes/Routes";
import { prefetchAuthorizedRoutesIdle } from "../../routes/routePrefetch";
import useActiveSessionContext from "../../hooks/useActiveSessionContext";

const FloatingAIChat = lazy(() => import("../ai/FloatingAIChat"));

const LayoutShell = () => {
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const showContextPicker = useAuthStore((state) => state.showContextPicker);
  const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
  const companyId = useAuthStore((state) => state.companyId);
  const branchId = useAuthStore((state) => state.branchId);
  const yearId = useAuthStore((state) => state.yearId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userWithPerms = useAuthUser();
  const { branchShortcut, branchName, yearLabel } = useActiveSessionContext();
  useSessionKeepalive();
  useActivityTracker();
  useCopyableTableIdentifiers();

  // Task 2: Chrome tab title format: "Smart Dia - branch - year"
  useEffect(() => {
    if (!isAuthenticated) {
      document.title = "Smart Dia";
      return;
    }
    const branch = (branchShortcut || branchName || "").trim();
    const year = yearLabel && String(yearLabel).trim();
    if (branch && year) {
      document.title = `Smart Dia - ${branch} - ${year}`;
    } else if (branch) {
      document.title = `Smart Dia - ${branch}`;
    } else if (year) {
      document.title = `Smart Dia - ${year}`;
    } else {
      document.title = "Smart Dia";
    }
  }, [isAuthenticated, branchShortcut, branchName, yearLabel]);

  // Company optional: Branch + Year is enough (create company after login)
  const contextReady =
    yearId != null &&
    (Number(companyId) > 0 || Number(branchId) > 0 || companyId === 0);
  const queryClient = useQueryClient();
  const { routes: authorizedRoutes } = useMemo(
    () => getAuthorizedRouteMeta(userWithPerms),
    [userWithPerms]
  );

  useEffect(() => {
    if (isAuthenticated && !contextReady) {
      setShowContextPicker(true);
    }
  }, [isAuthenticated, contextReady, setShowContextPicker]);

  useEffect(() => {
    if (PAUSE_BACKGROUND_API) return;
    if (isAuthenticated && contextReady) {
      prefetchMasterQueries(queryClient);
    }
  }, [isAuthenticated, contextReady, queryClient]);

  useEffect(() => {
    if (PAUSE_BACKGROUND_API) return undefined;
    if (!contextReady) return undefined;
    return prefetchAuthorizedRoutesIdle(authorizedRoutes);
  }, [contextReady, authorizedRoutes]);

  useEffect(() => {
    if (PAUSE_BACKGROUND_API) return undefined;
    if (!contextReady) return undefined;
    const prefetchChat = () => import("../ai/FloatingAIChat");
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetchChat);
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(prefetchChat, 1);
    return () => window.clearTimeout(timer);
  }, [contextReady]);

  return (
    <SkuModalProvider>
      <AuditUiTracker />
      {contextReady ? (
        <>
          {viewMode === "dashboard" ? <DashboardLayout /> : <MainLayout />}
          <Suspense fallback={null}>
            <FloatingAIChat />
          </Suspense>
          <TaskReminderModal />
        </>
      ) : null}
      <CompanyYearPicker
        open={showContextPicker || !contextReady}
        onClose={() => setShowContextPicker(false)}
        force={!contextReady}
      />
    </SkuModalProvider>
  );
};

export default LayoutShell;
