import { api } from "../api/axiosInstance";
import { getAuditPageContext } from "./auditUiTracker";

let installed = false;

/** Attach current page path to API requests so backend audit rows include page context. */
export function setupAuditAxiosHeaders() {
  if (installed) return;
  installed = true;

  api.interceptors.request.use((config) => {
    const ctx = getAuditPageContext();
    if (ctx?.path && !String(ctx.path).startsWith("/auth")) {
      config.headers["X-Audit-Page-Path"] = ctx.path;
      if (ctx.label) config.headers["X-Audit-Page-Label"] = ctx.label;
      if (ctx.search) config.headers["X-Audit-Page-Search"] = ctx.search;
    }
    return config;
  });
}
