const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const outwardService = require("../outward/outwardService.js");
const changePriceService = require("./changePriceService.js");
const { validateChangePriceBody } = require("./changePriceValidation.js");
const labelA4Service = require("./labelA4Service.js");
const { validateLabelA4Body } = require("./labelA4Validation.js");
const labelStickerService = require("./labelStickerService.js");
const { validateLabelStickerBody } = require("./labelStickerValidation.js");
const iExportService = require("./iExportService.js");
const { validateIExportBody } = require("./iExportValidation.js");
const exportInventoryService = require("./exportInventoryService.js");
const { validateExportBody } = require("./exportValidation.js");
const inventoryMailService = require("./inventoryMailService.js");
const { validateInventoryMailBody } = require("./inventoryMailValidation.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { getInventorySuggestions } = require("./inventorySuggestService.js");
const { getInventorySummary } = require("../../services/inventorySummaryService.js");
const boxParcelService = require("./boxParcelService.js");
const {
  normalizeInventoryQuery,
  expandCategoryIds,
  resolveInventoryPagination,
} = require("./inventoryFilterHelper.js");
const productRouter = express.Router();

productRouter.use(express.json());

const columnName =
  " p.id,p.mfg_code,p.diamond_no,p.sku,p.pair,p.polish_pcs,p.polish_carat,p.rap_price,p.cost,p.price,p.amount,p.main_group,p.sub_group,p.remark,p.location,p.date,p.company,p.inward_id,p.group_type,p.lab,p.send_to_lab,p.outward,p.box_products,p.parcel_products,p.box_id,p.parcel_id,p.hold,p.visibility,p.parent_id,p.main_color,p.category,p.argyle_color,p.in_house_clarity,p.mining,p.origin,p.rapnet_upload,p.site_upload,pv.report_no,pv.shape,pv.color,pv.clarity,pv.size,pv.polish,pv.f_intensity,pv.symmentry,pv.cut,pv.mesurment,pv.table_pc,pv.depth_pc,pv.gridle,pv.intensity,pv.overtone,pv.package,pv.bgm,pv.eyeclean ";

productRouter.get("/product/inventory/suggest", authenticateToken, async (req, res) => {
  try {
    const q = req.query.q;
    const limit = req.query.limit;
    const Data = await getInventorySuggestions(q, limit, buildUserContext(req).companyId);
    res.json({ Data });
  } catch (error) {
    console.error("inventory suggest error:", error);
    res.status(500).json({ Data: [], message: "Could not load suggestions" });
  }
});

productRouter.get("/product/inventory/summary", authenticateToken, async (req, res) => {
  try {
    const Data = await getInventorySummary(req);
    res.status(200).json({
      status: true,
      Message: "Inventory summary loaded",
      Data,
      TotalItems: Data.totalItems || 0,
    });
  } catch (error) {
    console.error("inventory/summary error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to load inventory summary",
      Data: {},
      TotalItems: 0,
    });
  }
});

// Get Inventory
productRouter.get("/product/inventory", authenticateToken, async (req, res) => {
  let post = normalizeInventoryQuery(req.query);
  const companyId = buildUserContext(req).companyId;
  const form_type = post.form_type;
  const searchInput = post.searchInput;
  const limit = parseInt(post.limit, 10) || 100;
  const { paginationOffset } = resolveInventoryPagination(post.offset, limit);

  if (post.category?.length) {
    try {
      const expanded = await expandCategoryIds(post.category);
      if (expanded.length) post.category = expanded.map(String);
    } catch (categoryError) {
      console.error("expandCategoryIds error:", categoryError);
    }
  }

  let pair =
    (location =
    sku =
    carat =
    type =
    package =
    shape =
    color =
    intensity =
    overtone =
    clarity =
    f_intensity =
    memo =
    symmentry =
    cut =
    polish =
    lab =
      "");
  let category = "";

  // if (post.sku && post.sku !== "") {
  //   post.sku = post.sku.replace(/\s+/g, "");
  //   let tem = post.sku.split(",");

  //   if (tem.length !== 1) {
  //     let skua = tem.join("','");
  //     sku = ` and ( p.mfg_code IN ('${skua}') or p.sku IN ('${skua}') or pv.report_no IN ('${skua}') )`;
  //   } else {
  //     sku = ` and ( p.mfg_code LIKE '%${post.sku}%' or p.sku LIKE '%${post.sku}%' or pv.report_no LIKE '%${post.sku}%' or p.barcode LIKE '%${post.sku}%' ) `;
  //   }
  // }

  // if (post.limit) {
  //   let oldL = post.limit;
  //   let newL = post.limitTo;
  //   limit = ` LIMIT ${oldL},${newL}`;
  // }

  if (form_type === "fancy") {
    if (post.cfrom && post.cfrom !== "" && post.cto && post.cto !== "") {
      carat = ` and p.polish_carat BETWEEN ${post.cfrom} and ${post.cto}`;
    } else if (post.cfrom && post.cfrom !== "") {
      carat = ` and p.polish_carat BETWEEN ${post.cfrom} and 9999`;
    } else if (post.cto && post.cto !== "") {
      carat = ` and p.polish_carat BETWEEN 0 and ${post.cto}`;
    }
  } else if (form_type === "white") {
    if (post.cwfrom && post.cwfrom !== "" && post.cwto && post.cwto !== "") {
      carat = ` and p.polish_carat BETWEEN ${post.cwfrom} and ${post.cwto}`;
    } else if (post.cwfrom && post.cwfrom !== "") {
      carat = ` and p.polish_carat BETWEEN ${post.cwfrom} and 9999`;
    } else if (post.cwto && post.cwto !== "") {
      carat = ` and p.polish_carat BETWEEN 0 and ${post.cwto}`;
    }
  } else {
    if (post.clfrom && post.clfrom !== "" && post.clto && post.clto !== "") {
      carat = ` and p.polish_carat BETWEEN ${post.clfrom} and ${post.clto}`;
    } else if (post.clfrom && post.clfrom !== "") {
      carat = ` and p.polish_carat BETWEEN ${post.clfrom} and 9999`;
    } else if (post.clto && post.clto !== "") {
      carat = ` and p.polish_carat BETWEEN 0 and ${post.clto}`;
    }
  }

  if (post.lab) {
    lab = " and ( ";
    post.lab.forEach((v, k) => {
      lab += ` p.lab = '${v}' `;
      if (k !== post.lab.length - 1) lab += " || ";
    });
    lab += " ) ";
  }

  if (post.memo) {
    memo = " and ( ";
    post.memo.forEach((v, k) => {
      if (v === "memo") {
        memo += "(p.outward = 'memo'  ||  p.outward = 'consign')";
      }
      if (v === "lab") memo += "p.outward = 'lab' ";
      if (v === "nong") memo += "(p.lab = '' ||  p.lab IS NULL)";
      if (k !== post.memo.length - 1) memo += " and ";
    });
    memo += " ) ";
  }

  if (post.type) {
    const typeValues = Array.isArray(post.type) ? post.type : [post.type];
    type = " and (";
    typeValues.forEach((v, k) => {
      type += ` p.group_type = '${v}' `;
      if (k !== typeValues.length - 1) type += " || ";
    });
    type += ") ";
  }

  let hold = "";
  if (post.hold) hold = " and p.hold = 1 ";

  let nonmemo = "";
  if (post.nm) nonmemo += " and p.outward <> 'memo' ";

  if (post.pair) pair = " and p.pair <> '' ";

  if (post.shape) {
    shape = " and (";
    post.shape.forEach((v, k) => {
      shape += ` pv.shape LIKE '%${v}%' `;
      if (k !== post.shape.length - 1) shape += " || ";
    });
    shape += ") ";
  }

  if (post.package) {
    package = " and (";
    post.package.forEach((v, k) => {
      package += ` pv.package = '${v}' `;
      if (k !== post.package.length - 1) package += " || ";
    });
    package += ") ";
  }

  let size = "";
  if (post.size) {
    size = " and (";
    post.size.forEach((v, k) => {
      size += ` pv.size = '${v}' `;
      if (k !== post.size.length - 1) size += " || ";
    });
    size += ") ";
  }

  if (post.location) {
    location = " and (";
    post.location.forEach((v, k) => {
      location += ` p.location = '${v}' `;
      if (k !== post.location.length - 1) location += " || ";
    });
    location += ") ";
  }

  if (post.color && form_type === "white") {
    color = " and (";
    post.color.forEach((v, k) => {
      color += ` pv.color LIKE '${v}' || pv.color LIKE '${v}-%' `;
      if (k !== post.color.length - 1) color += " || ";
    });
    color += ") ";
  }

  if (post.color && form_type === "fancy") {
    color = " and (";
    post.color.forEach((v, k) => {
      color += ` pv.color = '${v}' `;
      if (k !== post.color.length - 1) color += " || ";
    });
    color += ") ";
  }

  if (form_type === "fancy") {
    intensity = " and ( pv.intensity <> '' || pv.intensity IS NOT NULL )";
  } else if (form_type === "white") {
    intensity = " and ( pv.intensity = '' || pv.intensity IS NULL )";
  }

  if (post.intensity) {
    intensity = " and (";
    post.intensity.forEach((v, k) => {
      intensity += ` pv.intensity = '${v}' `;
      if (k !== post.intensity.length - 1) intensity += " || ";
    });
    intensity += ") ";
  }

  if (post.f_intensity) {
    f_intensity = " and (";
    post.f_intensity.forEach((v, k) => {
      f_intensity += ` pv.f_intensity = '${v}' `;
      if (k !== post.f_intensity.length - 1) f_intensity += " || ";
    });
    f_intensity += ") ";
  }

  if (post.clarity) {
    clarity = " and (";
    post.clarity.forEach((v, k) => {
      clarity += ` pv.clarity = '${v}' `;
      if (k !== post.clarity.length - 1) clarity += " || ";
    });
    clarity += ") ";
  }

  if (post.overtone) {
    overtone = " and (";
    post.overtone.forEach((v, k) => {
      if (v === "None") v = "";
      overtone += ` pv.overtone LIKE '%${v}%' `;
      if (k !== post.overtone.length - 1) overtone += " || ";
    });
    overtone += ") ";
  }

  if (post.cut) {
    cut = " and (";
    post.cut.forEach((v, k) => {
      cut += ` pv.cut = '${v}' `;
      if (k !== post.cut.length - 1) cut += " || ";
    });
    cut += ") ";
  }

  let main_group = "";
  if (post.main_group) {
    main_group = " and (";
    post.main_group.forEach((v, k) => {
      main_group += ` p.main_group = '${v}' `;
      if (k !== post.main_group.length - 1) main_group += " || ";
    });
    main_group += ") ";
  }

  let sub_group = "";
  if (post.sub_group) {
    sub_group = " and (";
    post.sub_group.forEach((v, k) => {
      sub_group += ` p.sub_group = '${v}' `;
      if (k !== post.sub_group.length - 1) sub_group += " || ";
    });
    sub_group += ") ";
  }

  if (post.polish) {
    polish = " and (";
    post.polish.forEach((v, k) => {
      polish += ` pv.polish = '${v}' `;
      if (k !== post.polish.length - 1) polish += " || ";
    });
    polish += ") ";
  }

  if (post.symmentry) {
    symmentry = " and (";
    post.symmentry.forEach((v, k) => {
      symmentry += ` pv.symmentry = '${v}' `;
      if (k !== post.symmentry.length - 1) symmentry += " || ";
    });
    symmentry += ") ";
  }

  if (post.category) {
    const cats = Array.isArray(post.category) ? post.category : [post.category];
    const ids = cats
      .filter((c) => c != null && c !== "")
      .map((c) => connection.escape(String(c)))
      .join(",");
    if (ids) category = ` and p.category IN (${ids}) `;
  }

  let sort = " p.lab desc,p.sku ";

  if (
    post.sort &&
    post.sort !== "" &&
    post.sort !== "rapnet" &&
    post.sort !== "discount"
  ) {
    sort = ` ${post.sort} `;
  }

  let ascType = "";
  if (post.sorttype && post.sorttype !== "") {
    ascType = ` ${post.sorttype} `;
  }

  sort = `${sort} ${ascType}`;

  // Newest stock first on page 1 unless caller passes explicit sort
  const newestFirst = post.sort ? "" : "p.id DESC, ";
  let group_type_sort = " FIELD(p.group_type, 'single','box','parcel'), ";
  if (post.lab) {
    sort = " p.sku ";
    sort = `${sort} ${ascType}`;
    group_type_sort = "";
  }

  let diamond = "";
  if (post.diamond && post.diamond !== null) {
    if (post.diamond === "F") {
      diamond = " and (pv.intensity !='' || pv.intensity != NULL)";
    } else {
      diamond = " and (pv.intensity ='' || pv.intensity IS NULL)";
    }
  }

  // query — outward scope mirrors venya inventoryModel.php per filter branch
  let query = "";
  const inventoryBaseFrom =
    ` FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.company=${companyId} and visibility=1 and polish_carat <>0`;
  const inventoryBoxParcel =
    " and (p.box_id='' || p.box_id IS NULL) and (p.parcel_id='' || p.parcel_id IS NULL)";
  let outwardScope = " and (p.outward='' || p.outward IS NULL)";
  let sortQuery = `ORDER BY ${newestFirst}${group_type_sort}${sort}`;
  let filter = "";
  let searchClause = "";

  if (searchInput) {
    const searchTerms = searchInput.split(",").map((term) => term.trim()).filter(Boolean);
    const searchConditions = searchTerms
      .map((term) => {
        const like = connection.escape(`%${term}%`);
        const caratClause = /^\d/.test(term)
          ? ` OR CAST(p.polish_carat AS CHAR) LIKE ${like}`
          : "";
        return `(
          pv.report_no LIKE ${like}
          OR p.sku LIKE ${like}
          OR p.mfg_code LIKE ${like}
          OR p.diamond_no LIKE ${like}
          OR pv.shape LIKE ${like}
          OR pv.cut LIKE ${like}
          OR pv.polish LIKE ${like}
          ${caratClause}
        )`;
      })
      .join(" OR ");
    searchClause = ` AND (${searchConditions})`;
  }

  if (
    post.available &&
    (post.available === "All Stock" ||
      post.available === "GIA" ||
      post.available === "Non-GIA")
  ) {
    outwardScope =
      " and ((p.outward <> 'sale' and p.outward <> 'export') || p.outward='' || p.outward IS NULL)";
    let avai_gia = "";
    if (post.available === "GIA") {
      avai_gia = " and (p.lab !='' || p.lab != NULL) ";
    } else if (post.available === "Non-GIA") {
      avai_gia = " and (p.lab = '' || p.lab IS NULL) ";
    }

    filter = `${category}${avai_gia}${hold}${sku}${pair}${carat}${size}${lab}${memo}${type}${sub_group}${main_group}${shape}${color}${package}${location}${intensity}${f_intensity}${overtone}${clarity}${symmentry}${cut}${polish}${diamond}`;
  } else if (
    post.available &&
    (post.available === "On Hand GIA" ||
      post.available === "On Hand Non-GIA" ||
      post.available === "On Hand Stock")
  ) {
    outwardScope = " and (p.outward='' || p.outward IS NULL)";
    let avai_gia = "";
    if (post.available === "On Hand GIA") {
      avai_gia = " and (p.lab !='' || p.lab != NULL) ";
    } else if (post.available === "On Hand Non-GIA") {
      avai_gia = " and (p.lab = '' || p.lab IS NULL) ";
    }

    filter = `${category}${avai_gia}${nonmemo}${hold}${sku}${pair}${carat}${size}${lab}${memo}${type}${sub_group}${main_group}${shape}${color}${package}${location}${intensity}${f_intensity}${overtone}${clarity}${symmentry}${cut}${polish}${diamond}`;
  } else {
    if (post.memo) {
      outwardScope =
        " and ( p.outward = 'memo' || p.outward ='consign' || p.outward ='' || p.outward IS NULL)";
    } else if (post.type) {
      outwardScope =
        " and ( p.outward = 'memo' || p.outward ='consign' || p.outward ='' || p.outward IS NULL)";
    } else {
      outwardScope =
        " and ( p.outward = 'lab' || p.outward = 'memo' || p.outward ='consign' || p.outward ='' || p.outward IS NULL)";
    }
    let outword = "";
    if (post.outstock) {
      if (post.outstock === "GIA-OutMemo") {
        outword =
          " and ((p.lab !='' || p.lab != NULL) and (p.outward='memo' || p.outward='consign')) ";
      } else if (post.outstock === "GIA-OnHold") {
        outword =
          " and ((p.lab !='' || p.lab != NULL) and (p.outward='memo' || p.outward='consign') and (p.hold=1)) ";
      } else if (post.outstock === "Non-GIA-OutMemo") {
        outword =
          " and ((p.lab ='' || p.lab = NULL) and (p.outward='memo' || p.outward='consign')) ";
      } else if (post.outstock === "Non-GIA-OnHold") {
        outword =
          " and ((p.lab ='' || p.lab = NULL) and (p.outward='memo' || p.outward='consign') and (p.hold=1)) ";
      } else if (post.outstock === "AllStock-OutMemo") {
        outword = " and (p.outward='memo' || p.outward='consign') ";
      } else if (post.outstock === "AllStock-OnHold") {
        outword =
          " and ((p.outward='memo' || p.outward='consign') and (p.hold=1)) ";
      } else if (post.outstock === "Lab") {
        outword = " and (p.outward='lab') ";
      }
    }

    if (post.type) {
      sortQuery = `ORDER BY ${newestFirst}${sort} `;
      if (post.memo) {
        filter = `${outword}${hold}${sku}${carat}${location}${pair}${lab}${memo}${type}${shape}${size}${package}${color}${sub_group}${main_group}${intensity}${f_intensity}${overtone}${clarity}${symmentry}${cut}${polish}${diamond}${category}`;
      } else {
        filter = `${outword}${nonmemo}${hold}${sku}${pair}${carat}${size}${lab}${memo}${type}${sub_group}${main_group}${shape}${color}${package}${location}${intensity}${f_intensity}${overtone}${clarity}${symmentry}${cut}${polish}${diamond}${category}`;
      }
    } else {
      sortQuery = `ORDER BY ${newestFirst}${group_type_sort} ${sort}`;
      if (post.memo) {
        filter = `${outword}${hold}${sku}${carat}${pair}${location}${size}${lab}${memo}${sub_group}${main_group}${shape}${package}${color}${intensity}${f_intensity}${overtone}${clarity}${symmentry}${cut}${polish}${diamond}${category}`;
      } else {
        filter = `${outword}${nonmemo}${hold}${sku}${pair}${carat}${size}${lab}${memo}${sub_group}${main_group}${shape}${color}${package}${location}${intensity}${f_intensity}${overtone}${clarity}${symmentry}${cut}${polish}${diamond}${category}`;
      }
    }
  }

  const queryConditions = `${inventoryBaseFrom}${outwardScope}${inventoryBoxParcel}${searchClause}`;
  let limitQuery = `LIMIT ${limit} OFFSET ${paginationOffset}`;

  query = `SELECT ${columnName} ${queryConditions} ${filter} ${sortQuery} ${limitQuery} `;

  const countQuery = `SELECT COUNT(id) as totalProducts, SUM(p.amount) as totalAmount ${queryConditions} ${filter}`;

  // console.log("----------");
  // console.log(query);

  connection.query(countQuery, (countError, countResult) => {
    if (countError) {
      return res
        .status(500)
        .json({ error: "Error occured while fetching data" });
    }

    if (!countResult || countResult.length === 0) {
      return res.status(500).json({ error: "Count query returned no results" });
    }

    connection.query(query, async (error, data) => {
      if (error) return res.status(500).json({ error: error.message });

      let rows = data;
      try {
        rows = await helper.attachMemoCaratToProducts(data);
      } catch (enrichError) {
        console.error("attachMemoCaratToProducts:", enrichError);
      }

      const response = {
        TotalData: {
          TotalItems: countResult[0]?.totalProducts || 0,
          TotalAmount: countResult[0]?.totalAmount || 0,
        },
        Data: rows,
      };
      res.json(response);
    });
  });
});

productRouter.get("/product/detail", authenticateToken, (req, res) => {
  const id = req.query.id;
  const by = req?.query?.by || "id";

  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Stone ID or SKU is required" });
  }

  const trimmed = String(id).trim();
  const companyId = buildUserContext(req).companyId;

  const loadDetail = async () => {
    if (by === "p.sku" && companyId) {
      const scoped = await productHelper.getDetailBySku(trimmed, companyId);
      if (scoped) return scoped;
    }
    return productHelper.getDetail(trimmed, by);
  };

  loadDetail()
    .then((data) => {
      if (!data) {
        return res.status(404).json({ error: "Stone not found", Data: null });
      }
      if (companyId && String(data.company) !== String(companyId)) {
        return res.status(404).json({ error: "Stone not found", Data: null });
      }
      res.json({ Data: data });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: error?.error || "Failed to load stone detail" });
    });
});

productRouter.post("/product/save", authenticateToken, async (req, res) => {
  const { id, values, ...body } = req.body;

  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: "Request body is empty" });
  }

  if (id == 0) {
    return res.status(400).json({ error: "Product not found." });
  }

  let message = "There was an error. Please check it";

  try {
    await helper.runInTransaction(async (q) => {
      const oldRows = await q("SELECT * FROM dai_product WHERE id=?", [id]);
      const oldRow = oldRows[0] || null;
      const oldValRows = await q("SELECT * FROM dai_product_value WHERE product_id=?", [id]);
      const oldValRow = oldValRows[0] || null;

      const updateResponse = helper.updateString(body);
      const valuesResponse = helper.updateString(values || {});
      if (!updateResponse) {
        throw new Error("No product fields to update");
      }
      if (!valuesResponse) {
        throw new Error("No specification fields to update");
      }
      await q(`UPDATE dai_product SET ${updateResponse} WHERE id=?`, [id]);
      await q(`UPDATE dai_product_value SET ${valuesResponse} WHERE product_id=?`, [id]);
      message = "Product detail has been updated successfully!";

      const newRows = await q("SELECT * FROM dai_product WHERE id=?", [id]);
      const newValRows = await q("SELECT * FROM dai_product_value WHERE product_id=?", [id]);

      const { logAuditInTx } = require("../../services/auditIntegration.js");
      const { buildFullProductAuditSnapshot } = require("../../services/auditProductSnapshot.js");
      const { diffFields } = require("../../services/auditService.js");

      const oldSnap = buildFullProductAuditSnapshot({ ...oldRow, record: oldValRow });
      const newSnap = buildFullProductAuditSnapshot({ ...newRows[0], record: newValRows[0] });

      await logAuditInTx(q, {
        actionType: "UPDATE",
        moduleName: "Stone Update",
        recordId: id,
        recordReference: newRows[0]?.sku || String(id),
        oldValue: oldSnap,
        newValue: newSnap,
        changedFields: diffFields(oldSnap, newSnap),
      });
    });

    res.status(201).json({ message: message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

productRouter.post("/product/change-price", authenticateToken, async (req, res) => {
  try {
    const validation = validateChangePriceBody(req.body || {});
    if (!validation.ok) {
      return res.status(200).json({
        status: false,
        message: validation.message,
      });
    }

    const userContext = buildUserContext(req);

    await changePriceService.updatePrice(validation.product, userContext);
    return res.status(200).json({
      status: true,
      message: "Price updated successfully",
    });
  } catch (error) {
    console.error("[change-price] error:", error);
    return res.status(200).json({
      status: false,
      message: error?.sqlMessage || error?.message || "Server error",
    });
  }
});

productRouter.post("/product/export", authenticateToken, async (req, res) => {
  try {
    const validation = validateExportBody(req.body || {});
    if (!validation.ok) {
      return res.status(200).json({
        status: false,
        message: validation.message,
      });
    }

    const exportFile = await exportInventoryService.exportInventoryGrid({
      ids: validation.ids,
      sheetName: validation.sheetName,
    });

    const downloadName = `${validation.fileName}.${exportFile.extension}`;
    res.setHeader("Content-Type", exportFile.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    return res.status(200).send(exportFile.buffer);
  } catch (error) {
    console.error("[export] error:", error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode === 404 ? 200 : 500).json({
      status: false,
      message: error?.sqlMessage || error?.message || "Server error",
    });
  }
});

productRouter.post("/product/mail", authenticateToken, async (req, res) => {
  try {
    const validation = validateInventoryMailBody(req.body || {});
    if (!validation.ok) {
      return res.status(200).json({
        status: false,
        message: validation.message,
      });
    }

    const result = await inventoryMailService.sendInventoryStoneMail({
      ids: validation.ids,
      email: validation.email,
      subject: validation.subject,
      content: validation.content,
    });

    return res.status(200).json({
      status: result.ok,
      message: result.message,
    });
  } catch (error) {
    console.error("[mail] error:", error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode === 404 ? 200 : 500).json({
      status: false,
      message: error?.message || "Server error",
    });
  }
});

productRouter.post("/product/i-export", authenticateToken, async (req, res) => {
  try {
    const validation = validateIExportBody(req.body || {});
    if (!validation.ok) {
      return res.status(200).json({
        status: false,
        message: validation.message,
      });
    }

    const exportFile = await iExportService.exportInventoryFull({
      ids: validation.ids,
      format: validation.format,
    });

    const downloadName = `${validation.fileName}.${exportFile.extension}`;
    res.setHeader("Content-Type", exportFile.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    return res.status(200).send(exportFile.buffer);
  } catch (error) {
    console.error("[i-export] error:", error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode === 404 ? 200 : 500).json({
      status: false,
      message: error?.sqlMessage || error?.message || "Server error",
    });
  }
});

productRouter.post("/product/label/print", authenticateToken, async (req, res) => {
  try {
    const validation = validateLabelStickerBody(req.body || {});
    if (!validation.ok) {
      return res.status(200).json({
        status: false,
        message: validation.message,
      });
    }

    const pdfBuffer = await labelStickerService.printLabelSticker({
      ids: validation.ids,
      diaPair: validation.diaPair,
      copies: validation.copies,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="Print.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[label] error:", error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode === 400 || statusCode === 404 ? 200 : 500).json({
      status: false,
      message: error?.sqlMessage || error?.message || "Server error",
    });
  }
});

productRouter.post("/product/label-a4/print", authenticateToken, async (req, res) => {
  try {
    const validation = validateLabelA4Body(req.body || {});
    if (!validation.ok) {
      return res.status(200).json({
        status: false,
        message: validation.message,
      });
    }

    const pdfBuffer = await labelA4Service.printLabelA4({
      ids: validation.ids,
      type: validation.type,
      diaPair: validation.diaPair,
      copies: validation.copies,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="Print.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[label-a4] error:", error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode === 400 || statusCode === 404 ? 200 : 500).json({
      status: false,
      message: error?.sqlMessage || error?.message || "Server error",
    });
  }
});

productRouter.get("/product/holdDetail", authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.query.productId || req.query.id, 10);
    if (!productId) {
      return res.status(400).json({ status: false, message: "productId is required" });
    }
    const data = await outwardService.getHoldDetail(productId);
    if (!data) {
      return res.status(404).json({ status: false, message: "Hold record not found" });
    }
    return res.status(200).json({ status: true, data });
  } catch (error) {
    console.error("holdDetail error:", error);
    return res.status(500).json({ status: false, message: error.message || "Server error" });
  }
});

productRouter.get("/product/history", authenticateToken, async (req, res) => {
  try {
    const sku = req.query.sku;

    // Get product detail
    const detail = await productHelper.getDetail(sku, "p.sku");

    if (!detail || detail.id === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get product history
    const history = await new Promise((resolve, reject) => {
      let query = `SELECT * FROM dai_history WHERE product_id=${detail.id} ORDER BY id`;
      connection.query(query, (error, data) => {
        if (error) {
          return reject({ error: "Error occurred while fetching data" });
        }
        resolve(data);
      });
    });

    // Send the response
    const response = {
      Data: detail,
      History: history,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

productRouter.post("/product/box/add-stones", authenticateToken, async (req, res) => {
  try {
    const result = await boxParcelService.addSinglesToBox(req.body, buildUserContext(req));
    return res.status(200).json(result);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ ok: false, message: error.message || "Server error" });
  }
});

productRouter.post("/product/parcel/add-stones", authenticateToken, async (req, res) => {
  try {
    const result = await boxParcelService.addSinglesToParcel(req.body, buildUserContext(req));
    return res.status(200).json(result);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ ok: false, message: error.message || "Server error" });
  }
});

productRouter.get("/product/categorize/tree", authenticateToken, async (req, res) => {
  try {
    const Data = await boxParcelService.getCategorizeTree();
    return res.json({ Data });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

productRouter.get("/product/categorize/stats", authenticateToken, async (req, res) => {
  try {
    const categoryId = req.query.categoryId;
    const Data = await boxParcelService.getCategoryStats(categoryId);
    return res.json({ Data });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

productRouter.post("/product/categorize/assign", authenticateToken, async (req, res) => {
  try {
    const { productIds, categoryId } = req.body;
    const result = await boxParcelService.assignCategory(productIds, categoryId);
    return res.status(200).json(result);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ ok: false, message: error.message || "Server error" });
  }
});

// const getDetail = (id, by) => {
//   return new Promise((resolve, reject) => {
//     try {
//       console.log(id);
//       let query = `SELECT  * FROM dai_product p JOIN dai_product_value v ON p.id = v.product_id WHERE ${by}='${id}'`;
// console.log(query);
//       connection.query(query, (error, data) => {
//         if (error) {
//           return reject({ error: "Error occurred while fetching data" });
//         }
//         if (data.length > 0) {
//           resolve(data[0]); // Return the first record
//         } else {
//           resolve(null); // Return null if no records found
//         }
//       });
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

productRouter.post("/product/package/assign", authenticateToken, async (req, res) => {
  try {
    const packageName = String(req.body?.packageName || req.body?.package || "").trim().toUpperCase();
    const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    if (!packageName || !productIds.length) {
      return res.status(400).json({ status: false, message: "packageName and productIds are required" });
    }
    const userId = req.user?.user_id || 1;
    for (const pid of productIds) {
      await new Promise((resolve, reject) => {
        connection.query(
          "UPDATE dai_product_value SET package = ? WHERE product_id = ?",
          [packageName, pid],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }
    const trackSql = `INSERT INTO user_track (product_id, action, date, description, user, company)
      VALUES (?, 'add_to_package', NOW(), ?, ?, ?)`;
    connection.query(
      trackSql,
      [productIds.join(","), `Add To Package: ${packageName}`, userId, req.user?.companyId || 1],
      () => {}
    );
    return res.json({ status: true, message: `${productIds.length} stone(s) assigned to package ${packageName}` });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

productRouter.post("/product/pair/assign", authenticateToken, async (req, res) => {
  try {
    const id1 = Number(req.body?.id1);
    const id2 = Number(req.body?.id2);
    const pairName = req.body?.pairName || "pair";
    if (!id1 || !id2) {
      return res.status(400).json({ status: false, message: "id1 and id2 are required" });
    }
    const result = await boxParcelService.assignPair(id1, id2, pairName);
    return res.status(200).json(result);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ status: false, message: error.message || "Server error" });
  }
});

productRouter.post("/product/pair/unpair", authenticateToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const result = await boxParcelService.unpairProducts(ids);
    return res.status(200).json(result);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ status: false, message: error.message || "Server error" });
  }
});

module.exports = productRouter;
