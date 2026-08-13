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

async function getTransferHistory({ sku, fromDate, toDate }) {
  if (!(await hasBoxHistoryTable())) return [];

  let sql = `SELECT bh.*, p.sku FROM dai_boxhistory bh
    LEFT JOIN dai_product p ON p.id = bh.product_id WHERE 1=1`;
  const values = [];
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
    return await queryAsync(sql, values);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      boxHistoryTableExists = false;
      return [];
    }
    throw err;
  }
}

const getCompanyId = (req) => Number(req.companyId ?? req.user?.companyId) || 1;
const getUserId = (req) => Number(req.user?.user_id) || 1;
const hideUser16 = (userId) => userId !== 16 && userId !== 1;

/** Mirrors PHP Helper::getStoneAction() */
const STONE_ACTION_LABELS = {
  import: "Import",
  purchase: "Purchase",
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

function mapStoneHistoryRows(history, partyMap) {
  return history.map((h) => ({
    ...h,
    party_name: partyMap[h.party] || h.party || "",
    action_label: STONE_ACTION_LABELS[h.action] || h.action,
  }));
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
  const userFilter = hideUser16(userId) ? " AND user <> 16" : "";
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

    const outwardRows = await queryAsync(sql, values);
    const partyMap = await getPartyMap();

    for (const row of outwardRows) {
      const ids = (row.products || "").split(",").filter(Boolean);
      for (const id of ids) {
        const prodSql = `SELECT p.*, pv.* FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.id = ?${mainGroup.sql}${subGroup.sql}`;
        const prodRows = await queryAsync(prodSql, [id, ...mainGroup.values, ...subGroup.values]);
        prodRows.forEach((p) => {
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

      if ((report === "close_memo" || report === "close_sale") && !row.products && row.out_product) {
        const retIds = (row.out_product || "").split(",").filter(Boolean);
        for (const rid of retIds) {
          const retSql = `SELECT pr.price AS r_price, pr.amount AS r_amount, pr.*, p.*, pv.*
            FROM dai_product_return pr
            INNER JOIN dai_product p ON p.id = pr.product_id
            INNER JOIN dai_product_value pv ON pr.product_id = pv.product_id
            WHERE pr.id = ?${mainGroup.sql}${subGroup.sql}`;
          const retRows = await queryAsync(retSql, [rid, ...mainGroup.values, ...subGroup.values]);
          retRows.forEach((p) => {
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
    }
  } else if (report === "purchase" || report === "import") {
    const sql = `SELECT * FROM dai_inward WHERE deleted = 0 AND company = ?${userFilter}
      AND inward_type IN ('purchase','import')${partyFilter.sql}${dateCol.sql} ORDER BY date DESC, id DESC`;
    const inwardRows = await queryAsync(sql, [companyId, ...partyFilter.values, ...dateCol.values]);
    const partyMap = await getPartyMap();

    for (const row of inwardRows) {
      const prodSql = `SELECT p.*, pv.* FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id
        WHERE p.inward_id = ?${mainGroup.sql}${subGroup.sql}`;
      const prods = await queryAsync(prodSql, [row.id, ...mainGroup.values, ...subGroup.values]);
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
  const partyList = await getPartyMap();

  let partySql = "";
  const values = [companyId];
  if (post.party) {
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

  const outwardSql = `SELECT * FROM dai_outward WHERE products <> '' AND company = ?
    AND status NOT IN ('sale_close','close_sale','close_export')
    AND type IN ('sale','export')${partySql}${dateSql}${invoiceSql}
    ORDER BY date DESC, id DESC LIMIT ?`;
  values.push(limit);

  const outwardRows = await queryAsync(outwardSql, values);
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
      `SELECT action_type, module_name, description, user_name, created_at
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

    if (log?.created_at) {
      return {
        ...h,
        updated_at: log.created_at,
        updated_by: log.user_name || "",
        date_display: formatStoneDateTime(log.created_at),
      };
    }

    return {
      ...h,
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
  if (!detail || !detail.id) return null;
  if (companyId && detail.company != null && String(detail.company) !== String(companyId)) {
    return null;
  }
  return detail;
}

async function getStoneDetail(sku, companyId, userId) {
  const detail = await resolveStoneDetail(sku, companyId);
  if (!detail || !detail.id) return null;

  let historySql = "SELECT * FROM dai_history WHERE product_id = ?";
  const historyValues = [detail.id];
  if (hideUser16(userId)) {
    historySql += " AND user <> 16";
  }
  historySql += " ORDER BY id";
  const history = await queryAsync(historySql, historyValues);

  const transfer = await getBoxHistoryByProductId(detail.id);

  const partyMap = await getPartyMap();
  const activityLogs = await getActivityLogForStone(sku, detail.id, companyId);
  const mappedHistory = mapStoneHistoryRows(history, partyMap);
  const enrichedHistory = enrichHistoryDates(mappedHistory, activityLogs);

  const lastUpdatedAt =
    activityLogs.length > 0
      ? activityLogs[activityLogs.length - 1].created_at
      : detail.date;

  return {
    detail: {
      ...detail,
      last_updated_at: lastUpdatedAt,
      last_updated_display: formatStoneDateTime(lastUpdatedAt),
    },
    history: enrichedHistory,
    transfer,
    status: !detail.outward ? "AVAILABLE" : String(detail.outward).toUpperCase(),
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

  const userFilter = hideUser16(userId) ? " AND user <> 16" : "";
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

  const partyMap = await getPartyMap();
  return {
    sku: detail.sku,
    product_id: detail.id,
    history: mapStoneHistoryRows(rows, partyMap),
  };
}

async function getStoneInfoByParty(sku, companyId, userId) {
  const base = await getStoneDetail(sku, companyId, userId);
  if (!base) return null;

  const partyIds = await queryAsync(
    "SELECT DISTINCT party FROM dai_history WHERE product_id = ? AND party IS NOT NULL AND party <> ''",
    [base.detail.id]
  );

  const partyMap = await getPartyMap();
  const memoActions = ["memo", "memo_return", "memo_close", "consign", "consign_return", "consign_close"];
  const saleActions = ["sale", "sale_return", "sale_close", "export", "export_close"];

  const byParty = [];
  for (const { party } of partyIds) {
    let sql = `SELECT * FROM dai_history WHERE product_id = ? AND party = ?`;
    const vals = [base.detail.id, party];
    if (hideUser16(userId)) sql += " AND user <> 16";
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
  const mainGroups = await queryAsync(
    "SELECT DISTINCT main_group AS value FROM dai_product WHERE company = ? AND main_group <> ''",
    [companyId]
  );
  const subGroups = await queryAsync(
    "SELECT DISTINCT sub_group AS value FROM dai_product WHERE company = ? AND sub_group <> ''",
    [companyId]
  );
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
  if (post.saleStatus === "close") return "close_sale";
  if (post.saleStatus === "open") return "sale";
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
  const userFilter = hideUser16(userId) ? " AND user <> 16" : "";
  const giaSql = buildGiaFilter(post);
  const partyMap = await getPartyMap();

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
  const outwardRows = await queryAsync(outwardSql, outwardValues);

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
    });
  });

  return data.map((row, idx) => ({
    no: idx + 1,
    key: idx + 1,
    invoice: row.invoiceno,
    date: row.out_date,
    company: row.party,
    pcs: row.tpp,
    carat: row.tpc,
    price: row.tp,
    amount: row.ta,
    term: row.terms,
    dueDate: row.duedate,
    reference: row.reference,
  }));
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
  const userFilter = hideUser16(userId) ? " AND user <> 16" : "";
  const giaSql = buildGiaFilter(post);
  const partyMap = await getPartyMap();

  const inwardSql = `SELECT * FROM dai_inward
    WHERE (deleted = 0 OR deleted IS NULL) AND company = ?${userFilter}
    AND inward_type IN ('purchase','import')${partyFilter.sql}${dateFilter.sql}${invoiceFilter.sql}
    ORDER BY date DESC, id DESC LIMIT ?`;
  const inwardRows = await queryAsync(inwardSql, [
    companyId,
    ...partyFilter.values,
    ...dateFilter.values,
    ...invoiceFilter.values,
    limit,
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
  getStoneDetail,
  getStoneOldHistory,
  getStoneInfoByParty,
  getFilterOptions,
  getPartyMap,
  getTransferHistory,
  getTransactionReport,
};
