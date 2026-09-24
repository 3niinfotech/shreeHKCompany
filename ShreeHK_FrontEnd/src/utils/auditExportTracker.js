import { api } from "../api/client/axiosInstance";

/**
 * Tracks an Excel/PDF/CSV export in the central Activity Audit Log.
 */
export async function trackExportAudit({
  moduleName = "Report",
  recordReference = "",
  description = "",
  count = 0,
  format = "xlsx",
  fileName = "",
} = {}) {
  try {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    await api.post("/admin/activity-log/track-export", {
      moduleName,
      recordReference: recordReference || (fileName ? `${fileName}.${format}` : `${count || 0} rows`),
      description: description || `Exported ${moduleName} data to ${format.toUpperCase()} (${count || 0} rows)`,
      count,
      format,
      fileName,
      path,
    });
  } catch {
    // Non-blocking for export functionality
  }
}
