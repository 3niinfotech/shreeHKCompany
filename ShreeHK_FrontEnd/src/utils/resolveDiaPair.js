/**
 * Mirrors PHP printSticker() dia_pair from filter pair checkbox / stockChecks.
 */
export function resolveDiaPair(source = {}) {
  if (source.diaPair) return source.diaPair;
  if (source.dia_pair) return source.dia_pair;

  const stockChecks = source.stockChecks;
  if (Array.isArray(stockChecks) && stockChecks.includes("PAIR")) {
    return "pair";
  }

  if (source.appliedFilters?.pair) {
    return "pair";
  }

  return "";
}
