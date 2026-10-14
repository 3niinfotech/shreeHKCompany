/** Match backend — memo/consign/sale/export → INV-1; lab → LAB-1 */
export function formatOutwardInvoiceNo(type, seq) {
  const digits = String(seq ?? "").replace(/\D/g, "");
  const n = parseInt(digits, 10);
  const num = Number.isNaN(n) || n <= 0 ? 1 : n;
  const t = String(type || "").toLowerCase();
  if (t === "lab") return `LAB-${num}`;
  return `INV-${num}`;
}

/** Match backend entry no — memo-1 / sale-1 / lab-1 */
export function formatOutwardEntryNo(type, seq) {
  const digits = String(seq ?? "").replace(/\D/g, "");
  const n = parseInt(digits, 10);
  const num = Number.isNaN(n) || n <= 0 ? 1 : n;
  const t = String(type || "").toLowerCase();
  let prefix = "sale";
  if (t === "memo") prefix = "memo";
  else if (t === "consign") prefix = "consign";
  else if (t === "lab") prefix = "lab";
  else if (t === "export") prefix = "export";
  return `${prefix}-${num}`;
}
