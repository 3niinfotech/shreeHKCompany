import { resolveUploadUrl } from "./uploadBaseUrl";

/** Absolute URL for a company logo path (or null). */
export const resolveCompanyLogoUrl = (logo) => {
  if (!logo) return null;
  return resolveUploadUrl(String(logo).trim()) || null;
};

/**
 * HTML for bill header logo.
 * Prefer uploaded company logo; otherwise letter fallback (not fixed Venya SVG).
 */
export const buildCompanyLogoHtml = ({
  logo,
  logoUrl,
  companyName = "",
  className = "logo",
  imgStyle = "max-height:70px;max-width:200px;object-fit:contain;display:block;",
} = {}) => {
  const url = logoUrl || resolveCompanyLogoUrl(logo);
  const name = String(companyName || "").trim();
  const letter = (name.charAt(0) || "C").toUpperCase();

  if (url) {
    const safeUrl = String(url)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
    const safeAlt = name
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
    return `<img class="${className}" src="${safeUrl}" alt="${safeAlt || "Company logo"}" style="${imgStyle}" />`;
  }

  return `<div class="${className}">${letter}</div>`;
};
