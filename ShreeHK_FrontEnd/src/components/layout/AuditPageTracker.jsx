import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

/**
 * Isolated page-visit audit — leaf component so LayoutShell does not re-render
 * the full layout tree on every pathname change.
 */
export default function AuditPageTracker() {
  const location = useLocation();
  const lastTracked = useRef("");

  useEffect(() => {
    const key = `${location.pathname}${location.search || ""}`;
    if (!key || key === lastTracked.current) return;
    if (location.pathname.startsWith("/auth")) return;

    lastTracked.current = key;
    api
      .post(ENDPOINTS.admin.activityLogTrack, {
        path: location.pathname,
        search: location.search || "",
      })
      .catch(() => {});
  }, [location.pathname, location.search]);

  return null;
}
