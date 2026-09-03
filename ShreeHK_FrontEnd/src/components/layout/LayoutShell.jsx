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
import { getAuthorizedRouteMeta } from "../../routes/Routes";
import { prefetchAuthorizedRoutesIdle } from "../../routes/routePrefetch";

const FloatingAIChat = lazy(() => import("../ai/FloatingAIChat"));

const LayoutShell = () => {
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const showContextPicker = useAuthStore((state) => state.showContextPicker);
  const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
  const companyId = useAuthStore((state) => state.companyId);
  const yearId = useAuthStore((state) => state.yearId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userWithPerms = useAuthUser();
  useSessionKeepalive();
  useActivityTracker();
  useCopyableTableIdentifiers();

  const contextReady = companyId != null && yearId != null;
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
    if (isAuthenticated && contextReady) {
      prefetchMasterQueries(queryClient);
    }
  }, [isAuthenticated, contextReady, queryClient]);

  useEffect(() => {
    if (!contextReady) return undefined;
    return prefetchAuthorizedRoutesIdle(authorizedRoutes);
  }, [contextReady, authorizedRoutes]);

  useEffect(() => {
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
