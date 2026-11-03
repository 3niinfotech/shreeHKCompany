/**
 * Audit Feature Flag & Guard Helper
 *
 * Supported Modes:
 * - "OFF" (default when env var is missing or empty)
 * - "LOG_ONLY" (writes warnings to console only, zero DB writes, never throws)
 * - "ENFORCE" (executes enforcement callback)
 */

function getAuditFlag(envVar) {
  const val = String(process.env[envVar] || "OFF").trim().toUpperCase();
  if (val === "ENFORCE" || val === "LOG_ONLY") return val;
  return "OFF";
}

/**
 * Async-capable audit guard executor.
 * Safely wraps execution in try/catch so it can NEVER throw or alter standard responses in LOG_ONLY.
 *
 * @param {string} flagName - Environment variable name (e.g. "FLAG_BLOCK_PAID_SALE_DELETE")
 * @param {Function} checkFn - Async or sync function returning truthy violation info if check fails
 * @param {Function} onEnforceFn - Async or sync function executed only when mode === "ENFORCE"
 * @returns {Promise<any>} Result of onEnforceFn if ENFORCE, or null
 */
async function executeAuditGuard(flagName, checkFn, onEnforceFn) {
  const mode = getAuditFlag(flagName);
  if (mode === "OFF") return null;

  try {
    const violation = await checkFn();
    if (!violation) return null;

    if (mode === "LOG_ONLY") {
      console.warn(`[AUDIT_FLAG:${flagName}] (LOG_ONLY mode - no action taken):`, violation);
      return null;
    }

    if (mode === "ENFORCE") {
      if (typeof onEnforceFn === "function") {
        return await onEnforceFn(violation);
      }
      return violation;
    }
  } catch (err) {
    console.error(`[AUDIT_FLAG:${flagName}] Guard execution error:`, err?.message || err);
    return null;
  }
  return null;
}

/**
 * Recomputes expected invoice final amount matching frontend MemoConvertModal formula:
 * base = itemsTotal + shipping_charge
 * less applied on base
 * other_less applied after less
 * final = after_other_less + extra charge
 */
function computeExpectedInvoiceTotal(subtotal, post = {}) {
  const itemsTotal = Number(subtotal) || 0;
  const shippingCharge = Number(post.shipping_charge) || 0;
  const base = itemsTotal + shippingCharge;

  const lessPercent = Number(post.less_percent) || 0;
  let lessAmount = 0;
  if (lessPercent > 0) {
    lessAmount = (base * lessPercent) / 100;
  } else if (post.less_amount) {
    lessAmount = Number(post.less_amount) || 0;
  }
  const afterLess1 = base - lessAmount;

  const otherLessPercent = Number(post.other_less_percent) || 0;
  let otherLessAmount = 0;
  if (otherLessPercent > 0) {
    otherLessAmount = (afterLess1 * otherLessPercent) / 100;
  } else if (post.other_less_amount) {
    otherLessAmount = Number(post.other_less_amount) || 0;
  }
  const afterLess2 = afterLess1 - otherLessAmount;

  const charge = Number(post.charge) || 0;

  return Number((afterLess2 + charge).toFixed(2));
}

module.exports = {
  getAuditFlag,
  executeAuditGuard,
  computeExpectedInvoiceTotal,
};

