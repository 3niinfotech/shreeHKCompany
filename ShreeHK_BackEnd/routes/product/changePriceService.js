const helper = require("../../helper.js");
const repository = require("./changePriceRepository.js");
const { logBulkRowAudit } = require("../../services/auditIntegration.js");

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const buildUpdatePayload = (entry, detail) => {
  const updates = {};
  const hasCost = entry.cost !== undefined && entry.cost !== null && entry.cost !== "";
  const hasPrice = entry.price !== undefined && entry.price !== null && entry.price !== "";
  const hasRapPrice = entry.rap_price !== undefined && entry.rap_price !== null && entry.rap_price !== "";

  if (hasCost) {
    updates.cost = entry.cost;
  }
  if (hasPrice) {
    const price = Number(entry.price);
    updates.price = price;
    updates.amount = Number(detail.polish_carat || 0) * price;
  }
  if (hasRapPrice) {
    const rapPrice = Number(entry.rap_price);
    updates.rap_price = rapPrice;
    updates.rap_amount = Number(detail.polish_carat || 0) * rapPrice;
  }

  updates.site_upload = 0;
  updates.rapnet_upload = 0;

  return { updates, hasPrice };
};

const updatePrice = async (productMap, userContext) => {
  let result = 0;
  const skuList = [];
  const pidList = [];

  for (const [pidKey, entry] of Object.entries(productMap)) {
    const pid = toNumber(pidKey);
    if (!pid) continue;

    const isAllEmpty = entry?.price === "" && entry?.cost === "" && entry?.rap_price === "";
    if (isAllEmpty) continue;

    const detail = await repository.getProductDetail(pid);
    if (!detail) continue;

    pidList.push(pid);
    skuList.push(detail.sku);

    const { updates, hasPrice } = buildUpdatePayload(entry, detail);
    result = await repository.updateProductById(pid, updates);

    if (hasPrice) {
      const oldPrice = detail.price;
      const desc = `Old Price :  ${oldPrice} , New Price :  ${entry.price}`;
      await helper.addHistory({
        product_id: pid,
        action: "price_change",
        date: new Date(),
        narretion: "cost price or base price are changed.",
        description: desc,
      });
      await logBulkRowAudit({
        actionType: "UPDATE",
        moduleName: "Diamond Stock",
        recordId: pid,
        recordReference: detail.sku,
        oldValue: { price: oldPrice, cost: detail.cost },
        newValue: { price: entry.price, cost: entry.cost },
        description: desc,
      });
    }
  }

  await helper.addUserTrack({
    product_id: pidList.join(","),
    action: "price_change",
    date: new Date(),
    description: `cost price or base price are changed of ${skuList.join(",")}`,
    user: userContext.userId,
    company: userContext.companyId,
  });

  return result;
};

module.exports = {
  updatePrice,
};
