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
 * Recomputes expected invoice final amount using standard diamond trade formula.
 * itemsTotal - discount (less_amount / less_percent) - other_discount (other_less_amount / other_less_percent) + shipping + charges
 */
function computeExpectedInvoiceTotal(subtotal, post = {}) {
  const itemsTotal = Number(subtotal) || 0;
  const lessPercent = Number(post.less_percent) || 0;
  let lessAmount = Number(post.less_amount) || 0;
  if (!lessAmount && lessPercent > 0) {
    lessAmount = Number(((itemsTotal * lessPercent) / 100).toFixed(2));
  }
  const afterLess1 = itemsTotal - lessAmount;

  const otherLessPercent = Number(post.other_less_percent) || 0;
  let otherLessAmount = Number(post.other_less_amount) || 0;
  if (!otherLessAmount && otherLessPercent > 0) {
    otherLessAmount = Number(((afterLess1 * otherLessPercent) / 100).toFixed(2));
  }
  const afterLess2 = afterLess1 - otherLessAmount;

  const shippingCharge = Number(post.shipping_charge) || 0;
  const charge = Number(post.charge) || 0;

  return Number((afterLess2 + shippingCharge + charge).toFixed(2));
}

module.exports = {
  getAuditFlag,
  executeAuditGuard,
  computeExpectedInvoiceTotal,
};

