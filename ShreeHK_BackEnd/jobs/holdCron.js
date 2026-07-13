/**
 * Auto-unhold expired stones — port of venya/holdcron.php
 *
 * Run manually: node jobs/holdCron.js (from backend directory)
 * Or enable in server: ENABLE_HOLD_CRON=true in .env (daily at 00:05 server time)
 */
try {
  require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
} catch (_) {
  /* optional */
}

const helper = require("../helper.js");
const holdRepository = require("../routes/outward/holdRepository.js");
const productHelper = require("../productHelper.js");
const { logAudit } = require("../services/auditIntegration.js");

async function runHoldCron() {
  const today = new Date().toISOString().slice(0, 10);
  const q = (sql, values = []) => helper.query(sql, values);
  const rows = await holdRepository.findExpiredHolds(q, today);

  if (!rows.length) {
    console.log(`[holdCron] No expired holds before ${today}`);
    return { processed: 0 };
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  let processed = 0;

  for (const row of rows) {
    const productId = parseInt(row.product_id, 10);
    if (!productId) continue;

    await q(`UPDATE dai_product SET hold = 0 WHERE id = ?`, [productId]);

    let sku = "";
    try {
      const detail = await productHelper.getDetail(productId, "p.id");
      sku = detail?.sku || "";
    } catch (_) {
      /* ignore */
    }

    await helper.addHistory({
      product_id: productId,
      sku,
      action: "unhold",
      date: now,
      description:
        "stone put on unhold through auto unhold and show in inventory.",
    });

    try {
      let productRow = null;
      try {
        productRow = await productHelper.getDetail(productId, "p.id");
      } catch (_) {
        /* ignore */
      }
      await logAudit({
        system: true,
        actionType: "UPDATE",
        moduleName: "Diamond Stock",
        recordId: productId,
        recordReference: sku || String(productId),
        oldValue: productRow ? { ...productRow, hold: 1 } : { hold: 1 },
        newValue: productRow ? { ...productRow, hold: 0 } : { hold: 0 },
        description: `SYSTEM auto unhold stone ${sku || productId}`,
      });
    } catch (auditErr) {
      console.error("[holdCron] audit:", auditErr);
    }

    await holdRepository.deleteHoldByProductId(q, productId);
    processed += 1;
  }

  console.log(`[holdCron] Processed ${processed} expired hold(s)`);
  return { processed };
}

if (require.main === module) {
  runHoldCron()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[holdCron] Failed:", err);
      process.exit(1);
    });
}

module.exports = { runHoldCron };
