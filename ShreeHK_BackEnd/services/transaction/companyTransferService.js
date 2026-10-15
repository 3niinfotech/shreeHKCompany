const connection = require("../../connection.js");
const helper = require("../../helper.js");
const companyTransferRepository = require("../../repositories/transaction/companyTransferRepository.js");
const { ensureCompanyTransferSchema } = require("./companyTransferSchemaService.js");
const moment = require("moment");

function queryWith(executor, sql, values = []) {
  try {
    const res = executor(sql, values);
    if (res && typeof res.then === "function") {
      return res;
    }
  } catch (err) {
    return Promise.reject(err);
  }
  return new Promise((resolve, reject) => {
    executor(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function extractSeqNumber(value) {
  const n = parseInt(String(value ?? "").replace(/\D/g, ""), 10);
  return Number.isNaN(n) || n <= 0 ? 0 : n;
}

async function allocateSaleInvoiceNo(q, companyId) {
  const existing = await queryWith(
    q,
    "SELECT invoiceno FROM dai_outward WHERE (company = ? OR company = ?) AND LOWER(TRIM(type)) = 'sale'",
    [companyId, String(companyId)]
  );
  let max = 0;
  for (const r of existing || []) {
    const n = extractSeqNumber(r.invoiceno);
    if (n > max) max = n;
  }
  return `INV-${max + 1}`;
}

async function allocatePurchaseInvoiceNo(q, companyId) {
  const existing = await queryWith(
    q,
    "SELECT invoiceno FROM dai_inward WHERE (company = ? OR company = ?) AND LOWER(TRIM(inward_type)) = 'purchase'",
    [companyId, String(companyId)]
  );
  let max = 0;
  for (const r of existing || []) {
    const n = extractSeqNumber(r.invoiceno);
    if (n > max) max = n;
  }
  return `INV-${max + 1}`;
}

async function allocateOutwardEntryNo(q, companyId) {
  const existing = await queryWith(
    q,
    "SELECT entryno FROM dai_outward WHERE (company = ? OR company = ?) AND LOWER(TRIM(type)) = 'sale'",
    [companyId, String(companyId)]
  );
  let max = 0;
  for (const r of existing || []) {
    const n = extractSeqNumber(r.entryno);
    if (n > max) max = n;
  }
  return String(max + 1);
}

async function allocateInwardEntryNo(q, companyId) {
  const existing = await queryWith(
    q,
    "SELECT entryno FROM dai_inward WHERE company = ? OR company = ?",
    [companyId, String(companyId)]
  );
  let max = 0;
  for (const r of existing || []) {
    const n = extractSeqNumber(r.entryno);
    if (n > max) max = n;
  }
  return `Inward-${max + 1}`;
}

function escapeRegex(string) {
  return String(string || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function generateTargetSku(executor, baseSku) {
  const cleanBase = String(baseSku || "").trim();
  if (!cleanBase) return `TRF-${Date.now()}`;

  // If the sku already ends with -T<number>, extract root base
  const rootBase = cleanBase.replace(/-T\d+$/i, "");

  const pattern = `${rootBase}-T%`;
  const sql = `
    SELECT sku FROM dai_product WHERE sku LIKE ?
    UNION
    SELECT sku FROM dai_company_transfer_item WHERE sku LIKE ?
  `;
  const rows = await queryWith(executor, sql, [pattern, pattern]);

  let maxNum = 0;
  const regex = new RegExp(`^${escapeRegex(rootBase)}-T(\\d+)$`, "i");

  rows.forEach((row) => {
    const match = String(row.sku || "").trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  return `${rootBase}-T${maxNum + 1}`;
}

const companyTransferService = {
  async executeTransfer(payload, userContext = {}) {
    await ensureCompanyTransferSchema();

    const {
      from_company_id,
      to_company_id,
      to_party,
      transfer_date,
      notes,
      items,
    } = payload;
    const userId = Number(userContext.userId || userContext.user_id || 1);

    return helper.runInTransaction(async (q) => {
      // 1. Fetch and lock source stones from dai_product
      const productIds = items.map((i) => i.product_id);
      const ph = productIds.map(() => "?").join(",");
      const sourceStones = await queryWith(
        q,
        `SELECT p.*,
                pv.report_no, pv.shape, pv.clarity, pv.size, pv.f_intensity, pv.cut,
                pv.polish, pv.symmentry, pv.table_pc, pv.depth_pc, pv.mesurment, pv.gridle,
                pv.intensity, pv.overtone, pv.color, pv.package, pv.bgm, pv.eyeclean
         FROM dai_product p
         LEFT JOIN dai_product_value pv ON p.id = pv.product_id
         WHERE p.id IN (${ph}) FOR UPDATE`,
        productIds
      );

      const sourceMap = new Map();
      sourceStones.forEach((s) => sourceMap.set(Number(s.id), s));

      for (const item of items) {
        const stone = sourceMap.get(item.product_id);
        if (!stone) {
          throw new Error(`Stone SKU "${item.sku}" (ID: ${item.product_id}) not found in inventory.`);
        }
      }

      // Determine actual source company from stone in database (avoids header company context mismatch)
      const firstStone = sourceStones[0];
      const actualFromCompanyId = (firstStone && firstStone.company) ? Number(firstStone.company) : Number(from_company_id);
      const effectiveFromCompanyId = actualFromCompanyId;
      const effectiveToCompanyId = Number(to_company_id);

      if (effectiveFromCompanyId === effectiveToCompanyId) {
        throw new Error("Cannot transfer stone to the same company. Please select a different target company.");
      }

      // 2. Verify companies
      const compRows = await queryWith(
        q,
        "SELECT id, name FROM company WHERE id IN (?, ?)",
        [effectiveFromCompanyId, effectiveToCompanyId]
      );
      const fromComp = compRows.find((c) => Number(c.id) === effectiveFromCompanyId);
      const toComp = compRows.find((c) => Number(c.id) === effectiveToCompanyId);

      if (!fromComp) throw new Error(`Source company #${effectiveFromCompanyId} not found.`);
      if (!toComp) throw new Error(`Target company #${effectiveToCompanyId} not found.`);

      const fromCompName = fromComp.name;
      const toCompName = to_party || toComp.name;

      for (const item of items) {
        const stone = sourceMap.get(item.product_id);
        const availPcs = Number(stone.polish_pcs || 0);
        const availCarat = Number(stone.polish_carat || 0);
        if (availPcs < item.pcs) {
          throw new Error(`SKU "${item.sku}": Insufficient pcs (Available: ${availPcs}, Requested: ${item.pcs}).`);
        }
        if (availCarat < item.carat - 0.0001) {
          throw new Error(`SKU "${item.sku}": Insufficient carats (Available: ${availCarat.toFixed(3)}, Requested: ${item.carat.toFixed(3)}).`);
        }
      }

      // 3. Totals
      const totalPcs = items.reduce((sum, i) => sum + i.pcs, 0);
      const totalCarat = items.reduce((sum, i) => sum + i.carat, 0);
      const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

      // 4. Sequence Allocation
      const nextTransferNo = await companyTransferRepository.getNextTransferNo(q);
      const saleInvoiceNo = nextTransferNo;
      const saleEntryNo = nextTransferNo;
      const purchaseInvoiceNo = nextTransferNo;
      const purchaseEntryNo = nextTransferNo;

      // 5. Create Transfer Outward Record in Source Company
      const outwardSql = `
        INSERT INTO dai_outward
        (entryno, invoiceno, invoicedate, date, type, company, party, products,
         final_amount, due_amount, paid_amount, narretion, user, status)
        VALUES (?, ?, ?, ?, 'inter_transfer', ?, ?, ?, ?, ?, 0, ?, ?, 'transferred')
      `;
      const outwardResult = await queryWith(q, outwardSql, [
        saleEntryNo,
        saleInvoiceNo,
        transfer_date,
        transfer_date,
        effectiveFromCompanyId,
        toCompName,
        productIds.join(","),
        totalAmount,
        totalAmount,
        notes || `Inter-Company transfer to ${toComp.name} (${nextTransferNo})`,
        userId,
      ]);
      const sourceOutwardId = outwardResult.insertId;

      // 6. Create Transfer Inward Record in Target Company
      const inwardSql = `
        INSERT INTO dai_inward
        (entryno, invoiceno, invoicedate, date, inward_type, company, party, products,
         final_amount, due_amount, paid_amount, pcs, carat, narretion, user)
        VALUES (?, ?, ?, ?, 'inter_transfer', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `;
      const inwardResult = await queryWith(q, inwardSql, [
        purchaseEntryNo,
        purchaseInvoiceNo,
        transfer_date,
        transfer_date,
        effectiveToCompanyId,
        fromCompName,
        "", // populated after target stones created
        totalAmount,
        totalAmount,
        totalPcs,
        totalCarat,
        notes || `Inter-Company transfer from ${fromCompName} (${nextTransferNo})`,
        userId,
      ]);
      const targetInwardId = inwardResult.insertId;

      // 7. Insert Transfer Header
      const transferId = await companyTransferRepository.insertTransfer(q, {
        transfer_no: nextTransferNo,
        from_company_id: effectiveFromCompanyId,
        to_company_id: effectiveToCompanyId,
        transfer_date,
        from_party: toCompName,
        to_party: fromCompName,
        source_outward_id: sourceOutwardId,
        source_invoice_no: saleInvoiceNo,
        target_inward_id: targetInwardId,
        target_invoice_no: purchaseInvoiceNo,
        total_pcs: totalPcs,
        total_carat: totalCarat,
        total_amount: totalAmount,
        currency: "USD",
        status: "transferred",
        notes: notes || `Transferred ${items.length} stone(s)`,
        created_by: userId,
      });

      const targetProductIds = [];

      // 8. Process each stone item
      for (const item of items) {
        const stone = sourceMap.get(item.product_id);
        const sourceSku = String(item.sku || stone.sku || "").trim();
        const targetSku = await generateTargetSku(q, sourceSku);

        // 8a. Insert dai_outward_item for source company
        await queryWith(
          q,
          `INSERT INTO dai_outward_item
           (company, outward_id, product_id, sku, party, outward_type, pcs, carat, price, amount,
            balance_pcs, balance_carat, entry_date, invoice_no, narretion, status, user)
           VALUES (?, ?, ?, ?, ?, 'inter_transfer', ?, ?, ?, ?, 0, 0, ?, ?, ?, 'transferred', ?)`,
          [
            effectiveFromCompanyId,
            sourceOutwardId,
            item.product_id,
            sourceSku,
            toCompName,
            item.pcs,
            item.carat,
            item.price,
            item.amount,
            transfer_date,
            saleInvoiceNo,
            `Transfer ${nextTransferNo} (Target SKU: ${targetSku})`,
            userId,
          ]
        );

        // 8b. Deduct stock in source company
        const origPcs = Number(stone.polish_pcs || 0);
        const origCarat = Number(stone.polish_carat || 0);
        let remPcs = Math.max(0, origPcs - item.pcs);
        const remCarat = Math.max(0, origCarat - item.carat);

        if (remCarat <= 0.0001) {
          // Fully transferred
          await queryWith(
            q,
            `UPDATE dai_product
             SET outward = 'transferred', hold = 0, polish_pcs = 0, polish_carat = 0, onhand_pcs = 0, onhand_carat = 0,
                 sell_price = ?, sell_amount = ?
             WHERE id = ?`,
            [item.price, item.amount, item.product_id]
          );
        } else {
          // Partial transfer: stone remains active in source inventory with remaining balance
          if (remPcs <= 0) remPcs = 1;
          const remAmount = Math.round(remCarat * (Number(stone.price) || 0) * 100) / 100;
          await queryWith(
            q,
            `UPDATE dai_product
             SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?
             WHERE id = ?`,
            [remPcs, remCarat, remPcs, remCarat, remAmount, item.product_id]
          );
        }

        // 8c. History in source company
        await queryWith(
          q,
          `INSERT INTO dai_history
           (product_id, action, party, date, description, pcs, carat, amount, price, sku, type, invoice, entry_from, entryno, user)
           VALUES (?, 'inter_transfer', ?, ?, ?, ?, ?, ?, ?, ?, 'dr', ?, 'company_transfer', ?, ?)`,
          [
            item.product_id,
            toCompName,
            transfer_date,
            `INTER-COMPANY TRANSFER TO ${toComp.name.toUpperCase()} (TRANSFER: ${nextTransferNo}, TARGET SKU: ${targetSku})`,
            item.pcs,
            item.carat,
            item.amount,
            item.price,
            sourceSku,
            saleInvoiceNo,
            sourceOutwardId,
            userId,
          ]
        );

        // 8d. Create stone in Target Company (Company 2)
        const newProductSql = `
          INSERT INTO dai_product
          (mfg_code, diamond_no, sku, pair, polish_pcs, polish_carat, purchase_pcs, purchase_carat,
           purchased_pcs, purchased_carat, onhand_pcs, onhand_carat,
           purchase_price, purchase_amount, rap_price, cost, price, amount,
           main_group, sub_group, remark, location, date, company, inward_id, inward, group_type,
           lab, visibility, outward, hold, main_color, category, rapnet_upload, site_upload)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer', ?, ?, 1, '', 0, ?, ?, 1, 1)
        `;
        const newProductResult = await queryWith(q, newProductSql, [
          stone.mfg_code || "",
          stone.diamond_no || targetSku,
          targetSku,
          stone.pair || "",
          item.pcs,
          item.carat,
          item.pcs,
          item.carat,
          item.pcs,
          item.carat,
          item.pcs,
          item.carat,
          item.price,
          item.amount,
          stone.rap_price || 0,
          stone.cost || item.price,
          item.price,
          item.amount,
          stone.main_group || "",
          stone.sub_group || "",
          `Transferred from ${fromCompName} (From SKU: ${sourceSku})`,
          stone.location || "",
          transfer_date,
          to_company_id,
          targetInwardId,
          stone.group_type || "single",
          stone.lab || "",
          stone.main_color || "",
          stone.category || "",
        ]);
        const targetProductId = newProductResult.insertId;
        targetProductIds.push(targetProductId);

        // 8e. Insert dai_product_value for Target Company
        await queryWith(
          q,
          `INSERT INTO dai_product_value
           (product_id, report_no, shape, color, clarity, size, f_intensity, cut, polish,
            symmentry, table_pc, depth_pc, mesurment, gridle, intensity, overtone, package, bgm, eyeclean)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetProductId,
            stone.report_no || "",
            stone.shape || "",
            stone.color || "",
            stone.clarity || "",
            stone.size || "",
            stone.f_intensity || "",
            stone.cut || "",
            stone.polish || "",
            stone.symmentry || "",
            stone.table_pc || "",
            stone.depth_pc || "",
            stone.mesurment || "",
            stone.gridle || "",
            stone.intensity || "",
            stone.overtone || "",
            stone.package || "",
            stone.bgm || "",
            stone.eyeclean || "",
          ]
        );

        // 8f. Insert dai_inward_item for Target Company
        await queryWith(
          q,
          `INSERT INTO dai_inward_item
           (company, inward_id, product_id, sku, party, inward_type, pcs, carat, price, amount,
            balance_pcs, balance_carat, entry_date, invoice_no, narretion, user)
           VALUES (?, ?, ?, ?, ?, 'inter_transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            to_company_id,
            targetInwardId,
            targetProductId,
            targetSku,
            fromCompName,
            item.pcs,
            item.carat,
            item.price,
            item.amount,
            item.pcs,
            item.carat,
            transfer_date,
            purchaseInvoiceNo,
            `Inter-Company Transfer ${nextTransferNo} (From SKU: ${sourceSku})`,
            userId,
          ]
        );

        // 8g. History in target company
        await queryWith(
          q,
          `INSERT INTO dai_history
           (product_id, action, party, date, description, pcs, carat, amount, price, sku, type, invoice, entry_from, entryno, user)
           VALUES (?, 'inter_transfer', ?, ?, ?, ?, ?, ?, ?, ?, 'cr', ?, 'company_transfer', ?, ?)`,
          [
            targetProductId,
            fromCompName,
            transfer_date,
            `INTER-COMPANY TRANSFER FROM ${fromCompName.toUpperCase()} (TRANSFER: ${nextTransferNo}, ORIGINAL SKU: ${sourceSku})`,
            item.pcs,
            item.carat,
            item.amount,
            item.price,
            targetSku,
            purchaseInvoiceNo,
            targetInwardId,
            userId,
          ]
        );

        // 8h. Transfer Item record
        await companyTransferRepository.insertTransferItem(q, {
          transfer_id: transferId,
          source_product_id: item.product_id,
          target_product_id: targetProductId,
          source_sku: sourceSku,
          sku: targetSku,
          pcs: item.pcs,
          carat: item.carat,
          price: item.price,
          amount: item.amount,
          status: "transferred",
        });
      }

      // Update target inward with product IDs CSV
      await queryWith(
        q,
        "UPDATE dai_inward SET products = ? WHERE id = ?",
        [targetProductIds.join(","), targetInwardId]
      );

      return {
        transfer_id: transferId,
        transfer_no: nextTransferNo,
        source_company_id: effectiveFromCompanyId,
        source_company_name: fromCompName,
        source_invoice_no: saleInvoiceNo,
        source_outward_id: sourceOutwardId,
        target_company_id: effectiveToCompanyId,
        target_company_name: toComp.name,
        target_invoice_no: purchaseInvoiceNo,
        target_inward_id: targetInwardId,
        total_pcs: totalPcs,
        total_carat: totalCarat,
        total_amount: totalAmount,
      };
    });
  },

  async listTransfers(filters, userContext) {
    await ensureCompanyTransferSchema();
    const db = connection.getActivePool();
    const companyIds = userContext.allowedCompanyIds || (userContext.companyId ? [userContext.companyId] : []);
    const { rows, total } = await companyTransferRepository.listTransfers(db, filters, companyIds);

    if (rows && rows.length > 0) {
      const transferIds = rows.map((r) => r.id);
      const placeholders = transferIds.map(() => "?").join(",");
      const itemsSql = `
        SELECT ti.*,
               sp.lab,
               pv.shape, pv.color, pv.clarity, pv.cut, pv.polish
        FROM dai_company_transfer_item ti
        LEFT JOIN dai_product sp ON sp.id = ti.source_product_id
        LEFT JOIN dai_product_value pv ON pv.product_id = sp.id
        WHERE ti.transfer_id IN (${placeholders})
        ORDER BY ti.id ASC
      `;
      const allItems = await queryWith(db.query.bind(db), itemsSql, transferIds);
      const itemsByTransfer = new Map();
      allItems.forEach((it) => {
        if (!itemsByTransfer.has(it.transfer_id)) {
          itemsByTransfer.set(it.transfer_id, []);
        }
        itemsByTransfer.get(it.transfer_id).push(it);
      });

      rows.forEach((r) => {
        r.items = itemsByTransfer.get(r.id) || [];
      });
    }

    return { rows, total };
  },

  async getTransferDetails(transferId) {
    await ensureCompanyTransferSchema();
    const db = connection.getActivePool();
    const transfer = await companyTransferRepository.findById(db, transferId);
    if (!transfer) return null;
    const items = await companyTransferRepository.getItemsByTransferId(db, transferId);
    return { ...transfer, items };
  },

  async executeSaleReturn(payload, userContext = {}) {
    await ensureCompanyTransferSchema();
    const { transfer_id, notes } = payload;
    const userId = Number(userContext.userId || userContext.user_id || 1);

    return helper.runInTransaction(async (q) => {
      // 1. Fetch transfer and items
      const transferRows = await queryWith(
        q,
        `SELECT t.*, fc.name AS from_company_name, tc.name AS to_company_name
         FROM dai_company_transfer t
         LEFT JOIN company fc ON fc.id = t.from_company_id
         LEFT JOIN company tc ON tc.id = t.to_company_id
         WHERE t.id = ? FOR UPDATE`,
        [transfer_id]
      );
      const transfer = transferRows[0];
      if (!transfer) throw new Error("Transfer record not found.");
      if (transfer.status === "returned") {
        throw new Error("This transfer has already been returned.");
      }

      const items = await queryWith(
        q,
        "SELECT * FROM dai_company_transfer_item WHERE transfer_id = ? FOR UPDATE",
        [transfer_id]
      );

      const returnDate = moment().format("YYYY-MM-DD");

      for (const item of items) {
        // A. Verify target stone in target company
        const targetRows = await queryWith(
          q,
          "SELECT * FROM dai_product WHERE id = ? AND company = ? FOR UPDATE",
          [item.target_product_id, transfer.to_company_id]
        );
        const targetStone = targetRows[0];
        if (targetStone) {
          // If already sold or outwarded by target company, block return!
          if (targetStone.outward && targetStone.outward !== "") {
            throw new Error(
              `Cannot return: Stone SKU "${item.sku}" has been ${targetStone.outward}ed in company "${transfer.to_company_name}".`
            );
          }
          // Remove from target company
          await queryWith(
            q,
            `UPDATE dai_product
             SET visibility = 0, outward = 'returned', polish_pcs = 0, polish_carat = 0, onhand_pcs = 0, onhand_carat = 0
             WHERE id = ?`,
            [item.target_product_id]
          );

          // Target history
          await queryWith(
            q,
            `INSERT INTO dai_history
             (product_id, action, party, date, description, pcs, carat, amount, price, sku, type, invoice, entry_from, entryno, user)
             VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?, ?, 'dr', ?, 'transfer_return', ?, ?)`,
            [
              item.target_product_id,
              transfer.from_company_name,
              returnDate,
              `SALE RETURN BACK TO ${transfer.from_company_name.toUpperCase()} (TRANSFER: ${transfer.transfer_no})`,
              item.pcs,
              item.carat,
              item.amount,
              item.price,
              item.sku,
              transfer.target_invoice_no,
              transfer.target_inward_id,
              userId,
            ]
          );
        }

        // B. Restore stone in source company
        const sourceRows = await queryWith(
          q,
          "SELECT * FROM dai_product WHERE id = ? AND company = ? FOR UPDATE",
          [item.source_product_id, transfer.from_company_id]
        );
        const sourceStone = sourceRows[0];
        if (sourceStone) {
          const newPcs = Number(sourceStone.polish_pcs || 0) + Number(item.pcs);
          const newCarat = Number(sourceStone.polish_carat || 0) + Number(item.carat);
          const newAmount = Math.round(newCarat * (Number(sourceStone.price) || item.price) * 100) / 100;

          await queryWith(
            q,
            `UPDATE dai_product
             SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, visibility = 1,
                 outward = CASE WHEN outward = 'sale' OR outward = 'transferred' THEN '' ELSE outward END
             WHERE id = ?`,
            [newPcs, newCarat, newPcs, newCarat, newAmount, item.source_product_id]
          );

          // Source history
          await queryWith(
            q,
            `INSERT INTO dai_history
             (product_id, action, party, date, description, pcs, carat, amount, price, sku, type, invoice, entry_from, entryno, user)
             VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?, ?, 'cr', ?, 'transfer_return', ?, ?)`,
            [
              item.source_product_id,
              transfer.to_company_name,
              returnDate,
              `TRANSFER RETURN RESTORED FROM ${transfer.to_company_name.toUpperCase()} (TRANSFER: ${transfer.transfer_no})`,
              item.pcs,
              item.carat,
              item.amount,
              item.price,
              item.source_sku || item.sku,
              transfer.source_invoice_no,
              transfer.source_outward_id,
              userId,
            ]
          );
        }

        // Update item status
        await companyTransferRepository.updateItemStatus(q, item.id, "returned");
      }

      // Update transfer header
      await companyTransferRepository.updateTransferStatus(q, transfer_id, "returned", returnDate);

      // Update source outward invoice status
      if (transfer.source_outward_id) {
        await queryWith(
          q,
          "UPDATE dai_outward SET status = 'returned' WHERE id = ?",
          [transfer.source_outward_id]
        );
        await queryWith(
          q,
          "UPDATE dai_outward_item SET status = 'returned' WHERE outward_id = ?",
          [transfer.source_outward_id]
        );
      }

      // Update target inward invoice status
      if (transfer.target_inward_id) {
        await queryWith(
          q,
          "UPDATE dai_inward SET deleted = 1, status = 'returned' WHERE id = ?",
          [transfer.target_inward_id]
        );
      }

      return {
        transfer_id,
        transfer_no: transfer.transfer_no,
        return_date: returnDate,
        message: "Sale return completed successfully.",
      };
    });
  },
};

module.exports = companyTransferService;
