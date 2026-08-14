export const fmtMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const fmtCaratPcs = (carat, pcs) =>
  `${Number(carat || 0).toFixed(2)} (${Number(pcs || 0).toLocaleString()})`;

export const fmtAxisAmount = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const RANGE_OPTIONS = [
  { value: "1m", label: "This Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "12m", label: "Last 12 Months" },
];

export const dueStatusFromRow = (row) => {
  const paid = Number(row?.paid) || 0;
  const balance = Number(row?.balance) || 0;
  if (paid > 0 && balance > 0) return "Partial";
  return "Due";
};
