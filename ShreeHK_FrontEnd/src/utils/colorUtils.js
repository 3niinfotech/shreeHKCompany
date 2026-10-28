/**
 * Ensures a color value is a syntactically valid CSS hex or color string.
 * Prepends '#' if 3, 6, or 8 hex digits were provided without a leading '#'.
 */
export const normalizeHexColor = (color) => {
  if (!color || typeof color !== "string") return null;
  const trimmed = color.trim();
  if (!trimmed) return null;
  if (/^[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  return trimmed;
};
