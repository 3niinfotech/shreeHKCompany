const connection = require("../../connection.js");
const helper = require("../../helper.js");
const holdRepository = require("./holdRepository.js");
const { logAuditInTx, logAudit } = require("../../services/auditIntegration.js");
const { diffFields } = require("../../services/auditService.js");
const { buildFullProductAuditSnapshot } = require("../../services/auditProductSnapshot.js");
const { DEFAULT_COMPANY_ID, DEFAULT_USER_ID } = helper;

const TABLE_OUTWARD = "dai_outward";
const TABLE_PRODUCT = "dai_product";
const TABLE_PRODUCT_VALUE = "dai_product_value";

/** dai_outward columns from shreehkweb_snj2024.sql — no vat_percent / vat_amount. */
function formatDateOnly(value) {
  if (!value) return null;
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}

function resolveInvoiceFrom(value) {
  if (value === undefined || value === null || value === "" || value === "Invoice From") {
    return 0;
  }
  if (value === "Invoice To") return 1;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function buildMemoOutwardRow(post, productsCsv) {
  return {
    entryno: post.entryno || "",
    place: post.place || "",
    date: formatDateOnly(post.date),
    reference: post.reference || "",
    invoiceno: post.invoiceno != null ? String(post.invoiceno) : "",
    invoicedate: formatDateOnly(post.invoicedate),
    terms: post.terms || "",
    duedate: post.duedate ? formatDateOnly(post.duedate) : null,
    party: post.party != null ? String(post.party) : "",
    type: post.type || "memo",
    company: post.company != null ? String(post.company) : String(DEFAULT_COMPANY_ID),
    narretion: post.narretion || "",
    products: productsCsv,
    return_products: "",
    status: post.status || "on_memo",
    paid_amount: post.paid_amount ?? 0,
    due_amount: post.due_amount ?? 0,
    part: 0,
    user: post.user ?? DEFAULT_USER_ID,
    final_amount: post.final_amount ?? 0,
    less_percent: post.less_percent ?? 0,
    less_amount: post.less_amount ?? 0,
    charge: post.charge ?? 0,
    other_less_amount: post.other_less_amount ?? 0,
    other_less_percent: post.other_less_percent ?? 0,
    shipping_charge: post.shipping_charge ?? 0,
    shipping_name: post.shipping_name || "",
    origin_of: post.origin_of || "",
    cif: post.cif || "",
    lab: post.lab || "",
    out_product: "",
    bank: 0,
    invoice_from: resolveInvoiceFrom(post.invoice_from),
    boc: post.boc ? 1 : 0,
    citi: post.citi ? 1 : 0,
    dbs: post.dbs ? 1 : 0,
    sc: post.sc ? 1 : 0,
    boc_sksm: 0,
    citi_sksm: 0,
    other_party: post.other_party != null ? String(post.other_party) : "",
  };
}

let outwardTableColumnsCache = null;

async function getOutwardTableColumns(q) {
  if (outwardTableColumnsCache) return outwardTableColumnsCache;
  const rows = await q("SHOW COLUMNS FROM dai_outward");
  outwardTableColumnsCache = rows.map((r) => r.Field);
  return outwardTableColumnsCache;
}

/** Only insert keys that exist on the connected DB (avoids ER_BAD_FIELD_ERROR). */
function filterRowToExistingColumns(row, columnNames) {
  const safe = {};
  for (const col of columnNames) {
    if (col === "id") continue;
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      safe[col] = row[col];
    }
  }
  return safe;
}

async function insertOutwardRow(q, post, productsCsv) {
  const full = buildMemoOutwardRow(post, productsCsv);
  const tableColumns = await getOutwardTableColumns(q);
  const safe = filterRowToExistingColumns(full, tableColumns);
  const data = helper.insertString(safe);
  if (!data || !data[0]) throw new Error("Insert failed for dai_outward");
  const sql = `INSERT INTO ${TABLE_OUTWARD} (${data[0]}) VALUES (${data[1]})`;
  const result = await q(sql);
  return result.insertId;
}

function withTransaction(callback) {
  return new Promise((resolve, reject) => {
    connection.getConnection((err, conn) => {
      if (err) return reject(err);
      const q = (sql, values = []) =>
        new Promise((res, rej) => {
          conn.query(sql, values, (e, r) => (e ? rej(e) : res(r)));
        });
      (async () => {
        try {
          await q("START TRANSACTION");
          const result = await callback(q);
          await q("COMMIT");
          resolve(result);
        } catch (e) {
          try {
            await q("ROLLBACK");
          } catch (_) {
            /* ignore */
          }
          reject(e);
        } finally {
          conn.release();
        }
      })();
    });
  });
}

async function getIncrementEntry(q, field, companyId = DEFAULT_COMPANY_ID) {
  if (!field) return "";
  const allowed = ["outward", "invoice", "memo_invoice", "lab_invoice"];
  if (!allowed.includes(field)) return "";
  const rows = await q(
    `SELECT ${field} FROM dai_incrementid WHERE company = ? LIMIT 1`,
    [companyId]
  );
  return rows.length ? rows[0][field] : "";
}

async function getProductDetail(q, id, companyId = DEFAULT_COMPANY_ID) {
  const rows = await q(
    `SELECT * FROM ${TABLE_PRODUCT} p WHERE p.company = ? AND p.id = ?`,
    [companyId, id]
  );
  if (!rows.length) return null;
  const data = { ...rows[0] };
  const vals = await q(
    `SELECT * FROM ${TABLE_PRODUCT_VALUE} WHERE product_id = ?`,
    [id]
  );
  if (vals.length) data.record = { ...vals[0] };
  return data;
}

function buildSaleContext(post) {
  return {
    party: post.party ?? null,
    invoice: post.invoiceno ?? null,
    reference: post.reference ?? null,
    invoicedate: post.invoicedate ?? null,
  };
}

function buildProductAuditSnapshot(row, extra = {}) {
  return buildFullProductAuditSnapshot(row, extra);
}

async function insertRow(q, table, post) {
  const data = helper.insertString(post);
  if (!data || !data[0]) throw new Error(`Insert failed for ${table}`);
  const sql = `INSERT INTO ${table} (${data[0]}) VALUES (${data[1]})`;
  const result = await q(sql);
  return result.insertId;
}

async function addHistoryTx(q, post) {
  const history = { ...post };
  if (history.description) {
    history.description = String(history.description).toUpperCase();
  }
  const data = helper.insertString(history);
  const sql = `INSERT INTO dai_history (${data[0]}) VALUES (${data[1]})`;
  await q(sql);
  return 1;
}

async function addUserTrackTx(q, post) {
  const track = { ...post };
  if (!track.user) track.user = DEFAULT_USER_ID;
  if (!track.company) track.company = DEFAULT_COMPANY_ID;
  if (track.description) track.description = String(track.description).toUpperCase();
  const data = helper.insertString(track);
  const sql = `INSERT INTO user_track (${data[0]}) VALUES (${data[1]})`;
  await q(sql);
}

/**
 * Port of outwardModel::separateSale — box/parcel partial outward.
 */
async function separateSale(q, v, edata, type, post) {
  const saleCtx = buildSaleContext(post);
  const parentBefore = buildProductAuditSnapshot(edata, saleCtx);
  const child = (Number(edata.child_count) || 0) + 1;
  edata.child_count = child;

  const childSku = `${edata.sku}-${child}`;
  const tp = Number(v.polish_pcs) || 0;
  const tc = Number(v.polish_carat) || 0;

  if (edata.group_type === "box") {
    edata.polish_pcs = (Number(edata.polish_pcs) || 0) - tp;
  }
  edata.polish_carat = (Number(edata.polish_carat) || 0) - tc;
  edata.amount = Number((edata.polish_carat * edata.price).toFixed(2));

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const pc = v.polish_pcs;
  let group = "";
  if (pc == 1 || pc == 1.0) group = "single";
  else if (pc > 1) group = "box";
  else if (pc === "" || pc == 0 || pc === "0") group = "parcel";

  const price = Number(v.price) || 0;
  const sellAmount = price * tc;

  const productRow = {
    sku: childSku,
    date: now,
    company: post.company,
    user: post.user,
    polish_pcs: v.polish_pcs,
    polish_carat: v.polish_carat,
    group_type: group,
    site_upload: 1,
    rapnet_upload: 1,
    is_uploadsite: 0,
    is_uploadrapnet: 0,
    outward_parent: edata.id,
    main_color: edata.main_color,
    location: edata.location,
    main_group: edata.main_group,
    sub_group: edata.sub_group,
    remark: edata.remark,
    transaction: "dr",
    inward: edata.inward,
    inward_id: edata.inward_id,
    outward: type,
    visibility: type === "sale" || type === "export" ? 0 : 1,
    sell_price: price,
    sell_amount: sellAmount,
    price,
    amount: sellAmount,
    child_count: 0,
  };

  const prid = await insertRow(q, TABLE_PRODUCT, productRow);

  const attr = { ...(edata.record || {}) };
  delete attr.pid;
  attr.product_id = prid;
  await insertRow(q, TABLE_PRODUCT_VALUE, attr);

  await addHistoryTx(q, {
    product_id: prid,
    action: "unboxing",
    party: post.party,
    narretion: post.narretion,
    date: post.invoicedate,
    description: `${type} with Unboxing from ${edata.sku} with  carat :${v.polish_carat}`,
    pcs: v.polish_pcs,
    carat: v.polish_carat,
    amount: sellAmount,
    price,
    sku: childSku,
    type: "cr",
    invoice: post.invoiceno,
    entry_from: "outward",
    balance_pcs: v.polish_pcs,
    balance_carat: v.polish_carat,
  });

  await q(
    `UPDATE ${TABLE_PRODUCT} SET polish_pcs = ?, polish_carat = ?, amount = ?, child_count = ? WHERE id = ?`,
    [edata.polish_pcs, edata.polish_carat, edata.amount, edata.child_count, edata.id]
  );

  await addHistoryTx(q, {
    product_id: edata.id,
    action: type,
    party: post.party,
    narretion: post.narretion,
    date: post.invoicedate,
    description: `${type} with carat :${tc}`,
    pcs: v.polish_pcs,
    carat: v.polish_carat,
    amount: sellAmount,
    price,
    sku: edata.sku,
    type: "dr",
    invoice: post.invoiceno,
    entry_from: "outward",
    balance_pcs: edata.polish_pcs,
    balance_carat: edata.polish_carat,
  });

  const companyId = post.company || DEFAULT_COMPANY_ID;
  const parentAfterRow = await getProductDetail(q, edata.id, companyId);
  const childAfterRow = await getProductDetail(q, prid, companyId);
  const parentAfter = buildProductAuditSnapshot(parentAfterRow, {
    ...saleCtx,
    sale_type: type,
  });
  const childAfter = buildProductAuditSnapshot(childAfterRow, {
    ...saleCtx,
    sale_type: type,
    split_from: edata.sku,
  });

  await logAuditInTx(q, {
    actionType: type === "sale" ? "STOCK_OUT" : "UPDATE",
    moduleName: "Diamond Stock",
    recordId: edata.id,
    recordReference: edata.sku,
    oldValue: parentBefore,
    newValue: parentAfter,
    changedFields: diffFields(parentBefore, parentAfter),
    description:
      type === "sale"
        ? `Inventory sale — parent ${edata.sku} split (${tc} ct → ${childSku})`
        : `Partial ${type} — parent ${edata.sku} split (${tc} ct → ${childSku})`,
    companyId,
  });

  await logAuditInTx(q, {
    actionType: type === "sale" ? "STOCK_OUT" : "CREATE",
    moduleName: "Diamond Stock",
    recordId: prid,
    recordReference: childSku,
    newValue: childAfter,
    description:
      type === "sale"
        ? `Inventory sale — child stone ${childSku} from ${edata.sku}`
        : `Partial ${type} — child stone ${childSku} from ${edata.sku}`,
    companyId,
  });

  return prid;
}

function recordToArray(record) {
  if (!record) return [];
  if (Array.isArray(record)) return record;
  return Object.values(record);
}

/**
 * Validate products before sendTo (memo / inventory).
 */
async function validateProductsForMemo(productIds, companyId = DEFAULT_COMPANY_ID) {
  if (!productIds || !productIds.length) {
    return "Please Select Item";
  }
  const q = (sql, vals) => helper.query(sql, vals);
  for (const pid of productIds) {
    const edata = await getProductDetail(q, pid, companyId);
    if (!edata) {
      return `Product id ${pid} not found`;
    }
    if (edata.outward === "memo") {
      return `SKU ${edata.sku} is already on memo`;
    }
    if (edata.outward === "consign") {
      return `SKU ${edata.sku} is already on consign`;
    }
    if (edata.hold == 1) {
      return `SKU ${edata.sku} is on hold`;
    }
  }
  return null;
}

/**
 * Validate products for memo -> sale conversion.
 */
async function validateProductsForMemoSale(productIds, companyId = DEFAULT_COMPANY_ID) {
  if (!productIds || !productIds.length) {
    return "Please Select Item";
  }
  const q = (sql, vals) => helper.query(sql, vals);
  for (const pid of productIds) {
    const edata = await getProductDetail(q, pid, companyId);
    if (!edata) {
      return `Product id ${pid} not found`;
    }
    if (edata.hold == 1) {
      return `SKU ${edata.sku} is on hold`;
    }
    if (String(edata.outward || "").toLowerCase() !== "memo") {
      return `SKU ${edata.sku} is not on memo`;
    }
  }
  return null;
}

/** Stock outward (lab / export) — stone must be available on hand. */
async function validateProductsForStockOut(productIds, companyId = DEFAULT_COMPANY_ID) {
  if (!productIds || !productIds.length) {
    return "Please Select Item";
  }
  const q = (sql, vals) => helper.query(sql, vals);
  for (const pid of productIds) {
    const edata = await getProductDetail(q, pid, companyId);
    if (!edata) {
      return `Product id ${pid} not found`;
    }
    if (edata.hold == 1) {
      return `SKU ${edata.sku} is on hold`;
    }
    const outward = String(edata.outward || "").toLowerCase();
    if (outward && outward !== "") {
      return `SKU ${edata.sku} is already on ${edata.outward}`;
    }
  }
  return null;
}

const OUTWARD_STATUS_BY_TYPE = {
  memo: "on_memo",
  sale: "on_sale",
  consign: "on_consign",
  lab: "on_lab",
  export: "on_export",
};

/**
 * Port of outwardModel::sendTo — memo and memo->sale.
 */
async function sendTo(rawPost, userContext = {}) {
  const post = { ...rawPost };
  const type = post.type || "memo";
  const allowedTypes = ["memo", "sale", "consign", "lab", "export"];
  if (!allowedTypes.includes(type)) {
    return { ok: false, message: `Unsupported outward type: ${type}` };
  }

  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;
  const userId = userContext.userId || userContext.user_id || DEFAULT_USER_ID;

  const recordList = recordToArray(post.record);
  if (!recordList.length) {
    return { ok: false, message: "Please Select at least one stone for process." };
  }

  const productIds = recordList.map((r) => r.id).filter(Boolean);
  const preCheck =
    type === "sale"
      ? await validateProductsForMemoSale(productIds, companyId)
      : type === "memo" || type === "consign"
        ? await validateProductsForMemo(productIds, companyId)
        : await validateProductsForStockOut(productIds, companyId);
  if (preCheck) {
    return { ok: false, message: preCheck };
  }

  if (type === "lab" && !String(post.lab || "").trim()) {
    return { ok: false, message: "Please select lab type" };
  }

  if (type === "export") {
    const qRead = (sql, vals) => helper.query(sql, vals);
    for (const pid of productIds) {
      const edata = await getProductDetail(qRead, pid, companyId);
      const inward = String(edata?.inward || "").toLowerCase();
      if (inward === "memo" || inward === "consign") {
        return {
          ok: false,
          message: `SKU ${edata.sku} is IN Memo. Please purchase first`,
        };
      }
    }
  }

  if (!post.party) {
    return { ok: false, message: "Please select party" };
  }

  try {
    const outwardId = await withTransaction(async (q) => {
      const increId = await getIncrementEntry(q, "outward", companyId);
      const invoiceNo = await getIncrementEntry(q, "invoice", companyId);

      const today = new Date().toISOString().slice(0, 10);
      post.date = formatDateOnly(post.invoicedate) || today;
      post.invoicedate = formatDateOnly(post.invoicedate) || today;
      post.company = companyId;
      post.user = userId;
      post.entryno = post.entryno || increId;
      post.invoiceno = post.invoiceno || invoiceNo;
      post.type = type;
      post.status = post.status || OUTWARD_STATUS_BY_TYPE[type] || `on_${type}`;
      post.duedate = formatDateOnly(post.duedate);

      const OutProducts = [];
      const Productsku = [];
      let amount = 0;

      for (const rec of recordList) {
        const pid = rec.id;
        const edata = await getProductDetail(q, pid, companyId);
        if (!edata) {
          throw new Error(`Product id ${pid} not found`);
        }

        const recCarat =
          rec.polish_carat !== undefined && rec.polish_carat !== ""
            ? Number(rec.polish_carat)
            : null;
        const stockCarat = Number(edata.polish_carat) || 0;

        if (
          rec.group_type &&
          recCarat !== null &&
          recCarat !== stockCarat
        ) {
          if (
            rec.price === "NaN" ||
            rec.price === "" ||
            rec.price == null ||
            rec.amount === "" ||
            rec.amount == null
          ) {
            throw new Error(
              `Please Enter price and amount of carat for SKU : ${edata.sku}`
            );
          }
          if (
            Number(rec.polish_pcs) > Number(edata.polish_pcs) &&
            edata.group_type === "box"
          ) {
            throw new Error(`Pcs is exceed than stock PCS For SKU : ${edata.sku}`);
          }
          if (recCarat > stockCarat) {
            throw new Error(`Carat is exceed than stock carat For SKU : ${edata.sku}`);
          }
        }
      }

      for (const rec of recordList) {
        const pid = rec.id;
        const edata = await getProductDetail(q, pid, companyId);
        const recCarat =
          rec.polish_carat !== undefined && rec.polish_carat !== ""
            ? Number(rec.polish_carat)
            : null;
        const stockCarat = Number(edata.polish_carat) || 0;

        const isBoxParcelOutward =
          rec.group_type &&
          rec.polish_carat !== "" &&
          rec.polish_carat != null &&
          (edata.group_type === "box" || edata.group_type === "parcel");

        if (isBoxParcelOutward) {
          if (rec.price === "" || rec.price == null || rec.amount === "" || rec.amount == null) {
            throw new Error("Please Enter price and amount of carat");
          }
          const rid = await separateSale(q, rec, edata, type, post);
          OutProducts.push(rid);
          const sData = await getProductDetail(q, rid, companyId);
          Productsku.push(sData.sku);
          const lineAmount = Number(rec.price) * recCarat;
          amount += lineAmount;
        } else {
          OutProducts.push(pid);
          Productsku.push(edata.sku);
          const sprice = Number(rec.price) || 0;
          const samount = sprice * stockCarat;
          const saleCtx = buildSaleContext(post);
          const stoneBefore = buildProductAuditSnapshot(edata, saleCtx);
          await q(
            `UPDATE ${TABLE_PRODUCT} SET sell_price = ?, sell_amount = ?, outward = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ?`,
            [sprice, samount, type, pid]
          );
          await addHistoryTx(q, {
            product_id: pid,
            action: type,
            party: post.party,
            narretion: post.narretion,
            date: post.invoicedate,
            description: ` Stone ${type}  with reference no is ${post.reference || ""}`,
            pcs: edata.polish_pcs,
            carat: edata.polish_carat,
            balance_pcs: 0,
            balance_carat: 0,
            amount: samount,
            price: sprice,
            sku: edata.sku,
            type: "dr",
            invoice: post.invoiceno,
          });
          const stoneAfterRow = await getProductDetail(q, pid, companyId);
          const stoneAfter = buildProductAuditSnapshot(stoneAfterRow, {
            ...saleCtx,
            sale_type: type,
          });
          await logAuditInTx(q, {
            actionType: type === "sale" ? "STOCK_OUT" : "UPDATE",
            moduleName: "Diamond Stock",
            recordId: pid,
            recordReference: edata.sku,
            oldValue: stoneBefore,
            newValue: stoneAfter,
            changedFields: diffFields(stoneBefore, stoneAfter),
            description:
              type === "sale"
                ? `Inventory sale — ${edata.sku} memo → sale (invoice ${post.invoiceno || post.reference || "—"})`
                : undefined,
            companyId,
          });
          amount += samount;
        }
      }

      const mappedFinalAmount =
        post.final_amount != null && post.final_amount !== ""
          ? Number(post.final_amount)
          : post.finalAmount != null && post.finalAmount !== ""
            ? Number(post.finalAmount)
            : amount;
      post.final_amount = Number.isFinite(mappedFinalAmount) ? mappedFinalAmount : amount;
      post.due_amount = post.final_amount;
      post.paid_amount = 0;

      if (!OutProducts.length) {
        throw new Error("Please select item or enter required value for box/parcel ");
      }

      const productsCsv = OutProducts.join(",");
      const outwardPayload = buildMemoOutwardRow(post, productsCsv);

      const Oid = await insertOutwardRow(q, post, productsCsv);

      const sku = Productsku.join(",");
      await addUserTrackTx(q, {
        product_id: outwardPayload.products,
        action: type,
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        description: `${sku} send to ${type} with Outward id ${Oid}`,
        user: userId,
        company: companyId,
      });

      const temp = String(increId).split("-");
      if (temp.length >= 2) {
        temp[1] = String(Number(temp[1]) + 1);
      }
      const setNewid = temp.join("-");
      const nextInvoice = Number(invoiceNo) + 1;
      await q(
        `UPDATE dai_incrementid SET outward = ?, invoice = ? WHERE company = ?`,
        [setNewid, nextInvoice, companyId]
      );

      const outwardRows = await q(`SELECT * FROM ${TABLE_OUTWARD} WHERE id = ?`, [Oid]);
      const saleCtx = buildSaleContext(post);
      await logAuditInTx(q, {
        actionType: type === "sale" ? "STOCK_OUT" : type === "consign" ? "MEMO_CREATE" : "MEMO_CREATE",
        moduleName: type === "sale" ? "Sale" : type === "consign" ? "Consignment" : "Memo",
        recordId: Oid,
        recordReference: String(post.invoiceno || post.reference || Oid),
        oldValue:
          type === "sale"
            ? {
                outward_status: "memo",
                skus: Productsku,
                ...saleCtx,
              }
            : null,
        newValue: {
          ...(outwardRows[0] || { products: productsCsv, skus: sku }),
          skus: Productsku,
          ...saleCtx,
        },
        changedFields:
          type === "sale"
            ? ["outward_status", "type", "skus", "final_amount"]
            : undefined,
        description:
          type === "sale"
            ? `Inventory sale invoice ${post.invoiceno || post.reference || Oid} — ${Productsku.join(", ")}`
            : undefined,
        companyId,
      });

      return { Oid, sku, invoiceno: post.invoiceno };
    });

    if (type === "sale") {
      try {
        await helper.notifyStoneSale({
          sellerName: userContext.username,
          sellerId: userId,
          skus: outwardId.sku,
          outwardId: outwardId.Oid,
          invoiceNo: outwardId.invoiceno,
          companyId,
        });
      } catch (notificationError) {
        console.error("Stone sale notification error:", notificationError);
      }
    }

    return {
      ok: true,
      id: outwardId.Oid,
      message:
        type === "sale"
          ? "Sale saved successfully"
          : type === "consign"
            ? "Consignment saved successfully"
            : "Memo saved successfully",
    };
  } catch (err) {
    const msg =
      typeof err === "string"
        ? err
        : err.message || "Error saving outward transaction";
    return { ok: false, message: msg };
  }
}

function mapRequestBody(body) {
  const type = body.type || "memo";
  let record = body.record;
  let products = body.products;

  if (
    !record &&
    Array.isArray(body.products) &&
    body.products.length &&
    typeof body.products[0] === "object"
  ) {
    products = body.products.map((p) => p.id);
    record = {};
    body.products.forEach((p, i) => {
      const key = `${p.id}${i}`;
      record[key] = {
        id: p.id,
        price: p.price,
        amount: p.amount,
        polish_carat: p.polishCarat ?? p.polish_carat ?? p.carat,
        polish_pcs: p.polishPcs ?? p.polish_pcs,
        group_type: p.groupType ?? p.group_type,
      };
    });
  } else if (Array.isArray(record)) {
    const recObj = {};
    record.forEach((r, i) => {
      recObj[`${r.id}${i}`] = r;
    });
    record = recObj;
  }

  if (Array.isArray(products) && typeof products[0] !== "object") {
    /* ids only */
  } else if (!products && record) {
    products = Object.values(record).map((r) => r.id);
  }

  return {
    type,
    status: body.status || `on_${type}`,
    party: body.party ?? body.company,
    invoicedate: body.invoicedate ?? body.date,
    narretion: body.narretion ?? body.narration ?? "",
    reference: body.reference ?? "",
    entryno: body.entryno,
    invoiceno: body.invoiceno,
    other_party: body.other_party ?? "",
    invoice_from: body.invoice_from ?? body.invoiceType ?? body.invoice_type,
    boc: body.boc ? 1 : 0,
    citi: body.citi ? 1 : 0,
    dbs: body.dbs ? 1 : 0,
    sc: body.sc ? 1 : 0,
    less_percent: body.less_percent ?? body.lessPercent ?? 0,
    less_amount: body.less_amount ?? body.lessAmount ?? 0,
    other_less_percent: body.other_less_percent ?? body.otherLessPercent ?? 0,
    other_less_amount: body.other_less_amount ?? body.otherLessAmount ?? 0,
    charge: body.charge ?? body.extraCharge ?? 0,
    terms: body.terms ?? "",
    duedate: body.duedate,
    final_amount: body.final_amount ?? body.finalAmount ?? 0,
    lab: body.lab || "",
    shipping_name: body.shipping_name || "",
    origin_of: body.origin_of || "",
    shipping_charge: body.shipping_charge ?? 0,
    cif: body.cif || "",
    vat_percent: body.vat_percent ?? body.vatPercent ?? 0,
    vat_amount: body.vat_amount ?? body.vatAmount ?? 0,
    products,
    record,
  };
}

/**
 * Port of venya outwardModel::hold() — outwardModel.php L1151–1208.
 * No DB transaction (PHP mysqli); fail-fast on first SQL error; partial updates possible.
 *
 * @param {{ ids: number[], status: 0|1, date?: string, description?: string }} post
 * @param {{ userId?: number, companyId?: number }} userContext
 */
async function holdProducts(post, userContext = {}) {
  const status = Number(post.status) === 1 ? 1 : 0;
  const ids = Array.isArray(post.ids) ? post.ids : [];
  const holdDate = post.date != null ? String(post.date).trim() : "";
  const description = post.description != null ? String(post.description) : "";
  const userId = userContext.userId || userContext.user_id || DEFAULT_USER_ID;
  const companyId = userContext.companyId || DEFAULT_COMPANY_ID;

  const q = (sql, values = []) => helper.query(sql, values);

  const pidList = [];
  const skuList = [];
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  for (const v of ids) {
    const productId = parseInt(v, 10);
    if (!productId) continue;

    const productBefore = await getProductDetail(q, productId, companyId);
    if (!productBefore) {
      return { ok: false, message: `Product id ${productId} not found` };
    }

    try {
      await q(
        `UPDATE ${TABLE_PRODUCT} SET hold = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ?`,
        [status, productId]
      );
    } catch (err) {
      return { ok: false, message: err.message || String(err) };
    }

    const productAfter = await getProductDetail(q, productId, companyId);
    pidList.push(productId);
    skuList.push(productBefore.sku);

    const historyDescription = status
      ? "Stone put on Hold for while."
      : `Stone put unhold and show in inventory. User Description:${description}`;

    const beforeSnap = buildFullProductAuditSnapshot(productBefore);
    const afterSnap = buildFullProductAuditSnapshot(productAfter);

    try {
      await addHistoryTx(q, {
        product_id: productId,
        sku: productBefore.sku,
        action: status ? "hold" : "unhold",
        date: now,
        description: historyDescription,
        user: userId,
      });
      await logAudit({
        actionType: "UPDATE",
        moduleName: "Diamond Stock",
        recordId: productId,
        recordReference: productBefore.sku,
        oldValue: beforeSnap,
        newValue: afterSnap,
        changedFields: diffFields(beforeSnap, afterSnap),
        description: historyDescription,
        companyId,
      }).catch(console.error);
    } catch (err) {
      return { ok: false, message: err.message || String(err) };
    }

    // L1174–1191: dai_hold when status=1 and date provided
    if (status === 1 && holdDate !== "") {
      try {
        await holdRepository.upsertHoldRow(q, {
          product_id: productId,
          date: holdDate,
          description,
          user: userId,
        });
      } catch (err) {
        return { ok: false, message: err.message || String(err) };
      }
    }

    // L1193–1196: delete dai_hold on unhold
    if (status === 0) {
      try {
        await holdRepository.deleteHoldByProductId(q, productId);
      } catch (err) {
        return { ok: false, message: err.message || String(err) };
      }
    }
  }

  // L1198–1207: batch user_track
  const alsku = skuList.join(",");
  const alpid = pidList.join(",");
  const trackDescription = status
    ? `${alsku} put on Hold for while.`
    : `${alsku} put unhold and show in inventory. User Description:${description}`;

  try {
    await addUserTrackTx(q, {
      product_id: alpid,
      action: status ? "hold" : "unhold",
      date: now,
      description: trackDescription,
      company: companyId,
      user: userId,
    });
  } catch (err) {
    return { ok: false, message: err.message || String(err) };
  }

  return { ok: true, message: "Hold updated successfully" };
}

/**
 * Port of outwardModel::getHoldDetail — outwardModel.php L3205–3215.
 */
async function getHoldDetail(productId) {
  const q = (sql, values = []) => helper.query(sql, values);
  const row = await holdRepository.getHoldByProductId(q, productId);
  if (!row) return null;
  const user_name = await holdRepository.getUserName(q, row.user);
  return { ...row, user_name };
}

function normalizeHoldIds(body) {
  let ids = body?.ids;
  if (typeof ids === "string") {
    ids = ids.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => parseInt(id, 10)).filter((n) => n > 0);
}

/**
 * Port of outwardModel::updateOutward — product returns, box splits, history, acc_transaction sync.
 */
async function updateOutward(rawPost) {
  const post = { ...rawPost };
  const id = parseInt(post.id, 10);
  if (!id) return { ok: false, message: "Invalid id" };

  try {
    return await withTransaction(async (q) => {
      const rows = await q("SELECT * FROM dai_outward WHERE id = ?", [id]);
      if (!rows.length) return { ok: false, message: "Record not found" };
      const existing = rows[0];
      const otype = existing.type;
      const companyId = existing.company || DEFAULT_COMPANY_ID;

      const saleProducts = String(post.sproducts || existing.products || "")
        .split(",")
        .filter(Boolean);
      const productList = Array.isArray(post.products) ? post.products : [];

      const recordMap = {};
      if (productList.length) {
        productList.forEach((p) => {
          if (!p.id) return;
          recordMap[p.id] = {
            id: p.id,
            sku: p.sku,
            polish_pcs: p.polish_pcs ?? p.polishPcs,
            polish_carat: p.polish_carat ?? p.polishCarat,
            sell_price: p.sell_price ?? p.sellPrice ?? p.price,
            sell_amount: p.sell_amount ?? p.sellAmount ?? p.amount,
            price: p.price ?? p.sell_price,
            amount: p.amount ?? p.sell_amount,
            group_type: p.group_type ?? p.groupType,
          };
        });
      } else if (post.record && typeof post.record === "object") {
        Object.assign(recordMap, post.record);
      }

      const keptIds = productList.map((p) => String(p.id)).filter(Boolean);
      const headerParty = post.party != null ? String(post.party) : existing.party;
      const headerRef = post.reference ?? existing.reference;
      const headerInvoice = post.invoiceno ?? existing.invoiceno;
      const headerNarration = post.narretion ?? post.narration ?? existing.narretion;

      for (const pidStr of saleProducts) {
        if (!pidStr || keptIds.includes(pidStr)) continue;
        const pid = parseInt(pidStr, 10);
        const pdata = await getProductDetail(q, pid, companyId);
        if (!pdata) continue;

        if (pdata.outward_parent && pdata.outward_parent !== 0) {
          const edata = await getProductDetail(q, pdata.outward_parent, companyId);
          if (edata) {
            const parentPcs =
              edata.group_type === "box"
                ? (Number(edata.polish_pcs) || 0) + (Number(pdata.polish_pcs) || 0)
                : Number(edata.polish_pcs) || 0;
            const parentCarat = (Number(edata.polish_carat) || 0) + (Number(pdata.polish_carat) || 0);
            await q(`UPDATE ${TABLE_PRODUCT} SET polish_pcs=?, polish_carat=?, outward='' WHERE id = ?`, [
              parentPcs,
              parentCarat,
              edata.id,
            ]);
            await addHistoryTx(q, {
              product_id: edata.id,
              action: `${otype}_return`,
              party: headerParty,
              narretion: headerNarration,
              date: new Date().toISOString().slice(0, 19).replace("T", " "),
              description: `Stone ${otype} return with reference no is ${headerRef}`,
              pcs: pdata.polish_pcs,
              carat: pdata.polish_carat,
              balance_pcs: edata.polish_pcs,
              balance_carat: edata.polish_carat,
              amount: pdata.sell_amount == 0 ? pdata.amount : pdata.sell_amount,
              price: pdata.sell_price == 0 ? pdata.price : pdata.sell_price,
              sku: pdata.sku,
              type: "cr",
              invoice: headerInvoice,
              entry_from: "outward",
              entryno: id,
            });
          }
          await q(
            `UPDATE ${TABLE_PRODUCT} SET outward = '', visibility = 0, outward_parent = 0, site_upload = 0, rapnet_upload = 0 WHERE id = ?`,
            [pid]
          );
        } else {
          await q(
            `UPDATE ${TABLE_PRODUCT} SET outward = '', site_upload = 0, rapnet_upload = 0 WHERE id = ?`,
            [pid]
          );
          await addHistoryTx(q, {
            product_id: pid,
            action: `${otype}_return`,
            party: headerParty,
            narretion: headerNarration,
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            description: `Stone ${otype} return with reference no is ${headerRef}`,
            pcs: pdata.polish_pcs,
            carat: pdata.polish_carat,
            balance_pcs: pdata.polish_pcs,
            balance_carat: pdata.polish_carat,
            amount: pdata.sell_amount == 0 ? pdata.amount : pdata.sell_amount,
            price: pdata.sell_price == 0 ? pdata.price : pdata.sell_price,
            sku: pdata.sku,
            type: "cr",
            invoice: headerInvoice,
            entry_from: "outward",
            entryno: id,
          });
        }
      }

      const updatedProductIds = [];
      let amount = 0;

      for (const pdata of Object.values(recordMap)) {
        if (!pdata.sku && !pdata.polish_carat) continue;
        const pid = parseInt(pdata.id, 10);
        if (!pid) continue;

        amount += Number(
          pdata.sell_amount == 0 || pdata.sell_amount == null
            ? pdata.amount || 0
            : pdata.sell_amount
        );

        let Tpcs = 0;
        let Tcarat = 0;
        let BaseData = null;

        if (saleProducts.includes(String(pid))) {
          const oldData = await getProductDetail(q, pid, companyId);
          if (oldData?.outward_parent) {
            BaseData = await getProductDetail(q, oldData.outward_parent, companyId);
            if (BaseData?.group_type === "box") {
              Tpcs = (Number(oldData.polish_pcs) || 0) - (Number(pdata.polish_pcs) || 0);
              BaseData.polish_pcs = (Number(BaseData.polish_pcs) || 0) + Tpcs;
            }
            Tcarat = (Number(oldData.polish_carat) || 0) - (Number(pdata.polish_carat) || 0);
            BaseData.polish_carat = (Number(BaseData.polish_carat) || 0) + Tcarat;
          }
        } else {
          const oldData = await getProductDetail(q, pid, companyId);
          if (
            oldData &&
            (oldData.group_type === "box" || oldData.group_type === "parcel")
          ) {
            const rid = await separateSale(q, pdata, oldData, otype, {
              ...post,
              party: headerParty,
              narretion: headerNarration,
              invoiceno: headerInvoice,
              reference: headerRef,
              company: companyId,
              user: post.user ?? DEFAULT_USER_ID,
            });
            if (typeof rid === "number") {
              updatedProductIds.push(rid);
              continue;
            }
            return { ok: false, message: String(rid) };
          }
        }

        const productUpdate = {
          polish_pcs: pdata.polish_pcs,
          polish_carat: pdata.polish_carat,
          sell_price: pdata.sell_price,
          sell_amount: pdata.sell_amount ?? pdata.amount,
          price: pdata.price,
          amount: pdata.amount,
          sku: pdata.sku,
          outward: otype,
          site_upload: 0,
          rapnet_upload: 0,
        };
        const values = helper.updateString(productUpdate);
        if (values) await q(`UPDATE ${TABLE_PRODUCT} SET ${values} WHERE id = ?`, [pid]);
        updatedProductIds.push(pid);

        await addHistoryTx(q, {
          product_id: pid,
          action: otype,
          type: "dr",
          description: "Stone updated",
          party: headerParty,
          narretion: headerNarration,
          date: new Date().toISOString().slice(0, 19).replace("T", " "),
          pcs: pdata.polish_pcs,
          carat: pdata.polish_carat,
          amount: pdata.sell_amount == 0 ? pdata.amount : pdata.sell_amount,
          price: pdata.sell_price == 0 ? pdata.price : pdata.sell_price,
          sku: pdata.sku,
          invoice: headerInvoice,
          entry_from: "outward",
          entryno: id,
        });

        if (BaseData) {
          delete BaseData.record;
          const baseValues = helper.updateString(BaseData);
          if (baseValues) {
            await q(`UPDATE ${TABLE_PRODUCT} SET ${baseValues} WHERE id = ?`, [BaseData.id]);
          }
          if (Tcarat !== 0) {
            await addHistoryTx(q, {
              product_id: BaseData.id,
              action: Tcarat < 0 ? otype : `${otype}_return`,
              type: Tcarat < 0 ? "dr" : "cr",
              description:
                Tcarat < 0
                  ? `Stone ${otype} with reference no is ${headerRef}`
                  : `Stone ${otype} return with reference no is ${headerRef}`,
              party: headerParty,
              narretion: headerNarration,
              date: new Date().toISOString().slice(0, 19).replace("T", " "),
              pcs: Math.abs(Tpcs),
              carat: Math.abs(Tcarat),
              amount: pdata.sell_amount == 0 ? pdata.amount : pdata.sell_amount,
              price: pdata.sell_price == 0 ? pdata.price : pdata.sell_price,
              sku: BaseData.sku,
              invoice: headerInvoice,
              entry_from: "outward",
              entryno: id,
            });
          }
        }
      }

      const finalProductIds = updatedProductIds.length
        ? updatedProductIds
        : keptIds.map((x) => parseInt(x, 10)).filter(Boolean);

      if (!finalProductIds.length) {
        for (const pid of saleProducts) {
          const p = await getProductDetail(q, parseInt(pid, 10), companyId);
          if (p) amount += Number(p.sell_amount || p.amount || 0);
        }
      }

      if (post.shipping_charge) {
        amount += Number(post.shipping_charge) || 0;
      }

      const paidAmount = Number(post.paid_amount ?? existing.paid_amount ?? 0);
      const finalAmount = amount;
      const dueAmount = finalAmount - paidAmount;

      const skuList = [];
      for (const ps of finalProductIds) {
        const skuData = await getProductDetail(q, ps, companyId);
        if (skuData?.sku) skuList.push(skuData.sku);
      }

      const productsCsv = finalProductIds.join(",");
      const status = finalProductIds.length ? existing.status : `close_${otype}`;

      const headerUpdate = {
        place: post.place ?? existing.place,
        date: formatDateOnly(post.date) ?? existing.date,
        reference: headerRef,
        invoicedate: formatDateOnly(post.invoicedate) ?? existing.invoicedate,
        terms: post.terms ?? existing.terms,
        duedate: formatDateOnly(post.duedate) ?? existing.duedate,
        party: headerParty,
        other_party: post.other_party != null ? String(post.other_party) : existing.other_party,
        paid_amount: paidAmount,
        final_amount: finalAmount,
        due_amount: dueAmount,
        narretion: headerNarration,
        products: productsCsv,
        status,
        boc: post.boc ? 1 : 0,
        citi: post.citi ? 1 : 0,
        dbs: post.dbs ? 1 : 0,
        sc: post.sc ? 1 : 0,
      };

      const headerValues = helper.updateString(headerUpdate);
      await q(`UPDATE dai_outward SET ${headerValues} WHERE id = ?`, [id]);

      await q(
        "UPDATE acc_transaction SET party = ?, other_party = ? WHERE type = 'cr' AND sale_id = ?",
        [headerParty, headerUpdate.other_party, id]
      );

      await addUserTrackTx(q, {
        product_id: productsCsv,
        action: otype,
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        description: `${otype} Updated with ${skuList.join(",")} of Outward id ${id}`,
        company: companyId,
        user: post.user ?? DEFAULT_USER_ID,
      });

      return { ok: true, message: "Updated successfully" };
    });
  } catch (error) {
    console.error("updateOutward error:", error);
    return { ok: false, message: error.message || "Update failed" };
  }
}

module.exports = {
  sendTo,
  mapRequestBody,
  validateProductsForMemo,
  validateProductsForMemoSale,
  getProductDetail,
  getIncrementEntry,
  withTransaction,
  holdProducts,
  getHoldDetail,
  normalizeHoldIds,
  updateOutward,
};
