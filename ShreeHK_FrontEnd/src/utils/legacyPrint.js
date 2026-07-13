import { message } from "antd";

/**
 * Opens legacy PHP PDF print until native Node PDF is available.
 * Set VITE_LEGACY_PDF_URL in frontEnd/.env (same base as backend LEGACY_PDF_URL).
 */
export function openLegacyPdf(path, params = {}) {
  const base = (import.meta.env.VITE_LEGACY_PDF_URL || "").trim();
  if (!base) {
    message.warning("Legacy PDF URL is not configured (VITE_LEGACY_PDF_URL)");
    return;
  }
  const qs = new URLSearchParams(params).toString();
  const url = `${base.replace(/\/$/, "")}/${String(path || "").replace(/^\//, "")}${qs ? `?${qs}` : ""}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
