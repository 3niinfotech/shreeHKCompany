import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setupAuditAxiosHeaders } from "../../audit/setupAuditAxios";
import { setAuditPageContext } from "../../audit/auditUiTracker";
import { resolvePageLabel } from "../../audit/resolvePageLabel";

/**
 * Attaches current page to API audit headers (save/update/delete context only).
 * Page visits and UI clicks are not logged.
 */
export default function AuditUiTracker() {
  const location = useLocation();

  useEffect(() => {
    setupAuditAxiosHeaders();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/auth")) return;
    setAuditPageContext({
      path: location.pathname,
      search: location.search || "",
      label: resolvePageLabel(location.pathname),
    });
  }, [location.pathname, location.search]);

  return null;
}
