import { useEffect } from "react";
import useUIStore from "../../store/Ui.Store";
import useAuthStore from "../../store/Auth.Store";
import useSessionKeepalive from "../../hooks/useSessionKeepalive";
import MainLayout from "./MainLayout";
import DashboardLayout from "./DashboardLayout";
import FloatingAIChat from "../ai/FloatingAIChat";
import FloatingRapaportPanel from "../rapaport/FloatingRapaportPanel";
import CompanyYearPicker from "./CompanyYearPicker";
import AuditUiTracker from "./AuditUiTracker";
import useCopyableTableIdentifiers from "../../hooks/useCopyableTableIdentifiers";
import TaskReminderModal from "../dashboard/TaskReminderModal";
import { SkuModalProvider } from "../../hooks/useSkuModalAction";

const LayoutShell = () => {
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const showContextPicker = useAuthStore((state) => state.showContextPicker);
  const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
  const companyId = useAuthStore((state) => state.companyId);
  const yearId = useAuthStore((state) => state.yearId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useSessionKeepalive();
  useCopyableTableIdentifiers();

  const contextReady = companyId != null && yearId != null;

  useEffect(() => {
    if (isAuthenticated && !contextReady) {
      setShowContextPicker(true);
    }
  }, [isAuthenticated, contextReady, setShowContextPicker]);

  return (
    <SkuModalProvider>
      <AuditUiTracker />
      {contextReady ? (
        <>
          {viewMode === "dashboard" ? <DashboardLayout /> : <MainLayout />}
          {/* <FloatingRapaportPanel /> */}
          <FloatingAIChat />
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
