import { PAGE_ENTRIES } from "../config/permissionRegistry";

/** Resolve human-readable page label from route path (for audit context). */
export function resolvePageLabel(pathname) {
  const normalized = String(pathname || "").split("?")[0];
  const entry = PAGE_ENTRIES.find((p) => p.path === normalized);
  return entry?.label || normalized || "Page";
}
