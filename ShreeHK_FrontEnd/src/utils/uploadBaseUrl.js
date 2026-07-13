/**
 * Base URL for static uploads (profile images, etc.)
 */
export const getUploadBaseUrl = () => {
  const envUrl = import.meta.env.VITE_NODE_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (import.meta.env.DEV) return "";
  return "http://localhost:3500";
};

export const resolveUploadUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getUploadBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};
