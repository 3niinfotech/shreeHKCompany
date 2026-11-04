const fs = require('fs');
const filePath = 'ShreeHK_BackEnd/routes/transaction/transactionStockService.js';
let content = fs.readFileSync(filePath, 'utf8');
const isCrlf = content.includes('\r\n');

const normalized = content.replace(/\r\n/g, '\n');

const target = `async function deleteGia(id, companyId = null) {
  const oData = await getOutwardData(id, companyId);
  if (!oData) return { ok: false, message: "Record not found or access denied" };
  const products = (oData.products || "").split(",").filter(Boolean);
  for (const pid of products) {
    await query("UPDATE dai_product SET outward='', visibility=1 WHERE id = ?", [pid]);
  }
  if (companyId) {
    await query("DELETE FROM dai_outward WHERE id = ? AND company = ?", [id, companyId]);
  } else {
    await query("DELETE FROM dai_outward WHERE id = ?", [id]);
  }
  try {
    await logAudit({
      actionType: "DELETE",
      moduleName: "GIA",
      recordId: id,
      recordReference: oData.invoiceno || String(id),
      oldValue: oData,
      companyId: oData.company,
    });
  } catch (e) {
    console.error("deleteGia audit:", e);
  }
  return { ok: true, message: "GIA record deleted" };
}`;

const replacement = `async function deleteGia(id, companyId = null, options = {}) {
  const oData = await getOutwardData(id, companyId);
  if (!oData) return { ok: false, message: "Record not found or access denied" };
  const products = (oData.products || "").split(",").filter(Boolean);

  await helper.runInTransaction(async (q) => {
    const outwardItems = await stockMovement.getOutwardItems(q, id);

    for (const pid of products) {
      await q("UPDATE dai_product SET outward='', visibility=1 WHERE id = ?", [pid]);

      const product = await getProductDetail(pid, q);
      if (!product) continue;

      const itemForProduct = outwardItems.find(
        (it) => String(it.product_id) === String(pid)
      );

      let histPcs =
        Number(itemForProduct?.pcs) > 0
          ? Number(itemForProduct.pcs)
          : Number(product.polish_pcs) || Number(product.onhand_pcs) || 0;
      let histCarat =
        Number(itemForProduct?.carat) > 0
          ? Number(itemForProduct.carat)
          : Number(product.polish_carat) || Number(product.onhand_carat) || 0;

      // Legacy lab send may leave polish/onhand at 0 with no item row — use last lab history qty
      if (histCarat <= 0 && histPcs <= 0) {
        const hist = await q(
          \`SELECT pcs, carat FROM dai_history
           WHERE product_id = ? AND action IN ('lab','gia')
           ORDER BY id DESC LIMIT 1\`,
          [pid]
        );
        if (hist[0]) {
          histPcs = Number(hist[0].pcs) || 0;
          histCarat = Number(hist[0].carat) || 0;
        }
      }
      if (histCarat <= 0 && histPcs <= 0) {
        const purchased = Number(product.purchased_carat) || 0;
        const sold = Number(product.sold_carat) || 0;
        const memo = Number(product.memo_carat) || 0;
        const restored = Math.max(0, purchased - sold - memo);
        if (restored > 0) {
          histCarat = restored;
          histPcs =
            Math.max(
              0,
              (Number(product.purchased_pcs) || 0) -
              (Number(product.sold_pcs) || 0) -
              (Number(product.memo_pcs) || 0)
            ) || 1;
        }
      }

      try {
        const histPayload = {
          product_id: pid,
          action: "outward_cancel",
          party: oData.party || "",
          narretion: oData.narretion || "",
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
          description: \`Outward \${oData.type || "gia"} cancelled: Restored to inventory\`,
          pcs: histPcs,
          carat: histCarat,
          amount: product.amount || 0,
          price: product.price || 0,
          sku: product.sku,
          type: "cr",
          invoice: oData.invoiceno || "",
          entry_from: "outward",
          entryno: id,
          balance_pcs: Number(product.onhand_pcs) || 0,
          balance_carat: Number(product.onhand_carat) || 0,
          user: oData.user || options.userId || helper.DEFAULT_USER_ID,
        };
        await addHistoryTx(q, histPayload);
      } catch (histErr) {
        console.error("deleteGia product history error:", histErr);
      }
    }

    if (companyId) {
      await q("DELETE FROM dai_outward WHERE id = ? AND company = ?", [id, companyId]);
    } else {
      await q("DELETE FROM dai_outward WHERE id = ?", [id]);
    }
  });

  try {
    await logAudit({
      actionType: "DELETE",
      moduleName: "GIA",
      recordId: id,
      recordReference: oData.invoiceno || String(id),
      oldValue: oData,
      companyId: oData.company,
    });
  } catch (e) {
    console.error("deleteGia audit:", e);   
  }
  return { ok: true, message: "GIA record deleted" };
}`;

if (!normalized.includes(target)) {
  console.error("Target not found!");
  process.exit(1);
}

const updatedNormalized = normalized.replace(target, replacement);
const updated = isCrlf ? updatedNormalized.replace(/\n/g, '\r\n') : updatedNormalized;
fs.writeFileSync(filePath, updated, 'utf8');
console.log("Updated deleteGia successfully!");

