const connection = require("./connection.js");
const { getTenantScope } = require("./tenantHelper.js");
const DEFAULT_COMPANY_ID = 1;
const DEFAULT_USER_ID = 1;

const resolveCompanyId = (companyId) => {
  if (companyId != null && Number(companyId) > 0) return Number(companyId);
  const store = connection.getTenantStore?.();
  if (store?.companyId) return Number(store.companyId);
  return DEFAULT_COMPANY_ID;
};

const query = (sql, values = []) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });
};

const insertString = (post) => {
  try {
    const names = [];
    const values = [];

    for (const key of Object.keys(post)) {
      if (key === 'id') continue;
      names.push(key);
      values.push(connection.escape(post[key]));
    }

    return [names.join(','), values.join(',')];
  } catch (error) {
    console.error(error);
  }
};

const updateString = (post) => {
  try {
    const parts = [];

    for (const key of Object.keys(post)) {
      if (key === 'id' || key === 'company' || key === 'fn') continue;
      parts.push(`${key}=${connection.escape(post[key])}`);
    }

    return parts.join(',');
  } catch (error) {
    console.error(error);
  }
};

const getIncrementEntry = (of, companyId = DEFAULT_COMPANY_ID) => {
  return new Promise((resolve, reject) => {
    try {
      const cid = resolveCompanyId(companyId);
      const query = `SELECT ${of} FROM dai_incrementid WHERE company=?`;

      connection.query(query, [cid], (error, data) => {
        if (error) {
          return reject({ error: "Error occurred while increment ids" });
        }
        if (data.length > 0) {
          resolve(data[0][of]); // Return the first record
        } else {
          resolve(null); // Return null if no records found
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const addHistory = (post) => {

  if (post.description) {
    post.description = post.description.toUpperCase();
  }

  return new Promise((resolve, reject) => {
    try {

      const data = insertString(post);
      const query = `INSERT INTO dai_history (${data[0]}) VALUES (${data[1]})`;

      connection.query(query, (error, data) => {
        if (error) {
          return reject({ error: "Error occurred while adding history data" });
        }
        resolve(data); // Return the first record

      });
    } catch (error) {
      reject(error);
    }
  });
}

const addUserTrack = (post) => {
  if (!post.user) post.user = DEFAULT_USER_ID;
  if (!post.company) post.company = DEFAULT_COMPANY_ID;
  if (post.description) post.description = String(post.description).toUpperCase();
  return new Promise((resolve, reject) => {
    try {
      const data = insertString(post);
      const sql = `INSERT INTO user_track (${data[0]}) VALUES (${data[1]})`;
      connection.query(sql, (error, rs) => {
        if (error) return reject({ error: "Error occurred while adding user track data" });
        resolve(rs);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const addNotification = (post) => {
  const payload = { ...post };
  if (!payload.user) payload.user = DEFAULT_USER_ID;
  if (!payload.company) payload.company = DEFAULT_COMPANY_ID;
  if (!payload.datetine) payload.datetine = new Date();
  if (payload.message) {
    payload.message = String(payload.message).toUpperCase().slice(0, 500);
  }

  const companyPrefix = Number(payload.company) === 1 ? "ShreeHK" : "Company";
  payload.title = `${companyPrefix} : ${payload.title || ""}`;

  return new Promise((resolve, reject) => {
    try {
      const data = insertString(payload);
      const sql = `INSERT INTO notification (${data[0]}) VALUES (${data[1]})`;
      connection.query(sql, (error, rs) => {
        if (error) return reject({ error: "Error occurred while adding notification data" });
        try {
          const { publishToCompany } = require("./services/notificationRealtimeService.js");
          publishToCompany(payload.company, {
            id: rs?.insertId || 0,
            title: payload.title || "",
            message: payload.message || "",
            user: payload.user,
            company: payload.company,
            datetine: payload.datetine,
          });
        } catch (_) {
          // Realtime fanout should never break write flow.
        }
        resolve(rs);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const notifyStoneSale = async ({
  sellerName,
  sellerId,
  skus,
  outwardId,
  invoiceNo,
  companyId,
}) => {
  const skuText = Array.isArray(skus)
    ? skus.filter(Boolean).join(",")
    : String(skus || "-");
  return addNotification({
    title: "Stone Sold",
    message: [
      `Seller: ${sellerName || `User ${sellerId || DEFAULT_USER_ID}`}`,
      `SKU: ${skuText || "-"}`,
      `Outward ID: ${outwardId || "-"}`,
      `Invoice: ${invoiceNo || "-"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n"),
    user: sellerId || DEFAULT_USER_ID,
    company: companyId || DEFAULT_COMPANY_ID,
    datetine: new Date(),
  });
};

/** Port of venya dai/Helper.php getInventoryAttribute() — grid export columns. */
const getInventoryAttribute = () => ({
  mfg_code: "Type",
  sku: "Sku",
  lab: "Lab",
  report_no: "Certificate.",
  shape: "Shape",
  polish_pcs: "Pcs",
  polish_carat: "Carat",
  main_color: "Full Color",
  argyle_color: "Argyle Color",
  in_house_clarity: "In House Cla",
  clarity: "Clarity",
  rap_price: "Rap",
  cost: "Cost",
  price: "Price",
  amount: "Amount",
  size: "Size",
  f_intensity: "Fluorescence",
  cut: "Cut",
  polish: "Polish",
  symmentry: "Symm",
  table_pc: "Table",
  depth_pc: "Depth",
  mesurment: "Msurmnt",
  gridle: "Gridle",
  mining: "Mining",
  origin: "Origin",
  intensity: "Intensity",
  overtone: "Overtone",
  color: "Color",
  location: "LOC",
  package: "Package",
  bgm: "BGM",
  eyeclean: "Eye Clean",
  main_group: "Group",
  sub_group: "Sub Group",
  remark: "Remark",
});

/** Port of venya dai/Helper.php getExportAttribute() — mail attachment columns. */
const getExportAttribute = () => ({
  sku: "Sku",
  lab: "Lab",
  report_no: "Certificate",
  shape: "Shape",
  polish_pcs: "Pcs",
  polish_carat: "Carat",
  main_color: "Color",
  clarity: "Clarity",
  rapnet: "Rapnet",
  discount: "Discount",
  price: "Price",
  amount: "Amount",
  size: "Size",
  f_intensity: "Fluorescence",
  cut: "Cut",
  polish: "Polish",
  symmentry: "Symm",
  table_pc: "Table",
  depth_pc: "Depth",
  mesurment: "Msurmnt",
  gridle: "Gridle",
  location: "LOC",
  package: "Package",
});

const getAttribute = async (all = 0) => {
  const data = {};
  if (all) {
    data.mfg_code = "Mfg.Code";
    data.diamond_no = "D.No";
    data.sku = "Sku";
    data.rought_pcs = "R.Pcs";
    data.rought_carat = "R.Carat";
    data.polish_pcs = "P.Pcs";
    data.polish_carat = "P.Carat";
    data.cost = "Cost";
    data.price = "Price";
    data.amount = "Amount";
    data.main_color = "Main Color";
    data.location = "LOC";
    data.lab = "Lab";
  }
  const rows = await query(
    "SELECT code,name FROM dai_attribute WHERE company=? ORDER BY short_order",
    [resolveCompanyId()]
  );
  for (const row of rows) data[row.code] = row.name;
  delete data.package;
  if (all) {
    data.remark = "Remark";
    data.group_type = "Group Type";
  }
  return data;
};

const getAttributeField = async (all = 0) => {
  const data = {};
  if (all) {
    data.mfg_code = "";
    data.diamond_no = "";
    data.sku = "";
    data.rought_pcs = 0.0;
    data.rought_carat = 0.0;
    data.polish_pcs = 0.0;
    data.polish_carat = 0.0;
    data.cost = 0.0;
    data.price = 0.0;
    data.amount = 0.0;
    data.location = "";
    data.remark = "";
    data.lab = "";
  }
  data.record = {};
  const rows = await query(
    "SELECT code,name FROM dai_attribute WHERE company=? ORDER BY short_order",
    [resolveCompanyId()]
  );
  for (const row of rows) data.record[row.code] = "";
  return data;
};

const getTagValue = (xml, tag) => {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(xml || "").match(re);
  return m ? m[1].trim() : "";
};

const getGiaReport = async (rn) => {
  const data = {};
  try {
    const htmlResp = await fetch(`https://www.gia.edu/report-check?reportno=${rn}`);
    const html = await htmlResp.text();
    const encryptedMatch = html.match(/id=["']encryptedString["'][^>]*value=["']([^"']+)["']/i);
    const encryptString = encryptedMatch ? encryptedMatch[1] : "";
    if (!encryptString) {
      data.message = "Please check your entries and try again.";
      return data;
    }

    const xmlResp = await fetch(`https://www.gia.edu/otmm_wcs_int/xml/load.jsp?ReportNumber=${encryptString}`);
    const xml = await xmlResp.text();
    const message = getTagValue(xml, "MESSAGE");
    if (message !== "") {
      data.message = "Please check your entries and try again.";
      return data;
    }

    const map = {
      FLUO_INTENSITY_CODE: "f_intensity",
      CUT_CODE: "cut",
      DEPTH_PCT: "depth_pc",
      IDENT_TBL_WEIGHT: "weight",
      TABLE_PCT: "table_pc",
      SYMMETRY_CODE: "symmentry",
      GIRDLE_CODE: "gridle",
      POLISH_CODE: "polish",
      COLOR: "color",
      CLARITY: "clarity",
      REPORT_NO: "report_no",
      REPORTNUMBER: "report_no",
      REPORTNUMBER_: "report_no",
    };

    const measurement =
      getTagValue(xml, "MEASUREMENT") ||
      getTagValue(xml, "IDENT_TBL_MEASUREMENTS") ||
      getTagValue(xml, "LENGTH");
    if (measurement) {
      data.mesurment = measurement.replace(/mm/gi, "").replace(/\s+/g, "").trim();
    }

    const shapeRaw = getTagValue(xml, "SHAPE") || getTagValue(xml, "IDENT_TBL_SHAPE");
    if (shapeRaw) {
      const parts = shapeRaw.split("~");
      const picked = (parts[1] || parts[0] || "").replace(/Brilliant/gi, "").trim();
      data.shape = picked;
      if (data.shape === "Cut-Cornered Rectangular Modified") data.shape = "Radiant";
      if (data.shape === "Modified Rectangular" || data.shape === "Modified Square") {
        data.shape = "Cushion Modified";
      }
      if (data.shape === "Cushion Rose Cut") data.shape = "Rose";
    }

    for (const [xmlKey, key] of Object.entries(map)) {
      const v = getTagValue(xml, xmlKey);
      if (!v) continue;
      if (key === "color") {
        data.color = v.replace(/Natural/gi, "").replace(/Even/gi, "").replace(/~/g, "").trim();
      } else if (key === "weight") {
        data.weight = v.replace(/carat/gi, "").trim();
      } else {
        data[key] = v.trim();
      }
    }

    data.message = "";
    return data;
  } catch (e) {
    data.message = `${e.message}Please check your entries and try again.`;
    return data;
  }
};

/** Port of venya inventoryModel::getMemoCarat — carats on memo/consign under a box/parcel parent. */
const getMemoCaratMap = async (parentIds = []) => {
  const ids = [...new Set(parentIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (!ids.length) return {};

  const placeholders = ids.map(() => "?").join(",");
  const rows = await query(
    `SELECT outward_parent, COALESCE(SUM(polish_carat), 0) AS total
     FROM dai_product
     WHERE (outward = 'memo' OR outward = 'consign')
       AND visibility = 1
       AND outward_parent IN (${placeholders})
     GROUP BY outward_parent`,
    ids
  );

  return rows.reduce((acc, row) => {
    acc[row.outward_parent] = Number(row.total) || 0;
    return acc;
  }, {});
};

/** Memo line items under box/parcel parents — for inventory CRT hover details. */
const getMemoItemsMap = async (parentIds = []) => {
  const ids = [...new Set(parentIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (!ids.length) return {};

  const placeholders = ids.map(() => "?").join(",");
  const rows = await query(
    `SELECT
       p.outward_parent,
       p.id,
       p.sku,
       p.polish_carat,
       p.polish_pcs,
       p.outward,
       p.sell_price,
       p.sell_amount,
       p.price,
       p.amount,
       o.entryno,
       o.invoiceno,
       o.reference,
       o.date AS memo_date,
       o.id AS outward_id,
       pt.name AS party_name
     FROM dai_product p
     LEFT JOIN dai_outward o ON o.id = (
       SELECT o2.id
       FROM dai_outward o2
       WHERE FIND_IN_SET(p.id, o2.products) > 0
         AND o2.type IN ('memo', 'consign')
         AND o2.status IN ('on_memo', 'on_consign')
       ORDER BY o2.id DESC
       LIMIT 1
     )
     LEFT JOIN dai_party pt ON pt.id = o.party
     WHERE p.outward_parent IN (${placeholders})
       AND p.visibility = 1
       AND (p.outward = 'memo' OR p.outward = 'consign')
     ORDER BY p.outward_parent, p.sku`,
    ids
  );

  return rows.reduce((acc, row) => {
    const parentId = row.outward_parent;
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push({
      id: row.id,
      sku: row.sku,
      polish_carat: Number(row.polish_carat) || 0,
      polish_pcs: Number(row.polish_pcs) || 0,
      outward: row.outward,
      price: Number(row.sell_price) || Number(row.price) || 0,
      amount: Number(row.sell_amount) || Number(row.amount) || 0,
      entryno: row.entryno || "",
      invoiceno: row.invoiceno || "",
      reference: row.reference || "",
      memo_date: row.memo_date || "",
      outward_id: row.outward_id || null,
      party_name: row.party_name || "",
    });
    return acc;
  }, {});
};

/** Memo / unboxing history for parent box/parcel and its memo child stones. */
const getMemoHistoryMap = async (parentIds = [], memoItemsMap = {}) => {
  const parents = [...new Set(parentIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (!parents.length) return {};

  const childToParent = {};
  const childIds = [];
  Object.entries(memoItemsMap).forEach(([parentId, items]) => {
    (items || []).forEach((item) => {
      childToParent[item.id] = Number(parentId);
      childIds.push(item.id);
    });
  });

  const productIds = [...new Set([...parents, ...childIds])];
  if (!productIds.length) return {};

  const placeholders = productIds.map(() => "?").join(",");
  const rows = await query(
    `SELECT
       h.id,
       h.product_id,
       h.sku,
       h.action,
       h.description,
       h.date,
       h.carat,
       h.pcs,
       h.amount,
       h.price,
       h.invoice,
       h.type,
       h.narretion,
       pt.name AS party_name
     FROM dai_history h
     LEFT JOIN dai_party pt ON pt.id = h.party
     WHERE h.product_id IN (${placeholders})
     ORDER BY h.date DESC, h.id DESC
     LIMIT 80`,
    productIds
  );

  const parentSet = new Set(parents);
  const result = parents.reduce((acc, id) => {
    acc[id] = [];
    return acc;
  }, {});

  rows.forEach((row) => {
    const productId = Number(row.product_id);
    const parentId = parentSet.has(productId)
      ? productId
      : childToParent[productId];
    if (!parentId || !result[parentId]) return;

    if (result[parentId].length >= 12) return;

    result[parentId].push({
      id: row.id,
      product_id: productId,
      sku: row.sku || "",
      action: row.action || "",
      description: row.description || "",
      date: row.date || "",
      carat: Number(row.carat) || 0,
      pcs: Number(row.pcs) || 0,
      amount: Number(row.amount) || 0,
      price: Number(row.price) || 0,
      invoice: row.invoice || "",
      type: row.type || "",
      narration: row.narretion || "",
      party_name: row.party_name || "",
    });
  });

  return result;
};

const attachMemoCaratToProducts = async (products = []) => {
  if (!Array.isArray(products) || !products.length) return products;

  const parentIds = products
    .filter((row) => row.group_type && row.group_type !== "single")
    .map((row) => row.id);

  const [memoCaratMap, memoItemsMap] = await Promise.all([
    getMemoCaratMap(parentIds),
    getMemoItemsMap(parentIds),
  ]);

  const memoHistoryMap = await getMemoHistoryMap(parentIds, memoItemsMap);

  return products.map((row) => {
    if (!row.group_type || row.group_type === "single") return row;
    return {
      ...row,
      memo_carat: memoCaratMap[row.id] || 0,
      memo_items: memoItemsMap[row.id] || [],
      memo_history: memoHistoryMap[row.id] || [],
    };
  });
};

const getInsertString = insertString;
const getUpdateString = updateString;

/** Shared DB transaction — same pattern as outwardService.withTransaction */
const runInTransaction = (callback) => {
  const connection = require("./connection.js");
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
};

module.exports = {
  query,
  insertString,
  updateString,
  getInsertString,
  getUpdateString,
  getIncrementEntry,
  addHistory,
  addUserTrack,
  addNotification,
  notifyStoneSale,
  getInventoryAttribute,
  getExportAttribute,
  getAttribute,
  getAttributeField,
  getGiaReport,
  getMemoCaratMap,
  getMemoItemsMap,
  getMemoHistoryMap,
  attachMemoCaratToProducts,
  runInTransaction,
  DEFAULT_COMPANY_ID,
  DEFAULT_USER_ID,
  resolveCompanyId,
  getTenantScope,
};
