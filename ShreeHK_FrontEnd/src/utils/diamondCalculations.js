/**
 * Centralized Diamond & Transaction Calculation Utility
 * Single source of truth for:
 * - Amount = Carat × Price
 * - Price from RapNet & Discount / Back %
 * - Discount % from RapNet & Price
 * - Carat from Amount & Price (Reverse Inward calculation)
 *
 * All formulas maintain exact backward-compatible precision.
 */

/**
 * Calculates total amount from carat weight and price per carat.
 * @param {number|string} carat - Carat weight
 * @param {number|string} price - Price per carat
 * @returns {number} Rounded to 2 decimal places (e.g. 55350.25)
 */
export function calculateAmount(carat, price) {
  const c = Number(carat) || 0;
  const p = Number(price) || 0;
  if (c <= 0 || p <= 0) return 0;
  return Math.round(c * p * 100) / 100;
}

/**
 * Calculates net price per carat from RapNet price and Discount / Back %.
 * Formula: Rap × (1 + Discount% / 100)
 * Note: discountPct can be negative (e.g. -35% back) or positive (+5% premium)
 * @param {number|string} rapPrice - Base RapNet price per carat
 * @param {number|string} discountPct - Discount percentage (-80 to +100)
 * @param {number|string} [fallbackPrice=0] - Price to return if rap is 0
 * @returns {number} Rounded to 2 decimal places
 */
export function calculatePriceFromRap(rapPrice, discountPct, fallbackPrice = 0) {
  const rap = Number(rapPrice) || 0;
  const disc = Number(discountPct) || 0;
  if (rap > 0) {
    const price = rap * (1 + disc / 100);
    return Math.max(0, Number(price.toFixed(2)));
  }
  return Number(fallbackPrice) || 0;
}

/**
 * Calculates discount / back % from RapNet price and actual Price per carat.
 * Formula: ((Price × 100) / Rap) - 100
 * @param {number|string} rapPrice - Base RapNet price per carat
 * @param {number|string} price - Actual selling/buying price per carat
 * @param {number|string} [fallbackDisc=0] - Fallback discount
 * @returns {number} Rounded to 2 decimal places (e.g. -35.50)
 */
export function calculateDiscountFromPrice(rapPrice, price, fallbackDisc = 0) {
  const rap = Number(rapPrice) || 0;
  const p = Number(price) || 0;
  if (rap > 0 && p > 0) {
    const disc = (p * 100) / rap - 100;
    return Number(disc.toFixed(2));
  }
  return Number(fallbackDisc) || 0;
}

/**
 * Reverse-calculates carat weight from total amount and price per carat.
 * Used during inward entry when total amount is known.
 * @param {number|string} amount - Total amount
 * @param {number|string} price - Price per carat
 * @param {number|string} [fallbackCarat=0] - Fallback carat
 * @returns {number} Rounded to 4 decimal places for diamond weight precision
 */
export function calculateCaratFromAmount(amount, price, fallbackCarat = 0) {
  const a = Number(amount) || 0;
  const p = Number(price) || 0;
  if (p > 0 && a > 0) {
    return Math.round((a / p) * 10000) / 10000;
  }
  return Number(fallbackCarat) || 0;
}

