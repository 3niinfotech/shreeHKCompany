/**
 * Main-stock movement helpers:
 * - dai_inward_item / dai_outward_item line history
 * - dai_product balance buckets (purchased / memo / sold / onhand)
 * - keeps polish_pcs / polish_carat in sync with onhand for legacy screens
 */

const helper = require("../helper.js");

const toNum = (v, def = 0) => {
  if (v == null || v === "" || v === "NaN") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

let balanceColsCache = null;

async function tableExists(q, tableName) {
  const rows = await q(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.cnt) > 0;
}

async function columnExists(q, tableName, columnName) {
  const rows = await q(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.cnt) > 0;
}

async function ensureStockItemSchema(queryFn = helper.query) {
  const q = queryFn;

  if (!(await tableExists(q, "dai_inward_item"))) {
    await q(`CREATE TABLE IF NOT EXISTS \`dai_inward_item\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`company\` INT NOT NULL DEFAULT 1,
      \`inward_id\` INT NOT NULL,
      \`product_id\` INT NOT NULL,
      \`sku\` VARCHAR(100) DEFAULT NULL,
      \`party\` VARCHAR(100) DEFAULT NULL,
      \`inward_type\` VARCHAR(50) DEFAULT NULL,
      \`pcs\` DECIMAL(18,3) NOT NULL DEFAULT 0,
      \`carat\` DECIMAL(18,3) NOT NULL DEFAULT 0,
      \`price\` DECIMAL(18,2) NOT NULL DEFAULT 0,
      \`amount\` DECIMAL(18,2) NOT NULL DEFAULT 0,
      \`balance_pcs\` DECIMAL(18,3) DEFAULT NULL,
      \`balance_carat\` DECIMAL(18,3) DEFAULT NULL,
      \`entry_date\` DATE DEFAULT NULL,
      \`invoice_no\` VARCHAR(100) DEFAULT NULL,
      \`reference\` VARCHAR(100) DEFAULT NULL,
      \`narretion\` TEXT,
      \`user\` INT DEFAULT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_inward_item_inward\` (\`inward_id\`),
      KEY \`idx_inward_item_product\` (\`product_id\`),
      KEY \`idx_inward_item_company_product\` (\`company\`, \`product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log("[stock-schema] created dai_inward_item");
  }

  if (!(await tableExists(q, "dai_outward_item"))) {
    await q(`CREATE TABLE IF NOT EXISTS \`dai_outward_item\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`company\` INT NOT NULL DEFAULT 1,
      \`outward_id\` INT NOT NULL,
      \`product_id\` INT NOT NULL,
      \`sku\` VARCHAR(100) DEFAULT NULL,
      \`party\` VARCHAR(100) DEFAULT NULL,
      \`outward_type\` VARCHAR(50) NOT NULL DEFAULT 'memo',
      \`pcs\` DECIMAL(18,3) NOT NULL DEFAULT 0,
      \`carat\` DECIMAL(18,3) NOT NULL DEFAULT 0,
      \`price\` DECIMAL(18,2) NOT NULL DEFAULT 0,
      \`amount\` DECIMAL(18,2) NOT NULL DEFAULT 0,
      \`balance_pcs\` DECIMAL(18,3) DEFAULT NULL,
      \`balance_carat\` DECIMAL(18,3) DEFAULT NULL,
      \`entry_date\` DATE DEFAULT NULL,
      \`invoice_no\` VARCHAR(100) DEFAULT NULL,
      \`reference\` VARCHAR(100) DEFAULT NULL,
      \`narretion\` TEXT,
      \`status\` VARCHAR(50) DEFAULT NULL,
      \`user\` INT DEFAULT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_outward_item_outward\` (\`outward_id\`),
      KEY \`idx_outward_item_product\` (\`product_id\`),
      KEY \`idx_outward_item_company_product\` (\`company\`, \`product_id\`),
      KEY \`idx_outward_item_type\` (\`outward_type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log("[stock-schema] created dai_outward_item");
  }

  const balanceCols = [
    ["purchased_pcs", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["purchased_carat", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["memo_pcs", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["memo_carat", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["sold_pcs", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["sold_carat", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["onhand_pcs", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
    ["onhand_carat", "DECIMAL(18,3) NOT NULL DEFAULT 0"],
  ];

  for (const [col, def] of balanceCols) {
    if (!(await columnExists(q, "dai_product", col))) {
      await q(`ALTER TABLE \`dai_product\` ADD COLUMN \`${col}\` ${def}`);
      console.log(`[stock-schema] added dai_product.${col}`);
    }
  }

  // Entry No on purchase/import/outward lists
  if (await tableExists(q, "dai_inward") && !(await columnExists(q, "dai_inward", "entryno"))) {
    await q(
      "ALTER TABLE `dai_inward` ADD COLUMN `entryno` VARCHAR(100) DEFAULT NULL AFTER `id`"
    );
    console.log("[stock-schema] added dai_inward.entryno");
  }
  if (await tableExists(q, "dai_outward") && !(await columnExists(q, "dai_outward", "entryno"))) {
    await q(
      "ALTER TABLE `dai_outward` ADD COLUMN `entryno` VARCHAR(100) DEFAULT NULL AFTER `id`"
    );
    console.log("[stock-schema] added dai_outward.entryno");
  }
  // Backfill blank Entry No from id so Purchase Stock never shows bare "#"
  try {
    if (await tableExists(q, "dai_inward") && (await columnExists(q, "dai_inward", "entryno"))) {
      await q(
        `UPDATE dai_inward SET entryno = CONCAT('Inward-', id)
         WHERE entryno IS NULL OR TRIM(entryno) = ''`
      );
    }
    if (await tableExists(q, "dai_outward") && (await columnExists(q, "dai_outward", "entryno"))) {
      await q(
        `UPDATE dai_outward SET entryno = CONCAT('Outward-', id)
         WHERE entryno IS NULL OR TRIM(entryno) = ''`
      );
    }
  } catch (backfillErr) {
    console.error("[stock-schema] entryno backfill:", backfillErr?.message || backfillErr);
  }

  balanceColsCache = true;
}

async function hasBalanceColumns(q) {
  if (balanceColsCache) return true;
  try {
    const ok = await columnExists(q, "dai_product", "onhand_pcs");
    balanceColsCache = ok;
    return ok;
  } catch {
    return false;
  }
}

function readBalances(row) {
  const polishPcs = toNum(row.polish_pcs);
  const polishCarat = toNum(row.polish_carat);
  return {
    purchased_pcs: toNum(row.purchased_pcs, polishPcs),
    purchased_carat: toNum(row.purchased_carat, polishCarat),
    memo_pcs: toNum(row.memo_pcs),
    memo_carat: toNum(row.memo_carat),
    sold_pcs: toNum(row.sold_pcs),
    sold_carat: toNum(row.sold_carat),
    onhand_pcs: toNum(row.onhand_pcs, polishPcs),
    onhand_carat: toNum(row.onhand_carat, polishCarat),
  };
}

/**
 * Add qty to existing main stock (same SKU box/parcel).
 * Cost/price = carat-weighted average; amount = old_amount + new_amount.
 */
async function applyInwardQty(q, productId, pcs, carat, price, extras = {}) {
  const rows = await q("SELECT * FROM dai_product WHERE id = ? LIMIT 1", [productId]);
  if (!rows.length) throw new Error(`Product ${productId} not found`);
  const row = rows[0];
  const b = readBalances(row);
  const addPcs = toNum(pcs);
  const addCarat = toNum(carat);
  const oldCarat = b.onhand_carat;
  const oldPrice = toNum(row.price);
  const oldCost = toNum(row.cost);
  const oldAmount = toNum(row.amount);
  const addPrice = toNum(price, oldPrice);
  const addCost = toNum(extras.cost, oldCost);
  const addAmount = toNum(
    extras.amount,
    Number((addCarat * addPrice).toFixed(2))
  );

  const next = {
    purchased_pcs: b.purchased_pcs + addPcs,
    purchased_carat: b.purchased_carat + addCarat,
    memo_pcs: b.memo_pcs,
    memo_carat: b.memo_carat,
    sold_pcs: b.sold_pcs,
    sold_carat: b.sold_carat,
    onhand_pcs: b.onhand_pcs + addPcs,
    onhand_carat: b.onhand_carat + addCarat,
  };

  let avgPrice = addPrice;
  let avgCost = addCost;
  if (next.onhand_carat > 0) {
    avgPrice = Number(
      ((oldCarat * oldPrice + addCarat * addPrice) / next.onhand_carat).toFixed(2)
    );
    avgCost = Number(
      ((oldCarat * oldCost + addCarat * addCost) / next.onhand_carat).toFixed(2)
    );
  }
  const amount = Number((oldAmount + addAmount).toFixed(2));

  const hasBal = await hasBalanceColumns(q);
  // Inventory On Hand / All Stock hide sale+export (and On Hand hides memo).
  // Fresh inward stock must clear sold flag; clear memo only when memo bucket is empty.
  const outward = String(row.outward || "").trim().toLowerCase();
  const memoEmpty = next.memo_carat <= 0.0001 && next.memo_pcs <= 0;
  const clearOutward =
    next.onhand_carat > 0 &&
    (outward === "sale" ||
      outward === "export" ||
      (memoEmpty && (outward === "memo" || outward === "consign")));

  if (hasBal) {
    await q(
      `UPDATE dai_product SET
         polish_pcs = ?, polish_carat = ?, cost = ?, price = ?, amount = ?,
         purchased_pcs = ?, purchased_carat = ?,
         onhand_pcs = ?, onhand_carat = ?,
         visibility = 1
         ${clearOutward ? ", outward = ''" : ""}
       WHERE id = ?`,
      [
        next.onhand_pcs,
        next.onhand_carat,
        avgCost,
        avgPrice,
        amount,
        next.purchased_pcs,
        next.purchased_carat,
        next.onhand_pcs,
        next.onhand_carat,
        productId,
      ]
    );
  } else {
    await q(
      `UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, cost = ?, price = ?, amount = ?, visibility = 1
       ${clearOutward ? ", outward = ''" : ""}
       WHERE id = ?`,
      [next.onhand_pcs, next.onhand_carat, avgCost, avgPrice, amount, productId]
    );
  }

  return { ...next, cost: avgCost, price: avgPrice, amount };
}

async function setInitialBalances(q, productId, pcs, carat) {
  const hasBal = await hasBalanceColumns(q);
  if (!hasBal) return;
  const p = toNum(pcs);
  const c = toNum(carat);
  await q(
    `UPDATE dai_product SET
       purchased_pcs = ?, purchased_carat = ?,
       memo_pcs = 0, memo_carat = 0,
       sold_pcs = 0, sold_carat = 0,
       onhand_pcs = ?, onhand_carat = ?,
       polish_pcs = ?, polish_carat = ?
     WHERE id = ?`,
    [p, c, p, c, p, c, productId]
  );
}

/**
 * Outward movement from onhand.
 * type: memo|consign → memo_*; sale|export → sold_*; lab → onhand only reduce
 * returnMemo / lab_return → reverse back to onhand
 */
async function applyOutwardQty(q, productId, type, pcs, carat) {
  const rows = await q("SELECT * FROM dai_product WHERE id = ? LIMIT 1", [productId]);
  if (!rows.length) throw new Error(`Product ${productId} not found`);
  const row = rows[0];
  const b = readBalances(row);
  const movePcs = toNum(pcs);
  const moveCarat = toNum(carat);
  const t = String(type || "").toLowerCase();

  let next = { ...b };

  if (t === "lab_return" || t === "return_lab") {
    // Lab send only reduced onhand (not memo_*); restore the same qty
    next.onhand_pcs = b.onhand_pcs + movePcs;
    next.onhand_carat = b.onhand_carat + moveCarat;
  } else if (t === "return" || t === "memo_return" || t === "return_memo") {
    next.memo_pcs = Math.max(0, b.memo_pcs - movePcs);
    next.memo_carat = Math.max(0, b.memo_carat - moveCarat);
    next.onhand_pcs = b.onhand_pcs + movePcs;
    next.onhand_carat = b.onhand_carat + moveCarat;
  } else if (t === "memo" || t === "consign") {
    if (moveCarat > b.onhand_carat + 0.0001) {
      throw new Error(
        `Insufficient onhand for SKU ${row.sku}: available ${b.onhand_carat} ct, requested ${moveCarat} ct`
      );
    }
    next.onhand_pcs = Math.max(0, b.onhand_pcs - movePcs);
    next.onhand_carat = Math.max(0, b.onhand_carat - moveCarat);
    next.memo_pcs = b.memo_pcs + movePcs;
    next.memo_carat = b.memo_carat + moveCarat;
  } else if (t === "sale" || t === "export") {
    let remainPcs = movePcs;
    let remainCarat = moveCarat;
    const fromMemoPcs = Math.min(b.memo_pcs, remainPcs);
    const fromMemoCarat = Math.min(b.memo_carat, remainCarat);
    next.memo_pcs = b.memo_pcs - fromMemoPcs;
    next.memo_carat = b.memo_carat - fromMemoCarat;
    remainPcs -= fromMemoPcs;
    remainCarat -= fromMemoCarat;
    if (remainCarat > b.onhand_carat + 0.0001) {
      throw new Error(
        `Insufficient stock for SKU ${row.sku}: onhand ${b.onhand_carat} ct + memo ${b.memo_carat} ct`
      );
    }
    next.onhand_pcs = Math.max(0, b.onhand_pcs - remainPcs);
    next.onhand_carat = Math.max(0, b.onhand_carat - remainCarat);
    next.sold_pcs = b.sold_pcs + movePcs;
    next.sold_carat = b.sold_carat + moveCarat;
  } else {
    if (moveCarat > b.onhand_carat + 0.0001) {
      throw new Error(`Insufficient onhand for SKU ${row.sku}`);
    }
    next.onhand_pcs = Math.max(0, b.onhand_pcs - movePcs);
    next.onhand_carat = Math.max(0, b.onhand_carat - moveCarat);
  }

  const unitPrice = toNum(row.price);
  const amount = Number((next.onhand_carat * unitPrice).toFixed(2));
  const hasBal = await hasBalanceColumns(q);

  if (hasBal) {
    await q(
      `UPDATE dai_product SET
         polish_pcs = ?, polish_carat = ?, amount = ?,
         purchased_pcs = ?, purchased_carat = ?,
         memo_pcs = ?, memo_carat = ?,
         sold_pcs = ?, sold_carat = ?,
         onhand_pcs = ?, onhand_carat = ?
       WHERE id = ?`,
      [
        next.onhand_pcs,
        next.onhand_carat,
        amount,
        next.purchased_pcs,
        next.purchased_carat,
        next.memo_pcs,
        next.memo_carat,
        next.sold_pcs,
        next.sold_carat,
        next.onhand_pcs,
        next.onhand_carat,
        productId,
      ]
    );
  } else {
    await q(
      `UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, amount = ? WHERE id = ?`,
      [next.onhand_pcs, next.onhand_carat, amount, productId]
    );
  }

  return next;
}

async function insertInwardItem(q, payload) {
  if (!(await tableExists(q, "dai_inward_item"))) return null;
  const row = {
    company: payload.company || 1,
    inward_id: payload.inward_id,
    product_id: payload.product_id,
    sku: payload.sku || "",
    party: payload.party || "",
    inward_type: payload.inward_type || "",
    pcs: toNum(payload.pcs),
    carat: toNum(payload.carat),
    price: toNum(payload.price),
    amount: toNum(payload.amount),
    balance_pcs: payload.balance_pcs != null ? toNum(payload.balance_pcs) : null,
    balance_carat: payload.balance_carat != null ? toNum(payload.balance_carat) : null,
    entry_date: payload.entry_date || null,
    invoice_no: payload.invoice_no || "",
    reference: payload.reference || "",
    narretion: payload.narretion || "",
    user: payload.user || null,
  };
  const data = helper.insertString(row);
  const result = await q(`INSERT INTO dai_inward_item (${data[0]}) VALUES (${data[1]})`);
  return result.insertId;
}

async function insertOutwardItem(q, payload) {
  if (!(await tableExists(q, "dai_outward_item"))) return null;
  const row = {
    company: payload.company || 1,
    outward_id: payload.outward_id,
    product_id: payload.product_id,
    sku: payload.sku || "",
    party: payload.party || "",
    outward_type: payload.outward_type || "memo",
    pcs: toNum(payload.pcs),
    carat: toNum(payload.carat),
    price: toNum(payload.price),
    amount: toNum(payload.amount),
    balance_pcs: payload.balance_pcs != null ? toNum(payload.balance_pcs) : null,
    balance_carat: payload.balance_carat != null ? toNum(payload.balance_carat) : null,
    entry_date: payload.entry_date || null,
    invoice_no: payload.invoice_no || "",
    reference: payload.reference || "",
    narretion: payload.narretion || "",
    status: payload.status || null,
    user: payload.user || null,
  };
  const data = helper.insertString(row);
  const result = await q(`INSERT INTO dai_outward_item (${data[0]}) VALUES (${data[1]})`);
  return result.insertId;
}

async function getInwardItems(q, inwardId) {
  if (!(await tableExists(q, "dai_inward_item"))) return [];
  return q(`SELECT * FROM dai_inward_item WHERE inward_id = ? ORDER BY id ASC`, [inwardId]);
}

async function getOutwardItems(q, outwardId) {
  if (!(await tableExists(q, "dai_outward_item"))) return [];
  return q(
    `SELECT * FROM dai_outward_item WHERE outward_id = ? AND (status IS NULL OR status NOT IN ('returned','cancelled'))`,
    [outwardId]
  );
}

async function markOutwardItemReturned(q, outwardId, productId, pcs, carat) {
  if (!(await tableExists(q, "dai_outward_item"))) return;
  const items = await q(
    `SELECT * FROM dai_outward_item
     WHERE outward_id = ? AND product_id = ?
       AND (status IS NULL OR status NOT IN ('returned','cancelled'))
     ORDER BY id ASC`,
    [outwardId, productId]
  );
  if (!items.length) return;

  let remainPcs = toNum(pcs);
  let remainCarat = toNum(carat);
  for (const item of items) {
    if (remainCarat <= 0 && remainPcs <= 0) break;
    const itemPcs = toNum(item.pcs);
    const itemCarat = toNum(item.carat);
    const usePcs = Math.min(itemPcs, remainPcs || itemPcs);
    const useCarat = Math.min(itemCarat, remainCarat || itemCarat);
    const leftPcs = Math.max(0, itemPcs - usePcs);
    const leftCarat = Math.max(0, itemCarat - useCarat);
    if (leftCarat <= 0.0001 && leftPcs <= 0) {
      await q(`UPDATE dai_outward_item SET status = 'returned' WHERE id = ?`, [item.id]);
    } else {
      await q(
        `UPDATE dai_outward_item SET pcs = ?, carat = ?, amount = ? WHERE id = ?`,
        [leftPcs, leftCarat, Number((leftCarat * toNum(item.price)).toFixed(2)), item.id]
      );
    }
    remainPcs = Math.max(0, remainPcs - usePcs);
    remainCarat = Math.max(0, remainCarat - useCarat);
  }
}

/**
 * Heal stones returned from lab (outward cleared) but still at 0 onhand/polish
 * because older returnGia did not restore balances.
 */
async function repairOrphanLabReturns(q = helper.query) {
  await ensureStockItemSchema(q);
  let fixed = 0;

  if (await tableExists(q, "dai_outward_item")) {
    const rows = await q(
      `SELECT oi.outward_id, oi.product_id, oi.pcs, oi.carat, p.sku
       FROM dai_outward_item oi
       INNER JOIN dai_outward o ON o.id = oi.outward_id AND o.type = 'lab'
       INNER JOIN dai_product p ON p.id = oi.product_id
       WHERE (oi.status IS NULL OR oi.status NOT IN ('returned','cancelled'))
         AND (p.outward = '' OR p.outward IS NULL)
         AND COALESCE(p.onhand_carat, 0) <= 0.0001
         AND COALESCE(p.polish_carat, 0) <= 0.0001
         AND COALESCE(oi.carat, 0) > 0`
    );

    for (const row of rows) {
      const pcs = toNum(row.pcs);
      const carat = toNum(row.carat);
      if (carat <= 0 && pcs <= 0) continue;
      await applyOutwardQty(q, row.product_id, "lab_return", pcs, carat);
      await markOutwardItemReturned(q, row.outward_id, row.product_id, pcs, carat);
      await q(
        `UPDATE dai_product SET visibility = 1, outward = '' WHERE id = ?`,
        [row.product_id]
      );
      fixed += 1;
    }
  }

  // Fallback: lab_return history exists, stock still at 0, restore from last lab debit qty
  const orphanHist = await q(
    `SELECT p.id AS product_id,
            (SELECT h.pcs FROM dai_history h
              WHERE h.product_id = p.id AND LOWER(h.action) IN ('lab','gia')
              ORDER BY h.id DESC LIMIT 1) AS pcs,
            (SELECT h.carat FROM dai_history h
              WHERE h.product_id = p.id AND LOWER(h.action) IN ('lab','gia')
              ORDER BY h.id DESC LIMIT 1) AS carat
     FROM dai_product p
     WHERE (p.outward = '' OR p.outward IS NULL OR p.outward = 'lab')
       AND COALESCE(p.onhand_carat, 0) <= 0.0001
       AND COALESCE(p.polish_carat, 0) <= 0.0001
       AND EXISTS (
         SELECT 1 FROM dai_history hr
         WHERE hr.product_id = p.id AND LOWER(hr.action) IN ('lab_return','lab return')
       )`
  );

  for (const row of orphanHist) {
    let pcs = toNum(row.pcs);
    let carat = toNum(row.carat);
    if (carat <= 0 && pcs <= 0) {
      const prodRows = await q(
        `SELECT purchased_pcs, purchased_carat, sold_pcs, sold_carat, memo_pcs, memo_carat
         FROM dai_product WHERE id = ? LIMIT 1`,
        [row.product_id]
      );
      const p = prodRows[0];
      if (p) {
        carat = Math.max(
          0,
          toNum(p.purchased_carat) - toNum(p.sold_carat) - toNum(p.memo_carat)
        );
        pcs = Math.max(
          0,
          toNum(p.purchased_pcs) - toNum(p.sold_pcs) - toNum(p.memo_pcs)
        );
      }
    }
    if (carat <= 0 && pcs <= 0) {
      const anyQty = await q(
        `SELECT pcs, carat FROM dai_history
         WHERE product_id = ? AND COALESCE(carat, 0) > 0
         ORDER BY id DESC LIMIT 1`,
        [row.product_id]
      );
      if (anyQty[0]) {
        pcs = toNum(anyQty[0].pcs) || 1;
        carat = toNum(anyQty[0].carat);
      }
    }
    if (carat <= 0 && pcs <= 0) continue;
    await applyOutwardQty(q, row.product_id, "lab_return", pcs || 1, carat);
    await q(
      `UPDATE dai_product SET visibility = 1, outward = '' WHERE id = ?`,
      [row.product_id]
    );
    fixed += 1;
  }

  return { fixed };
}

module.exports = {
  toNum,
  ensureStockItemSchema,
  hasBalanceColumns,
  readBalances,
  applyInwardQty,
  setInitialBalances,
  applyOutwardQty,
  insertInwardItem,
  insertOutwardItem,
  getInwardItems,
  getOutwardItems,
  markOutwardItemReturned,
  repairOrphanLabReturns,
  tableExists,
};
