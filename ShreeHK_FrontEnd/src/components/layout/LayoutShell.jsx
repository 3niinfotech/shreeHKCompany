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

const LayoutShell = () => {
  const viewMode = useUIStore((state) => state.viewMode) ?? "web";
  const showContextPicker = useAuthStore((state) => state.showContextPicker);
  const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
  const companyId = useAuthStore((state) => state.companyId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useSessionKeepalive();
  useCopyableTableIdentifiers();

  useEffect(() => {
    if (isAuthenticated && companyId == null) {
      setShowContextPicker(true);
    }
  }, [isAuthenticated, companyId, setShowContextPicker]);

  return (
    <>
      <AuditUiTracker />
      {viewMode === "dashboard" ? <DashboardLayout /> : <MainLayout />}
      <FloatingRapaportPanel />
      <FloatingAIChat />
      <CompanyYearPicker
        open={showContextPicker}
        onClose={() => setShowContextPicker(false)}
        force={!companyId}
      />
    </>
  );
};

export default LayoutShell;
