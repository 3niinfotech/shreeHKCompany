const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (value, unit) => `${value} ${unit}${value === 1 ? "" : "s"} ago`;

/**
 * Human-readable "last active" label for a millisecond timestamp.
 * Returns null when there is no usable timestamp so callers can hide the label.
 */
export const formatLastActive = (timestamp) => {
  const time = Number(timestamp);
  if (!time || Number.isNaN(time)) return null;

  const diff = Date.now() - time;
  if (diff < 0) return "just now";
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "min");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < 7 * DAY) return plural(Math.floor(diff / DAY), "day");

  return new Date(time).toLocaleDateString();
};

export default formatLastActive;
