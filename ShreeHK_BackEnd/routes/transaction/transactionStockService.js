const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const moment = require("moment");

const { query, insertString, getIncrementEntry, addHistory, addUserTrack, DEFAULT_COMPANY_ID } = helper;
const { logAudit } = require("../../services/auditIntegration.js");
const { diffFields } = require("../../services/auditService.js");

const addHistoryAudited = async (
  history,
  moduleName = "Transaction Stock",
  actionType = "UPDATE",
  auditMeta = {},
) => {
  await addHistory(history);
  try {
    const { oldValue, newValue, companyId } = auditMeta;
    const changedFields =
      auditMeta.changedFields ??
      (oldValue && newValue ? diffFields(oldValue, newValue) : undefined);

    await logAudit({
      actionType,
      moduleName,
      recordId: history.product_id,
      recordReference: history.sku || String(history.product_id || ""),
      description: history.description,
      oldValue,
      newValue,
      changedFields,
      companyId,
    });
  } catch (e) {
    console.error("transactionStock audit:", e);
  }
};

function buildUserFilter(alias, userId) {
  if (userId === 16 || userId === 1) return { clause: "", params: [] };
  return { clause: ` AND ${alias}.user != ?`, params: [16] };
}

function normalizeFilterDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = moment(raw, ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

/** Append From/To date filters against `{alias}.date`. Mutates `params`. */
function buildDateFilterClause(alias, post, params) {
  let clause = "";
  const fromDate = normalizeFilterDate(post.fromDate || post.cfrom || post.from_date);
  const toDate = normalizeFilterDate(post.toDate || post.cto || post.to_date);
  if (fromDate) {
    clause += ` AND DATE(${alias}.date) >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    clause += ` AND DATE(${alias}.date) <= ?`;
    params.push(toDate);
  }
  return clause;
}

async function getProductDetail(id) {
  return productHelper.getDetail(id, "p.id");
}

async function loadProductsByInwardId(inwardId, filterMemo = true) {
  const rows = await query(
    `SELECT p.*, pv.* FROM dai_product p
     JOIN dai_product_value pv ON p.id = pv.product_id
     WHERE p.inward_id = ?`,
    [inwardId]
  );
  if (!filterMemo) return rows;
  return rows.filter((row) => {
    if (
      (row.outward === "memo" || row.outward === "consign" || row.outward === "sale") &&
      row.group_type !== "single" &&
      row.outward_parent
    ) {
      return false;
    }
    return true;
  });
}

async function loadProductsByIds(ids) {
  if (!ids || !ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return query(
    `SELECT p.*, pv.* FROM dai_product p
     JOIN dai_product_value pv ON p.id = pv.product_id
     WHERE p.id IN (${placeholders})`,
    ids
  );
}

const PARTY_FIELDS = `
  p.name AS party_name,
  p.address AS party_address,
  p.pincode AS party_pincode,
  p.country AS party_country,
  p.contact_number AS party_contact,
  p.fax AS party_fax,
  p.contact_person AS contact_person`;

function mapProducts(products) {
  return products.map((p) => ({
    ...p,
    sell_price: p.sell_price || p.price,
    sell_amount: p.sell_amount || p.amount,
  }));
}

function normalizeInwardRow(row, products) {
  const partyName = row.party_name || row.party;
  return {
    id: row.id,
    entryno: row.entryno,
    party: row.party,
    party_name: partyName,
    party_address: row.party_address || "",
    party_pincode: row.party_pincode || "",
    party_country: row.party_country || "",
    party_contact: row.party_contact || "",
    party_fax: row.party_fax || "",
    contact_person: row.contact_person || "",
    invoiceno: row.invoiceno,
    reference: row.reference,
    date: row.date,
    invoicedate: row.invoicedate,
    duedate: row.duedate,
    terms: row.terms,
    type: row.inward_type,
    inward_type: row.inward_type,
    final_amount: row.final_amount,
    products: mapProducts(products),
  };
}

function normalizeOutwardRow(row, products) {
  return {
    id: row.id,
    entryno: row.entryno,
    party: row.party,
    party_name: row.party_name || row.party,
    party_address: row.party_address || "",
    party_pincode: row.party_pincode || "",
    party_country: row.party_country || "",
    party_contact: row.party_contact || "",
    party_fax: row.party_fax || "",
    contact_person: row.contact_person || "",
    invoiceno: row.invoiceno,
    reference: row.reference,
    date: row.date,
    invoicedate: row.invoicedate,
    duedate: row.duedate,
    terms: row.terms,
    type: row.type,
    lab: row.lab,
    final_amount: row.final_amount,
    paid_amount: row.paid_amount,
    due_amount: row.due_amount,
    shipping_name: row.shipping_name,
    shipping_charge: row.shipping_charge,
    origin_of: row.origin_of,
    manufacture_origin: row.manufacture_origin,
    cif: row.cif,
    invoice_from: row.invoice_from,
    boc: row.boc,
    citi: row.citi,
    dbs: row.dbs,
    sc: row.sc,
    boc_sksm: row.boc_sksm,
    citi_sksm: row.citi_sksm,
    products: mapProducts(products),
  };
}

async function listGia(post, userContext = {}) {
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("o", userId);
  const limit = parseInt(post.limit, 10) || 10;
  const offset = parseInt(post.start, 10) || (parseInt(post.page, 10) - 1 || 0) * limit;
  const params = [companyId, ...userFilter.params];
  let partyClause = "";
  if (post.party && post.party !== "0" && post.party !== "") {
    partyClause = " AND o.party = ?";
    params.push(post.party);
  }
  let invoiceClause = "";
  if (post.invoice || post.invoiceno) {
    invoiceClause = " AND o.invoiceno LIKE ?";
    params.push(`%${post.invoice || post.invoiceno}%`);
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND o.type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("o", post, params);
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM dai_outward o
     WHERE o.company = ? AND o.type = 'lab' AND o.status = 'on_lab'
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}`,
    params
  );
  const rows = await query(
    `SELECT o.*, ${PARTY_FIELDS} FROM dai_outward o
     LEFT JOIN dai_party p ON o.party = p.id
     WHERE o.company = ? AND o.type = 'lab' AND o.status = 'on_lab'
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY o.date DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const data = [];
  for (const row of rows) {
    if (!row.products) continue;
    const ids = row.products.split(",").filter(Boolean);
    const products = await loadProductsByIds(ids);
    if (!products.length) continue;
    data.push(normalizeOutwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: countRows[0]?.total || 0 };
}

async function listInwardStock(post, userContext = {}) {
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("i", userId);
  const params = [companyId, ...userFilter.params];
  let partyClause = "";
  if (post.party && post.party !== "0" && post.party !== "") {
    partyClause = " AND i.party = ?";
    params.push(post.party);
  }
  let invoiceClause = "";
  if (post.invoice || post.invoiceno) {
    invoiceClause = " AND i.invoiceno LIKE ?";
    params.push(`%${post.invoice || post.invoiceno}%`);
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND i.inward_type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("i", post, params);
  const rows = await query(
    `SELECT i.*, ${PARTY_FIELDS} FROM dai_inward i
     LEFT JOIN dai_party p ON i.party = p.id
     WHERE (i.deleted = 0 OR i.deleted IS NULL) AND i.company = ?
     AND i.inward_type IN ('memo','consign')
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY i.date DESC, i.id DESC`,
    params
  );
  const data = [];
  for (const row of rows) {
    const products = await loadProductsByInwardId(row.id, true);
    if (!products.length) continue;
    data.push(normalizeInwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: data.length };
}

async function listPurchaseStock(post, userContext = {}) {
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("i", userId);
  const limit = parseInt(post.limit, 10) || 10;
  const offset = parseInt(post.start, 10) || (parseInt(post.page, 10) - 1 || 0) * limit;
  const params = [companyId, ...userFilter.params];
  let partyClause = "";
  if (post.party && post.party !== "0" && post.party !== "") {
    partyClause = " AND i.party = ?";
    params.push(post.party);
  }
  let invoiceClause = "";
  let limitClause = " LIMIT ? OFFSET ?";
  if (post.invoice || post.invoiceno) {
    invoiceClause = " AND i.invoiceno LIKE ?";
    params.push(`%${post.invoice || post.invoiceno}%`);
    limitClause = "";
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND i.inward_type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("i", post, params);
  const countParams = [...params];
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM dai_inward i
     WHERE (i.deleted = 0 OR i.deleted IS NULL) AND i.company = ?
     AND i.inward_type IN ('import','purchase','consign')
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}`,
    countParams
  );
  const listParams = limitClause ? [...params, limit, offset] : params;
  const rows = await query(
    `SELECT i.*, ${PARTY_FIELDS} FROM dai_inward i
     LEFT JOIN dai_party p ON i.party = p.id
     WHERE (i.deleted = 0 OR i.deleted IS NULL) AND i.company = ?
     AND i.inward_type IN ('import','purchase','consign')
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY i.date DESC, i.id DESC ${limitClause}`,
    listParams
  );
  const data = [];
  for (const row of rows) {
    const products = await loadProductsByInwardId(row.id, false);
    if (!products.length) continue;
    data.push(normalizeInwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: countRows[0]?.total || data.length };
}

async function listOutwardStock(post, stockType, userContext = {}) {
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("o", userId);
  const limit = parseInt(post.limit, 10) || 10;
  const offset = parseInt(post.start, 10) || (parseInt(post.page, 10) - 1 || 0) * limit;
  const params = [companyId, ...userFilter.params];
  let typeClause;
  switch (stockType) {
    case "sale":
      typeClause = " AND o.type IN ('sale','export') AND o.status IN ('on_sale','on_export')";
      break;
    case "export":
      typeClause = " AND o.type = 'export' AND o.status = 'on_export'";
      break;
    case "consign":
      typeClause = " AND o.type = 'consign' AND o.status = 'on_consign'";
      break;
    case "memo":
      typeClause = " AND o.type = 'memo' AND o.status = 'on_memo'";
      break;
    default:
      typeClause = " AND o.type IN ('memo','consign') AND o.status IN ('on_memo','on_consign')";
  }
  let partyClause = "";
  if (post.party && post.party !== "0" && post.party !== "") {
    partyClause = " AND o.party = ?";
    params.push(post.party);
  }
  let invoiceClause = "";
  if (post.invoice || post.invoiceno) {
    invoiceClause = " AND o.invoiceno LIKE ?";
    params.push(`%${post.invoice || post.invoiceno}%`);
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND o.type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("o", post, params);
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM dai_outward o
     WHERE o.company = ? ${typeClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}`,
    params
  );
  const rows = await query(
    `SELECT o.*, ${PARTY_FIELDS} FROM dai_outward o
     LEFT JOIN dai_party p ON o.party = p.id
     WHERE o.company = ? ${typeClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY o.date DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const data = [];
  for (const row of rows) {
    if (!row.products) continue;
    const ids = row.products.split(",").filter(Boolean);
    const products = await loadProductsByIds(ids);
    if (!products.length) continue;
    data.push(normalizeOutwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: countRows[0]?.total || 0 };
}

async function getOutwardData(id) {
  const rows = await query("SELECT * FROM dai_outward WHERE id = ?", [id]);
  return rows[0] || null;
}

async function getInwardData(id) {
  const rows = await query("SELECT * FROM dai_inward WHERE id = ?", [id]);
  return rows[0] || null;
}

async function returnGia(post, userContext = {}) {
  const outid = post.outid;
  const oData = await getOutwardData(outid);
  if (!oData) return { ok: false, message: "GIA record not found" };
  const lab = oData.lab;
  let oProducts = (oData.products || "").split(",").filter(Boolean);
  const record = post.record || {};

  for (const [pid, v] of Object.entries(record)) {
    const productId = parseInt(pid, 10);
    oProducts = oProducts.filter((id) => id !== String(productId));
    const product = await getProductDetail(productId);
    if (!product) continue;

    if (!v.report) {
      await query("UPDATE dai_product SET outward='', visibility=1 WHERE id = ?", [productId]);
      await addHistoryAudited({
        product_id: productId,
        action: "lab_return",
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: "Lab Return with No Certificate:",
        type: "cr",
        pcs: product.polish_pcs,
        carat: product.polish_carat,
        balance_pcs: product.polish_pcs,
        balance_carat: product.polish_carat,
        price: product.price,
        amount: product.amount,
      });
      continue;
    }

    const pcarat = product.polish_carat;
    const amount = pcarat * product.price;
    await query(
      `UPDATE dai_product SET lab=?, sku=?, mfg_code=?, main_color=?, polish_carat=?, amount=?,
       outward='', site_upload=0, rapnet_upload=0, is_uploadsite=1, is_uploadrapnet=1, visibility=1
       WHERE id = ?`,
      [lab, v.sku || product.sku, v.mfg_code || product.mfg_code, v.color || product.main_color, pcarat, amount, productId]
    );
    await query(
      `UPDATE dai_product_value SET intensity=?, overtone=?, color=? WHERE product_id = ?`,
      [v.intensity || "", v.overtone || "", v.color || "", productId]
    );
    await addHistoryAudited({
      product_id: productId,
      action: "lab_return",
      date: moment().format("YYYY-MM-DD HH:mm:ss"),
      description: `Lab Return With Certificate no:${v.report}`,
      type: "cr",
      pcs: product.polish_pcs,
      carat: pcarat,
      amount,
      price: product.price,
      invoice: oData.invoiceno,
      party: oData.party,
    });
  }

  if (!oProducts.length) {
    await query("UPDATE dai_outward SET products='', status='close_lab' WHERE id = ?", [outid]);
  } else {
    await query("UPDATE dai_outward SET products=? WHERE id = ?", [oProducts.join(","), outid]);
  }
  return { ok: true, message: "GIA return saved successfully" };
}

async function returnInwardMemo(post) {
  const inData = await getInwardData(post.id);
  if (!inData) return { ok: false, message: "Inward record not found" };
  const products = post.products || [];
  const inProducts = (inData.products || "").split(",").filter(Boolean);
  let returnProducts = (inData.return_products || "").split(",").filter(Boolean);
  const updateProduct = [];

  for (const pid of inProducts) {
    if (products.includes(parseInt(pid, 10)) || products.includes(pid)) {
      const product = await getProductDetail(pid);
      if (!product || product.outward) continue;
      returnProducts.push(pid);
      await query("UPDATE dai_product SET visibility=0, inward_id='' WHERE id = ?", [pid]);
      await addHistoryAudited({
        product_id: product.id,
        action: "purchase_return",
        party: inData.party,
        narretion: inData.narretion,
        date: moment().format("YYYY-MM-DD"),
        description: "Purchase Return",
        pcs: product.polish_pcs,
        carat: product.polish_carat,
        amount: product.amount,
        price: product.price,
        sku: product.sku,
        type: "dr",
        invoice: inData.invoiceno,
        entry_from: "inward",
      });
    } else {
      updateProduct.push(pid);
    }
  }

  await query(
    "UPDATE dai_inward SET return_products=?, products=? WHERE id = ?",
    [[...new Set(returnProducts)].join(","), updateProduct.join(","), post.id]
  );

  const skus = [];
  for (const pid of products) {
    const product = await getProductDetail(pid);
    if (product) skus.push(product.sku);
  }
  await addUserTrack({
    product_id: products.join(","),
    action: "memo_return",
    date: moment().format("YYYY-MM-DD HH:mm:ss"),
    description: `${skus.join(",")} return from in memo id ${post.id}`,
  });
  return { ok: true, message: "In memo return completed" };
}

async function returnOutwardMemo(post) {
  const mdata = await getOutwardData(post.id);
  if (!mdata) return { ok: false, message: "Outward record not found" };
  const products = (post.products || []).map(String);
  let returnProduct = (mdata.return_products || "").split(",").filter(Boolean);
  const mp = [];

  for (const pid of (mdata.products || "").split(",").filter(Boolean)) {
    if (!products.includes(pid)) {
      mp.push(pid);
      continue;
    }
    const pdata = await getProductDetail(pid);
    if (!pdata) continue;

    if (pdata.outward_parent) {
      const edata = await getProductDetail(pdata.outward_parent);
      if (edata) {
        const parentPcs =
          edata.group_type === "box"
            ? parseFloat(edata.polish_pcs) + parseFloat(pdata.polish_pcs)
            : parseFloat(edata.polish_pcs);
        const parentCarat = parseFloat(edata.polish_carat) + parseFloat(pdata.polish_carat);
        await query("UPDATE dai_product SET polish_pcs=?, polish_carat=? WHERE id = ?", [
          parentPcs,
          parentCarat,
          edata.id,
        ]);
        await addHistoryAudited({
          product_id: edata.id,
          action: "memo_return",
          party: mdata.party,
          narretion: mdata.narretion,
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
          description: `Stone Memo return with reference no is ${mdata.reference}`,
          pcs: pdata.polish_pcs,
          carat: pdata.polish_carat,
          amount: pdata.sell_amount || pdata.amount,
          price: pdata.sell_price || pdata.price,
          sku: edata.sku,
          type: "cr",
          invoice: mdata.invoiceno,
          entry_from: "outward",
          entryno: mdata.id,
          balance_pcs: edata.polish_pcs,
          balance_carat: edata.polish_carat,
        });
      }
      await query("UPDATE dai_product SET outward='', visibility=0, outward_parent=0 WHERE id = ?", [pid]);
    } else {
      await query("UPDATE dai_product SET outward='', site_upload=0, rapnet_upload=0 WHERE outward='memo' AND id = ?", [pid]);
      await addHistoryAudited({
        product_id: pid,
        action: "memo_return",
        party: mdata.party,
        narretion: mdata.narretion,
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: `Stone Memo return with reference no is ${mdata.reference}`,
        pcs: pdata.polish_pcs,
        carat: pdata.polish_carat,
        amount: pdata.sell_amount || pdata.amount,
        price: pdata.sell_price || pdata.price,
        sku: pdata.sku,
        type: "cr",
        invoice: mdata.invoiceno,
        entry_from: "outward",
        entryno: mdata.id,
        balance_pcs: pdata.polish_pcs,
        balance_carat: pdata.polish_carat,
      });
    }
    returnProduct.push(pid);
  }

  returnProduct = [...new Set(returnProduct)];
  if (!mp.length) {
    await query("UPDATE dai_outward SET products='', status='close_memo', return_products=? WHERE id = ?", [
      returnProduct.join(","),
      post.id,
    ]);
  } else {
    await query("UPDATE dai_outward SET products=?, return_products=? WHERE id = ?", [
      mp.join(","),
      returnProduct.join(","),
      post.id,
    ]);
  }
  return { ok: true, message: "Out memo return completed" };
}

async function outwardMemoToSale(post, userContext = {}) {
  const memoId = post.memo_id || post.id;
  const mdata = await getOutwardData(memoId);
  if (!mdata) return { ok: false, message: "Memo not found" };
  const products = post.products || [];
  const record = post.record || {};
  const type = post.type || "sale";
  const incre_id = await getIncrementEntry("outward");
  const invoice = await getIncrementEntry("invoice");
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;

  const outProducts = [];
  const soldSkus = [];
  let amount = 0;

  for (const pid of products) {
    const pdata = await getProductDetail(pid);
    if (!pdata) continue;
    soldSkus.push(pdata.sku);
    const rec = record[pid] || record[String(pid)] || {
      price: pdata.sell_price || pdata.price,
      polish_pcs: pdata.polish_pcs,
      polish_carat: pdata.polish_carat,
    };
    const sellAmount = parseFloat(rec.price) * parseFloat(rec.polish_carat || pdata.polish_carat);
    amount += sellAmount;
    outProducts.push(pid);

    const oldSnapshot = {
      outward: pdata.outward,
      sell_price: pdata.sell_price,
      sell_amount: pdata.sell_amount,
      polish_pcs: pdata.polish_pcs,
      polish_carat: pdata.polish_carat,
      sku: pdata.sku,
      party: mdata.party,
    };

    await query(
      "UPDATE dai_product SET outward=?, sell_price=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id = ?",
      [type, rec.price, sellAmount, pid]
    );

    const newSnapshot = {
      outward: type,
      sell_price: rec.price,
      sell_amount: sellAmount,
      polish_pcs: pdata.polish_pcs,
      polish_carat: pdata.polish_carat,
      sku: pdata.sku,
      party: post.party || mdata.party,
    };

    await addHistoryAudited(
      {
        product_id: pid,
        action: type,
        party: post.party || mdata.party,
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: `Stone ${type} FROM MEMO — SKU ${pdata.sku}`,
        amount: sellAmount,
        price: rec.price,
        sku: pdata.sku,
        type: "dr",
        invoice: invoice,
      },
      "Diamond Stock",
      "STOCK_OUT",
      {
        oldValue: oldSnapshot,
        newValue: newSnapshot,
        companyId,
      },
    );
  }

  const salePost = {
    company: companyId,
    user: userId,
    entryno: incre_id,
    invoiceno: invoice,
    type,
    status: type === "export" ? "on_export" : "on_sale",
    party: post.party || mdata.party,
    reference: mdata.reference,
    date: moment().format("YYYY-MM-DD"),
    invoicedate: moment().format("YYYY-MM-DD"),
    products: outProducts.join(","),
    final_amount: amount,
    due_amount: amount,
  };
  const data = insertString(salePost);
  const result = await query(`INSERT INTO dai_outward (${data[0]}) VALUES (${data[1]})`);

  try {
    const outwardRows = await query("SELECT * FROM dai_outward WHERE id = ? LIMIT 1", [result.insertId]);
    await logAudit({
      actionType: "STOCK_OUT",
      moduleName: "Sale",
      recordId: result.insertId,
      recordReference: String(invoice),
      newValue: outwardRows[0] || {
        ...salePost,
        id: result.insertId,
        skus: soldSkus,
        memo_id: memoId,
      },
      description: `Memo converted to sale — invoice ${invoice}, SKUs: ${soldSkus.join(", ")}`,
      companyId,
    });
  } catch (auditErr) {
    console.error("outwardMemoToSale audit:", auditErr);
  }

  const remaining = (mdata.products || "")
    .split(",")
    .filter((id) => id && !products.map(String).includes(String(id)));
  await query("UPDATE dai_outward SET products=? WHERE id = ?", [remaining.join(","), memoId]);

  try {
    await helper.notifyStoneSale({
      sellerName: userContext.username,
      sellerId: userId,
      skus: soldSkus,
      outwardId: result.insertId,
      invoiceNo: invoice,
      companyId,
    });
  } catch (notificationError) {
    console.error("Memo to sale notification error:", notificationError);
  }

  return { ok: true, message: "Memo converted to sale", id: result.insertId };
}

async function inwardMemoToPurchase(post, userContext = {}) {
  const memoId = post.memo_id || post.id;
  const memoData = await getInwardData(memoId);
  if (!memoData) return { ok: false, message: "In memo not found" };
  const products = post.products || [];
  const record = post.record || {};
  const incre_id = await getIncrementEntry("inward");
  const reference = await getIncrementEntry("reference");
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;

  const outProducts = [];
  let iTotal = 0;
  let iCarat = 0;
  let iPcs = 0;

  for (const pid of products) {
    const pdata = await getProductDetail(pid);
    if (!pdata) continue;
    const rec = record[pid] || record[String(pid)] || { price: pdata.price };
    const price = rec.price || pdata.price;
    const amount = parseFloat(pdata.polish_carat) * parseFloat(price);
    iTotal += amount;
    iCarat += parseFloat(pdata.polish_carat);
    iPcs += parseFloat(pdata.polish_pcs || 0);
    outProducts.push(pid);
    await query(
      `UPDATE dai_product SET purchase_price=?, purchase_amount=?, price=?, amount=?, inward='', site_upload=0, rapnet_upload=0 WHERE id = ?`,
      [price, amount, price, amount, pid]
    );
  }

  const purchasePost = {
    company: companyId,
    user: userId,
    entryno: incre_id,
    reference,
    inward_type: "purchase",
    party: post.party || memoData.party,
    invoiceno: post.invoiceno || memoData.invoiceno,
    invoicedate: moment().format("YYYY-MM-DD"),
    date: moment().format("YYYY-MM-DD"),
    duedate: moment().format("YYYY-MM-DD"),
    products: outProducts.join(","),
    final_amount: iTotal,
    due_amount: iTotal,
    carat: iCarat,
    pcs: iPcs,
    deleted: 0,
    narretion: post.narretion || "",
  };
  const data = insertString(purchasePost);
  const result = await query(`INSERT INTO dai_inward (${data[0]}) VALUES (${data[1]})`);
  const newId = result.insertId;

  for (const pid of outProducts) {
    await query("UPDATE dai_product SET inward_id=? WHERE id = ?", [newId, pid]);
    const pdata = await getProductDetail(pid);
    if (!pdata) continue;
    const rec = record[pid] || record[String(pid)] || {};
    const price = rec.price || pdata.price;
    const amount = parseFloat(pdata.polish_carat) * parseFloat(price);
    try {
      await addHistoryAudited({
        product_id: pid,
        action: "purchase",
        party: purchasePost.party,
        narretion: purchasePost.narretion || "",
        date: purchasePost.invoicedate,
        description: ` Stone Memo To Purchase with reference no is ${reference}`,
        pcs: 0,
        carat: 0,
        amount,
        price,
        sku: pdata.sku,
        type: "cr",
        invoice: purchasePost.invoiceno,
        balance_pcs: pdata.polish_pcs,
        balance_carat: pdata.polish_carat,
        user: userId,
      });
    } catch (histErr) {
      console.error("inwardMemoToPurchase addHistory:", histErr);
    }
  }

  const remaining = (memoData.products || "")
    .split(",")
    .filter((id) => id && !products.map(String).includes(String(id)));
  await query("UPDATE dai_inward SET products=? WHERE id = ?", [remaining.join(","), memoId]);

  return { ok: true, message: "Memo converted to purchase", id: newId };
}

async function toggleInwardType(post) {
  const inData = await getInwardData(post.id);
  if (!inData) return { ok: false, message: "Record not found" };
  const newType = post.inward_type;
  const products = (inData.products || "").split(",").filter(Boolean);
  for (const pid of products) {
    const pdata = await getProductDetail(pid);
    if (!pdata) continue;
    await addHistoryAudited({
      product_id: pdata.id,
      action: newType,
      party: inData.party,
      date: moment().format("YYYY-MM-DD HH:mm:ss"),
      description: `Stone convert to ${newType}`,
      pcs: 0,
      carat: 0,
      balance_pcs: 0,
      balance_carat: 0,
      amount: pdata.amount,
      price: pdata.price,
      sku: pdata.sku,
      type: "cr",
      invoice: inData.invoiceno,
      entry_from: "inward",
      entryno: post.id,
    });
    if (pdata.inward) {
      await query("UPDATE dai_product SET inward=? WHERE id = ?", [newType, pid]);
    }
  }
  await query("UPDATE dai_inward SET inward_type=? WHERE id = ?", [newType, post.id]);
  return { ok: true, message: `Converted to ${newType}` };
}

async function outwardToExport(post) {
  const oData = await getOutwardData(post.id);
  if (!oData) return { ok: false, message: "Record not found" };
  const newType = post.type === "export" ? "export" : "consign";
  const newStatus = post.type === "export" ? "on_export" : "on_consign";
  await query("UPDATE dai_outward SET type=?, status=? WHERE id = ?", [newType, newStatus, post.id]);
  return { ok: true, message: `Converted to ${newType}` };
}

async function deleteInwardStock(id) {
  const inData = await getInwardData(id);
  if (!inData) return { ok: false, message: "Record not found" };
  const products = (inData.products || "").split(",").filter(Boolean);
  for (const pid of products) {
    await query("DELETE FROM dai_product_value WHERE product_id = ?", [pid]);
    await query("DELETE FROM dai_product WHERE id = ?", [pid]);
  }
  await query("UPDATE dai_inward SET deleted=1 WHERE id = ?", [id]);
  try {
    await logAudit({
      actionType: "DELETE",
      moduleName: "Inward Stock",
      recordId: id,
      recordReference: inData.invoiceno || String(id),
      oldValue: inData,
    });
  } catch (e) {
    console.error("deleteInwardStock audit:", e);
  }
  return { ok: true, message: "Inward record deleted" };
}

async function deleteGia(id) {
  const oData = await getOutwardData(id);
  if (!oData) return { ok: false, message: "Record not found" };
  const products = (oData.products || "").split(",").filter(Boolean);
  for (const pid of products) {
    await query("UPDATE dai_product SET outward='', visibility=1 WHERE id = ?", [pid]);
  }
  await query("DELETE FROM dai_outward WHERE id = ?", [id]);
  try {
    await logAudit({
      actionType: "DELETE",
      moduleName: "GIA",
      recordId: id,
      recordReference: oData.invoiceno || String(id),
      oldValue: oData,
    });
  } catch (e) {
    console.error("deleteGia audit:", e);
  }
  return { ok: true, message: "GIA record deleted" };
}

async function deleteOutwardStock(id) {
  const oData = await getOutwardData(id);
  await query("DELETE FROM dai_outward WHERE id = ?", [id]);
  try {
    await logAudit({
      actionType: "DELETE",
      moduleName: "Outward Stock",
      recordId: id,
      recordReference: oData?.invoiceno || String(id),
      oldValue: oData || { id },
    });
  } catch (e) {
    console.error("deleteOutwardStock audit:", e);
  }
  return { ok: true, message: "Outward record deleted" };
}

function getPrintStub(type, id) {
  const base = process.env.LEGACY_PDF_URL || "";
  const paths = {
    gia: "pdf/file/memo.php",
    memo: "pdf/file/memo.php",
    sale: "pdf/file/invoice.php",
    purchase: "pdf/file/purchase.php",
    inward: "pdf/file/purchase.php",
  };
  const path = paths[type] || paths.memo;
  return {
    ok: true,
    legacyUrl: base ? `${base}${path}?id=${id}` : null,
    message: base ? "Open legacy PDF" : "Print service not configured",
  };
}

module.exports = {
  listGia,
  listInwardStock,
  listPurchaseStock,
  listOutwardStock,
  returnGia,
  returnInwardMemo,
  returnOutwardMemo,
  outwardMemoToSale,
  inwardMemoToPurchase,
  toggleInwardType,
  outwardToExport,
  deleteInwardStock,
  deleteGia,
  deleteOutwardStock,
  getPrintStub,
};
