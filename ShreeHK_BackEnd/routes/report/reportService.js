const connection = require("../../connection.js");
const productHelper = require("../../productHelper.js");
const moment = require("moment");
const { auditQuery } = require("../../services/auditDb.js");
const { metaQuery, databaseExists } = require("../../tenantHelper.js");

const queryAsync = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

let boxHistoryTableExists = null;

async function hasBoxHistoryTable() {
  if (boxHistoryTableExists !== null) return boxHistoryTableExists;
  try {
    const rows = await queryAsync(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'dai_boxhistory' LIMIT 1`
    );
    boxHistoryTableExists = rows.length > 0;
  } catch {
    boxHistoryTableExists = false;
  }
  return boxHistoryTableExists;
}

async function getBoxHistoryByProductId(productId) {
  try {
    if (!(await hasBoxHistoryTable())) return [];
    return await queryAsync(
      "SELECT * FROM dai_boxhistory WHERE product_id = ? ORDER BY id",
      [productId]
    );
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      boxHistoryTableExists = false;
      return [];
    }
    throw err;
  }
}

async function getTransferHistory({ sku, companyId, fromDate, toDate }) {
  if (await hasBoxHistoryTable()) {
    let sql = `SELECT bh.*, p.sku FROM dai_boxhistory bh
      LEFT JOIN dai_product p ON p.id = bh.product_id WHERE 1=1`;
    const values = [];
    if (companyId && Number(companyId) > 0) {
      sql += " AND p.company = ?";
      values.push(companyId);
    }
    if (sku) {
      sql += " AND p.sku = ?";
      values.push(sku);
    }
    if (fromDate) {
      sql += " AND bh.date >= ?";
      values.push(fromDate);
    }
    if (toDate) {
      sql += " AND bh.date <= ?";
      values.push(toDate);
    }
    sql += " ORDER BY bh.id DESC LIMIT 500";

    try {
      const rows = await queryAsync(sql, values);
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        boxHistoryTableExists = false;
      } else {
        throw err;
      }
    }
  }

  // Fallback / main store in dai_history
  let sql = `SELECT h.*, COALESCE(h.sku, p.sku) AS sku FROM dai_history h
    LEFT JOIN dai_product p ON p.id = h.product_id WHERE 1=1`;
  const values = [];
  if (companyId && Number(companyId) > 0) {
    sql += " AND p.company = ?";
    values.push(companyId);
  }
  if (sku) {
    sql += " AND (h.sku = ? OR p.sku = ?)";
    values.push(sku, sku);
  }
  if (fromDate) {
    sql += " AND h.date >= ?";
    values.push(fromDate);
  }
  if (toDate) {
    sql += " AND h.date <= ?";
    values.push(toDate);
  }
  sql += " ORDER BY h.id DESC LIMIT 500";

  try {
    return await queryAsync(sql, values);
  } catch (err) {
    throw err;
  }
}

const getCompanyId = (req) => {
  if (req && typeof req === "object") {
    if (req.companyId != null && Number(req.companyId) > 0) return Number(req.companyId);
    if (req.user && req.user.companyId != null && Number(req.user.companyId) > 0) return Number(req.user.companyId);
    if (req.headers && req.headers["x-company-id"] != null && Number(req.headers["x-company-id"]) > 0) {
      return Number(req.headers["x-company-id"]);
    }
  }
  const n = Number(req);
  return n > 0 ? n : 0;
};
const getUserId = (req) => Number(req.user?.user_id) || 1;
const hideUser16 = (userId) => userId !== 16 && userId !== 1;
/** Exclude system user 16 but keep rows with NULL user (older outward history). */
const HISTORY_HIDE_USER16_SQL = " AND (user IS NULL OR user <> 16)";

/** Mirrors PHP Helper::getStoneAction() */
const STONE_ACTION_LABELS = {
  import: "Import",
  in_import: "In Import",
  purchase: "Purchase",
  purchase_return: "Purchase Return",
  lab: "Send To Lab",
  lab_return: "Lab Return",
  memo: "Memo",
  in_memo: "In Memo",
  sale: "Sale",
  sale_return: "Sale Return",
  sale_close: "Sale Close",
  close_memo: "Memo Close",
  close_lab: "Lab Close",
  memo_return: "Memo Return",
  memo_close: "Memo Close",
  lab_close: "Lab Close",
  hold: "Hold",
  unhold: "Unhold",
  price_change: "Price Changed",
  unboxing: "Unboxing",
  boxing: "Boxing",
  to_box: "To Box",
  from_box: "From Box",
  export: "Export",
  export_close: "Export Close",
  consign: "Consignment",
  in_consign: "In Consign",
  consign_return: "Consign Return",
  consign_close: "Consign Close",
  sku_change: "Sku Change",
  purchase_delete: "Purchase Delete",
  close_sale: "Sale Close",
};

function queryPool(pool, sql, values = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function isBlankHistoryUser(user) {
  return user == null || String(user).trim() === "" || String(user).trim() === "0";
}

function resolveHistoryUserName(h, userMap = {}) {
  const fromMap =
    userMap[h.user] ||
    userMap[String(h.user)] ||
    userMap[Number(h.user)] ||
    "";
  const existing =
    h.updated_by && String(h.updated_by).trim() !== "—"
      ? String(h.updated_by).trim()
      : "";
  const raw =
    existing ||
    (h.user_name && String(h.user_name).trim()) ||
    fromMap ||
    (!isBlankHistoryUser(h.user) ? `User #${h.user}` : "");
  return String(raw || "").trim() || "—";
}

/** When dai_history.user is NULL (old sale/memo bugs), recover from outward/inward invoice. */
async function backfillHistoryUsers(history) {
  const need = (history || []).filter((h) => isBlankHistoryUser(h.user) && h.invoice);
  if (!need.length) return history || [];

  const invoices = [...new Set(need.map((h) => String(h.invoice).trim()).filter(Boolean))];
  if (!invoices.length) return history;

  const placeholders = invoices.map(() => "?").join(",");
  const byInvoice = {};
  try {
    const outRows = await queryAsync(
      `SELECT invoiceno, user FROM dai_outward
       WHERE invoiceno IN (${placeholders}) AND user IS NOT NULL AND user <> 0
       ORDER BY id DESC`,
      invoices
    );
    (outRows || []).forEach((r) => {
      const key = String(r.invoiceno || "").trim();
      if (key && byInvoice[key] == null) byInvoice[key] = r.user;
    });
  } catch (_) {
    /* ignore */
  }
  try {
    const inRows = await queryAsync(
      `SELECT invoiceno, user FROM dai_inward
       WHERE invoiceno IN (${placeholders}) AND user IS NOT NULL AND user <> 0
       ORDER BY id DESC`,
      invoices
    );
    (inRows || []).forEach((r) => {
      const key = String(r.invoiceno || "").trim();
      if (key && byInvoice[key] == null) byInvoice[key] = r.user;
    });
  } catch (_) {
    /* ignore */
  }

  const patched = [];
  for (const h of history) {
    if (!isBlankHistoryUser(h.user)) {
      patched.push(h);
      continue;
    }
    const key = String(h.invoice || "").trim();
    const recovered = key ? byInvoice[key] : null;
    if (recovered == null) {
      patched.push(h);
      continue;
    }
    patched.push({ ...h, user: recovered });
    if (h.id != null) {
      try {
        await queryAsync(
          `UPDATE dai_history SET user = ?
           WHERE id = ? AND (user IS NULL OR user = 0 OR user = '')`,
          [recovered, h.id]
        );
      } catch (_) {
        /* non-fatal */
      }
    }
  }
  return patched;
}

function mapStoneHistoryRows(history, partyMap, userMap = {}) {
  return history.map((h) => ({
    ...h,
    party_name: partyMap[h.party] || h.party || "",
    action_label: STONE_ACTION_LABELS[h.action] || h.action,
    updated_by: resolveHistoryUserName(h, userMap),
  }));
}

/**
 * Enrich memo/consign return rows so Stone History can show
 * "returned X of memo Y" even for older generic descriptions.
 * Does not change pcs/carat/balance — display/context only.
 */
function enrichMemoReturnContext(history) {
  const rows = Array.isArray(history) ? history : [];
  /** @type {Map<string, { pcs: number, carat: number, invoice: string }>} */
  const lastMemoByInvoice = new Map();

  return rows.map((h) => {
    const action = String(h.action || "").toLowerCase().trim();
    const invoice = String(h.invoice || "").trim();
    const pcs = Number(h.pcs) || 0;
    const carat = Number(h.carat) || 0;

    if (action === "memo" || action === "consign") {
      if (invoice) {
        lastMemoByInvoice.set(invoice, { pcs: Math.abs(pcs), carat: Math.abs(carat), invoice });
      }
      return {
        ...h,
        impacts_onhand_stock: true,
      };
    }

    if (
      action === "sale" ||
      action === "export" ||
      action === "sale_close" ||
      action === "close_sale" ||
      action === "memo_to_sale"
    ) {
      const descLower = String(h.description || "").toLowerCase();
      const isExplicitMemoSale =
        descLower.includes("from memo") ||
        descLower.includes("memo to sale") ||
        action === "memo_to_sale" ||
        String(h.narretion || "").toLowerCase().includes("from memo");

      const memoOf = invoice ? lastMemoByInvoice.get(invoice) : null;
      const isMemoInvoiceMatch = Boolean(memoOf && memoOf.carat > 0.0001);
      const isFromMemo = isExplicitMemoSale || isMemoInvoiceMatch;

      if (isFromMemo) {
        const soldCarat = Math.abs(carat);
        const soldPcs = Math.abs(pcs);
        if (memoOf) {
          const leftCarat = Math.max(0, memoOf.carat - soldCarat);
          const leftPcs = Math.max(0, memoOf.pcs - soldPcs);
          lastMemoByInvoice.set(invoice, {
            pcs: leftPcs,
            carat: leftCarat,
            invoice,
          });
        }
        return {
          ...h,
          is_from_memo: true,
          impacts_onhand_stock: false,
          memo_invoice: invoice || (memoOf ? memoOf.invoice : ""),
          action_label: "Sale (From Memo)",
          balance_note: `Sold from Memo (${invoice || "open memo"}). This carat was already debited from on-hand stock when memo was issued, so B.Carat does not deduct again.`,
        };
      }
      return {
        ...h,
        is_from_memo: false,
        impacts_onhand_stock: true,
      };
    }

    if (["hold", "unhold", "price_change", "sku_change"].includes(action)) {
      return {
        ...h,
        impacts_onhand_stock: false,
      };
    }

    if (action !== "memo_return" && action !== "consign_return") {
      return {
        ...h,
        impacts_onhand_stock: true,
      };
    }

    const memoOf = invoice ? lastMemoByInvoice.get(invoice) : null;
    const existingDesc = String(h.description || "").trim();
    const alreadyDetailed = /of memo|\(full\)/i.test(existingDesc);
    const retPcsLabel = pcs;
    const retCaratLabel = Number(carat.toFixed(3));

    let description = existingDesc;
    let memo_of_pcs = null;
    let memo_of_carat = null;
    let is_partial_memo_return = false;

    if (memoOf) {
      memo_of_pcs = memoOf.pcs;
      memo_of_carat = memoOf.carat;
      const leftPcs = Math.max(0, memoOf.pcs - pcs);
      const leftCarat = Math.max(0, memoOf.carat - carat);
      is_partial_memo_return =
        leftCarat > 0.0001 || (memoOf.pcs > 0 && leftPcs > 0.0001);

      if (!alreadyDetailed) {
        description = is_partial_memo_return
          ? `Stone Memo return ${retPcsLabel}pcs / ${retCaratLabel}ct of memo ${memoOf.pcs}pcs / ${Number(memoOf.carat.toFixed(3))}ct`
          : `Stone Memo return ${retPcsLabel}pcs / ${retCaratLabel}ct (full) of memo ${memoOf.pcs}pcs / ${Number(memoOf.carat.toFixed(3))}ct`;
        if (existingDesc && !/stone memo return/i.test(existingDesc)) {
          description = `${description} — ${existingDesc}`;
        }
      }

      // Reduce open memo qty so a 2nd partial return against same invoice still makes sense
      lastMemoByInvoice.set(invoice, {
        pcs: leftPcs,
        carat: leftCarat,
        invoice,
      });
    } else if (!alreadyDetailed && (pcs > 0 || carat > 0)) {
      description = `Stone Memo return ${retPcsLabel}pcs / ${retCaratLabel}ct`;
      if (existingDesc) description = `${description} — ${existingDesc}`;
    }

    return {
      ...h,
      description,
      memo_of_pcs,
      memo_of_carat,
      is_partial_memo_return,
      impacts_onhand_stock: true,
    };
  });
}

function buildDateFilter(from, to, column = "date") {
  if (from && to) {
    const ff = moment(from, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    const ft = moment(to, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    return { sql: ` AND o.${column} BETWEEN ? AND ?`, values: [ff, ft] };
  }
  if (from) {
    const ff = moment(from, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    return { sql: ` AND o.${column} BETWEEN ? AND ?`, values: [ff, "2050/12/31"] };
  }
  if (to) {
    const ft = moment(to, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    return { sql: ` AND o.${column} BETWEEN ? AND ?`, values: ["2010/01/01", ft] };
  }
  return { sql: "", values: [] };
}

async function getPartyMap() {
  const rows = await queryAsync("SELECT id, name FROM dai_party");
  const map = {};
  rows.forEach((r) => {
    map[r.id] = r.name;
  });
  return map;
}

/** Map user_id → display name (first+last, else user_name). Prefer meta DB. */
async function getUserMap() {
  const map = {};
  const addRows = (rows) => {
    (rows || []).forEach((r) => {
      const full = `${r.first_name || ""} ${r.last_name || ""}`.trim();
      const name = full || r.user_name || String(r.user_id);
      map[r.user_id] = name;
      map[String(r.user_id)] = name;
    });
  };
  try {
    addRows(
      await metaQuery(
        "SELECT user_id, first_name, last_name, user_name FROM user"
      )
    );
  } catch (_) {
    /* fall through to tenant */
  }
  if (!Object.keys(map).length) {
    try {
      addRows(
        await queryAsync(
          "SELECT user_id, first_name, last_name, user_name FROM user"
        )
      );
    } catch (_) {
      /* leave empty */
    }
  }
  return map;
}

async function getGroupReport(post, companyId, userId) {
  const report = post.report || post.reportType;
  if (!report) return [];

  const partyFilter =
    post.party && post.party !== "0" && post.party !== ""
      ? { sql: " AND party = ?", values: [post.party] }
      : { sql: "", values: [] };

  const mainGroup =
    post.main_group || post.mainGroup
      ? { sql: " AND p.main_group = ?", values: [post.main_group || post.mainGroup] }
      : { sql: "", values: [] };

  const subGroup =
    post.sub_group || post.subGroup
      ? { sql: " AND p.sub_group = ?", values: [post.sub_group || post.subGroup] }
      : { sql: "", values: [] };

  const dateCol = buildDateFilter(post.cfrom || post.fromDate, post.cto || post.toDate, "date");
  const userFilter = hideUser16(userId) ? HISTORY_HIDE_USER16_SQL : "";
  const data = [];

  const outwardReports = ["memo", "lab", "sale", "export", "close_memo", "close_sale"];
  if (outwardReports.includes(report)) {
    let typeSql = " AND type = ?";
    let typeVal = report;
    if (["sale", "export", "close_sale"].includes(report)) {
      typeSql = " AND type IN ('sale','export')";
      typeVal = null;
    }
    if (["memo", "close_memo", "consign"].includes(report)) {
      typeSql = " AND type IN ('memo','consign')";
      typeVal = null;
    }

    let statusSql =
      " AND status NOT IN ('sale_close','close_sale','close_memo','close_lab','close_export')";
    if (report === "close_memo") statusSql = " AND status IN ('close_memo','close_consign')";
    if (report === "close_sale") statusSql = " AND status IN ('sale_close','close_export')";

    const productsClause =
      report === "close_memo" || report === "close_sale" ? "" : " AND products <> ''";

    let sql = `SELECT * FROM dai_outward WHERE company = ?${userFilter}${statusSql}${typeSql}${partyFilter.sql}${dateCol.sql}${productsClause} ORDER BY date DESC, id DESC`;
    const values = [companyId];
    if (typeVal) values.push(typeVal);
    values.push(...partyFilter.values, ...dateCol.values);

    if (!typeVal) {
      sql = `SELECT * FROM dai_outward WHERE company = ?${userFilter}${statusSql}${typeSql}${partyFilter.sql}${dateCol.sql}${productsClause} ORDER BY date DESC, id DESC`;
    }

    // perf: outward rows and party map are independent reads
    const [outwardRows, partyMap] = await Promise.all([
      queryAsync(sql, values),
      getPartyMap(),
    ]);

    // Batch fetch products and return records to eliminate N+1 loop queries
    const allProductIds = [];
    const allReturnIds = [];
    for (const row of outwardRows) {
      const ids = (row.products || "").split(",").map((s) => s.trim()).filter(Boolean);
      allProductIds.push(...ids);

      if ((report === "close_memo" || report === "close_sale") && !row.products && row.out_product) {
        const retIds = (row.out_product || "").split(",").map((s) => s.trim()).filter(Boolean);
        allReturnIds.push(...retIds);
      }
    }

    const uniqueProductIds = [...new Set(allProductIds)];
    const uniqueReturnIds = [...new Set(allReturnIds)];

    const productMap = {};
    if (uniqueProductIds.length > 0) {
      const placeholders = uniqueProductIds.map(() => "?").join(",");
      const prodSql = `SELECT p.*, pv.* FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.id IN (${placeholders})${mainGroup.sql}${subGroup.sql}`;
      const prodRows = await queryAsync(prodSql, [...uniqueProductIds, ...mainGroup.values, ...subGroup.values]);
      for (const p of prodRows) {
        productMap[p.id] = p;
      }
    }

    const returnMap = {};
    if (uniqueReturnIds.length > 0) {
      const placeholders = uniqueReturnIds.map(() => "?").join(",");
      const retSql = `SELECT pr.price AS r_price, pr.amount AS r_amount, pr.*, p.*, pv.*
        FROM dai_product_return pr
        INNER JOIN dai_product p ON p.id = pr.product_id
        INNER JOIN dai_product_value pv ON pr.product_id = pv.product_id
        WHERE pr.id IN (${placeholders})${mainGroup.sql}${subGroup.sql}`;
      const retRows = await queryAsync(retSql, [...uniqueReturnIds, ...mainGroup.values, ...subGroup.values]);
      for (const r of retRows) {
        returnMap[r.id] = r;
      }
    }

    for (const row of outwardRows) {
      const ids = (row.products || "").split(",").map((s) => s.trim()).filter(Boolean);
      for (const id of ids) {
        const p = productMap[id];
        if (p) {
          data.push({
            ...p,
            party: row.party,
            party_name: partyMap[row.party] || "",
            out_date: row.date,
            entryno: row.entryno,
            invoiceno: row.invoiceno,
          });
        }
      }

      if ((report === "close_memo" || report === "close_sale") && !row.products && row.out_product) {
        const retIds = (row.out_product || "").split(",").map((s) => s.trim()).filter(Boolean);
        for (const rid of retIds) {
          const p = returnMap[rid];
          if (p) {
            data.push({
              ...p,
              party: row.party,
              party_name: partyMap[row.party] || "",
              out_date: row.date,
              entryno: row.entryno,
              invoiceno: row.invoiceno,
            });
          }
        }
      }
    }
  } else if (report === "purchase" || report === "import") {
    const sql = `SELECT * FROM dai_inward WHERE deleted = 0 AND company = ?${userFilter}
      AND inward_type IN ('purchase','import')${partyFilter.sql}${dateCol.sql} ORDER BY date DESC, id DESC`;
    // perf: inward rows and party map are independent reads
    const [inwardRows, partyMap] = await Promise.all([
      queryAsync(sql, [companyId, ...partyFilter.values, ...dateCol.values]),
      getPartyMap(),
    ]);

    const inwardIds = inwardRows.map((r) => r.id).filter(Boolean);
    const inwardProductsByInwardId = {};
    if (inwardIds.length > 0) {
      const placeholders = inwardIds.map(() => "?").join(",");
      const prodSql = `SELECT p.*, pv.* FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id
        WHERE p.inward_id IN (${placeholders})${mainGroup.sql}${subGroup.sql}`;
      const prods = await queryAsync(prodSql, [...inwardIds, ...mainGroup.values, ...subGroup.values]);
      for (const p of prods) {
        if (!inwardProductsByInwardId[p.inward_id]) inwardProductsByInwardId[p.inward_id] = [];
        inwardProductsByInwardId[p.inward_id].push(p);
      }
    }

    for (const row of inwardRows) {
      const prods = inwardProductsByInwardId[row.id] || [];
      prods.forEach((p) => {
        data.push({
          ...p,
          party: row.party,
          party_name: partyMap[row.party] || "",
          out_date: row.date,
          entryno: row.entryno,
          invoiceno: row.invoiceno,
        });
      });
    }
  }

  return data.map((row, idx) => formatGroupRow(row, report, idx + 1));
}

function formatGroupRow(row, report, no) {
  let polish_pcs, polish_carat, price, amount;
  if (report === "close_memo" || report === "close_sale") {
    polish_carat = row.carat;
    polish_pcs = row.pcs;
    price = parseFloat(row.r_price || 0);
    amount = parseFloat(row.r_amount || 0);
  } else {
    polish_carat =
      parseFloat(row.purchase_carat) === 0 ? row.polish_carat : row.purchase_carat;
    polish_pcs = parseFloat(row.purchase_pcs) === 0 ? row.polish_pcs : row.purchase_pcs;
    if (report === "purchase") {
      price = parseFloat(row.purchase_price) === 0 ? row.price : row.purchase_price;
      amount = parseFloat(row.purchase_amount) === 0 ? row.amount : row.purchase_amount;
    } else {
      price = parseFloat(row.sell_price) === 0 ? row.price : row.sell_price;
      amount = parseFloat(row.sell_amount) === 0 ? row.amount : row.sell_amount;
    }
  }

  return {
    no,
    company: row.party_name || "",
    date: row.out_date ? moment(row.out_date).format("DD-MM-YYYY") : "",
    invoice: row.invoiceno || "",
    sku: row.sku || "",
    lab: row.lab || "",
    reportNo: row.report_no || "",
    pcs: polish_pcs,
    carat: polish_carat,
    price,
    amount,
    shape: row.shape || "",
    color: row.color || "",
    clarity: row.clarity || "",
    remark: row.remark || "",
    mainGroup: row.main_group || "",
    subGroup: row.sub_group || "",
  };
}

async function getStoneSaleReport(post, companyId) {
  const limit = parseInt(post.limit, 10) || 100;
  const allCompanies = companyId == null || companyId === "" || Number(companyId) <= 0;

  let partySql = "";
  const values = [];
  let companySql = "";
  if (!allCompanies) {
    companySql = " AND company = ?";
    values.push(companyId);
  }
  if (post.party && post.party !== "0" && post.party !== "") {
    partySql = " AND party = ?";
    values.push(post.party);
  }

  let dateSql = "";
  const fd = post.cfrom || post.fromDate;
  const td = post.cto || post.toDate;
  if (fd && td) {
    dateSql = " AND invoicedate BETWEEN ? AND ?";
    values.push(fd, td);
  } else if (fd) {
    dateSql = " AND invoicedate >= ?";
    values.push(fd);
  } else if (td) {
    dateSql = " AND invoicedate <= ?";
    values.push(td);
  }

  let giaSql = "";
  if (post.gia && post["non-gia"]) {
    giaSql = " AND (p.lab = 'gia' OR p.lab IS NULL OR p.lab = '')";
  } else if (post.gia) {
    giaSql = " AND p.lab = 'gia'";
  } else if (post["non-gia"]) {
    giaSql = " AND (p.lab IS NULL OR p.lab = '')";
  }

  let invoiceSql = "";
  if (post.invoice || post.invoiceNo) {
    invoiceSql = " AND invoiceno = ?";
    values.push(post.invoice || post.invoiceNo);
  }

  const outwardSql = `SELECT * FROM dai_outward WHERE products <> ''${companySql}
    AND status NOT IN ('sale_close','close_sale','close_export')
    AND type IN ('sale','export')${partySql}${dateSql}${invoiceSql}
    ORDER BY date DESC, id DESC LIMIT ?`;
  values.push(limit);

  // perf: party map and outward rows are independent
  const [partyList, outwardRows] = await Promise.all([
    getPartyMap(),
    queryAsync(outwardSql, values),
  ]);
  const productIds = [];
  outwardRows.forEach((row) => {
    (row.products || "").split(",").forEach((id) => {
      if (id) productIds.push(parseInt(id, 10));
    });
  });

  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const productRows = await queryAsync(
    `SELECT p.id, p.sku, p.lab, p.polish_pcs, p.polish_carat, p.sell_price, p.sell_amount,
      pv.shape, pv.clarity, pv.color, pv.report_no
     FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id
     WHERE p.id IN (${uniqueIds.map(() => "?").join(",")})${giaSql}`,
    uniqueIds
  );

  const productMap = {};
  productRows.forEach((p) => {
    productMap[p.id] = p;
  });

  const data = [];
  outwardRows.forEach((row) => {
    (row.products || "").split(",").forEach((id) => {
      const pid = parseInt(id, 10);
      const product = productMap[pid];
      if (!product) return;
      data.push({
        sku: product.sku,
        lab: product.lab,
        report_no: product.report_no,
        polish_pcs: product.polish_pcs,
        polish_carat: product.polish_carat,
        sell_price: product.sell_price,
        sell_amount: product.sell_amount,
        shape: product.shape,
        color: product.color,
        clarity: product.clarity,
        party: partyList[row.party] || "",
        out_date: row.invoicedate ? moment(row.invoicedate).format("DD-MM-YYYY") : "",
        entryno: row.entryno,
        invoiceno: row.invoiceno,
        terms: row.terms,
        due_date: row.duedate ? moment(row.duedate).format("DD-MM-YYYY") : "",
        paid_amount: row.paid_amount,
        company: row.company,
        outward: row.type || "sale",
        status: String(row.type || "sale").toUpperCase(),
      });
    });
  });

  return data;
}

async function getStonePurchaseReport(post, companyId) {
  const limit = parseInt(post.limit, 10) || 100;
  const allCompanies = companyId == null || companyId === "" || Number(companyId) <= 0;

  let partySql = "";
  const values = [];
  let companySql = "";
  if (!allCompanies) {
    companySql = " AND company = ?";
    values.push(companyId);
  }
  if (post.party && post.party !== "0" && post.party !== "") {
    partySql = " AND party = ?";
    values.push(post.party);
  }

  let dateSql = "";
  const fd = post.cfrom || post.fromDate;
  const td = post.cto || post.toDate;
  if (fd && td) {
    dateSql = " AND invoicedate BETWEEN ? AND ?";
    values.push(fd, td);
  } else if (fd) {
    dateSql = " AND invoicedate >= ?";
    values.push(fd);
  } else if (td) {
    dateSql = " AND invoicedate <= ?";
    values.push(td);
  }

  let invoiceSql = "";
  if (post.invoice || post.invoiceNo) {
    invoiceSql = " AND invoiceno = ?";
    values.push(post.invoice || post.invoiceNo);
  }

  const inwardSql = `SELECT * FROM dai_inward
    WHERE (deleted = 0 OR deleted IS NULL)${companySql}
    AND inward_type IN ('purchase','import')${partySql}${dateSql}${invoiceSql}
    ORDER BY date DESC, id DESC LIMIT ?`;
  values.push(limit);

  // perf: party map and inward rows are independent
  const [partyList, inwardRows] = await Promise.all([
    getPartyMap(),
    queryAsync(inwardSql, values),
  ]);
  if (!inwardRows.length) return [];

  const inwardIds = inwardRows.map((r) => r.id);
  const productRows = await queryAsync(
    `SELECT p.id, p.inward_id, p.sku, p.lab, p.polish_pcs, p.polish_carat,
      p.purchase_pcs, p.purchase_carat, p.price, p.amount, p.purchase_price, p.purchase_amount,
      p.outward, p.group_type, p.outward_parent,
      pv.shape, pv.clarity, pv.color, pv.report_no
     FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id
     WHERE p.inward_id IN (${inwardIds.map(() => "?").join(",")})`,
    inwardIds
  );

  const productsByInwardId = {};
  productRows.forEach((prod) => {
    if (!productsByInwardId[prod.inward_id]) productsByInwardId[prod.inward_id] = [];
    productsByInwardId[prod.inward_id].push(prod);
  });

  const data = [];
  inwardRows.forEach((row) => {
    (productsByInwardId[row.id] || []).forEach((prod) => {
      if (
        (prod.outward === "memo" || prod.outward === "sale") &&
        (prod.group_type !== "single" ||
          (prod.group_type === "single" && prod.outward_parent))
      ) {
        return;
      }
      data.push({
        sku: prod.sku,
        lab: prod.lab,
        report_no: prod.report_no,
        polish_pcs: parseFloat(prod.purchase_pcs) === 0 ? prod.polish_pcs : prod.purchase_pcs,
        polish_carat: parseFloat(prod.purchase_carat) === 0 ? prod.polish_carat : prod.purchase_carat,
        sell_price: parseFloat(prod.purchase_price) === 0 ? prod.price : prod.purchase_price,
        sell_amount: parseFloat(prod.purchase_amount) === 0 ? prod.amount : prod.purchase_amount,
        shape: prod.shape,
        color: prod.color,
        clarity: prod.clarity,
        party: partyList[row.party] || "",
        out_date: row.invoicedate ? moment(row.invoicedate).format("DD-MM-YYYY") : "",
        entryno: row.entryno,
        invoiceno: row.invoiceno,
        terms: row.terms,
        due_date: row.duedate && row.duedate !== "0000-00-00" ? moment(row.duedate).format("DD-MM-YYYY") : "",
        paid_amount: row.paid_amount,
        company: row.company,
        outward: row.inward_type || "purchase",
        status: String(row.inward_type || "purchase").toUpperCase(),
      });
    });
  });

  return data;
}

function formatStoneDateTime(value) {
  if (!value || value === "0000-00-00" || value === "0000-00-00 00:00:00") return "";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  return m.format("DD-MM-YYYY HH:mm:ss");
}

async function getActivityLogForStone(sku, productId, companyId) {
  try {
    return await auditQuery(
      `SELECT id, action_type, module_name, description, user_name, user_role,
              changed_fields, old_value, new_value, created_at
       FROM dai_activity_log
       WHERE company_id = ? AND (record_reference = ? OR record_id = ?)
       ORDER BY created_at ASC, id ASC`,
      [companyId, sku, String(productId)]
    );
  } catch {
    return [];
  }
}

function enrichHistoryDates(history, activityLogs) {
  const logsByDay = {};
  activityLogs.forEach((log) => {
    const day = moment(log.created_at).format("YYYY-MM-DD");
    if (!logsByDay[day]) logsByDay[day] = [];
    logsByDay[day].push(log);
  });

  const dayIndex = {};

  return history.map((h) => {
    const day = moment(h.date).format("YYYY-MM-DD");
    const pool = logsByDay[day] || [];
    const idx = dayIndex[day] || 0;
    dayIndex[day] = idx + 1;
    const log = pool[idx];
    const fromLog = log?.user_name && String(log.user_name).trim();
    const fromRow =
      h.updated_by && String(h.updated_by).trim() !== "—"
        ? String(h.updated_by).trim()
        : "";
    const updatedBy = fromLog || fromRow || "—";

    if (log?.created_at) {
      return {
        ...h,
        updated_at: log.created_at,
        updated_by: updatedBy,
        date_display: formatStoneDateTime(log.created_at),
      };
    }

    return {
      ...h,
      updated_by: updatedBy,
      date_display: formatStoneDateTime(h.date),
    };
  });
}

async function resolveStoneDetail(sku, companyId) {
  const trimmed = String(sku || "").trim();
  if (!trimmed) return null;

  let detail = null;
  if (companyId) {
    detail = await productHelper.getDetailBySku(trimmed, companyId);
  }
  if (!detail) {
    detail = await productHelper.getDetail(trimmed, "p.sku");
  }
  // Case-insensitive global fallback (sale-stock allCompanies → History)
  if (!detail || !detail.id) {
    const rows = await queryAsync(
      `SELECT p.*, v.report_no, v.shape, v.clarity, v.size, v.f_intensity, v.cut, v.polish, v.symmentry, v.table_pc, v.depth_pc, v.mesurment, v.gridle, v.intensity, v.overtone, v.color, v.package, v.bgm, v.eyeclean
       FROM dai_product p
       LEFT JOIN dai_product_value v ON p.id = v.product_id
       WHERE UPPER(TRIM(p.sku)) = UPPER(?)
       LIMIT 1`,
      [trimmed]
    );
    detail = rows?.[0] || null;
  }
  if (!detail || !detail.id) return null;
  // Do not reject company mismatch: sale-stock / reports may show stones from other
  // companies the user can already list via allCompanies.
  return detail;
}

function computeStockSummary(detail, enrichedHistory) {
  const initialRow = enrichedHistory.find(
    (h) => ["import", "in_import", "purchase", "in_memo", "in_consign"].includes(String(h.action || "").toLowerCase())
  ) || enrichedHistory[0] || null;

  const initialCarat = initialRow ? Math.abs(Number(initialRow.carat) || 0) : Number(detail.purchase_carat || detail.polish_carat || 0);
  const initialPcs = initialRow ? Math.abs(Number(initialRow.pcs) || 0) : Number(detail.purchase_pcs || detail.polish_pcs || 0);

  let totalMemoOutCarat = 0;
  let totalMemoOutPcs = 0;
  let totalMemoReturnCarat = 0;
  let totalMemoReturnPcs = 0;
  let totalSoldFromMemoCarat = 0;
  let totalSoldFromMemoPcs = 0;
  let totalDirectSaleCarat = 0;
  let totalDirectSalePcs = 0;

  enrichedHistory.forEach((h) => {
    const act = String(h.action || "").toLowerCase();
    const c = Math.abs(Number(h.carat) || 0);
    const p = Math.abs(Number(h.pcs) || 0);

    if (act === "memo" || act === "consign") {
      totalMemoOutCarat += c;
      totalMemoOutPcs += p;
    } else if (act === "memo_return" || act === "consign_return") {
      totalMemoReturnCarat += c;
      totalMemoReturnPcs += p;
    } else if (h.is_from_memo) {
      totalSoldFromMemoCarat += c;
      totalSoldFromMemoPcs += p;
    } else if (act === "sale" || act === "export") {
      totalDirectSaleCarat += c;
      totalDirectSalePcs += p;
    }
  });

  const onhandCarat = Number(detail.polish_carat != null ? detail.polish_carat : detail.onhand_carat || 0);
  const onhandPcs = Number(detail.polish_pcs != null ? detail.polish_pcs : detail.onhand_pcs || 0);
  const openMemoCarat = Math.max(0, Number((totalMemoOutCarat - totalMemoReturnCarat - totalSoldFromMemoCarat).toFixed(3)));

  let formulaText = "";
  if (totalSoldFromMemoCarat > 0) {
    formulaText = `Initial (${initialCarat.toFixed(3)} ct) - Memo (${totalMemoOutCarat.toFixed(3)} ct) + Memo Return (${totalMemoReturnCarat.toFixed(3)} ct) = On-Hand (${onhandCarat.toFixed(3)} ct). Note: ${totalSoldFromMemoCarat.toFixed(3)} ct was sold from Memo (was already deducted on Memo stage).`;
  } else if (totalMemoOutCarat > 0) {
    formulaText = `Initial (${initialCarat.toFixed(3)} ct) - Memo (${totalMemoOutCarat.toFixed(3)} ct) + Memo Return (${totalMemoReturnCarat.toFixed(3)} ct) = On-Hand (${onhandCarat.toFixed(3)} ct).`;
  } else if (totalDirectSaleCarat > 0) {
    formulaText = `Initial (${initialCarat.toFixed(3)} ct) - Sale (${totalDirectSaleCarat.toFixed(3)} ct) = On-Hand (${onhandCarat.toFixed(3)} ct).`;
  } else {
    formulaText = `On-Hand Stock: ${onhandCarat.toFixed(3)} ct (${onhandPcs} pcs).`;
  }

  return {
    initial_carat: Number(initialCarat.toFixed(3)),
    initial_pcs: initialPcs,
    onhand_carat: Number(onhandCarat.toFixed(3)),
    onhand_pcs: onhandPcs,
    memo_out_carat: Number(totalMemoOutCarat.toFixed(3)),
    memo_return_carat: Number(totalMemoReturnCarat.toFixed(3)),
    sold_from_memo_carat: Number(totalSoldFromMemoCarat.toFixed(3)),
    sold_from_memo_pcs: totalSoldFromMemoPcs,
    direct_sold_carat: Number(totalDirectSaleCarat.toFixed(3)),
    open_memo_carat: openMemoCarat,
    has_from_memo_sale: totalSoldFromMemoCarat > 0,
    formula_text: formulaText,
  };
}

async function getStoneLineageTree(detail, history, companyId) {
  const current = {
    id: detail.id,
    sku: detail.sku,
    group_type: detail.group_type || "single",
    polish_pcs: detail.polish_pcs || 0,
    polish_carat: detail.polish_carat || 0,
    price: detail.price || 0,
    amount: detail.amount || 0,
    outward: detail.outward || "",
    status: !detail.outward ? "AVAILABLE" : String(detail.outward).toUpperCase(),
    shape: detail.shape || "",
    color: detail.color || detail.main_color || "",
    clarity: detail.clarity || "",
    location: detail.location || "",
  };

  const parentId = Number(detail.parent_id || detail.box_id || detail.parcel_id || 0);
  let parent = null;
  if (parentId > 0 && parentId !== detail.id) {
    try {
      const parentRows = await queryAsync(
        `SELECT p.id, p.sku, p.group_type, p.polish_pcs, p.polish_carat, p.price, p.amount,
                p.outward, p.location, p.company, pv.shape, pv.color, pv.clarity
         FROM dai_product p
         LEFT JOIN dai_product_value pv ON p.id = pv.product_id
         WHERE p.id = ? LIMIT 1`,
        [parentId]
      );
      if (parentRows?.length) {
        const pr = parentRows[0];
        parent = {
          id: pr.id,
          sku: pr.sku,
          group_type: pr.group_type || "box",
          polish_pcs: pr.polish_pcs || 0,
          polish_carat: pr.polish_carat || 0,
          price: pr.price || 0,
          amount: pr.amount || 0,
          outward: pr.outward || "",
          status: !pr.outward ? "AVAILABLE" : String(pr.outward).toUpperCase(),
          shape: pr.shape || "",
          color: pr.color || "",
          clarity: pr.clarity || "",
        };
      }
    } catch (_) {}
  }

  let children = [];
  const childIdSet = new Set(
    String(detail.box_products || detail.parcel_products || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n !== detail.id)
  );

  try {
    let childQuery = `SELECT p.id, p.sku, p.group_type, p.polish_pcs, p.polish_carat, p.price, p.amount,
                             p.outward, p.visibility, p.location, p.company,
                             pv.shape, pv.color, pv.clarity, pv.cut, pv.report_no
                      FROM dai_product p
                      LEFT JOIN dai_product_value pv ON p.id = pv.product_id
                      WHERE (p.parent_id = ? OR p.box_id = ? OR p.parcel_id = ?) AND p.id <> ?`;
    const childParams = [detail.id, detail.id, detail.id, detail.id];
    if (childIdSet.size > 0) {
      childQuery += ` OR p.id IN (${[...childIdSet].map(() => "?").join(",")})`;
      childParams.push(...childIdSet);
    }
    childQuery += ` ORDER BY p.id ASC LIMIT 200`;
    const childRows = await queryAsync(childQuery, childParams);
    children = (childRows || []).map((cr) => ({
      id: cr.id,
      sku: cr.sku,
      group_type: cr.group_type || "single",
      polish_pcs: cr.polish_pcs || 0,
      polish_carat: cr.polish_carat || 0,
      price: cr.price || 0,
      amount: cr.amount || 0,
      outward: cr.outward || "",
      status: !cr.outward ? "AVAILABLE" : String(cr.outward).toUpperCase(),
      shape: cr.shape || "",
      color: cr.color || "",
      clarity: cr.clarity || "",
      cut: cr.cut || "",
      report_no: cr.report_no || "",
      visibility: cr.visibility,
    }));
  } catch (_) {}

  let siblings = [];
  if (parentId > 0 && parentId !== detail.id) {
    try {
      const sibRows = await queryAsync(
        `SELECT p.id, p.sku, p.group_type, p.polish_pcs, p.polish_carat, p.price, p.amount,
                p.outward, pv.shape, pv.color, pv.clarity
         FROM dai_product p
         LEFT JOIN dai_product_value pv ON p.id = pv.product_id
         WHERE (p.parent_id = ? OR p.box_id = ? OR p.parcel_id = ?) AND p.id <> ?
         ORDER BY p.id ASC LIMIT 50`,
        [parentId, parentId, parentId, detail.id]
      );
      siblings = (sibRows || []).map((sr) => ({
        id: sr.id,
        sku: sr.sku,
        group_type: sr.group_type || "single",
        polish_pcs: sr.polish_pcs || 0,
        polish_carat: sr.polish_carat || 0,
        status: !sr.outward ? "AVAILABLE" : String(sr.outward).toUpperCase(),
        shape: sr.shape || "",
        color: sr.color || "",
        clarity: sr.clarity || "",
      }));
    } catch (_) {}
  }

  let pair = null;
  if (detail.pair && String(detail.pair).trim()) {
    try {
      const pairRows = await queryAsync(
        `SELECT p.id, p.sku, p.group_type, p.polish_pcs, p.polish_carat, p.price, p.amount,
                p.outward, pv.shape, pv.color, pv.clarity
         FROM dai_product p
         LEFT JOIN dai_product_value pv ON p.id = pv.product_id
         WHERE UPPER(TRIM(p.sku)) = UPPER(?) LIMIT 1`,
        [String(detail.pair).trim()]
      );
      if (pairRows?.length) {
        const pr = pairRows[0];
        pair = {
          id: pr.id,
          sku: pr.sku,
          group_type: pr.group_type,
          polish_pcs: pr.polish_pcs,
          polish_carat: pr.polish_carat,
          status: !pr.outward ? "AVAILABLE" : String(pr.outward).toUpperCase(),
        };
      }
    } catch (_) {}
  }

  const transformations = [];
  (history || []).forEach((h) => {
    const act = String(h.action || "").toLowerCase().trim();
    const desc = String(h.description || "").trim();
    if (
      [
        "in_import", "import", "purchase", "in_memo", "in_consign",
        "box_add", "to_box", "boxing", "unboxing", "from_box",
        "parcel_add", "sku_change", "price_change", "hold", "unhold",
        "memo", "memo_return", "sale", "export", "lab", "lab_return"
      ].includes(act)
    ) {
      let typeLabel = "Movement";
      let iconType = "arrow";
      if (act === "in_import" || act === "purchase" || act === "import") {
        typeLabel = "Inward Creation";
        iconType = "inward";
      } else if (act === "box_add" || act === "to_box" || act === "boxing") {
        typeLabel = "Single → Box";
        iconType = "box";
      } else if (act === "unboxing" || act === "from_box") {
        typeLabel = "Box → Single";
        iconType = "unbox";
      } else if (act === "parcel_add") {
        typeLabel = "Single → Parcel";
        iconType = "parcel";
      } else if (act === "sku_change") {
        typeLabel = "SKU Renamed";
        iconType = "sku";
      } else if (act === "price_change") {
        typeLabel = "Price Changed";
        iconType = "price";
      } else if (act === "hold" || act === "unhold") {
        typeLabel = act === "hold" ? "Put On Hold" : "Released from Hold";
        iconType = "hold";
      } else if (act === "memo") {
        typeLabel = "Outward Memo";
        iconType = "memo";
      } else if (act === "memo_return") {
        typeLabel = "Memo Return";
        iconType = "return";
      } else if (act === "sale") {
        typeLabel = h.is_from_memo ? "Sale (from Memo)" : "Direct Sale";
        iconType = "sale";
      }

      transformations.push({
        id: h.id,
        action: act,
        type_label: typeLabel,
        icon_type: iconType,
        date: h.date_display || h.date,
        description: desc,
        invoice: h.invoice,
        party: h.party_name || h.party,
        pcs: h.pcs,
        carat: h.carat,
        balance_carat: h.balance_carat,
        updated_by: h.updated_by,
        is_from_memo: Boolean(h.is_from_memo),
      });
    }
  });

  return {
    current,
    parent,
    children,
    siblings,
    pair,
    transformations,
    has_lineage: Boolean(parent || children.length > 0 || siblings.length > 0 || pair),
  };
}

async function getStoneDetail(sku, companyId, userId) {
  const detail = await resolveStoneDetail(sku, companyId);
  if (!detail || !detail.id) return null;

  let historySql = "SELECT * FROM dai_history WHERE product_id = ?";
  const historyValues = [detail.id];
  if (hideUser16(userId)) {
    historySql += HISTORY_HIDE_USER16_SQL;
  }
  historySql += " ORDER BY id";
  // perf: history, box transfer, party map, and activity logs are independent
  const activityCompanyId = detail.company != null ? detail.company : companyId;
  const stockCompanyId = Number(detail.company) || Number(companyId) || 0;
  const [history, transfer, partyMap, userMap, activityLogs, companyRows] = await Promise.all([
    queryAsync(historySql, historyValues),
    getBoxHistoryByProductId(detail.id),
    getPartyMap(),
    getUserMap(),
    getActivityLogForStone(sku, detail.id, activityCompanyId),
    stockCompanyId > 0
      ? metaQuery(
          "SELECT id, name, shortcutName FROM company WHERE id = ? LIMIT 1",
          [stockCompanyId]
        ).catch(() => [])
      : Promise.resolve([]),
  ]);
  const historyWithUsers = await backfillHistoryUsers(history);
  const mappedHistory = mapStoneHistoryRows(historyWithUsers, partyMap, userMap);
  const withMemoContext = enrichMemoReturnContext(mappedHistory);
  const enrichedHistory = enrichHistoryDates(withMemoContext, activityLogs);
  const lineageTree = await getStoneLineageTree(detail, enrichedHistory, stockCompanyId);
  const stockSummary = computeStockSummary(detail, enrichedHistory);

  const lastUpdatedAt =
    activityLogs.length > 0
      ? activityLogs[activityLogs.length - 1].created_at
      : detail.date;

  const companyMeta = companyRows?.[0] || null;
  const companyName = companyMeta?.name || "";
  const companyCode = companyMeta?.shortcutName || "";

  return {
    detail: {
      ...detail,
      company_name: companyName,
      company_code: companyCode,
      last_updated_at: lastUpdatedAt,
      last_updated_display: formatStoneDateTime(lastUpdatedAt),
    },
    company_name: companyName,
    company_code: companyCode,
    history: enrichedHistory,
    transfer,
    status: !detail.outward ? "AVAILABLE" : String(detail.outward).toUpperCase(),
    stock_summary: stockSummary,
    lineage: lineageTree,
    activity_logs: activityLogs,
  };
}

async function getStoneOldHistory(sku, companyId, userId, currentDbName) {
  const detail = await resolveStoneDetail(sku, companyId);
  if (!detail || !detail.id) return null;

  const currentDb = currentDbName || connection.getTenantStore()?.dbName || connection.META_DB;
  let years = [];
  try {
    years = await metaQuery(
      "SELECT db_name FROM company_year WHERE db_name IS NOT NULL AND db_name <> ''"
    );
  } catch {
    years = [];
  }

  const otherDbs = [...new Set(
    (years || [])
      .map((y) => String(y.db_name || "").trim())
      .filter((db) => db && db !== currentDb)
  )];

  const userFilter = hideUser16(userId) ? HISTORY_HIDE_USER16_SQL : "";
  const sql = `SELECT * FROM dai_history WHERE product_id = ?${userFilter} ORDER BY date, id`;
  const rows = [];

  for (const dbName of otherDbs) {
    try {
      if (!(await databaseExists(dbName))) continue;
      const pool = connection.getPoolForDb(dbName);
      const yearRows = await queryPool(pool, sql, [detail.id]);
      yearRows.forEach((row) => rows.push({ ...row, year_db: dbName }));
    } catch {
      // Skip year DBs that are missing or unreachable, same as PHP skip-on-fail intent.
    }
  }

  const [partyMap, userMap] = await Promise.all([getPartyMap(), getUserMap()]);
  return {
    sku: detail.sku,
    product_id: detail.id,
    history: enrichMemoReturnContext(mapStoneHistoryRows(rows, partyMap, userMap)),
  };
}

async function getStoneInfoByParty(sku, companyId, userId) {
  const base = await getStoneDetail(sku, companyId, userId);
  if (!base) return null;

  // perf: distinct parties and party map are independent reads
  const [partyIds, partyMap] = await Promise.all([
    queryAsync(
      "SELECT DISTINCT party FROM dai_history WHERE product_id = ? AND party IS NOT NULL AND party <> ''",
      [base.detail.id]
    ),
    getPartyMap(),
  ]);
  const memoActions = ["memo", "memo_return", "memo_close", "consign", "consign_return", "consign_close"];
  const saleActions = ["sale", "sale_return", "sale_close", "export", "export_close"];

  const byParty = [];
  for (const { party } of partyIds) {
    let sql = `SELECT * FROM dai_history WHERE product_id = ? AND party = ?`;
    const vals = [base.detail.id, party];
    if (hideUser16(userId)) sql += HISTORY_HIDE_USER16_SQL;
    sql += " ORDER BY date";
    const rows = await queryAsync(sql, vals);

    byParty.push({
      party_id: party,
      party_name: partyMap[party] || party,
      memoHistory: rows.filter((r) => memoActions.includes(r.action)),
      saleHistory: rows.filter((r) => saleActions.includes(r.action)),
    });
  }

  return { ...base, byParty };
}

async function getFilterOptions(companyId) {
  // perf: main/sub group DISTINCT queries are independent
  const [mainGroups, subGroups] = await Promise.all([
    queryAsync(
      "SELECT DISTINCT main_group AS value FROM dai_product WHERE company = ? AND main_group <> ''",
      [companyId]
    ),
    queryAsync(
      "SELECT DISTINCT sub_group AS value FROM dai_product WHERE company = ? AND sub_group <> ''",
      [companyId]
    ),
  ]);
  return {
    mainGroups: mainGroups.map((r) => ({ value: r.value, label: r.value })),
    subGroups: subGroups.map((r) => ({ value: r.value, label: r.value })),
  };
}

function buildInvoiceDateFilter(from, to) {
  if (from && to) {
    const ff = moment(from, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    const ft = moment(to, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    return { sql: " AND invoicedate BETWEEN ? AND ?", values: [ff, ft] };
  }
  if (from) {
    const ff = moment(from, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    return { sql: " AND invoicedate BETWEEN ? AND ?", values: [ff, "2050/12/31"] };
  }
  if (to) {
    const ft = moment(to, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY/MM/DD");
    return { sql: " AND invoicedate BETWEEN ? AND ?", values: ["2010/01/01", ft] };
  }
  return { sql: "", values: [] };
}

function buildGiaFilter(post) {
  const hasGia = post.gia === true || post.gia === "on" || post.gia === 1 || post.gia === "1";
  const hasNonGia =
    post["non-gia"] === true ||
    post["non-gia"] === "on" ||
    post.nonGia === true ||
    post.nonGia === "on" ||
    post.nonGia === 1 ||
    post.nonGia === "1";

  if (hasGia && hasNonGia) {
    return " AND (p.lab = 'gia' OR p.lab IS NULL OR p.lab = '')";
  }
  if (hasGia) return " AND p.lab = 'gia'";
  if (hasNonGia) return " AND (p.lab IS NULL OR p.lab = '')";
  return "";
}

function formatOutwardDate(value) {
  if (!value || value === "0000-00-00") return "";
  return moment(value).format("DD/MM/YY");
}

function resolveTransactionReport(post) {
  if (post.report) return post.report;
  const status = String(post.saleStatus || "").trim();
  if (status === "close") return "close_sale";
  if (status === "open") return "sale";
  // "report" is UI placeholder — treat as open sale
  if (status === "report") return "sale";
  if (
    [
      "memo",
      "lab",
      "sale",
      "purchase",
      "import",
      "export",
      "close_memo",
      "close_sale",
      "consign",
    ].includes(status)
  ) {
    return status;
  }
  return "";
}

async function getOutwardTransactionRows(post, companyId, userId) {
  const report = resolveTransactionReport(post);
  const type = post.type || "party";
  if (!report || !type) return [];

  const partyVal = post.party ?? post.company;
  const partyFilter =
    partyVal && partyVal !== "0" && partyVal !== "all" && partyVal !== ""
      ? { sql: " AND party = ?", values: [partyVal] }
      : { sql: "", values: [] };

  const dateFilter = buildInvoiceDateFilter(post.cfrom || post.fromDate, post.cto || post.toDate);

  let invoiceFilter = { sql: "", values: [] };
  const invoiceNo = (post.invoice || post.invoiceNo || "").trim();
  if (invoiceNo) {
    invoiceFilter = { sql: " AND invoiceno = ?", values: [invoiceNo] };
  }

  const limit = parseInt(post.limit, 10) || 500;
  const userFilter = hideUser16(userId) ? HISTORY_HIDE_USER16_SQL : "";
  const giaSql = buildGiaFilter(post);

  let typeSql = " AND type = ?";
  const typeValues = [report];
  if (["sale", "export", "close_sale"].includes(report)) {
    typeSql = " AND type IN ('sale','export')";
    typeValues.length = 0;
  } else if (["memo", "close_memo", "consign"].includes(report)) {
    typeSql = " AND type IN ('memo','consign')";
    typeValues.length = 0;
  }

  let statusSql =
    " AND status NOT IN ('sale_close','close_sale','close_memo','close_consign','close_lab','close_export')";
  if (report === "close_memo") statusSql = " AND status IN ('close_memo','close_consign')";
  if (report === "close_sale") statusSql = " AND status IN ('close_sale','close_export')";

  const productsClause =
    report === "close_memo" || report === "close_sale" ? "" : " AND products <> ''";

  const outwardSql = `SELECT * FROM dai_outward WHERE company = ?${userFilter}${statusSql}${typeSql}${partyFilter.sql}${dateFilter.sql}${invoiceFilter.sql}${productsClause} ORDER BY date DESC, id DESC LIMIT ?`;
  const outwardValues = [
    companyId,
    ...typeValues,
    ...partyFilter.values,
    ...dateFilter.values,
    ...invoiceFilter.values,
    limit,
  ];
  // perf: party map and outward rows are independent
  const [partyMap, outwardRows] = await Promise.all([
    getPartyMap(),
    queryAsync(outwardSql, outwardValues),
  ]);

  if (type === "packet") {
    return getTransactionPacketRows(outwardRows, report, partyMap, giaSql);
  }

  return getTransactionPartyRows(outwardRows, report, partyMap, giaSql);
}

async function getTransactionPacketRows(outwardRows, report, partyMap, giaSql) {
  const productIds = [];
  const returnIds = [];
  const rowsData = [];

  outwardRows.forEach((row) => {
    const product_ids = (row.products || "").split(",").filter(Boolean);
    const return_ids = (row.out_product || "").split(",").filter(Boolean);

    if (["close_memo", "close_sale"].includes(report) && return_ids.length) {
      return_ids.forEach((id) => returnIds.push(parseInt(id, 10)));
    }
    if (["memo", "lab", "sale", "export"].includes(report) && product_ids.length) {
      product_ids.forEach((id) => productIds.push(parseInt(id, 10)));
    }

    rowsData.push({ row, product_ids, return_ids });
  });

  const returnData = {};
  const uniqueReturnIds = [...new Set(returnIds.filter(Boolean))];
  if (uniqueReturnIds.length) {
    const placeholders = uniqueReturnIds.map(() => "?").join(",");
    const sql = `SELECT pr.price AS r_price, pr.amount AS r_amount, pr.*, p.*, pv.*
      FROM dai_product_return pr
      INNER JOIN dai_product p ON p.id = pr.product_id
      INNER JOIN dai_product_value pv ON pr.product_id = pv.product_id
      WHERE pr.id IN (${placeholders})${giaSql}`;
    const rows = await queryAsync(sql, uniqueReturnIds);
    rows.forEach((r) => {
      returnData[r.id] = r;
    });
  }

  const productData = {};
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueProductIds.length) {
    const placeholders = uniqueProductIds.map(() => "?").join(",");
    const sql = `SELECT p.*, pv.*
      FROM dai_product p
      JOIN dai_product_value pv ON p.id = pv.product_id
      WHERE p.id IN (${placeholders})${giaSql}`;
    const rows = await queryAsync(sql, uniqueProductIds);
    rows.forEach((r) => {
      productData[r.id] = r;
    });
  }

  const data = [];
  rowsData.forEach(({ row, product_ids, return_ids }) => {
    if (["close_memo", "close_sale"].includes(report) && return_ids.length) {
      return_ids.forEach((id) => {
        const r = returnData[parseInt(id, 10)];
        if (!r) return;
        data.push({
          out_date: formatOutwardDate(row.invoicedate),
          sku: r.sku || "",
          lab: r.lab || "",
          report_no: r.report_no || "",
          polish_pcs: r.pcs,
          polish_carat: r.carat,
          sell_price: r.r_price,
          sell_amount: r.r_amount,
          shape: r.shape || "",
          color: r.color || "",
          clarity: r.clarity || "",
          party: partyMap[row.party] || "",
          remark: r.remark || "",
          entryno: row.entryno,
        });
      });
    }

    if (["memo", "lab", "sale", "export"].includes(report) && product_ids.length) {
      product_ids.forEach((id) => {
        const r = productData[parseInt(id, 10)];
        if (!r) return;
        const price = parseFloat(r.sell_price) === 0 ? r.price : r.sell_price;
        const amount = parseFloat(r.sell_amount) === 0 ? r.amount : r.sell_amount;
        data.push({
          out_date: formatOutwardDate(row.invoicedate),
          sku: r.sku || "",
          lab: r.lab || "",
          report_no: r.report_no || "",
          polish_pcs: r.polish_pcs,
          polish_carat: r.polish_carat,
          sell_price: price,
          sell_amount: amount,
          shape: r.shape || "",
          color: r.color || "",
          clarity: r.clarity || "",
          party: partyMap[row.party] || "",
          remark: r.remark || "",
          entryno: row.entryno,
        });
      });
    }
  });

  return data.map((row, idx) => ({ ...row, no: idx + 1, key: idx + 1 }));
}

async function getTransactionPartyRows(outwardRows, report, partyMap, giaSql) {
  const productIds = [];
  const returnIds = [];
  const rowsData = [];

  outwardRows.forEach((row) => {
    const product_ids = (row.products || "").split(",").filter(Boolean);
    const return_ids = (row.out_product || "").split(",").filter(Boolean);

    if (["close_memo", "close_sale"].includes(report) && !product_ids.length && return_ids.length) {
      return_ids.forEach((id) => returnIds.push(parseInt(id, 10)));
    } else if (product_ids.length) {
      product_ids.forEach((id) => productIds.push(parseInt(id, 10)));
    }

    const duedate =
      row.duedate && row.duedate !== "0000-00-00"
        ? moment(row.duedate).format("DD/MM/YY")
        : "";

    rowsData.push({
      ...row,
      product_ids,
      return_ids,
      party: partyMap[row.party] || "",
      out_date: formatOutwardDate(row.invoicedate),
      duedate,
    });
  });

  const returnData = {};
  const uniqueReturnIds = [...new Set(returnIds.filter(Boolean))];
  if (uniqueReturnIds.length) {
    const placeholders = uniqueReturnIds.map(() => "?").join(",");
    const sql = `SELECT r.*, p.id AS product_id
      FROM dai_product AS p
      JOIN dai_product_return AS r ON p.id = r.product_id
      WHERE r.id IN (${placeholders})${giaSql}`;
    const rows = await queryAsync(sql, uniqueReturnIds);
    rows.forEach((r) => {
      returnData[r.id] = r;
    });
  }

  const productData = {};
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueProductIds.length) {
    const placeholders = uniqueProductIds.map(() => "?").join(",");
    const sql = `SELECT p.*, pv.*
      FROM dai_product AS p
      JOIN dai_product_value AS pv ON p.id = pv.product_id
      WHERE p.id IN (${placeholders})${giaSql}`;
    const rows = await queryAsync(sql, uniqueProductIds);
    rows.forEach((r) => {
      productData[r.id] = r;
    });
  }

  const data = [];
  rowsData.forEach((row) => {
    let tpp = 0;
    let tpc = 0;
    let ta = 0;

    if (
      ["close_memo", "close_sale"].includes(report) &&
      !row.product_ids.length &&
      row.return_ids.length
    ) {
      row.return_ids.forEach((id) => {
        const jData = returnData[parseInt(id, 10)];
        if (!jData) return;
        tpp += parseFloat(jData.pcs) || 0;
        tpc += parseFloat(jData.carat) || 0;
        ta += parseFloat(jData.amount) || 0;
      });
    } else if (row.product_ids.length) {
      row.product_ids.forEach((id) => {
        const jData = productData[parseInt(id, 10)];
        if (!jData) return;
        tpp += parseFloat(jData.polish_pcs) || 0;
        tpc += parseFloat(jData.polish_carat) || 0;
        const amount =
          parseFloat(jData.sell_amount) === 0 ? jData.amount : jData.sell_amount;
        ta += parseFloat(amount) || 0;
      });
    }

    const tp = tpc > 0 ? ta / tpc : 0;

    data.push({
      id: row.id,
      invoiceno: row.invoiceno || "",
      out_date: row.out_date,
      party: row.party,
      tpp,
      tpc: Number(tpc.toFixed(3)),
      tp: Number(tp.toFixed(2)),
      ta: Number(ta.toFixed(2)),
      terms: row.terms || "",
      duedate: row.duedate,
      reference: row.reference || "",
      paid_amount: Number(row.paid_amount) || 0,
    });
  });

  return data.map((row, idx) => {
    const paid = Number(row.paid_amount) || 0;
    const amount = Number(row.ta) || 0;
    return {
      no: idx + 1,
      key: idx + 1,
      invoice: row.invoiceno,
      date: row.out_date,
      company: row.party,
      pcs: row.tpp,
      carat: row.tpc,
      price: row.tp,
      amount,
      term: row.terms,
      dueDate: row.duedate,
      reference: row.reference,
      paid_amount: paid,
      due_amount: Number((amount - paid).toFixed(2)),
    };
  });
}

async function getPurchaseTransactionRows(post, companyId, userId) {
  const report = resolveTransactionReport(post);
  const type = post.type || "party";
  if (!report || !type) return [];

  const partyVal = post.party ?? post.company;
  const partyFilter =
    partyVal && partyVal !== "0" && partyVal !== "all" && partyVal !== ""
      ? { sql: " AND party = ?", values: [partyVal] }
      : { sql: "", values: [] };

  const dateFilter = buildInvoiceDateFilter(post.cfrom || post.fromDate, post.cto || post.toDate);

  let invoiceFilter = { sql: "", values: [] };
  const invoiceNo = (post.invoice || post.invoiceNo || "").trim();
  if (invoiceNo) {
    invoiceFilter = { sql: " AND invoiceno = ?", values: [invoiceNo] };
  }

  const limit = parseInt(post.limit, 10) || 500;
  const userFilter = hideUser16(userId) ? HISTORY_HIDE_USER16_SQL : "";
  const giaSql = buildGiaFilter(post);

  const inwardSql = `SELECT * FROM dai_inward
    WHERE (deleted = 0 OR deleted IS NULL) AND company = ?${userFilter}
    AND inward_type IN ('purchase','import')${partyFilter.sql}${dateFilter.sql}${invoiceFilter.sql}
    ORDER BY date DESC, id DESC LIMIT ?`;
  // perf: party map and inward rows are independent
  const [partyMap, inwardRows] = await Promise.all([
    getPartyMap(),
    queryAsync(inwardSql, [
      companyId,
      ...partyFilter.values,
      ...dateFilter.values,
      ...invoiceFilter.values,
      limit,
    ]),
  ]);

  if (!inwardRows.length) return [];

  const inwardIds = inwardRows.map((r) => r.id);
  const placeholders = inwardIds.map(() => "?").join(",");
  const productSql = `SELECT p.*, pv.*
    FROM dai_product p
    JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.inward_id IN (${placeholders})${giaSql}`;
  const productRows = await queryAsync(productSql, inwardIds);

  const productsByInwardId = {};
  productRows.forEach((prod) => {
    if (!productsByInwardId[prod.inward_id]) productsByInwardId[prod.inward_id] = [];
    productsByInwardId[prod.inward_id].push(prod);
  });

  const data = [];
  inwardRows.forEach((row) => {
    const products = (productsByInwardId[row.id] || []).filter((prod) => {
      if (
        (prod.outward === "memo" || prod.outward === "sale") &&
        (prod.group_type !== "single" ||
          (prod.group_type === "single" && prod.outward_parent))
      ) {
        return false;
      }
      return true;
    });

    if (type === "packet") {
      products.forEach((prod) => {
        const polishCarat =
          parseFloat(prod.purchase_carat) === 0 ? prod.polish_carat : prod.purchase_carat;
        const polishPcs =
          parseFloat(prod.purchase_pcs) === 0 ? prod.polish_pcs : prod.purchase_pcs;
        const price =
          parseFloat(prod.purchase_price) === 0 ? prod.price : prod.purchase_price;
        const amount =
          parseFloat(prod.purchase_amount) === 0 ? prod.amount : prod.purchase_amount;
        data.push({
          out_date: formatOutwardDate(row.invoicedate),
          sku: prod.sku || "",
          lab: prod.lab || "",
          report_no: prod.report_no || "",
          polish_pcs: polishPcs,
          polish_carat: polishCarat,
          purchase_price: price,
          purchase_amount: amount,
          shape: prod.shape || "",
          color: prod.color || "",
          clarity: prod.clarity || "",
          party: partyMap[row.party] || "",
          remark: prod.remark || "",
          entryno: row.entryno,
        });
      });
      return;
    }

    let tpp = 0;
    let tpc = 0;
    let ta = 0;

    products.forEach((prod) => {
      const polishCarat =
        parseFloat(prod.purchase_carat) === 0 ? prod.polish_carat : prod.purchase_carat;
      const polishPcs =
        parseFloat(prod.purchase_pcs) === 0 ? prod.polish_pcs : prod.purchase_pcs;
      const amount =
        parseFloat(prod.purchase_amount) === 0 ? prod.amount : prod.purchase_amount;
      tpp += parseFloat(polishPcs) || 0;
      tpc += parseFloat(polishCarat) || 0;
      ta += parseFloat(amount) || 0;
    });

    if (tpc <= 0 || ta <= 0) return;

    const finalPcs = parseFloat(row.pcs) === 0 ? tpp : row.pcs;
    const finalCarat = parseFloat(row.carat) === 0 ? tpc : row.carat;
    const tp = tpc > 0 ? ta / tpc : 0;

    data.push({
      no: 0,
      key: 0,
      invoice: row.invoiceno || "",
      date: formatOutwardDate(row.invoicedate),
      company: partyMap[row.party] || "",
      pcs: finalPcs,
      carat: Number(parseFloat(finalCarat).toFixed(3)),
      price: Number(tp.toFixed(2)),
      amount: Number(ta.toFixed(2)),
      term: row.terms || "",
      dueDate:
        row.duedate && row.duedate !== "0000-00-00"
          ? moment(row.duedate).format("DD/MM/YY")
          : "",
      reference: row.reference || "",
      paid_amount: Number(row.paid_amount) || 0,
      due_amount: Number((Number(ta.toFixed(2)) - (Number(row.paid_amount) || 0)).toFixed(2)),
    });
  });

  return data.map((row, idx) => ({ ...row, no: idx + 1, key: idx + 1 }));
}

async function getTransactionReport(post, companyId, userId) {
  const report = resolveTransactionReport(post);
  const type = post.type || "party";
  if (!report || !type) return [];

  if (report === "purchase" || report === "import") {
    return getPurchaseTransactionRows(post, companyId, userId);
  }

  const outwardReports = ["memo", "lab", "sale", "export", "close_memo", "close_sale"];
  if (outwardReports.includes(report)) {
    return getOutwardTransactionRows(post, companyId, userId);
  }

  return [];
}

module.exports = {
  getGroupReport,
  getStoneSaleReport,
  getStonePurchaseReport,
  getStoneDetail,
  getStoneOldHistory,
  getUserMap,
  getStoneInfoByParty,
  getFilterOptions,
  getPartyMap,
  getTransferHistory,
  getTransactionReport,
};
