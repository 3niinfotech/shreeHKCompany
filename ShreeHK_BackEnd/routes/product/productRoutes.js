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
  " p.id,p.mfg_code,p.diamond_no,p.sku,p.pair,p.polish_pcs,p.polish_carat,p.rap_price,p.cost,p.price,p.amount,p.main_group,p.sub_group,p.remark,p.location,p.date,p.company,p.inward_id,p.inward,p.group_type,p.lab,p.send_to_lab,p.outward,p.box_products,p.parcel_products,p.box_id,p.parcel_id,p.hold,p.visibility,p.parent_id,p.main_color,p.category,p.argyle_color,p.in_house_clarity,p.mining,p.origin,p.rapnet_upload,p.site_upload,pv.report_no,pv.shape,pv.color,pv.clarity,pv.size,pv.polish,pv.f_intensity,pv.symmentry,pv.cut,pv.mesurment,pv.table_pc,pv.depth_pc,pv.gridle,pv.intensity,pv.overtone,pv.package,pv.bgm,pv.eyeclean ";

const ALLOWED_SORT_COLUMNS = {
  id: "p.id",
  "p.id": "p.id",
  sku: "p.sku",
  "p.sku": "p.sku",
  lab: "p.lab",
  "p.lab": "p.lab",
  mfg_code: "p.mfg_code",
  "p.mfg_code": "p.mfg_code",
  diamond_no: "p.diamond_no",
  "p.diamond_no": "p.diamond_no",
  polish_carat: "p.polish_carat",
  "p.polish_carat": "p.polish_carat",
  carat: "p.polish_carat",
  rap_price: "p.rap_price",
  "p.rap_price": "p.rap_price",
  cost: "p.cost",
  "p.cost": "p.cost",
  price: "p.price",
  "p.price": "p.price",
  amount: "p.amount",
  "p.amount": "p.amount",
  date: "p.date",
  "p.date": "p.date",
  location: "p.location",
  "p.location": "p.location",
  main_group: "p.main_group",
  "p.main_group": "p.main_group",
  sub_group: "p.sub_group",
  "p.sub_group": "p.sub_group",
  shape: "pv.shape",
  "pv.shape": "pv.shape",
  color: "pv.color",
  "pv.color": "pv.color",
  clarity: "pv.clarity",
  "pv.clarity": "pv.clarity",
  cut: "pv.cut",
  "pv.cut": "pv.cut",
  polish: "pv.polish",
  "pv.polish": "pv.polish",
  symmentry: "pv.symmentry",
  "pv.symmentry": "pv.symmentry",
  symmetry: "pv.symmentry",
  f_intensity: "pv.f_intensity",
  "pv.f_intensity": "pv.f_intensity",
  fluorescence: "pv.f_intensity",
  report_no: "pv.report_no",
  "pv.report_no": "pv.report_no",
  package: "pv.package",
  "pv.package": "pv.package",
  size: "pv.size",
  "pv.size": "pv.size",
  table: "pv.table_pc",
  table_pc: "pv.table_pc",
  "pv.table_pc": "pv.table_pc",
  depth: "pv.depth_pc",
  depth_pc: "pv.depth_pc",
  "pv.depth_pc": "pv.depth_pc",
  measurement: "pv.mesurment",
  mesurment: "pv.mesurment",
  "pv.mesurment": "pv.mesurment",
  gridle: "pv.gridle",
  "pv.gridle": "pv.gridle",
  eyeclean: "pv.eyeclean",
  "pv.eyeclean": "pv.eyeclean",
  bgm: "pv.bgm",
  "pv.bgm": "pv.bgm",
};

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

  const queryParams = [companyId];

  let pair = "";
  let location = "";
  let sku = "";
  let carat = "";
  let type = "";
  let package = "";
  let shape = "";
  let color = "";
  let intensity = "";
  let overtone = "";
  let clarity = "";
  let f_intensity = "";
  let memo = "";
  let symmentry = "";
  let cut = "";
  let polish = "";
  let lab = "";
  let category = "";

  const parseCarat = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let cFrom = null;
  let cTo = null;
  if (form_type === "fancy") {
    cFrom = parseCarat(post.cfrom);
    cTo = parseCarat(post.cto);
  } else if (form_type === "white") {
    cFrom = parseCarat(post.cwfrom);
    cTo = parseCarat(post.cwto);
  } else {
    cFrom = parseCarat(post.clfrom);
    cTo = parseCarat(post.clto);
  }

  if (cFrom !== null && cTo !== null) {
    carat = " and p.polish_carat BETWEEN ? and ?";
    queryParams.push(cFrom, cTo);
  } else if (cFrom !== null) {
    carat = " and p.polish_carat BETWEEN ? and 9999";
    queryParams.push(cFrom);
  } else if (cTo !== null) {
    carat = " and p.polish_carat BETWEEN 0 and ?";
    queryParams.push(cTo);
  }

  if (post.lab && post.lab.length) {
    const labPlaceholders = post.lab.map(() => "p.lab = ?").join(" || ");
    lab = ` and ( ${labPlaceholders} ) `;
    post.lab.forEach((v) => queryParams.push(v));
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
    const typePlaceholders = typeValues.map(() => "p.group_type = ?").join(" || ");
    type = ` and (${typePlaceholders}) `;
    typeValues.forEach((v) => queryParams.push(v));
  }

  let hold = "";
  if (post.hold) hold = " and p.hold = 1 ";

  let nonmemo = "";
  if (post.nm) nonmemo += " and p.outward <> 'memo' ";

  if (post.pair) pair = " and p.pair <> '' ";

  if (post.shape && post.shape.length) {
    const shapePlaceholders = post.shape.map(() => "pv.shape LIKE ?").join(" || ");
    shape = ` and (${shapePlaceholders}) `;
    post.shape.forEach((v) => queryParams.push(`%${v}%`));
  }

  if (post.package && post.package.length) {
    const packagePlaceholders = post.package.map(() => "pv.package = ?").join(" || ");
    package = ` and (${packagePlaceholders}) `;
    post.package.forEach((v) => queryParams.push(v));
  }

  let size = "";
  if (post.size && post.size.length) {
    const sizePlaceholders = post.size.map(() => "pv.size = ?").join(" || ");
    size = ` and (${sizePlaceholders}) `;
    post.size.forEach((v) => queryParams.push(v));
  }

  if (post.location && post.location.length) {
    const locPlaceholders = post.location.map(() => "p.location = ?").join(" || ");
    location = ` and (${locPlaceholders}) `;
    post.location.forEach((v) => queryParams.push(v));
  }

  if (post.color && form_type === "white") {
    const colorClauses = post.color.map(() => "pv.color LIKE ? || pv.color LIKE ?").join(" || ");
    color = ` and (${colorClauses}) `;
    post.color.forEach((v) => {
      queryParams.push(v, `${v}-%`);
    });
  }

  if (post.color && form_type === "fancy") {
    const colorPlaceholders = post.color.map(() => "pv.color = ?").join(" || ");
    color = ` and (${colorPlaceholders}) `;
    post.color.forEach((v) => queryParams.push(v));
  }

  if (form_type === "fancy") {
    intensity = " and ( pv.intensity <> '' || pv.intensity IS NOT NULL )";
  } else if (form_type === "white") {
    intensity = " and ( pv.intensity = '' || pv.intensity IS NULL )";
  }

  if (post.intensity && post.intensity.length) {
    const intensityPlaceholders = post.intensity.map(() => "pv.intensity = ?").join(" || ");
    intensity = ` and (${intensityPlaceholders}) `;
    post.intensity.forEach((v) => queryParams.push(v));
  }

  if (post.f_intensity && post.f_intensity.length) {
    const fIntensityPlaceholders = post.f_intensity.map(() => "pv.f_intensity = ?").join(" || ");
    f_intensity = ` and (${fIntensityPlaceholders}) `;
    post.f_intensity.forEach((v) => queryParams.push(v));
  }

  if (post.clarity && post.clarity.length) {
    const clarityPlaceholders = post.clarity.map(() => "pv.clarity = ?").join(" || ");
    clarity = ` and (${clarityPlaceholders}) `;
    post.clarity.forEach((v) => queryParams.push(v));
  }

  if (post.overtone && post.overtone.length) {
    const overtonePlaceholders = post.overtone.map(() => "pv.overtone LIKE ?").join(" || ");
    overtone = ` and (${overtonePlaceholders}) `;
    post.overtone.forEach((v) => {
      const val = v === "None" ? "" : v;
      queryParams.push(`%${val}%`);
    });
  }

  if (post.cut && post.cut.length) {
    const cutPlaceholders = post.cut.map(() => "pv.cut = ?").join(" || ");
    cut = ` and (${cutPlaceholders}) `;
    post.cut.forEach((v) => queryParams.push(v));
  }

  let main_group = "";
  if (post.main_group && post.main_group.length) {
    const mainGroupPlaceholders = post.main_group.map(() => "p.main_group = ?").join(" || ");
    main_group = ` and (${mainGroupPlaceholders}) `;
    post.main_group.forEach((v) => queryParams.push(v));
  }

  let sub_group = "";
  if (post.sub_group && post.sub_group.length) {
    const subGroupPlaceholders = post.sub_group.map(() => "p.sub_group = ?").join(" || ");
    sub_group = ` and (${subGroupPlaceholders}) `;
    post.sub_group.forEach((v) => queryParams.push(v));
  }

  if (post.polish && post.polish.length) {
    const polishPlaceholders = post.polish.map(() => "pv.polish = ?").join(" || ");
    polish = ` and (${polishPlaceholders}) `;
    post.polish.forEach((v) => queryParams.push(v));
  }

  if (post.symmentry && post.symmentry.length) {
    const symmentryPlaceholders = post.symmentry.map(() => "pv.symmentry = ?").join(" || ");
    symmentry = ` and (${symmentryPlaceholders}) `;
    post.symmentry.forEach((v) => queryParams.push(v));
  }

  if (post.category) {
    const cats = (Array.isArray(post.category) ? post.category : [post.category])
      .filter((c) => c != null && c !== "");
    if (cats.length) {
      category = ` and p.category IN (${cats.map(() => "?").join(",")}) `;
      cats.forEach((c) => queryParams.push(String(c)));
    }
  }

  const rawSortKey = String(post.sort || "").trim().toLowerCase();
  const rawSortType = String(post.sorttype || "").trim().toUpperCase();
  const safeSortDir = rawSortType === "DESC" ? "DESC" : "ASC";

  let sort = " p.lab desc,p.sku ";
  if (
    rawSortKey &&
    rawSortKey !== "rapnet" &&
    rawSortKey !== "discount" &&
    ALLOWED_SORT_COLUMNS[rawSortKey]
  ) {
    sort = ` ${ALLOWED_SORT_COLUMNS[rawSortKey]} ${safeSortDir} `;
  }

  // Newest stock first on page 1 unless caller passes explicit sort
  const newestFirst = post.sort ? "" : "p.id DESC, ";
  let group_type_sort = " FIELD(p.group_type, 'single','box','parcel'), ";
  if (post.lab) {
    sort = ` p.sku ${safeSortDir} `;
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
    " FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.company = ? and visibility = 1 and polish_carat <> 0";
  const inventoryBoxParcel =
    " and (p.box_id='' || p.box_id IS NULL) and (p.parcel_id='' || p.parcel_id IS NULL)";
  let outwardScope = " and (p.outward='' || p.outward IS NULL)";
  let sortQuery = `ORDER BY ${newestFirst}${group_type_sort}${sort}`;
  let filter = "";
  let searchClause = "";

  if (searchInput) {
    const searchTerms = searchInput.split(",").map((term) => term.trim()).filter(Boolean);
    if (searchTerms.length) {
      const searchConditions = searchTerms
        .map((term) => {
          const caratClause = /^\d/.test(term)
            ? " OR CAST(p.polish_carat AS CHAR) LIKE ?"
            : "";
          return `(
            pv.report_no LIKE ?
            OR p.sku LIKE ?
            OR p.mfg_code LIKE ?
            OR p.diamond_no LIKE ?
            OR pv.shape LIKE ?
            OR pv.cut LIKE ?
            OR pv.polish LIKE ?
            ${caratClause}
          )`;
        })
        .join(" OR ");
      searchClause = ` AND (${searchConditions})`;
      searchTerms.forEach((term) => {
        const likeVal = `%${term}%`;
        queryParams.push(likeVal, likeVal, likeVal, likeVal, likeVal, likeVal, likeVal);
        if (/^\d/.test(term)) {
          queryParams.push(likeVal);
        }
      });
    }
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

  let rowStatusFilter = "";
  if (post.rowStatus) {
    const s = String(post.rowStatus).trim().toLowerCase();
    if (s === "hold" || s === "on_hold" || s === "grey") {
      rowStatusFilter = " and p.hold = 1 ";
    } else if (s === "memo" || s === "consign" || s === "red") {
      rowStatusFilter = " and (p.outward = 'memo' || p.outward = 'consign') ";
    } else if (s === "certified" || s === "blue") {
      rowStatusFilter = " and (p.lab != '' and p.lab IS NOT NULL) ";
    } else if (s === "lab" || s === "green") {
      rowStatusFilter = " and p.outward = 'lab' ";
    } else if (s === "available" || s === "white" || s === "on_hand") {
      rowStatusFilter = " and (p.outward = '' || p.outward IS NULL) and (p.hold = 0 || p.hold IS NULL || p.hold = '') ";
    }
  }

  filter += rowStatusFilter;

  const queryConditions = `${inventoryBaseFrom}${outwardScope}${inventoryBoxParcel}${searchClause}`;
  let limitQuery = "LIMIT ? OFFSET ?";

  query = `SELECT ${columnName} ${queryConditions} ${filter} ${sortQuery} ${limitQuery} `;

  const countQuery = `SELECT COUNT(id) as totalProducts, SUM(p.polish_pcs) as totalPcs, SUM(p.polish_carat) as totalCarat, SUM(p.amount) as totalAmount ${queryConditions} ${filter}`;

  connection.query(countQuery, queryParams, (countError, countResult) => {
    if (countError) {
      return res
        .status(500)
        .json({ error: "Error occured while fetching data" });
    }

    if (!countResult || countResult.length === 0) {
      return res.status(500).json({ error: "Count query returned no results" });
    }

    connection.query(query, [...queryParams, limit, paginationOffset], async (error, data) => {
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
          TotalPcs: countResult[0]?.totalPcs || 0,
          TotalCarat: countResult[0]?.totalCarat || 0,
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

productRouter.post("/product/update-remark", authenticateToken, async (req, res) => {
  const id = Number(req.body?.id);
  const remark = req.body?.remark != null ? String(req.body.remark) : "";

  if (!id) {
    return res.status(400).json({ status: false, message: "Invalid product id" });
  }

  try {
    await helper.runInTransaction(async (q) => {
      const rows = await q("SELECT id, sku, remark FROM dai_product WHERE id=? LIMIT 1", [id]);
      if (!rows?.length) {
        throw new Error("Product not found.");
      }

      const oldRemark = rows[0].remark || "";
      await q("UPDATE dai_product SET remark=? WHERE id=?", [remark, id]);

      try {
        const { logAuditInTx } = require("../../services/auditIntegration.js");
        const { diffFields } = require("../../services/auditService.js");
        const oldSnap = { remark: oldRemark };
        const newSnap = { remark };
        await logAuditInTx(q, {
          actionType: "UPDATE",
          moduleName: "Inventory Remark",
          recordId: id,
          recordReference: rows[0]?.sku || String(id),
          oldValue: oldSnap,
          newValue: newSnap,
          changedFields: diffFields(oldSnap, newSnap),
        });
      } catch (_) {
        // Audit must not block remark save
      }
    });

    return res.status(200).json({ status: true, message: "Remark updated successfully" });
  } catch (err) {
    console.error("[update-remark] error:", err);
    return res.status(500).json({
      status: false,
      message: err?.message || "Failed to update remark",
    });
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
      companyId: buildUserContext(req).companyId,
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
      const historySql = "SELECT * FROM dai_history WHERE product_id = ? ORDER BY id";
      connection.query(historySql, [detail.id], (error, data) => {
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
      () => { }
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
