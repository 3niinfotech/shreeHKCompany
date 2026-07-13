const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getShapeFirst = (shape) => {
  const parts = String(shape || "").split(" ");
  return parts[0] || "";
};

const formatMainColor = (mainColor) => {
  const trimmed = String(mainColor || "").trim();
  if (trimmed.length > 30) {
    return trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("");
  }
  return trimmed.replace(/\s+/g, "");
};

module.exports = {
  escapeHtml,
  getShapeFirst,
  formatMainColor,
};
