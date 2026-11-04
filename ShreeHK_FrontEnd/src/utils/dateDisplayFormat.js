import dayjs from "dayjs";

/** UI date display / DatePicker input format (not API payload). */
export const DATE_DISPLAY_FORMAT = "DD-MM-YYYY";

/**
 * Universal date display formatter for UI.
 * Always formats valid dates to DD-MM-YYYY.
 * Preserves day/month ordering when given DD/MM/YY or DD/MM/YYYY.
 * Returns fallback (default "-") if empty or invalid.
 */
export const formatDateDisplay = (value, fallback = "-") => {
  if (!value || value === "—" || value === "0000-00-00" || value === "0000-00-00 00:00:00") {
    return fallback;
  }
  const s = String(value).trim();
  if (!s || s === "-" || s === "—") return fallback;

  // 1. Matches DD/MM/YY, DD/MM/YYYY, DD-MM-YYYY, DD-MM-YY
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[\sT].*)?$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mm = dmyMatch[2].padStart(2, "0");
    const yyyy = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    return `${dd}-${mm}-${yyyy}`;
  }

  // 2. Matches YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[\sT].*)?$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, "0");
    const dd = ymdMatch[3].padStart(2, "0");
    return `${dd}-${mm}-${yyyy}`;
  }

  const d = dayjs(s);
  if (d.isValid()) {
    return d.format(DATE_DISPLAY_FORMAT);
  }
  return s || fallback;
};
