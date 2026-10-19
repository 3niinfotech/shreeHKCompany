const helper = require("../helper.js");
const { repairOrphanLabReturns } = require("../services/stockMovementService.js");

(async () => {
  try {
    const hist = await helper.query(
      `SELECT product_id, action, pcs, carat, description, date
       FROM dai_history WHERE action IN ('lab','lab_return','gia')
       ORDER BY id DESC LIMIT 20`
    );
    console.log("history", JSON.stringify(hist, null, 2));
    const ids = [...new Set(hist.map((h) => h.product_id).filter(Boolean))];
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const prods = await helper.query(
        `SELECT id, sku, outward, visibility, polish_pcs, polish_carat, onhand_pcs, onhand_carat,
                purchased_carat, sold_carat, memo_carat
         FROM dai_product WHERE id IN (${ph})`,
        ids
      );
      console.log("products", JSON.stringify(prods, null, 2));
    }
    try {
      const items = await helper.query(
        `SELECT oi.id, oi.outward_id, oi.product_id, oi.pcs, oi.carat, oi.status
         FROM dai_outward_item oi
         INNER JOIN dai_outward o ON o.id = oi.outward_id AND o.type = 'lab'
         ORDER BY oi.id DESC LIMIT 20`
      );
      console.log("lab items", JSON.stringify(items, null, 2));
    } catch (e) {
      console.log("items err", e.message);
    }
    const result = await repairOrphanLabReturns();
    console.log("repair result", result);
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const after = await helper.query(
        `SELECT id, sku, outward, visibility, polish_pcs, polish_carat, onhand_pcs, onhand_carat
         FROM dai_product WHERE id IN (${ph})`,
        ids
      );
      console.log("products after", JSON.stringify(after, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
