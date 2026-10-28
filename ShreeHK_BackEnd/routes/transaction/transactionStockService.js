const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const moment = require("moment");
const stockMovement = require("../../services/stockMovementService.js");
const { resolveListCompanyIds } = require("../../tenantHelper.js");

const { query, insertString, getIncrementEntry, addHistory, addUserTrack, DEFAULT_COMPANY_ID } = helper;

function companyInClause(alias, companyIds) {
  const ids = (companyIds || []).map(Number).filter((id) => id > 0);
  const list = ids.length ? ids : [DEFAULT_COMPANY_ID];
  return {
    clause: `${alias}.company IN (${list.map(() => "?").join(",")})`,
    params: list,
  };
}
const { logAudit, logAuditInTx } = require("../../services/auditIntegration.js");
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

function extractSeqNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const n = parseInt(digits, 10);
  return Number.isNaN(n) || n <= 0 ? 1 : n;
}

function advanceSequenceValue(val) {
  return String(extractSeqNumber(val) + 1);
}

/** memo/consign/sale/export → INV-1; lab → LAB-1 (supports company prefix) */
function formatOutwardInvoiceNo(type, seq, customPrefix = null) {
  const n = extractSeqNumber(seq);
  const t = String(type || "").toLowerCase();
  if (customPrefix && typeof customPrefix === "string" && customPrefix.trim()) {
    const p = customPrefix.trim();
    return p.endsWith("-") ? `${p}${n}` : `${p}-${n}`;
  }
  if (t === "lab") return `LAB-${n}`;
  return `INV-${n}`;
}

/** memo-1 / sale-1 / lab-1 / consign-1 / export-1 */
function formatOutwardEntryNo(type, seq) {
  const n = extractSeqNumber(seq);
  const t = String(type || "").toLowerCase();
  let prefix = "sale";
  if (t === "memo") prefix = "memo";
  else if (t === "consign") prefix = "consign";
  else if (t === "lab") prefix = "lab";
  else if (t === "export") prefix = "export";
  return `${prefix}-${n}`;
}

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

/** Product + stone attrs — always keep p.id (pv.* would overwrite id and drop attrs). */
const PRODUCT_WITH_VALUE_SELECT = `
  p.*,
  p.id AS id,
  p.sku AS sku,
  p.lab AS lab,
  p.remark AS remark,
  p.location AS location,
  p.mfg_code AS mfg_code,
  p.diamond_no AS diamond_no,
  p.main_color AS main_color,
  pv.report_no AS report_no,
  pv.shape AS shape,
  pv.color AS color,
  pv.clarity AS clarity,
  pv.size AS size,
  pv.polish AS polish,
  pv.f_intensity AS f_intensity,
  pv.symmentry AS symmentry,
  pv.cut AS cut,
  pv.mesurment AS mesurment,
  pv.mesurment AS measurement,
  pv.table_pc AS table_pc,
  pv.depth_pc AS depth_pc,
  pv.gridle AS gridle,
  pv.gridle AS griddle_pc,
  pv.intensity AS intensity,
  pv.overtone AS overtone,
  pv.package AS package,
  pv.bgm AS bgm,
  pv.eyeclean AS eyeclean,
  pv.eyeclean AS eye_clean
`;

async function loadProductsByInwardId(inwardId, filterMemo = true) {
  const rows = await query(
    `SELECT ${PRODUCT_WITH_VALUE_SELECT}
     FROM dai_product p
     LEFT JOIN dai_product_value pv ON p.id = pv.product_id
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

/** Build display rows from dai_inward_item when product join fails (same SKU re-purchase). */
function productsFromInwardItems(items) {
  return (items || []).map((it) => {
    const pcs = Number(it.pcs) || 0;
    const carat = Number(it.carat) || 0;
    const price = Number(it.price) || 0;
    const amount = Number(it.amount) || Number((carat * price).toFixed(2));
    return {
      id: it.product_id,
      sku: it.sku || "",
      polish_pcs: pcs,
      polish_carat: carat,
      rought_pcs: pcs,
      price,
      amount,
      purchase_price: price,
      purchase_amount: amount,
      purchase_pcs: pcs,
      purchase_carat: carat,
      cost: 0,
      location: "",
      lab: "",
      group_type: "",
    };
  });
}

/** Prefer dai_inward_item product ids; else inward_id; else dai_inward.products CSV */
async function loadProductsForInwardRow(row, filterMemo = true) {
  let items = [];
  try {
    items = await stockMovement.getInwardItems(query, row.id);
    const itemIds = [...new Set((items || []).map((it) => Number(it.product_id)).filter((n) => n > 0))];
    if (itemIds.length) {
      const products = await loadProductsByIds(itemIds);
      if (products.length) {
        if (!filterMemo) return products;
        return products.filter((prod) => {
          if (
            (prod.outward === "memo" || prod.outward === "consign" || prod.outward === "sale") &&
            prod.group_type !== "single" &&
            prod.outward_parent
          ) {
            return false;
          }
          return true;
        });
      }
      // Items exist but product rows missing — still show invoice lines from items
      if (items.length) return productsFromInwardItems(items);
    }
  } catch (err) {
    console.error("loadProductsForInwardRow inward_item:", err.message);
  }

  const byInwardId = await loadProductsByInwardId(row.id, filterMemo);
  if (byInwardId.length) return byInwardId;

  const ids = String(row.products || "")
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => n > 0);
  if (ids.length) {
    const fromCsv = await loadProductsByIds(ids);
    if (fromCsv.length) return fromCsv;
  }

  // Last resort: synthetic lines so invoice 10009 etc. still appear after same-SKU stock-add
  if (items.length) return productsFromInwardItems(items);
  return [];
}

/** Overlay THIS invoice's pcs/carat/price/amount from dai_inward_item (so re-purchase same SKU keeps separate lines). */
async function applyInwardItemQtys(inwardId, products) {
  if (!inwardId || !Array.isArray(products) || !products.length) return products;
  try {
    const items = await stockMovement.getInwardItems(query, inwardId);
    if (!items.length) return products;

    const productMap = new Map();
    for (const p of products) {
      if (p && p.id != null) {
        productMap.set(String(p.id), p);
      }
    }

    const matchedPids = new Set();
    const result = items.map((it) => {
      matchedPids.add(String(it.product_id));
      const p = productMap.get(String(it.product_id)) || {};
      const pcs = Number(it.pcs) || 0;
      const carat = Number(it.carat) || 0;
      const price = Number(it.price) || Number(p.purchase_price) || Number(p.price) || 0;
      const amount = Number(it.amount) || Number((carat * price).toFixed(2));
      return {
        ...p,
        id: it.id,
        product_id: p.id || it.product_id,
        inward_item_id: it.id,
        polish_pcs: pcs,
        polish_carat: carat,
        rought_pcs: pcs,
        price,
        amount,
        purchase_price: price,
        purchase_amount: amount,
        purchase_pcs: pcs,
        purchase_carat: carat,
      };
    });

    for (const p of products) {
      if (!matchedPids.has(String(p.id))) {
        result.push(p);
      }
    }

    return result;
  } catch (err) {
    console.error("applyInwardItemQtys:", err.message);
    return products;
  }
}

/** Deduplicate product rows (LEFT JOIN dai_product_value can multiply rows). */
function dedupeProductsById(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const seen = new Map();
  for (const row of rows) {
    const key = String(row?.id ?? "");
    if (!key || key === "undefined" || key === "null") continue;
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

async function loadProductsByIds(ids) {
  if (!ids || !ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = await query(
    `SELECT ${PRODUCT_WITH_VALUE_SELECT}
     FROM dai_product p
     LEFT JOIN dai_product_value pv ON p.id = pv.product_id
     WHERE p.id IN (${placeholders})`,
    ids
  );
  // JOIN can return one product multiple times → list totals 5+5+5=15
  return dedupeProductsById(rows);
}

/** Overlay memo/sale line pcs/carat from dai_outward_item onto product rows (main-stock model). */
async function applyOutwardItemQtys(outwardId, products) {
  if (!outwardId || !Array.isArray(products) || !products.length) return products;
  try {
    const items = await stockMovement.getOutwardItems(query, outwardId);
    if (!items.length) return dedupeProductsById(products);

    const productMap = new Map();
    for (const p of products) {
      if (p && p.id != null) {
        productMap.set(String(p.id), p);
      }
    }

    const matchedPids = new Set();
    const result = items.map((it) => {
      matchedPids.add(String(it.product_id));
      const p = productMap.get(String(it.product_id)) || {};
      const pcs = Number(it.pcs) || 0;
      const carat = Number(it.carat) || 0;
      const price = Number(it.price) || Number(p.sell_price) || Number(p.price) || 0;
      const amount = Number(it.amount) || Number((carat * price).toFixed(2));
      return {
        ...p,
        id: it.id, // unique id per line so Antd Table rowKey, checkboxes, and selection are distinct
        product_id: p.id || it.product_id,
        outward_item_id: it.id,
        memo_item_id: it.id,
        polish_pcs: pcs,
        polish_carat: carat,
        sell_price: price,
        sell_amount: amount,
        price,
        amount,
        memo_line_pcs: pcs,
        memo_line_carat: carat,
      };
    });

    for (const p of products) {
      if (!matchedPids.has(String(p.id))) {
        result.push(p);
      }
    }

    return result;
  } catch (err) {
    console.error("applyOutwardItemQtys:", err.message);
    return dedupeProductsById(products);
  }
}

const PARTY_FIELDS = `
  COALESCE(p.name, comp.name) AS party_name,
  COALESCE(p.address, comp.address) AS party_address,
  COALESCE(p.pincode, comp.pincode) AS party_pincode,
  COALESCE(p.country, comp.country) AS party_country,
  COALESCE(p.contact_number, comp.number) AS party_contact,
  p.fax AS party_fax,
  COALESCE(p.contact_person, comp.partner) AS contact_person,
  c.name AS company_name,
  c.shortcutName AS company_shortcut,
  c.address AS company_address,
  c.city AS company_city,
  c.state AS company_state,
  c.pincode AS company_pincode,
  c.country AS company_country,
  c.number AS company_number,
  c.email AS company_email,
  c.website AS company_website,
  c.logo AS company_logo`;

function formatMeasurement(value) {
  return String(value || "").replace(/mm/gi, "").replace(/\s+/g, "");
}

function buildProductLabel(product) {
  const shape = String(product.shape || "").trim().split(/\s+/)[0] || "";
  const carat = product.polish_carat ?? "";
  const color = product.color || product.main_color || "";
  const clarity = product.clarity || "";
  const fluro = product.f_intensity || "";
  const lwh = formatMeasurement(product.mesurment);
  const lab = String(product.lab || "").trim();
  const main = [shape, carat, color, clarity, fluro, lwh]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("-");
  if (main && lab) return `${main}, ${lab}`;
  return main || lab || "";
}

function mapProducts(products) {
  return products.map((p) => ({
    ...p,
    id: p.id,
    sell_price: p.sell_price || p.price,
    sell_amount: p.sell_amount || p.amount,
    purchase_price: p.purchase_price || p.price,
    purchase_amount: p.purchase_amount || p.amount,
    report_no: p.report_no || "",
    certificate: p.report_no || "",
    shape: p.shape || "",
    color: p.color || p.main_color || "",
    main_color: p.main_color || p.color || "",
    clarity: p.clarity || "",
    size: p.size || "",
    polish: p.polish || "",
    f_intensity: p.f_intensity || "",
    symmentry: p.symmentry || "",
    cut: p.cut || "",
    mesurment: p.mesurment || "",
    table_pc: p.table_pc ?? "",
    depth_pc: p.depth_pc ?? "",
    gridle: p.gridle || "",
    intensity: p.intensity || "",
    overtone: p.overtone || "",
    bgm: p.bgm || "",
    eyeclean: p.eyeclean || "",
    lab: p.lab || "",
    remark: p.remark || "",
    location: p.location || p.loc || "",
    mfg_code: p.mfg_code || "",
    diamond_no: p.diamond_no || p.d_no || "",
    label: buildProductLabel(p),
  }));
}

function normalizeInwardRow(row, products) {
  const partyName = row.party_name || row.party;
  const entryno =
    row.entryno != null && String(row.entryno).trim() !== ""
      ? row.entryno
      : row.id != null
        ? `Inward-${row.id}`
        : "";
  return {
    id: row.id,
    company: row.company != null ? Number(row.company) : undefined,
    company_name: row.company_name || "",
    company_shortcut: row.company_shortcut || "",
    company_address: row.company_address || "",
    company_city: row.company_city || "",
    company_state: row.company_state || "",
    company_pincode: row.company_pincode || "",
    company_country: row.company_country || "",
    company_number: row.company_number || "",
    company_email: row.company_email || "",
    company_website: row.company_website || "",
    company_logo: row.company_logo || null,
    entryno,
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
  const entryno =
    row.entryno != null && String(row.entryno).trim() !== ""
      ? row.entryno
      : row.id != null
        ? `Outward-${row.id}`
        : "";
  return {
    id: row.id,
    company: row.company != null ? Number(row.company) : undefined,
    company_name: row.company_name || "",
    company_shortcut: row.company_shortcut || "",
    company_address: row.company_address || "",
    company_city: row.company_city || "",
    company_state: row.company_state || "",
    company_pincode: row.company_pincode || "",
    company_country: row.company_country || "",
    company_number: row.company_number || "",
    company_email: row.company_email || "",
    company_website: row.company_website || "",
    company_logo: row.company_logo || null,
    entryno,
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
    status: row.status || (row.type === "sale" ? "on_sale" : row.type === "memo" ? "on_memo" : ""),
    lab: row.lab,
    final_amount:
      Number(row.final_amount) ||
      products.reduce((acc, p) => acc + (Number(p.sell_amount || p.amount) || 0), 0),
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
  const companyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  let effectiveCompanyIds = companyIds;
  if (post.company && Number(post.company) > 0) {
    const requestedComp = Number(post.company);
    if (companyIds.includes(requestedComp)) {
      effectiveCompanyIds = [requestedComp];
    }
  }
  const companySql = companyInClause("o", effectiveCompanyIds);
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("o", userId);
  const limit = parseInt(post.limit, 10) || 10;
  const offset = parseInt(post.start, 10) || (parseInt(post.page, 10) - 1 || 0) * limit;
  const params = [...companySql.params, ...userFilter.params];
  let partyClause = "";
  if (post.party && post.party !== "0" && post.party !== "") {
    partyClause = " AND o.party = ?";
    params.push(post.party);
  }
  let invoiceClause = "";
  if (post.invoice || post.invoiceno) {
    const inv = String(post.invoice || post.invoiceno).trim();
    invoiceClause = " AND (CAST(o.invoiceno AS CHAR) = ? OR CAST(o.invoiceno AS CHAR) LIKE ?)";
    params.push(inv, `${inv}%`);
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND o.type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("o", post, params);
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM dai_outward o
     WHERE ${companySql.clause} AND o.type = 'lab' AND o.status = 'on_lab'
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}`,
    params
  );
  const rows = await query(
    `SELECT o.*, ${PARTY_FIELDS} FROM dai_outward o
     LEFT JOIN dai_party p ON (o.party = CAST(p.id AS CHAR) OR o.party = p.id OR o.party = p.name)
     LEFT JOIN company comp ON (o.party = CAST(comp.id AS CHAR) OR o.party = comp.id OR o.party = comp.name OR o.party = comp.shortcutName)
     LEFT JOIN company c ON (o.company = c.id)
     WHERE ${companySql.clause} AND o.type = 'lab' AND o.status = 'on_lab'
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY o.date DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const data = [];
  for (const row of rows) {
    if (!row.products) continue;
    const ids = row.products.split(",").filter(Boolean);
    let products = await loadProductsByIds(ids);
    products = await applyOutwardItemQtys(row.id, products);
    if (!products.length) continue;
    data.push(normalizeOutwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: countRows[0]?.total || 0 };
}

async function listInwardStock(post, userContext = {}) {
  try {
    await stockMovement.ensureStockItemSchema(query);
  } catch (schemaErr) {
    console.error("listInwardStock ensureStockItemSchema:", schemaErr?.message || schemaErr);
  }
  const companyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  let effectiveCompanyIds = companyIds;
  const targetComp = post.toCompany || post.toCompanyId || post.company;
  if (targetComp && Number(targetComp) > 0) {
    const requestedComp = Number(targetComp);
    if (companyIds.includes(requestedComp)) {
      effectiveCompanyIds = [requestedComp];
    }
  }
  const companySql = companyInClause("i", effectiveCompanyIds);
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("i", userId);
  const params = [...companySql.params, ...userFilter.params];
  const fromComp = post.fromCompany || post.fromCompanyId || post.party;
  let partyClause = "";
  if (fromComp && fromComp !== "0" && fromComp !== "") {
    partyClause = " AND (i.party = ? OR i.party = CAST(? AS CHAR) OR comp.name = ? OR comp.shortcutName = ? OR comp.id = ?)";
    params.push(fromComp, fromComp, fromComp, fromComp, fromComp);
  }
  let invoiceClause = "";
  if (post.invoice || post.invoiceno) {
    const inv = String(post.invoice || post.invoiceno).trim();
    invoiceClause = " AND (CAST(i.invoiceno AS CHAR) = ? OR CAST(i.invoiceno AS CHAR) LIKE ?)";
    params.push(inv, `${inv}%`);
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND i.inward_type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("i", post, params);
  const isInterMemo = post.stockType === "inter_memo" || post.isInterTransfer === true;
  const typeClause = isInterMemo
    ? " AND i.inward_type IN ('inter_memo', 'inter_transfer_memo', 'transfer_memo')"
    : " AND i.inward_type IN ('memo','consign') AND i.inward_type NOT IN ('inter_transfer', 'transfer', 'inter_memo', 'inter_transfer_memo', 'transfer_memo')";
  const rows = await query(
    `SELECT i.*, ${PARTY_FIELDS} FROM dai_inward i
     LEFT JOIN dai_party p ON (i.party = CAST(p.id AS CHAR) OR i.party = p.id OR i.party = p.name)
     LEFT JOIN company comp ON (i.party = CAST(comp.id AS CHAR) OR i.party = comp.id OR i.party = comp.name OR i.party = comp.shortcutName)
     LEFT JOIN company c ON (i.company = c.id)
     WHERE (i.deleted = 0 OR i.deleted IS NULL) AND ${companySql.clause}
     ${typeClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY i.date DESC, i.id DESC`,
    params
  );
  const data = [];
  for (const row of rows) {
    let products = await loadProductsForInwardRow(row, true);
    products = await applyInwardItemQtys(row.id, products);
    // Always show in-memo invoice even if product join is empty (stock-add / sibling company)
    data.push(normalizeInwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: data.length };
}

async function listPurchaseStock(post, userContext = {}) {
  try {
    await stockMovement.ensureStockItemSchema(query);
  } catch (schemaErr) {
    console.error("listPurchaseStock ensureStockItemSchema:", schemaErr?.message || schemaErr);
  }
  const companyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  let effectiveCompanyIds = companyIds;
  const targetComp = post.toCompany || post.toCompanyId || post.company;
  if (targetComp && Number(targetComp) > 0) {
    const requestedComp = Number(targetComp);
    if (companyIds.includes(requestedComp)) {
      effectiveCompanyIds = [requestedComp];
    }
  }
  const companySql = companyInClause("i", effectiveCompanyIds);
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("i", userId);
  const limit = parseInt(post.limit, 10) || 10;
  const offset = parseInt(post.start, 10) || (parseInt(post.page, 10) - 1 || 0) * limit;
  const params = [...companySql.params, ...userFilter.params];
  const fromComp = post.fromCompany || post.fromCompanyId || post.party;
  let partyClause = "";
  if (fromComp && fromComp !== "0" && fromComp !== "") {
    partyClause = " AND (i.party = ? OR i.party = CAST(? AS CHAR) OR p.name = ? OR p.id = ? OR comp.name = ? OR comp.shortcutName = ? OR comp.id = ?)";
    params.push(fromComp, fromComp, fromComp, fromComp, fromComp, fromComp, fromComp);
  }
  let invoiceClause = "";
  let limitClause = " LIMIT ? OFFSET ?";
  if (post.invoice || post.invoiceno) {
    const inv = String(post.invoice || post.invoiceno).trim();
    invoiceClause = " AND (CAST(i.invoiceno AS CHAR) = ? OR CAST(i.invoiceno AS CHAR) LIKE ?)";
    params.push(inv, `${inv}%`);
    limitClause = "";
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND i.inward_type = ?";
    params.push(String(post.type).toLowerCase());
  }
  const dateClause = buildDateFilterClause("i", post, params);
  const isInterTransfer = post.isInterTransfer === true || post.stockType === "inter_transfer";
  const typeClause = isInterTransfer
    ? " AND i.inward_type IN ('inter_transfer', 'transfer')"
    : " AND i.inward_type IN ('import','purchase','consign') AND i.inward_type NOT IN ('inter_transfer', 'transfer', 'inter_memo', 'inter_transfer_memo', 'transfer_memo')";

  const countParams = [...params];
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM dai_inward i
     LEFT JOIN dai_party p ON (i.party = CAST(p.id AS CHAR) OR i.party = p.id OR i.party = p.name)
     LEFT JOIN company comp ON (i.party = CAST(comp.id AS CHAR) OR i.party = comp.id OR i.party = comp.name OR i.party = comp.shortcutName)
     WHERE (i.deleted = 0 OR i.deleted IS NULL) AND ${companySql.clause}
     ${typeClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}`,
    countParams
  );
  const listParams = limitClause ? [...params, limit, offset] : params;
  const rows = await query(
    `SELECT i.*, ${PARTY_FIELDS} FROM dai_inward i
     LEFT JOIN dai_party p ON (i.party = CAST(p.id AS CHAR) OR i.party = p.id OR i.party = p.name)
     LEFT JOIN company comp ON (i.party = CAST(comp.id AS CHAR) OR i.party = comp.id OR i.party = comp.name OR i.party = comp.shortcutName)
     LEFT JOIN company c ON (i.company = c.id)
     WHERE (i.deleted = 0 OR i.deleted IS NULL) AND ${companySql.clause}
     ${typeClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${dateClause}
     ORDER BY i.date DESC, i.id DESC ${limitClause}`,
    listParams
  );
  const data = [];
  for (const row of rows) {
    let products = await loadProductsForInwardRow(row, false);
    products = await applyInwardItemQtys(row.id, products);
    // Always show the purchase invoice (10008 + 10009) even if product join is empty
    data.push(normalizeInwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: countRows[0]?.total || data.length };
}

async function listOutwardStock(post, stockType, userContext = {}) {
  try {
    await stockMovement.ensureStockItemSchema(query);
  } catch (schemaErr) {
    console.error("listOutwardStock ensureStockItemSchema:", schemaErr?.message || schemaErr);
  }
  const companyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  let effectiveCompanyIds = companyIds;
  const sourceComp = post.fromCompany || post.fromCompanyId || post.company;
  if (sourceComp && Number(sourceComp) > 0) {
    const requestedComp = Number(sourceComp);
    if (companyIds.includes(requestedComp)) {
      effectiveCompanyIds = [requestedComp];
    }
  }
  const companySql = companyInClause("o", effectiveCompanyIds);
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const userFilter = buildUserFilter("o", userId);
  const limit = parseInt(post.limit, 10) || 10;
  const offset = parseInt(post.start, 10) || (parseInt(post.page, 10) - 1 || 0) * limit;
  const params = [...companySql.params, ...userFilter.params];
  let typeClause;
  switch (stockType) {
    case "sale":
      typeClause = " AND o.type IN ('sale','export') AND o.status IN ('on_sale','on_export')";
      break;
    case "inter_transfer":
      typeClause = " AND o.type IN ('inter_transfer','transfer') AND o.status IN ('transferred','on_sale')";
      break;
    case "inter_memo":
      typeClause = " AND o.type IN ('inter_memo', 'inter_transfer_memo', 'transfer_memo') AND o.status IN ('on_memo', 'on_transfer', 'transferred')";
      break;
    case "export":
      typeClause = " AND o.type = 'export' AND o.status = 'on_export'";
      break;
    case "consign":
      typeClause = " AND o.type = 'consign' AND o.status = 'on_consign'";
      break;
    case "memo":
      typeClause = " AND o.type IN ('memo','consign')";
      break;
    default:
      typeClause = " AND o.type IN ('memo','consign')";
  }
  const excludeTransferClause = (stockType === "inter_transfer" || stockType === "inter_memo")
    ? ""
    : " AND o.type NOT IN ('inter_transfer', 'transfer', 'inter_memo', 'inter_transfer_memo', 'transfer_memo')";
  const toComp = post.toCompany || post.toCompanyId || post.party;
  let partyClause = "";
  if (toComp && toComp !== "0" && toComp !== "") {
    partyClause = " AND (o.party = ? OR o.party = CAST(? AS CHAR) OR p.name = ? OR p.id = ? OR comp.name = ? OR comp.shortcutName = ? OR comp.id = ?)";
    params.push(toComp, toComp, toComp, toComp, toComp, toComp, toComp);
  }
  let invoiceClause = "";
  if (post.invoice || post.invoiceno) {
    const inv = String(post.invoice || post.invoiceno).trim();
    invoiceClause = " AND (CAST(o.invoiceno AS CHAR) = ? OR CAST(o.invoiceno AS CHAR) LIKE ?)";
    params.push(inv, `${inv}%`);
  }
  let typeFilterClause = "";
  if (post.type) {
    typeFilterClause = " AND o.type = ?";
    params.push(String(post.type).toLowerCase());
  }
  let skuClause = "";
  if (post.sku) {
    const skuLike = `%${String(post.sku).trim()}%`;
    skuClause = ` AND EXISTS (
      SELECT 1 FROM dai_product pr
      LEFT JOIN dai_product_value pv ON pr.id = pv.product_id
      WHERE FIND_IN_SET(pr.id, o.products) > 0
        AND (
          pr.sku LIKE ?
          OR pr.mfg_code LIKE ?
          OR pr.diamond_no LIKE ?
          OR pv.report_no LIKE ?
        )
    )`;
    params.push(skuLike, skuLike, skuLike, skuLike);
  }
  const dateClause = buildDateFilterClause("o", post, params);
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM dai_outward o
     LEFT JOIN dai_party p ON (o.party = CAST(p.id AS CHAR) OR o.party = p.id OR o.party = p.name)
     LEFT JOIN company comp ON (o.party = CAST(comp.id AS CHAR) OR o.party = comp.id OR o.party = comp.name OR o.party = comp.shortcutName)
     WHERE ${companySql.clause} ${typeClause}
     ${excludeTransferClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${skuClause} ${dateClause}`,
    params
  );
  const rows = await query(
    `SELECT o.*, ${PARTY_FIELDS} FROM dai_outward o
     LEFT JOIN dai_party p ON (o.party = CAST(p.id AS CHAR) OR o.party = p.id OR o.party = p.name)
     LEFT JOIN company comp ON (o.party = CAST(comp.id AS CHAR) OR o.party = comp.id OR o.party = comp.name OR o.party = comp.shortcutName)
     LEFT JOIN company c ON (o.company = c.id)
     WHERE ${companySql.clause} ${typeClause}
     ${excludeTransferClause}
     ${userFilter.clause} ${partyClause} ${invoiceClause} ${typeFilterClause} ${skuClause} ${dateClause}
     ORDER BY o.date DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const data = [];
  for (const row of rows) {
    const ids = String(row.products || "")
      .split(",")
      .map((x) => String(x).trim())
      .filter(Boolean);
    let products = ids.length ? await loadProductsByIds(ids) : [];
    products = await applyOutwardItemQtys(row.id, products);
    if (!products.length) {
      try {
        const items = await query(
          "SELECT * FROM dai_outward_item WHERE outward_id = ? ORDER BY id ASC",
          [row.id]
        );
        if (items.length) {
          products = items.map((it) => ({
            id: it.product_id,
            sku: it.sku || "",
            polish_pcs: Number(it.pcs) || 0,
            polish_carat: Number(it.carat) || 0,
            sell_price: Number(it.price) || 0,
            sell_amount: Number(it.amount) || 0,
            price: Number(it.price) || 0,
            amount: Number(it.amount) || 0,
          }));
        }
      } catch (err) {
        console.error("listOutwardStock outward_item fallback:", err?.message || err);
      }
    }
    // Keep memo/sale row visible even if product join is empty
    data.push(normalizeOutwardRow(row, products));
  }
  return { ok: true, Data: data, TotalItems: countRows[0]?.total || 0 };
}

async function getOutwardData(id, companyId = null) {
  if (companyId) {
    const rows = await query("SELECT * FROM dai_outward WHERE id = ? AND company = ?", [id, companyId]);
    return rows[0] || null;
  }
  const rows = await query("SELECT * FROM dai_outward WHERE id = ?", [id]);
  return rows[0] || null;
}

async function getInwardData(id, companyId = null) {
  if (companyId) {
    const rows = await query("SELECT * FROM dai_inward WHERE id = ? AND company = ?", [id, companyId]);
    return rows[0] || null;
  }
  const rows = await query("SELECT * FROM dai_inward WHERE id = ?", [id]);
  return rows[0] || null;
}

async function returnGia(post, userContext = {}) {
  const outid = post.outid ?? post.id;
  if (outid == null || outid === "") {
    return { ok: false, message: "GIA record id is required" };
  }

  // Resolve by id within branch companies (lab voucher may be under sibling operating company)
  const lookupCompanyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  const companyPlaceholders = lookupCompanyIds.map(() => "?").join(",") || "?";
  const companyParams = lookupCompanyIds.length ? lookupCompanyIds : [DEFAULT_COMPANY_ID];
  let labRows = await query(
    `SELECT * FROM dai_outward WHERE id = ? AND company IN (${companyPlaceholders})`,
    [outid, ...companyParams]
  );
  if (!labRows.length) {
    labRows = await query("SELECT * FROM dai_outward WHERE id = ?", [outid]);
  }
  const oData = labRows[0] || null;
  if (!oData) return { ok: false, message: "GIA record not found or access denied" };
  if (String(oData.type || "").toLowerCase() !== "lab") {
    return { ok: false, message: "Selected record is not a GIA/lab memo" };
  }

  const lab = oData.lab;
  let oProducts = (oData.products || "").split(",").filter(Boolean);
  const record = post.record || {};
  const returnedIds = Object.keys(record)
    .map((pid) => parseInt(pid, 10))
    .filter((id) => !Number.isNaN(id) && id > 0);

  if (!returnedIds.length) {
    return { ok: false, message: "No stones selected for lab return" };
  }

  try {
    await stockMovement.ensureStockItemSchema(query);
  } catch (schemaErr) {
    console.error("returnGia ensureStockItemSchema:", schemaErr?.message || schemaErr);
  }

  const outwardItems = await stockMovement.getOutwardItems(query, outid);

  const processedProductIds = new Set();

  for (const rawId of returnedIds) {
    const itemMatch = outwardItems.find(
      (it) => Number(it.id) === Number(rawId) || Number(it.product_id) === Number(rawId)
    );
    const productId = itemMatch ? Number(itemMatch.product_id) : Number(rawId);
    if (processedProductIds.has(productId)) continue;
    processedProductIds.add(productId);

    const v = record[rawId] || record[String(rawId)] || record[productId] || record[String(productId)] || {};
    oProducts = oProducts.filter((id) => id !== String(productId) && id !== String(rawId));
    const product = await getProductDetail(productId);
    if (!product) continue;

    const itemForProduct = itemMatch || outwardItems.find(
      (it) => String(it.product_id) === String(productId)
    );
    let movePcs =
      Number(itemForProduct?.pcs) > 0
        ? Number(itemForProduct.pcs)
        : Number(product.polish_pcs) || Number(product.onhand_pcs) || 0;
    let moveCarat =
      Number(itemForProduct?.carat) > 0
        ? Number(itemForProduct.carat)
        : Number(product.polish_carat) || Number(product.onhand_carat) || 0;

    // Legacy lab send may leave polish/onhand at 0 with no item row — use last lab history qty
    if (moveCarat <= 0 && movePcs <= 0) {
      const hist = await query(
        `SELECT pcs, carat FROM dai_history
         WHERE product_id = ? AND action IN ('lab','gia')
         ORDER BY id DESC LIMIT 1`,
        [productId]
      );
      if (hist[0]) {
        movePcs = Number(hist[0].pcs) || 0;
        moveCarat = Number(hist[0].carat) || 0;
      }
    }
    if (moveCarat <= 0 && movePcs <= 0) {
      const purchased = Number(product.purchased_carat) || 0;
      const sold = Number(product.sold_carat) || 0;
      const memo = Number(product.memo_carat) || 0;
      const restored = Math.max(0, purchased - sold - memo);
      if (restored > 0) {
        moveCarat = restored;
        movePcs =
          Math.max(
            0,
            (Number(product.purchased_pcs) || 0) -
            (Number(product.sold_pcs) || 0) -
            (Number(product.memo_pcs) || 0)
          ) || 1;
      }
    }

    // Lab send zeroes onhand/polish — restore so stone appears in inventory again
    let bal = {
      onhand_pcs: Number(product.onhand_pcs ?? product.polish_pcs) || 0,
      onhand_carat: Number(product.onhand_carat ?? product.polish_carat) || 0,
    };
    if (moveCarat > 0 || movePcs > 0) {
      bal = await stockMovement.applyOutwardQty(
        query,
        productId,
        "lab_return",
        movePcs,
        moveCarat
      );
    }
    await stockMovement.markOutwardItemReturned(query, outid, productId, movePcs, moveCarat);

    const reportNo = String(v.report || "").trim();
    const nextSku = v.sku || product.sku;
    const nextMfg = v.mfg_code || product.mfg_code;
    const nextColor = v.color || product.main_color || product.color || "";
    const unitPrice = Number(product.price) || 0;
    const amount = Number(((Number(bal.onhand_carat) || 0) * unitPrice).toFixed(2));
    const targetLab = lab || product.lab || "GIA";

    if (!reportNo) {
      await query(
        `UPDATE dai_product SET lab=?, sku=?, mfg_code=?, outward='', visibility=1,
         site_upload=0, rapnet_upload=0, amount=?
         WHERE id = ?`,
        [targetLab, nextSku, nextMfg, amount, productId]
      );
      await addHistoryAudited({
        product_id: productId,
        action: "lab_return",
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: `Lab Return (${targetLab}) with No Certificate — SKU ${nextSku} (invoice #${oData.invoiceno})`,
        type: "cr",
        pcs: movePcs,
        carat: moveCarat,
        balance_pcs: bal.onhand_pcs,
        balance_carat: bal.onhand_carat,
        price: unitPrice,
        amount,
        invoice: oData.invoiceno,
        party: oData.party,
        sku: nextSku,
      }, "GIA Lab Stock", "LAB_RETURN", {
        oldValue: { outward: "lab", lab: oData.lab, sku: product.sku },
        newValue: { outward: "", lab: targetLab, sku: nextSku, amount },
        companyId: product.company || oData.company,
      });
      continue;
    }

    await query(
      `UPDATE dai_product SET lab=?, sku=?, mfg_code=?, main_color=?, amount=?,
       outward='', site_upload=0, rapnet_upload=0, is_uploadsite=1, is_uploadrapnet=1, visibility=1
       WHERE id = ?`,
      [targetLab, nextSku, nextMfg, nextColor, amount, productId]
    );
    await query(
      `UPDATE dai_product_value SET intensity=?, overtone=?, color=?, report_no=? WHERE product_id = ?`,
      [v.intensity || "", v.overtone || "", nextColor, reportNo, productId]
    );
    await addHistoryAudited({
      product_id: productId,
      action: "lab_return",
      date: moment().format("YYYY-MM-DD HH:mm:ss"),
      description: `Lab Return (${targetLab}) with Certificate #${reportNo} — SKU ${nextSku} (invoice #${oData.invoiceno})`,
      type: "cr",
      pcs: movePcs,
      carat: moveCarat,
      balance_pcs: bal.onhand_pcs,
      balance_carat: bal.onhand_carat,
      amount,
      price: unitPrice,
      invoice: oData.invoiceno,
      party: oData.party,
      sku: nextSku,
    }, "GIA Lab Stock", "LAB_RETURN", {
      oldValue: { outward: "lab", lab: oData.lab, sku: product.sku },
      newValue: { outward: "", lab: targetLab, sku: nextSku, report_no: reportNo, amount },
      companyId: product.company || oData.company,
    });
  }

  if (!oProducts.length) {
    await query("UPDATE dai_outward SET products='', status='close_lab' WHERE id = ?", [outid]);
    await logAudit({
      actionType: "LAB_RETURN",
      moduleName: "GIA Lab Stock",
      recordId: outid,
      recordReference: String(oData.invoiceno || outid),
      description: `Lab Memo #${oData.invoiceno} returned from ${targetLab} and closed`,
      companyId: oData.company,
    });
  } else {
    await query("UPDATE dai_outward SET products=? WHERE id = ?", [oProducts.join(","), outid]);
    await logAudit({
      actionType: "LAB_RETURN",
      moduleName: "GIA Lab Stock",
      recordId: outid,
      recordReference: String(oData.invoiceno || outid),
      description: `Partial Lab Return from ${targetLab} for Memo #${oData.invoiceno}`,
      companyId: oData.company,
    });
  }

  try {
    await stockMovement.repairOrphanLabReturns(query);
  } catch (repairErr) {
    console.error("returnGia repairOrphanLabReturns:", repairErr?.message || repairErr);
  }

  return { ok: true, message: "GIA return saved successfully" };
}

async function returnInwardMemo(post, userContext = {}) {
  const companyId = userContext.companyId || null;
  const inData = await getInwardData(post.id, companyId);
  if (!inData) return { ok: false, message: "Inward record not found or access denied" };
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

async function returnOutwardMemo(post, userContext = {}) {
  if (!Array.isArray(post.products) || post.products.length === 0) {
    return { ok: false, message: "No stones selected for return" };
  }

  // Resolve by id within branch companies (memo may be under sibling operating company)
  const lookupCompanyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  const companyPlaceholders = lookupCompanyIds.map(() => "?").join(",") || "?";
  const companyParams = lookupCompanyIds.length ? lookupCompanyIds : [DEFAULT_COMPANY_ID];
  let memoRows = await query(
    `SELECT * FROM dai_outward WHERE id = ? AND company IN (${companyPlaceholders})`,
    [post.id, ...companyParams]
  );
  if (!memoRows.length) {
    memoRows = await query("SELECT * FROM dai_outward WHERE id = ?", [post.id]);
  }
  const mdata = memoRows[0] || null;
  if (!mdata) return { ok: false, message: "Outward record not found or access denied" };
  const companyId = Number(mdata.company) || userContext.companyId || DEFAULT_COMPANY_ID;
  const products = (post.products || []).map(String);
  const recordMap = post.record || {};
  let returnProduct = (mdata.return_products || "").split(",").filter(Boolean);
  const mp = [];

  // Load once per voucher (not per product)
  const outwardItems = await stockMovement.getOutwardItems(query, post.id);

  const outwardType = String(mdata.type || "").toLowerCase();
  if (outwardType === "inter_transfer" || outwardType === "transfer") {
    const transferRows = await query(
      "SELECT * FROM dai_company_transfer WHERE source_outward_id = ? OR id = ? LIMIT 1",
      [post.id, post.id]
    );
    if (transferRows.length) {
      const companyTransferService = require("../../services/transaction/companyTransferService.js");
      const transferRes = await companyTransferService.executeSaleReturn(
        {
          transfer_id: transferRows[0].id,
          notes: post.narretion || "Sale return via Inter Transfer Sale",
        },
        userContext
      );
      return {
        ok: true,
        message: transferRes.message || "Sale return completed successfully.",
      };
    }
  }

  const isSaleVoucher =
    outwardType === "sale" ||
    outwardType === "export" ||
    outwardType === "inter_transfer" ||
    outwardType === "transfer";

  const returnedItemIds = new Set();
  const returnedProductIds = new Set();
  for (const rawId of products) {
    const itemMatch = outwardItems.find((it) => String(it.id) === String(rawId));
    if (itemMatch) {
      returnedItemIds.add(String(itemMatch.id));
      returnedProductIds.add(String(itemMatch.product_id));
    } else {
      returnedProductIds.add(String(rawId));
    }
  }

  for (const pid of (mdata.products || "").split(",").filter(Boolean)) {
    const isSelected =
      products.includes(pid) ||
      returnedProductIds.has(String(pid));
    if (!isSelected) {
      mp.push(pid);
      continue;
    }
    const pdata = await getProductDetail(pid);
    if (!pdata) continue;

    const isExport = outwardType === "export" || String(pdata.outward || "").toLowerCase() === "export";
    const isSale =
      isSaleVoucher ||
      String(pdata.outward || "").toLowerCase() === "sale" ||
      isExport ||
      String(pdata.outward || "").toLowerCase() === "transferred";
    const returnAction = isExport ? "export_close" : (isSale ? "sale_return" : "memo_return");
    const returnTypeLabel = isExport ? "Export" : (isSale ? "Sale" : "Memo");

    const itemForProduct = outwardItems.find((it) => {
      if (returnedItemIds.size > 0) {
        return returnedItemIds.has(String(it.id)) && String(it.product_id) === String(pid);
      }
      return String(it.product_id) === String(pid);
    });
    // New model: memo/sale qty lives on outward_item / balances
    const isMainStockMemoLine =
      !pdata.outward_parent &&
      (Boolean(itemForProduct) ||
        Number(pdata.memo_carat) > 0 ||
        (isSale && Number(pdata.sold_carat) > 0) ||
        pdata.outward === "memo" ||
        pdata.outward === "consign" ||
        (isSale && (pdata.outward === "sale" || pdata.outward === "export" || pdata.outward === "transferred")));

    if (
      !isSale &&
      pdata.outward !== "memo" &&
      pdata.outward !== "consign" &&
      !pdata.outward_parent &&
      !itemForProduct &&
      !(Number(pdata.memo_carat) > 0)
    ) {
      return {
        ok: false,
        message: `Stone ${pdata.sku || pid} cannot be returned: current outward status is '${pdata.outward || "available"}' (expected 'memo').`,
      };
    }

    const rec =
      (itemForProduct ? recordMap[itemForProduct.id] || recordMap[String(itemForProduct.id)] : null) ||
      recordMap[pid] ||
      recordMap[String(pid)] ||
      {};
    // Ceiling: item line → memo/sold bucket → product polish (legacy child rows)
    const memoPcsCeiling =
      Number(itemForProduct?.pcs) ||
      Number(isSale ? pdata.sold_pcs : pdata.memo_pcs) ||
      Number(pdata.polish_pcs) ||
      0;
    const memoCaratCeiling =
      Number(itemForProduct?.carat) ||
      Number(isSale ? pdata.sold_carat : pdata.memo_carat) ||
      Number(pdata.polish_carat) ||
      0;

    // For sale return, carat and pcs must never be altered or updated
    const retPcs = isSale
      ? memoPcsCeiling
      : (rec.polish_pcs != null && rec.polish_pcs !== "" ? Number(rec.polish_pcs) : memoPcsCeiling);
    const retCarat = isSale
      ? memoCaratCeiling
      : (rec.polish_carat != null && rec.polish_carat !== "" ? Number(rec.polish_carat) : memoCaratCeiling);
    const stockPcs = memoPcsCeiling;
    const stockCarat = memoCaratCeiling;

    if (retCarat <= 0) {
      return { ok: false, message: `Enter carat for SKU ${pdata.sku || pid}` };
    }
    if (retCarat > stockCarat + 0.0001) {
      return {
        ok: false,
        message: `Carat exceed ${returnTypeLabel.toLowerCase()} qty for SKU ${pdata.sku || pid} (returning ${retCarat}, ${returnTypeLabel.toLowerCase()} has ${stockCarat})`,
      };
    }
    if (pdata.group_type === "box" && retPcs > stockPcs + 0.0001) {
      return { ok: false, message: `Pcs exceed ${returnTypeLabel.toLowerCase()} qty for SKU ${pdata.sku || pid}` };
    }

    // New model: same main stock id → restore onhand via balances (full or partial)
    if (isMainStockMemoLine && !pdata.outward_parent) {
      const bal = await stockMovement.applyOutwardQty(
        query,
        pid,
        returnAction,
        retPcs,
        retCarat
      );
      if (itemForProduct && returnedItemIds.has(String(itemForProduct.id))) {
        const leftPcs = Math.max(0, stockPcs - retPcs);
        const leftCarat = Math.max(0, stockCarat - retCarat);
        if (leftCarat <= 0.0001 && (stockPcs <= 0 || leftPcs <= 0)) {
          await query("UPDATE dai_outward_item SET status = 'returned' WHERE id = ?", [itemForProduct.id]);
        } else {
          await query(
            "UPDATE dai_outward_item SET pcs = ?, carat = ?, amount = ? WHERE id = ?",
            [leftPcs, leftCarat, Number((leftCarat * Number(itemForProduct.price || pdata.price)).toFixed(2)), itemForProduct.id]
          );
        }
      } else {
        await stockMovement.markOutwardItemReturned(query, post.id, pid, retPcs, retCarat);
      }
      const leftPcs = Math.max(0, stockPcs - retPcs);
      const leftCarat = Math.max(0, stockCarat - retCarat);
      const hasLeftover =
        leftCarat > 0.0001 || (stockPcs > 0 && leftPcs > 0.0001);
      // Partial leftover: keep classic memo/consign/sale flag if it was set; blank stays blank
      const priorOut = String(pdata.outward || "").toLowerCase();
      const nextOut =
        priorOut === "memo" || priorOut === "consign" || priorOut === "sale" || priorOut === "export" ? priorOut : "";
      if (hasLeftover) {
        await query(
          "UPDATE dai_product SET outward=?, site_upload=0, rapnet_upload=0 WHERE id = ?",
          [nextOut, pid]
        );
        mp.push(pid);
      } else {
        await query(
          "UPDATE dai_product SET outward='', site_upload=0, rapnet_upload=0 WHERE id = ?",
          [pid]
        );
        returnProduct.push(pid);
      }
      const unitPrice = Number(pdata.sell_price || pdata.price) || 0;
      const retAmount = Number((unitPrice * retCarat).toFixed(2));
      const retPcsLabel = Number(retPcs) || 0;
      const retCaratLabel = Number(retCarat.toFixed(3));
      const memoPcsLabel = Number(stockPcs) || 0;
      const memoCaratLabel = Number(Number(stockCarat).toFixed(3));
      await addHistoryAudited({
        product_id: pid,
        action: returnAction,
        party: mdata.party,
        narretion: mdata.narretion,
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: isExport
          ? "EXPORT CLOSING / DELETING"
          : (hasLeftover
            ? `Stone ${returnTypeLabel} return ${retPcsLabel}pcs / ${retCaratLabel}ct of ${returnTypeLabel.toLowerCase()} ${memoPcsLabel}pcs / ${memoCaratLabel}ct — ref ${mdata.reference || mdata.invoiceno || ""}`
            : `Stone ${returnTypeLabel} return ${retPcsLabel}pcs / ${retCaratLabel}ct (full) — ref ${mdata.reference || mdata.invoiceno || ""}`),
        pcs: retPcs,
        carat: retCarat,
        amount: retAmount,
        price: unitPrice,
        sku: pdata.sku,
        type: "cr",
        invoice: mdata.invoiceno,
        entry_from: "outward",
        entryno: mdata.id,
        balance_pcs: bal.onhand_pcs,
        balance_carat: bal.onhand_carat,
      });
      continue;
    }

    const isPartial = retCarat < stockCarat - 0.0001;

    if (pdata.outward_parent) {
      const edata = await getProductDetail(pdata.outward_parent);
      if (edata) {
        const addPcs = pdata.group_type === "box" || edata.group_type === "box" ? retPcs : 0;
        const parentPcs =
          edata.group_type === "box"
            ? parseFloat(edata.polish_pcs) + addPcs
            : parseFloat(edata.polish_pcs);
        const parentCarat = parseFloat(edata.polish_carat) + retCarat;
        const parentPrice = Number(edata.price) || 0;
        const parentAmount = Number((parentCarat * parentPrice).toFixed(2));
        await query("UPDATE dai_product SET polish_pcs=?, polish_carat=?, amount=? WHERE id = ?", [
          parentPcs,
          parentCarat,
          parentAmount,
          edata.id,
        ]);
        const unitPrice = Number(pdata.sell_price || pdata.price) || 0;
        const retAmount = Number((unitPrice * retCarat).toFixed(2));
        const retPcsLabel = Number(retPcs) || 0;
        const retCaratLabel = Number(Number(retCarat).toFixed(3));
        const memoPcsLabel = Number(stockPcs) || 0;
        const memoCaratLabel = Number(Number(stockCarat).toFixed(3));
        await addHistoryAudited({
          product_id: edata.id,
          action: returnAction,
          party: mdata.party,
          narretion: mdata.narretion,
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
          description: isExport
            ? "EXPORT CLOSING / DELETING"
            : (isPartial
              ? `Stone ${returnTypeLabel} return ${retPcsLabel}pcs / ${retCaratLabel}ct of ${returnTypeLabel.toLowerCase()} ${memoPcsLabel}pcs / ${memoCaratLabel}ct — ref ${mdata.reference || mdata.invoiceno || ""}`
              : `Stone ${returnTypeLabel} return ${retPcsLabel}pcs / ${retCaratLabel}ct (full) — ref ${mdata.reference || mdata.invoiceno || ""}`),
          pcs: retPcs,
          carat: retCarat,
          amount: retAmount,
          price: unitPrice,
          sku: edata.sku,
          type: "cr",
          invoice: mdata.invoiceno,
          entry_from: "outward",
          entryno: mdata.id,
          balance_pcs: parentPcs,
          balance_carat: parentCarat,
        });
      }

      if (isPartial) {
        const leftPcs = Math.max(0, stockPcs - retPcs);
        const leftCarat = Math.max(0, stockCarat - retCarat);
        const leftPrice = Number(pdata.sell_price || pdata.price) || 0;
        await query(
          "UPDATE dai_product SET polish_pcs=?, polish_carat=?, sell_amount=?, amount=? WHERE id = ?",
          [leftPcs, leftCarat, Number((leftCarat * leftPrice).toFixed(2)), Number((leftCarat * (Number(pdata.price) || leftPrice)).toFixed(2)), pid]
        );
        mp.push(pid);
      } else {
        await query("UPDATE dai_product SET outward='', visibility=0, outward_parent=0 WHERE id = ?", [pid]);
        returnProduct.push(pid);
      }
    } else if (isPartial) {
      return {
        ok: false,
        message: `Partial return for SKU ${pdata.sku || pid} is only supported for box/parcel splits. Return full carat or split first.`,
      };
    } else {
      await query("UPDATE dai_product SET outward='', site_upload=0, rapnet_upload=0 WHERE outward IN ('memo','consign','sale','export') AND id = ?", [pid]);
      const unitPrice = Number(pdata.sell_price || pdata.price) || 0;
      const retAmount = Number((unitPrice * retCarat).toFixed(2));
      const retPcsLabel = Number(retPcs) || 0;
      const retCaratLabel = Number(Number(retCarat).toFixed(3));
      await addHistoryAudited({
        product_id: pid,
        action: returnAction,
        party: mdata.party,
        narretion: mdata.narretion,
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: isExport
          ? "EXPORT CLOSING / DELETING"
          : `Stone ${returnTypeLabel} return ${retPcsLabel}pcs / ${retCaratLabel}ct (full) — ref ${mdata.reference || mdata.invoiceno || ""}`,
        pcs: retPcs,
        carat: retCarat,
        amount: retAmount,
        price: unitPrice,
        sku: pdata.sku,
        type: "cr",
        invoice: mdata.invoiceno,
        entry_from: "outward",
        entryno: mdata.id,
        balance_pcs: pdata.polish_pcs,
        balance_carat: pdata.polish_carat,
      });
      returnProduct.push(pid);
    }
  }

  const stillActive = await query(
    `SELECT DISTINCT product_id FROM dai_outward_item
     WHERE outward_id = ? AND (status IS NULL OR status NOT IN ('returned','cancelled'))`,
    [post.id]
  );
  if (stillActive.length > 0) {
    mp = [...new Set(stillActive.map((r) => String(r.product_id)))];
  }

  // Recalculate remaining final amount on outward memo header
  let remainingFinalAmount = 0;
  if (mp.length > 0) {
    try {
      const itemAmtRows = await query(
        `SELECT SUM(COALESCE(amount, 0)) AS total_amount FROM dai_outward_item
         WHERE outward_id = ? AND (status IS NULL OR status NOT IN ('returned','cancelled'))`,
        [post.id]
      );
      const itemTotal = Number(itemAmtRows?.[0]?.total_amount);
      if (Number.isFinite(itemTotal) && itemTotal > 0) {
        remainingFinalAmount = itemTotal;
      } else {
        const placeholders = mp.map(() => "?").join(",");
        const remainingRows = await query(
          `SELECT SUM(COALESCE(sell_amount, amount, 0)) AS total_amount FROM dai_product WHERE id IN (${placeholders})`,
          mp
        );
        remainingFinalAmount = Number(remainingRows?.[0]?.total_amount || 0);
      }
    } catch (_) {}
  }

  returnProduct = [...new Set(returnProduct)];
  if (!mp.length) {
    const closeStatus = isSaleVoucher
      ? (outwardType === "export" ? "close_export" : (outwardType === "inter_transfer" || outwardType === "transfer" ? "returned" : "close_sale"))
      : "close_memo";
    await query(
      "UPDATE dai_outward SET products='', status=?, return_products=?, final_amount=0, due_amount=0 WHERE id = ?",
      [closeStatus, returnProduct.join(","), post.id]
    );
  } else {
    const paidAmount = Number(mdata.paid_amount || 0);
    const dueAmount = Math.max(0, remainingFinalAmount - paidAmount);
    await query(
      "UPDATE dai_outward SET products=?, return_products=?, final_amount=?, due_amount=? WHERE id = ?",
      [mp.join(","), returnProduct.join(","), remainingFinalAmount, dueAmount, post.id]
    );
  }
  return { ok: true, message: isSaleVoucher ? "Sale return completed" : "Out memo return completed" };
}

async function outwardMemoToSale(post, userContext = {}) {
  const memoId = post.memo_id || post.id;
  const operatingCompanyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;
  const lookupCompanyIds = await resolveListCompanyIds(userContext, DEFAULT_COMPANY_ID);
  const companyPlaceholders = lookupCompanyIds.map(() => "?").join(",") || "?";
  const companyParams = lookupCompanyIds.length ? lookupCompanyIds : [DEFAULT_COMPANY_ID];

  return helper.runInTransaction(async (q) => {
    // Memo may be under sibling company in same branch — do not require exact operating company match
    let memoRows = await q(
      `SELECT * FROM dai_outward WHERE id = ? AND company IN (${companyPlaceholders})`,
      [memoId, ...companyParams]
    );
    if (!memoRows.length) {
      memoRows = await q("SELECT * FROM dai_outward WHERE id = ?", [memoId]);
    }
    const mdata = memoRows[0] || null;
    if (!mdata) throw new Error("Memo not found");

    const memoCompanyId = Number(mdata.company) || operatingCompanyId;
    // Sale invoice uses selected operating company; stock updates use product/memo company
    const companyId = Number(operatingCompanyId) || memoCompanyId;

    // Unique product ids only — duplicate JOIN rows in UI used to sell same stone 3× (5+5+5=15)
    const products = [...new Set((post.products || []).map(String).filter(Boolean))];
    const record = post.record || {};
    const type = post.type || "sale";

    if (type === "sale") {
      if (!post.shipping_name || String(post.shipping_name).trim() === "") {
        throw new Error("Shipping is required");
      }
      if (!post.origin_of || String(post.origin_of).trim() === "") {
        throw new Error("Origin is required");
      }
    }

    // Sequence: lock counter + never reuse numbers already on dai_outward (fixes stuck #1)
    let seqRows = await q(
      "SELECT outward, invoice FROM dai_incrementid WHERE company = ? FOR UPDATE",
      [companyId]
    );
    if (!seqRows.length) {
      try {
        await q(
          "INSERT INTO dai_incrementid (company, outward, invoice, reference) VALUES (?, '1', '1', '1')",
          [companyId]
        );
      } catch (_) {
        /* may need more columns on some DBs */
      }
      seqRows = await q(
        "SELECT outward, invoice FROM dai_incrementid WHERE company = ? FOR UPDATE",
        [companyId]
      );
    }
    const existingOut = await q(
      "SELECT entryno, invoiceno, type FROM dai_outward WHERE company = ? OR company = ?",
      [companyId, String(companyId)]
    );
    const tLower = String(type || "sale").toLowerCase();
    const invGroup = tLower === "export" ? ["sale", "export"] : ["sale", "export"];
    let maxEntry = 0;
    let maxInvoice = 0;
    let maxEntryAll = 0;
    let maxInvoiceAll = 0;
    for (const r of existingOut || []) {
      const rt = String(r.type || "").toLowerCase();
      const e = extractSeqNumber(r.entryno);
      const i = extractSeqNumber(r.invoiceno);
      if (e > maxEntryAll) maxEntryAll = e;
      if (i > maxInvoiceAll) maxInvoiceAll = i;
      if (rt === tLower && e > maxEntry) maxEntry = e;
      if (invGroup.includes(rt) && i > maxInvoice) maxInvoice = i;
    }
    const entrySeq = maxEntry + 1;
    const invoiceSeq = maxInvoice + 1;

    let compPrefix = "INV-";
    try {
      const compRows = await q(
        "SELECT invoice_prefix, memo_prefix FROM company WHERE id = ? LIMIT 1",
        [companyId]
      );
      if (compRows?.[0]?.invoice_prefix) {
        compPrefix = compRows[0].invoice_prefix;
      }
    } catch (_) { }

    const incre_id = formatOutwardEntryNo(type, entrySeq);
    const invoice = formatOutwardInvoiceNo(type, invoiceSeq, compPrefix);
    const nextOutward = String(Math.max(maxEntryAll, entrySeq) + 1);
    const nextInvoice = String(Math.max(maxInvoiceAll, invoiceSeq) + 1);

    const outProducts = [];
    const soldSkus = [];
    const saleLineItems = [];
    /** Product ids still on this memo after sale (partial qty or not selected). */
    const remainingOnMemo = [];
    let amount = 0;

    await stockMovement.ensureStockItemSchema(q);
    const memoItems = await stockMovement.getOutwardItems(q, memoId);

    for (const rawId of products) {
      const itemMatch = memoItems.find((it) => String(it.id) === String(rawId));
      const pid = itemMatch ? itemMatch.product_id : rawId;

      let prodRows = await q(
        `SELECT * FROM dai_product WHERE id = ? AND company IN (${companyPlaceholders})`,
        [pid, ...companyParams]
      );
      if (!prodRows.length) {
        prodRows = await q("SELECT * FROM dai_product WHERE id = ?", [pid]);
      }
      const pdata = prodRows[0] || null;
      if (!pdata) continue;
      const productCompanyId = Number(pdata.company) || memoCompanyId || companyId;
      soldSkus.push(pdata.sku);

      const itemsForProduct = itemMatch
        ? [itemMatch]
        : memoItems.filter((it) => String(it.product_id) === String(pid));
      const onClassicMemo = pdata.outward === "memo" || pdata.outward === "consign";
      const onMainStockMemo =
        itemsForProduct.length > 0 || Number(pdata.memo_carat) > 0 || Number(pdata.memo_pcs) > 0;

      if (!onClassicMemo && !onMainStockMemo) {
        throw new Error(
          `Stone ${pdata.sku || pid} is not on active memo (already sold or returned), please refresh`
        );
      }

      // Ceiling = THIS memo voucher line qty only — never product onhand/polish total
      const itemPcsSum = itemsForProduct.reduce((s, it) => s + (Number(it.pcs) || 0), 0);
      const itemCaratSum = itemsForProduct.reduce((s, it) => s + (Number(it.carat) || 0), 0);
      const memoPcs =
        itemsForProduct.length > 0 ? itemPcsSum : Number(pdata.memo_pcs) || 0;
      const memoCarat =
        itemsForProduct.length > 0 ? itemCaratSum : Number(pdata.memo_carat) || 0;

      const rec =
        record[rawId] ||
        record[String(rawId)] ||
        record[pid] ||
        record[String(pid)] ||
        {};
      const sellPcs =
        rec.polish_pcs != null && rec.polish_pcs !== "" ? Number(rec.polish_pcs) : memoPcs;
      const sellCarat =
        rec.polish_carat != null && rec.polish_carat !== ""
          ? Number(rec.polish_carat)
          : memoCarat;
      if (sellPcs <= 0 && sellCarat <= 0) {
        throw new Error(
          `Enter pcs/carat for SKU ${pdata.sku || pid} (memo qty missing — do not use remaining stock)`
        );
      }
      const sellPrice =
        Number(rec.price != null && rec.price !== "" ? rec.price : itemMatch?.price || pdata.sell_price || pdata.price) ||
        0;

      if (sellCarat <= 0) {
        throw new Error(`Enter carat for SKU ${pdata.sku || pid}`);
      }
      if (memoPcs > 0 && sellPcs > memoPcs + 0.0001) {
        throw new Error(
          `Pcs exceed memo qty for SKU ${pdata.sku || pid} (selling ${sellPcs}, memo has ${memoPcs})`
        );
      }
      if (sellCarat > memoCarat + 0.0001) {
        throw new Error(
          `Carat exceed memo qty for SKU ${pdata.sku || pid} (selling ${sellCarat}, memo has ${memoCarat})`
        );
      }
      // Selling all memo pcs must also take all memo carat (avoids orphan memo carat with 0 pcs)
      if (memoPcs > 0 && Math.abs(sellPcs - memoPcs) <= 0.0001 && sellCarat + 0.0001 < memoCarat) {
        throw new Error(
          `Sell full memo carat for SKU ${pdata.sku || pid}: memo is ${memoPcs} pcs / ${memoCarat} ct, selling ${sellPcs} pcs / ${sellCarat} ct`
        );
      }
      if (memoCarat > 0 && Math.abs(sellCarat - memoCarat) <= 0.0001 && memoPcs > 0 && sellPcs + 0.0001 < memoPcs) {
        throw new Error(
          `Sell full memo pcs for SKU ${pdata.sku || pid}: memo is ${memoPcs} pcs / ${memoCarat} ct, selling ${sellPcs} pcs / ${sellCarat} ct`
        );
      }

      const sellAmount = Number((sellPrice * sellCarat).toFixed(2));
      amount += sellAmount;
      outProducts.push(pid);

      const leftCarat = memoCarat - sellCarat;
      const leftPcs = Math.max(0, memoPcs - sellPcs);
      const hasLeftover = leftCarat > 0.0001 || (memoPcs > 0 && leftPcs > 0.0001);

      const useBalanceLedger =
        itemsForProduct.length > 0 || Number(pdata.memo_carat) > 0 || Number(pdata.memo_pcs) > 0;

      let bal = {
        onhand_pcs: Number(pdata.onhand_pcs ?? pdata.polish_pcs) || 0,
        onhand_carat: Number(pdata.onhand_carat ?? pdata.polish_carat) || 0,
      };

      if (useBalanceLedger) {
        bal = await stockMovement.applyOutwardQty(q, pid, type, sellPcs, sellCarat);
        if (itemMatch) {
          const itemPcs = Number(itemMatch.pcs) || 0;
          const itemCarat = Number(itemMatch.carat) || 0;
          const leftItemPcs = Math.max(0, itemPcs - sellPcs);
          const leftItemCarat = Math.max(0, itemCarat - sellCarat);
          if (leftItemCarat <= 0.0001 && (itemPcs <= 0 || leftItemPcs <= 0)) {
            await q("UPDATE dai_outward_item SET status = 'returned' WHERE id = ?", [itemMatch.id]);
          } else {
            await q(
              "UPDATE dai_outward_item SET pcs = ?, carat = ?, amount = ? WHERE id = ?",
              [leftItemPcs, leftItemCarat, Number((leftItemCarat * Number(itemMatch.price || sellPrice)).toFixed(2)), itemMatch.id]
            );
            remainingOnMemo.push(String(pid));
          }
        } else {
          await stockMovement.markOutwardItemReturned(q, memoId, pid, sellPcs, sellCarat);
          if (hasLeftover) {
            remainingOnMemo.push(String(pid));
          }
        }
        if (hasLeftover) {
          await q(
            "UPDATE dai_product SET sell_price=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id = ? AND company = ?",
            [sellPrice, sellAmount, pid, productCompanyId]
          );
        } else {
          // Memo line fully sold — only mark whole row sold when no onhand left
          const stillOnhand =
            (Number(bal.onhand_carat) || 0) > 0.0001 || (Number(bal.onhand_pcs) || 0) > 0.0001;
          if (stillOnhand) {
            await q(
              "UPDATE dai_product SET outward='', sell_price=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id = ? AND company = ?",
              [sellPrice, sellAmount, pid, productCompanyId]
            );
          } else {
            await q(
              "UPDATE dai_product SET outward=?, sell_price=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id = ? AND company = ?",
              [type, sellPrice, sellAmount, pid, productCompanyId]
            );
          }
        }
      } else if (hasLeftover) {
        // Classic flag model has no memo_* ledger — partial qty not supported (same as return)
        throw new Error(
          `Partial sale for SKU ${pdata.sku || pid} requires main-stock memo balances. Sell full memo qty.`
        );
      } else {
        const updateResult = await q(
          "UPDATE dai_product SET outward=?, sell_price=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id = ? AND company = ? AND (outward = 'memo' OR outward = 'consign')",
          [type, sellPrice, sellAmount, pid, productCompanyId]
        );
        if (updateResult.affectedRows === 0) {
          throw new Error(
            `Stone ${pdata.sku || pid} is not on active memo (already sold or returned), please refresh`
          );
        }
      }

      saleLineItems.push({
        productId: pid,
        sku: pdata.sku,
        pcs: sellPcs,
        carat: sellCarat,
        price: sellPrice,
        amount: sellAmount,
        balance_pcs: bal.onhand_pcs,
        balance_carat: bal.onhand_carat,
      });

      const histPayload = {
        product_id: pid,
        action: type,
        party: post.party || mdata.party,
        date: moment().format("YYYY-MM-DD HH:mm:ss"),
        description: `Stone ${type} FROM MEMO${mdata.invoiceno ? ` #${mdata.invoiceno}` : ''} — SKU ${pdata.sku}`,
        pcs: sellPcs,
        carat: sellCarat,
        balance_pcs: bal.onhand_pcs,
        balance_carat: bal.onhand_carat,
        amount: sellAmount,
        price: sellPrice,
        sku: pdata.sku,
        type: "dr",
        invoice: invoice,
        entry_from: "outward",
        user: userId,
      };
      if (histPayload.description) histPayload.description = histPayload.description.toUpperCase();
      const hData = insertString(histPayload);
      await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);
    }

    const shippingCharge = Number(post.shipping_charge) || 0;
    let finalAmount = Number(post.final_amount);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      finalAmount = amount + shippingCharge;
    }
    const paidAmount = post.on_payment ? Number(post.paid_amount) || 0 : 0;
    const dueAmount =
      post.due_amount != null && post.due_amount !== ""
        ? Number(post.due_amount)
        : Math.max(0, finalAmount - paidAmount);

    const salePostRaw = {
      company: companyId,
      user: userId,
      entryno: incre_id,
      // Always new sale invoice from sequence — do NOT reuse memo invoice (was duplicating "1")
      invoiceno: String(invoice),
      type,
      status: type === "export" ? "on_export" : "on_sale",
      party: post.party || mdata.party,
      reference:
        post.reference != null && String(post.reference).trim() !== ""
          ? post.reference
          : mdata.reference ||
          (mdata.invoiceno != null && String(mdata.invoiceno).trim() !== ""
            ? `Memo ${mdata.invoiceno}`
            : ""),
      date: post.date || moment().format("YYYY-MM-DD"),
      invoicedate: post.invoicedate || post.date || moment().format("YYYY-MM-DD"),
      terms: post.terms != null ? post.terms : mdata.terms || "",
      duedate: post.duedate || null,
      products: outProducts.join(","),
      narretion: post.narretion || "",
      shipping_name: post.shipping_name || "",
      origin_of: post.origin_of || "",
      shipping_charge: shippingCharge,
      less_percent: Number(post.less_percent) || 0,
      less_amount: Number(post.less_amount) || 0,
      other_less_percent: Number(post.other_less_percent) || 0,
      other_less_amount: Number(post.other_less_amount) || 0,
      charge: Number(post.charge) || 0,
      paid_amount: paidAmount,
      final_amount: finalAmount,
      due_amount: dueAmount,
    };
    // Only insert columns present on dai_outward (memo row = SELECT *)
    const knownCols = new Set(Object.keys(mdata || {}));
    const salePost = {};
    for (const [k, v] of Object.entries(salePostRaw)) {
      if (knownCols.has(k)) salePost[k] = v;
    }
    const data = insertString(salePost);
    const result = await q(`INSERT INTO dai_outward (${data[0]}) VALUES (${data[1]})`);
    const newOutwardId = result.insertId;

    for (const line of saleLineItems) {
      await stockMovement.insertOutwardItem(q, {
        company: companyId,
        outward_id: newOutwardId,
        product_id: line.productId,
        sku: line.sku,
        party: post.party || mdata.party || "",
        outward_type: type,
        pcs: line.pcs,
        carat: line.carat,
        price: line.price,
        amount: line.amount,
        balance_pcs: line.balance_pcs,
        balance_carat: line.balance_carat,
        entry_date: salePost.invoicedate || moment().format("YYYY-MM-DD"),
        invoice_no: salePost.invoiceno || String(invoice),
        reference: salePost.reference || "",
        narretion: salePost.narretion || "",
        status: salePost.status || "on_sale",
        user: userId,
      });
    }

    // Mirror returnOutwardMemo: keep partial leftovers on memo; close when empty
    const stillActiveItems = await q(
      `SELECT DISTINCT product_id FROM dai_outward_item
       WHERE outward_id = ? AND (status IS NULL OR status NOT IN ('returned','cancelled'))`,
      [memoId]
    );
    let mp = [];
    if (stillActiveItems.length > 0) {
      mp = [...new Set(stillActiveItems.map((r) => String(r.product_id)))];
    } else {
      const soldSet = new Set(products.map(String));
      const leftoverSet = new Set(remainingOnMemo.map(String));
      mp = [
        ...new Set(
          (mdata.products || "")
            .split(",")
            .map((id) => String(id).trim())
            .filter(Boolean)
            .filter((id) => {
              if (!soldSet.has(id)) return true;
              return leftoverSet.has(id);
            })
        ),
      ];
    }

    let remainingFinalAmount = 0;
    if (mp.length > 0) {
      try {
        const itemAmtRows = await q(
          `SELECT SUM(COALESCE(amount, 0)) AS total_amount FROM dai_outward_item
           WHERE outward_id = ? AND (status IS NULL OR status NOT IN ('returned','cancelled'))`,
          [memoId]
        );
        const itemTotal = Number(itemAmtRows?.[0]?.total_amount);
        if (Number.isFinite(itemTotal) && itemTotal > 0) {
          remainingFinalAmount = itemTotal;
        } else {
          const placeholders = mp.map(() => "?").join(",");
          const remainingRows = await q(
            `SELECT SUM(COALESCE(sell_amount, amount, 0)) AS total_amount FROM dai_product WHERE id IN (${placeholders})`,
            mp
          );
          remainingFinalAmount = Number(remainingRows?.[0]?.total_amount || 0);
        }
      } catch (_) {
        /* dai_outward_item may be absent on older DBs */
      }
    }

    if (!mp.length) {
      await q(
        "UPDATE dai_outward SET products='', status='close_memo', final_amount=0, due_amount=0 WHERE id = ?",
        [memoId]
      );
    } else {
      const memoPaidAmount = Number(mdata.paid_amount || 0);
      const memoDueAmount = Math.max(0, remainingFinalAmount - memoPaidAmount);
      await q(
        "UPDATE dai_outward SET products=?, final_amount=?, due_amount=? WHERE id = ?",
        [mp.join(","), remainingFinalAmount, memoDueAmount, memoId]
      );
    }

    // Persist company increment sequence
    await q("UPDATE dai_incrementid SET outward = ?, invoice = ? WHERE company = ?", [nextOutward, nextInvoice, companyId]);

    try {
      await logAuditInTx(q, {
        actionType: "STOCK_OUT",
        moduleName: "Sale",
        recordId: newOutwardId,
        recordReference: String(invoice),
        newValue: {
          ...salePost,
          id: newOutwardId,
          skus: soldSkus,
          memo_id: memoId,
        },
        description: `Memo converted to sale — invoice ${invoice}, SKUs: ${soldSkus.join(", ")}`,
        companyId,
      });
    } catch (auditErr) {
      console.error("outwardMemoToSale audit:", auditErr);
    }

    return { ok: true, message: "Memo converted to sale", id: newOutwardId };
  });
}

async function inwardMemoToPurchase(post, userContext = {}) {
  const memoId = post.memo_id || post.id;
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || helper.DEFAULT_USER_ID;

  return helper.runInTransaction(async (q) => {
    const memoRows = await q("SELECT * FROM dai_inward WHERE id = ? AND company = ?", [memoId, companyId]);
    const memoData = memoRows[0] || null;
    if (!memoData) throw new Error("In memo not found");

    const products = (post.products || []).map(String);
    const record = post.record || {};

    const seqRows = await q("SELECT inward, reference FROM dai_incrementid WHERE company = ? FOR UPDATE", [companyId]);
    let curInward = seqRows?.[0]?.inward;
    let curRef = seqRows?.[0]?.reference;
    if (curInward == null || curRef == null) {
      curInward = (await getIncrementEntry("inward", companyId)) || 1;
      curRef = (await getIncrementEntry("reference", companyId)) || 1;
    }
    const incre_id = curInward;
    const reference = curRef;
    const nextInward = advanceSequenceValue(curInward);
    const nextRef = advanceSequenceValue(curRef);

    const outProducts = [];
    let iTotal = 0;
    let iCarat = 0;
    let iPcs = 0;

    for (const pid of products) {
      const prodRows = await q("SELECT * FROM dai_product WHERE id = ?", [pid]);
      const pdata = prodRows[0] || null;
      if (!pdata) continue;
      const rec = record[pid] || record[String(pid)] || { price: pdata.price };
      const price = rec.price || pdata.price;
      const amount = parseFloat(pdata.polish_carat) * parseFloat(price);
      iTotal += amount;
      iCarat += parseFloat(pdata.polish_carat);
      iPcs += parseFloat(pdata.polish_pcs || 0);
      outProducts.push(pid);

      await q(
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
    const result = await q(`INSERT INTO dai_inward (${data[0]}) VALUES (${data[1]})`);
    const newId = result.insertId;

    for (const pid of outProducts) {
      await q("UPDATE dai_product SET inward_id=? WHERE id = ?", [newId, pid]);
      const prodRows = await q("SELECT * FROM dai_product WHERE id = ?", [pid]);
      const pdata = prodRows[0] || null;
      if (!pdata) continue;
      const rec = record[pid] || record[String(pid)] || {};
      const price = rec.price || pdata.price;
      const amount = parseFloat(pdata.polish_carat) * parseFloat(price);

      const histPayload = {
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
      };
      if (histPayload.description) histPayload.description = histPayload.description.toUpperCase();
      const hData = insertString(histPayload);
      await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);
    }

    const remaining = (memoData.products || "")
      .split(",")
      .filter((id) => id && !products.map(String).includes(String(id)));
    await q("UPDATE dai_inward SET products=? WHERE id = ?", [remaining.join(","), memoId]);

    // Persist company increment sequence
    await q("UPDATE dai_incrementid SET inward = ?, reference = ? WHERE company = ?", [nextInward, nextRef, companyId]);

    try {
      await logAuditInTx(q, {
        actionType: "STOCK_IN",
        moduleName: "Inward Stock",
        recordId: newId,
        recordReference: String(purchasePost.invoiceno || reference || newId),
        newValue: { ...purchasePost, id: newId },
        companyId,
      });
    } catch (auditErr) {
      console.error("inwardMemoToPurchase audit:", auditErr);
    }

    return { ok: true, message: "Memo converted to purchase", id: newId };
  });
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

  // Export / Consign modal saves shipping / origin / charge / CIF / narration
  await query(
    `UPDATE dai_outward
     SET type=?, status=?,
         shipping_name=?, origin_of=?, shipping_charge=?, cif=?, narretion=?
     WHERE id = ?`,
    [
      newType,
      newStatus,
      post.shipping_name != null ? String(post.shipping_name) : (oData.shipping_name || ""),
      post.origin_of != null ? String(post.origin_of) : (oData.origin_of || ""),
      post.shipping_charge != null ? Number(post.shipping_charge) || 0 : (Number(oData.shipping_charge) || 0),
      post.cif != null ? String(post.cif) : (oData.cif || ""),
      post.narretion != null ? String(post.narretion) : (oData.narretion || ""),
      post.id,
    ],
  );

  return { ok: true, message: `Converted to ${newType}` };
}

async function deleteInwardStock(id) {
  const inData = await getInwardData(id);
  if (!inData) return { ok: false, message: "Inward record not found" };

  const products = (inData.products || "").split(",").map((s) => s.trim()).filter(Boolean);
  const returnProducts = (inData.return_products || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allProductIds = [...new Set([...products, ...returnProducts])];

  // 1. Check if any accounting payments / transactions exist for this inward
  const companyId = inData.company || DEFAULT_COMPANY_ID;
  const paymentRows = await query(
    `SELECT id FROM acc_transaction WHERE purchase_id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL) LIMIT 1`,
    [String(id), companyId]
  );
  const hasPaidAmount = Number(inData.paid_amount || 0) > 0;
  if ((paymentRows && paymentRows.length > 0) || hasPaidAmount) {
    return {
      ok: false,
      message: `Cannot delete Inward #${inData.invoiceno || inData.entryno || id}: Payment transactions are already recorded against this bill.`,
    };
  }

  // 2. Inspect active lifecycle status of all items
  const blockingReasons = [];
  if (allProductIds.length > 0) {
    const placeholders = allProductIds.map(() => "?").join(",");
    const productRows = await query(
      `SELECT id, sku, outward, outward_parent, child_count, box_id, parcel_id, parent_id, visibility 
       FROM dai_product 
       WHERE id IN (${placeholders})`,
      allProductIds
    );

    for (const prod of productRows) {
      const outwardStatus = String(prod.outward || "").trim();
      if (outwardStatus && outwardStatus !== "") {
        blockingReasons.push(`SKU ${prod.sku || prod.id} is currently on ${outwardStatus}`);
      } else if (Number(prod.child_count) > 0) {
        blockingReasons.push(`SKU ${prod.sku || prod.id} has split child stones`);
      } else if (prod.box_id || prod.parcel_id || (prod.parent_id && Number(prod.parent_id) > 0)) {
        blockingReasons.push(`SKU ${prod.sku || prod.id} is assigned to a container / parent`);
      }
    }
  }

  if (blockingReasons.length > 0) {
    return {
      ok: false,
      message: `Cannot delete Inward #${inData.invoiceno || inData.entryno || id}: ${blockingReasons.slice(0, 3).join("; ")}${blockingReasons.length > 3 ? ` and ${blockingReasons.length - 3} more items` : ""}.`,
    };
  }

  // 3. Atomically delete unreferenced inward stock inside transaction
  return helper.runInTransaction(async (q) => {
    for (const pid of allProductIds) {
      await q("DELETE FROM dai_product_value WHERE product_id = ?", [pid]);
      await q("DELETE FROM dai_history WHERE product_id = ?", [pid]);
      await q("DELETE FROM dai_product WHERE id = ?", [pid]);
    }
    await q("UPDATE dai_inward SET deleted = 1 WHERE id = ?", [id]);

    try {
      await logAudit({
        actionType: "DELETE",
        moduleName: "Inward Stock",
        recordId: id,
        recordReference: inData.invoiceno || String(id),
        oldValue: inData,
        companyId: inData.company,
      });
    } catch (e) {
      console.error("deleteInwardStock audit:", e);
    }

    return { ok: true, message: "Inward record deleted and stock removed successfully" };
  });
}

async function deleteGia(id, companyId = null) {
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
}

async function deleteOutwardStock(id, options = {}) {
  const moduleName = options.moduleName || "Outward Stock";
  const companyId = options.companyId || null;
  const result = await helper.runInTransaction(async (q) => {
    const oRows = companyId
      ? await q("SELECT * FROM dai_outward WHERE id = ? AND company = ?", [id, companyId])
      : await q("SELECT * FROM dai_outward WHERE id = ?", [id]);
    const oData = oRows[0] || null;
    if (!oData) return { ok: false, message: "Outward record not found or access denied" };

    const productIds = (oData.products || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const pid of productIds) {
      const pRows = await q("SELECT * FROM dai_product WHERE id = ?", [pid]);
      const pdata = pRows[0] || null;
      if (!pdata) continue;

      // Handle split/child products from Box/Parcel (created via separateSale)
      if (pdata.outward_parent) {
        const parentRows = await q("SELECT * FROM dai_product WHERE id = ?", [pdata.outward_parent]);
        const parentData = parentRows[0] || null;
        if (parentData) {
          const childPcs = Number(pdata.polish_pcs) || 0;
          const childCarat = Number(pdata.polish_carat) || 0;
          const parentPcs =
            parentData.group_type === "box"
              ? (Number(parentData.polish_pcs) || 0) + childPcs
              : Number(parentData.polish_pcs) || 0;
          const parentCarat = (Number(parentData.polish_carat) || 0) + childCarat;
          const parentPrice = Number(parentData.price) || 0;
          const parentAmount = Number((parentCarat * parentPrice).toFixed(2));

          await q(
            "UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, amount = ? WHERE id = ?",
            [parentPcs, parentCarat, parentAmount, parentData.id]
          );

          try {
            const histPayload = {
              product_id: parentData.id,
              action: "outward_cancel",
              party: oData.party || "",
              narretion: oData.narretion || "",
              date: moment().format("YYYY-MM-DD HH:mm:ss"),
              description: `Outward cancelled: Restored ${childCarat} cts / ${childPcs} pcs from split child SKU ${pdata.sku}`,
              pcs: childPcs,
              carat: childCarat,
              amount: parentAmount,
              price: parentPrice,
              sku: parentData.sku,
              type: "cr",
              invoice: oData.invoiceno || "",
              entry_from: "outward",
              entryno: id,
              balance_pcs: parentPcs,
              balance_carat: parentCarat,
              user: oData.user || options.userId || helper.DEFAULT_USER_ID,
            };
            const hData = helper.insertString(histPayload);
            await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);
          } catch (histErr) {
            console.error("deleteOutwardStock parent history error:", histErr);
          }
        }
        // Deactivate the split child product so it doesn't remain as standalone stock
        await q(
          "UPDATE dai_product SET outward = '', visibility = 0, outward_parent = 0, site_upload = 0, rapnet_upload = 0 WHERE id = ?",
          [pid]
        );
        const isExport = oData.type === "export";
        const isSale = oData.type === "sale";
        const histAction = isExport ? "export_close" : (isSale ? "sale_close" : "outward_cancel");
        const histDesc = isExport
          ? "EXPORT CLOSING / DELETING"
          : (isSale
            ? "sale Closing / deleting"
            : `Outward ${oData.type || ""} cancelled: Restored to inventory`);

        if ((isExport || isSale) && (Number(pdata.sold_carat) > 0 || Number(pdata.sold_pcs) > 0)) {
          try {
            await stockMovement.applyOutwardQty(
              q,
              pid,
              isExport ? "export_close" : "sale_return",
              Number(pdata.polish_pcs) || 0,
              Number(pdata.polish_carat) || 0
            );
          } catch (_) {}
        }

        // Standard standalone product restoration
        await q(
          "UPDATE dai_product SET outward = '', visibility = 1, is_uploadsite = 1, is_uploadrapnet = 1, site_upload = 0, rapnet_upload = 0 WHERE id = ?",
          [pid]
        );
        try {
          const histPayload = {
            product_id: pid,
            action: histAction,
            party: oData.party || "",
            narretion: oData.narretion || "",
            date: moment().format("YYYY-MM-DD HH:mm:ss"),
            description: histDesc,
            pcs: pdata.polish_pcs || 0,
            carat: pdata.polish_carat || 0,
            amount: pdata.amount || 0,
            price: pdata.price || 0,
            sku: pdata.sku,
            type: "cr",
            invoice: oData.invoiceno || "",
            entry_from: "outward",
            entryno: id,
            balance_pcs: pdata.polish_pcs || 0,
            balance_carat: pdata.polish_carat || 0,
            user: oData.user || options.userId || helper.DEFAULT_USER_ID,
          };
          const hData = helper.insertString(histPayload);
          await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);
        } catch (histErr) {
          console.error("deleteOutwardStock product history error:", histErr);
        }
      }
    }

    if (companyId) {
      await q("DELETE FROM dai_outward WHERE id = ? AND company = ?", [id, companyId]);
    } else {
      await q("DELETE FROM dai_outward WHERE id = ?", [id]);
    }
    return { ok: true, oData };
  });

  if (!result.ok) {
    return result;
  }

  try {
    await logAudit({
      actionType: "DELETE",
      moduleName,
      recordId: id,
      recordReference: result.oData?.invoiceno || String(id),
      oldValue: result.oData || { id },
      companyId: result.oData?.company,
    });
  } catch (e) {
    console.error("deleteOutwardStock audit:", e);
  }
  return { ok: true, message: "Outward record deleted and stock restored" };
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
