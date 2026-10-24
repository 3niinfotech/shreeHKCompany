const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const { logAudit } = require("../../services/auditIntegration.js");

async function addHistoryAudited(history, moduleName = "Box/Parcel") {
  await helper.addHistory(history);
  await logAudit({
    actionType: "UPDATE",
    moduleName,
    recordId: history.product_id,
    recordReference: history.sku || String(history.product_id || ""),
    description: history.description,
  }).catch(console.error);
}

async function getStoneById(id) {
  return productHelper.getDetail(id, "p.id");
}

async function validateSingles(stoneIds) {
  const stones = [];
  for (const rawId of stoneIds) {
    const id = Number(rawId);
    if (!id) continue;
    const stone = await getStoneById(id);
    if (!stone) {
      const err = new Error(`Product id ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (stone.group_type && stone.group_type !== "single") {
      const err = new Error(`SKU ${stone.sku} is not a single stone`);
      err.statusCode = 400;
      throw err;
    }
    if (stone.outward) {
      const err = new Error(`SKU ${stone.sku} is on ${stone.outward}`);
      err.statusCode = 400;
      throw err;
    }
    if (stone.box_id || stone.parcel_id) {
      const err = new Error(`SKU ${stone.sku} is already in a container`);
      err.statusCode = 400;
      throw err;
    }
    stones.push(stone);
  }
  if (!stones.length) {
    const err = new Error("No valid stones selected");
    err.statusCode = 400;
    throw err;
  }
  return stones;
}

function sumStones(stones) {
  return stones.reduce(
    (acc, s) => ({
      pcs: acc.pcs + Number(s.polish_pcs || 0),
      carat: acc.carat + Number(s.polish_carat || 0),
      amount: acc.amount + Number(s.amount || 0),
    }),
    { pcs: 0, carat: 0, amount: 0 },
  );
}

async function insertProductValueFromStone(productId, stone) {
  const attr = {
    product_id: productId,
    shape: stone.shape || "",
    color: stone.color || "",
    clarity: stone.clarity || "",
    size: stone.size || "",
    polish: stone.polish || "",
    cut: stone.cut || "",
    symmentry: stone.symmentry || "",
    f_intensity: stone.f_intensity || "",
    package: stone.package || "",
    bgm: stone.bgm || "",
    eyeclean: stone.eyeclean || "",
  };
  const [cols, vals] = helper.insertString(attr);
  await helper.query(`INSERT INTO dai_product_value (${cols}) VALUES (${vals})`);
}

async function attachStonesToContainer({ stones, container, containerField, actionLabel }) {
  const productList = String(container.box_products || container.parcel_products || "")
    .split(",")
    .filter(Boolean);
  let addPcs = 0;
  let addCarat = 0;
  let addAmount = 0;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const containerCompany = Number(container.company) || helper.resolveCompanyId(userContext.companyId);

  for (const stone of stones) {
    addPcs += Number(stone.polish_pcs || 0);
    addCarat += Number(stone.polish_carat || 0);
    addAmount += Number(stone.amount || 0);

    const stoneCompany = Number(stone.company) || containerCompany;
    await helper.query(
      `UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ? AND company = ?`,
      [container.id, container.id, stone.id, stoneCompany],
    );

    if (!productList.includes(String(stone.id))) {
      productList.push(String(stone.id));
    }

    await addHistoryAudited({
      product_id: stone.id,
      action: actionLabel,
      date: now,
      description: `Added to ${container.group_type} ${container.sku}`,
      sku: stone.sku,
      pcs: stone.polish_pcs,
      carat: stone.polish_carat,
      amount: stone.amount,
    });
  }

  const newPcs = Number(container.polish_pcs || 0) + addPcs;
  const newCarat = Number(container.polish_carat || 0) + addCarat;
  const newAmount = Number(container.amount || 0) + addAmount;
  const newPrice = newCarat > 0 ? Number((newAmount / newCarat).toFixed(2)) : container.price;
  const productsField = container.group_type === "parcel" ? "parcel_products" : "box_products";

  await helper.query(
    `UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ? AND company = ?`,
    [newPcs, newCarat, newAmount, newPrice, productList.length, productList.join(","), container.id, containerCompany],
  );

  const stoneSkus = stones.map((s) => s.sku).filter(Boolean);
  await addHistoryAudited({
    product_id: container.id,
    action: actionLabel,
    date: now,
    description: `Added ${stones.length} stone(s) (${stoneSkus.join(", ")})`,
    sku: container.sku,
    pcs: addPcs,
    carat: addCarat,
    amount: addAmount,
    balance_pcs: newPcs,
    balance_carat: newCarat,
  });

  return { containerId: container.id, containerSku: container.sku };
}

async function createContainerFromStones(stones, { groupType, sku, category, remark, userId, companyId }) {
  const totals = sumStones(stones);
  const avgPrice = totals.carat > 0 ? Number((totals.amount / totals.carat).toFixed(2)) : 0;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const first = stones[0];
  const productsField = groupType === "parcel" ? "parcel_products" : "box_products";
  const stoneIds = stones.map((s) => s.id);

  const row = {
    sku: sku || `${groupType.toUpperCase()}-${Date.now()}`,
    date: now,
    company: helper.resolveCompanyId(companyId),
    user: userId || helper.DEFAULT_USER_ID,
    polish_pcs: groupType === "parcel" ? 0 : totals.pcs,
    polish_carat: totals.carat,
    price: avgPrice,
    amount: totals.amount,
    group_type: groupType,
    visibility: 1,
    child_count: stones.length,
    [productsField]: stoneIds.join(","),
    remark: remark || "",
    category: category || first?.category || "",
    location: first?.location || "",
    main_group: first?.main_group || "",
    sub_group: first?.sub_group || "",
    main_color: first?.main_color || "",
  };

  const [cols, vals] = helper.insertString(row);
  const result = await helper.query(`INSERT INTO dai_product (${cols}) VALUES (${vals})`);
  const containerId = result.insertId;
  await insertProductValueFromStone(containerId, first);

  const container = await getStoneById(containerId);
  const containerField = groupType === "parcel" ? "parcel_id" : "box_id";

  for (const stone of stones) {
    await helper.query(
      `UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ?`,
      [containerId, containerId, stone.id],
    );
    await addHistoryAudited({
      product_id: stone.id,
      action: `${groupType}_add`,
      date: now,
      description: `Added to new ${groupType} ${row.sku}`,
      sku: stone.sku,
      pcs: stone.polish_pcs,
      carat: stone.polish_carat,
      amount: stone.amount,
    });
  }

  const stoneSkus = stones.map((s) => s.sku).filter(Boolean);
  await addHistoryAudited({
    product_id: containerId,
    action: groupType === "parcel" ? "parcel_add" : "boxing",
    date: now,
    description: `Created ${groupType} with ${stones.length} stone(s) (${stoneSkus.join(", ")})`,
    sku: row.sku,
    pcs: totals.pcs,
    carat: totals.carat,
    amount: totals.amount,
    balance_pcs: totals.pcs,
    balance_carat: totals.carat,
  });

  return container;
}

async function addSinglesToBox(body, userContext = {}) {
  const { mode, boxId, stoneIds, newBoxSku, category, remark } = body;
  const stones = await validateSingles(stoneIds);

  if (mode === "existing" && boxId) {
    const box = await getStoneById(boxId);
    if (!box || box.group_type !== "box") {
      const err = new Error("Invalid box selected");
      err.statusCode = 400;
      throw err;
    }
    const result = await attachStonesToContainer({
      stones,
      container: box,
      containerField: "box_id",
      actionLabel: "box_add",
    });
    return { ok: true, message: "Stones added to box successfully", ...result };
  }

  const box = await createContainerFromStones(stones, {
    groupType: "box",
    sku: newBoxSku,
    category,
    remark,
    userId: userContext.userId,
    companyId: userContext.companyId,
  });
  return {
    ok: true,
    message: "Box created and stones added successfully",
    containerId: box.id,
    containerSku: box.sku,
  };
}

async function addSinglesToParcel(body, userContext = {}) {
  const { mode, parcelId, stoneIds, newParcelSku, category, remark } = body;
  const stones = await validateSingles(stoneIds);

  if (mode === "existing" && parcelId) {
    const parcel = await getStoneById(parcelId);
    if (!parcel || parcel.group_type !== "parcel") {
      const err = new Error("Invalid parcel selected");
      err.statusCode = 400;
      throw err;
    }
    const result = await attachStonesToContainer({
      stones,
      container: parcel,
      containerField: "parcel_id",
      actionLabel: "parcel_add",
    });
    return { ok: true, message: "Stones added to parcel successfully", ...result };
  }

  const parcel = await createContainerFromStones(stones, {
    groupType: "parcel",
    sku: newParcelSku,
    category,
    remark,
    userId: userContext.userId,
    companyId: userContext.companyId,
  });
  return {
    ok: true,
    message: "Parcel created and stones added successfully",
    containerId: parcel.id,
    containerSku: parcel.sku,
  };
}

const IMPORT_DATE_CATEGORY_NAME = /^\d{2}-\d{2}-\d{4}$/;

function isImportDateCategoryName(name) {
  return IMPORT_DATE_CATEGORY_NAME.test(String(name || "").trim());
}

function categoryStoneCount(cat, countMap) {
  const byId = Number(countMap[String(cat.id)]) || 0;
  const byName = Number(countMap[String(cat.name)]) || 0;
  return byId + byName;
}

function countStonesForCategoryGroup(ids, name, countMap) {
  let total = Number(countMap[String(name)]) || 0;
  for (const id of ids) {
    total += Number(countMap[String(id)]) || 0;
  }
  return total;
}

function mergeTreeNodesByName(nodes, countMap) {
  if (!nodes?.length) return [];
  const grouped = new Map();
  for (const node of nodes) {
    const nameKey = String(node.name || "").trim().toLowerCase();
    if (!grouped.has(nameKey)) {
      grouped.set(nameKey, {
        name: node.name,
        categoryIds: [...node.categoryIds],
        children: [...(node.children || [])],
      });
      continue;
    }
    const existing = grouped.get(nameKey);
    existing.categoryIds.push(...node.categoryIds);
    existing.children.push(...(node.children || []));
  }
  return [...grouped.values()]
    .map((group) => {
      const categoryIds = [...new Set(group.categoryIds.map(String))];
      const mergedChildren = mergeTreeNodesByName(group.children, countMap);
      const stoneCount = countStonesForCategoryGroup(categoryIds, group.name, countMap);
      if (isImportDateCategoryName(group.name) && stoneCount === 0 && !mergedChildren.length) {
        return null;
      }
      return {
        title: `${group.name} (${stoneCount})`,
        key: categoryIds.join(","),
        children: mergedChildren,
      };
    })
    .filter(Boolean);
}

async function getCategorizeTree() {
  const categories = await helper.query(
    `SELECT id, name, parent FROM category ORDER BY name`,
  );
  const counts = await helper.query(
    `SELECT category, COUNT(*) AS cnt FROM dai_product WHERE visibility = 1 AND category IS NOT NULL AND category <> '' GROUP BY category`,
  );
  const countMap = Object.fromEntries(
    (counts || []).map((r) => [String(r.category), Number(r.cnt) || 0]),
  );

  const visibleCategories = (categories || []).filter((c) => {
    if (isImportDateCategoryName(c.name) && categoryStoneCount(c, countMap) === 0) {
      return false;
    }
    return true;
  });

  const buildNode = (cat) => ({
    name: cat.name,
    categoryIds: [String(cat.id)],
    children: visibleCategories
      .filter((ch) => Number(ch.parent) === Number(cat.id))
      .map(buildNode),
  });

  const rootCats = visibleCategories.filter((c) => {
    const parentId = Number(c.parent);
    if (!c.parent || parentId === 0) return true;
    return !visibleCategories.some((x) => Number(x.id) === parentId);
  });

  const rawTree = rootCats.map(buildNode);
  return mergeTreeNodesByName(rawTree, countMap);
}

async function assignCategory(productIds, categoryId) {
  const ids = (productIds || []).map(Number).filter(Boolean);
  if (!ids.length) {
    const err = new Error("No products selected");
    err.statusCode = 400;
    throw err;
  }
  const cat = String(categoryId || "");
  if (!cat) {
    const err = new Error("Category is required");
    err.statusCode = 400;
    throw err;
  }
  const placeholders = ids.map(() => "?").join(",");

  // 1. Fetch category name
  let categoryName = cat;
  try {
    const catRows = await helper.query(
      "SELECT id, name FROM category WHERE id = ? LIMIT 1",
      [cat],
    );
    if (catRows.length && catRows[0].name) {
      categoryName = catRows[0].name;
    }
  } catch (e) {
    console.warn("Category name lookup error:", e?.message);
  }

  // 2. Fetch full stone details before updating
  let stoneRows = [];
  try {
    stoneRows = await helper.query(
      `SELECT 
        p.id, p.sku, p.lab, p.polish_pcs, p.polish_carat, p.price, p.amount, p.cost, p.location, p.loc, p.mfg_code, p.category,
        pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmentry, pv.report_no, pv.mesurment
      FROM dai_product p
      LEFT JOIN dai_product_value pv ON p.id = pv.product_id
      WHERE p.id IN (${placeholders})`,
      ids,
    );
  } catch (e) {
    console.warn("Stones lookup error:", e?.message);
  }

  // 3. Perform update
  await helper.query(
    `UPDATE dai_product SET category = ? WHERE id IN (${placeholders})`,
    [cat, ...ids],
  );

  // 4. Record rich audit activity with SKU, Lab, Shape, Carat, Price, Location
  const items = (stoneRows || []).map((s) => ({
    id: s.id,
    sku: s.sku || "",
    lab: s.lab || "",
    shape: s.shape || "",
    polish_carat: s.polish_carat != null ? s.polish_carat : "",
    p_carat: s.polish_carat != null ? s.polish_carat : "",
    price: s.price != null ? s.price : "",
    amount: s.amount != null ? s.amount : "",
    cost: s.cost != null ? s.cost : "",
    location: s.location || s.loc || "",
    loc: s.location || s.loc || "",
    mfg_code: s.mfg_code || "",
    color: s.color || "",
    clarity: s.clarity || "",
    cut: s.cut || "",
    polish: s.polish || "",
    report_no: s.report_no || "",
    category: categoryName,
  }));

  const skus = items.map((s) => s.sku).filter(Boolean);
  const recordReference = skus.length ? skus.join(", ") : ids.join(", ");
  const description = `Assigned Category "${categoryName}" to ${items.length} diamond${items.length > 1 ? "s" : ""} (${recordReference})`;

  await logAudit({
    actionType: "UPDATE",
    moduleName: "Categorize",
    recordReference,
    description,
    oldValue: {
      category: stoneRows.map((s) => s.category).filter(Boolean).join(", ") || null,
    },
    newValue: {
      category: categoryName,
      categoryId: cat,
      categoryName,
      items,
      productIds: ids,
    },
  }).catch(console.error);

  return { ok: true, message: "Category assigned successfully", count: ids.length };
}

async function getCategoryStats(categoryId) {
  const ids = String(categoryId || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) {
    return { total: 0, pcs: 0, carat: 0, amount: 0 };
  }
  const idPlaceholders = ids.map(() => "?").join(",");
  const nameRows = await helper.query(
    `SELECT DISTINCT name FROM category WHERE id IN (${idPlaceholders})`,
    ids,
  );
  const keys = [...new Set([...ids, ...(nameRows || []).map((r) => String(r.name)).filter(Boolean)])];
  const placeholders = keys.map(() => "?").join(",");
  const rows = await helper.query(
    `SELECT COUNT(*) AS total, SUM(polish_pcs) AS pcs, SUM(polish_carat) AS carat, SUM(amount) AS amount
     FROM dai_product WHERE visibility = 1 AND category IN (${placeholders})`,
    keys,
  );
  return rows[0] || { total: 0, pcs: 0, carat: 0, amount: 0 };
}

async function assignPair(id1, id2, pairName = "pair") {
  const stone1 = await getStoneById(Number(id1));
  const stone2 = await getStoneById(Number(id2));
  if (!stone1 || !stone2) {
    const err = new Error("One or both stones not found");
    err.statusCode = 404;
    throw err;
  }
  const label = String(pairName || "pair").trim() || "pair";
  await helper.query(
    "UPDATE dai_product SET pair = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ?",
    [stone2.sku, stone1.id],
  );
  await helper.query(
    "UPDATE dai_product SET pair = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ?",
    [stone1.sku, stone2.id],
  );
  await logAudit({
    actionType: "UPDATE",
    moduleName: "Diamond Stock",
    recordId: stone1.id,
    recordReference: stone1.sku,
    description: `Paired ${stone1.sku} with ${stone2.sku} (${label})`,
  }).catch(console.error);
  return {
    status: true,
    message: `Paired ${stone1.sku} with ${stone2.sku}`,
  };
}

async function unpairProducts(rawIds) {
  const ids = (rawIds || []).map(Number).filter(Boolean);
  if (!ids.length) {
    const err = new Error("No stones selected");
    err.statusCode = 400;
    throw err;
  }
  for (const id of ids) {
    const stone = await getStoneById(id);
    if (!stone) continue;
    const partnerSku = stone.pair;
    await helper.query(
      "UPDATE dai_product SET pair = '', site_upload = 0, rapnet_upload = 0 WHERE id = ?",
      [id],
    );
    if (partnerSku) {
      await helper.query(
        "UPDATE dai_product SET pair = '', site_upload = 0, rapnet_upload = 0 WHERE sku = ? AND id <> ?",
        [partnerSku, id],
      );
    }
  }
  return { status: true, message: `Unpaired ${ids.length} stones` };
}

async function findPairCandidates(productId, options = {}) {
  const stone = await getStoneById(Number(productId));
  if (!stone) {
    const err = new Error("Stone not found");
    err.statusCode = 404;
    throw err;
  }

  const caratTol = Number(options.caratTolerance) || 0.04;
  const targetCarat = Number(stone.polish_carat) || 0;
  const minCarat = Math.max(0, targetCarat - caratTol);
  const maxCarat = targetCarat + caratTol;

  const sql = `
    SELECT 
      p.id, p.sku, p.lab, p.polish_carat, p.price, p.amount, p.cost, p.location, p.loc, p.mfg_code,
      pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmentry, pv.report_no, pv.mesurment, pv.table_pc, pv.depth_pc
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ? AND p.visibility = 1 AND p.id <> ?
      AND (p.hold = 0 OR p.hold IS NULL)
      AND (p.outward IS NULL OR p.outward = '')
      AND (p.pair IS NULL OR p.pair = '')
      AND p.polish_carat BETWEEN ? AND ?
      AND (pv.shape = ? OR ? = '')
    ORDER BY ABS(p.polish_carat - ?) ASC
    LIMIT 30
  `;

  const rows = await helper.query(sql, [
    stone.company || 1,
    stone.id,
    minCarat,
    maxCarat,
    stone.shape || "",
    stone.shape || "",
    targetCarat,
  ]);

  const candidates = (rows || []).map((r) => {
    let score = 50;
    if (r.shape === stone.shape) score += 15;
    if (r.color === stone.color) score += 15;
    if (r.clarity === stone.clarity) score += 10;
    if (r.cut === stone.cut) score += 4;
    if (r.polish === stone.polish) score += 3;
    if (r.symmentry === stone.symmentry) score += 3;
    const diff = Math.abs((Number(r.polish_carat) || 0) - targetCarat);
    if (diff <= 0.01) score += 5;
    else if (diff <= 0.02) score += 3;

    return {
      ...r,
      matchScore: Math.min(100, score),
      caratDiff: Number(diff.toFixed(3)),
    };
  });

  // Sort by highest match score first
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    status: true,
    targetStone: {
      id: stone.id,
      sku: stone.sku,
      shape: stone.shape,
      polish_carat: stone.polish_carat,
      color: stone.color,
      clarity: stone.clarity,
      cut: stone.cut,
      polish: stone.polish,
      symmentry: stone.symmentry,
      price: stone.price,
      amount: stone.amount,
      lab: stone.lab,
      location: stone.location || stone.loc,
    },
    candidates,
  };
}

/**
 * Fetch child stones belonging to a Box or Parcel container.
 */
async function getContainerChildren(containerId, userContext = {}) {
  const cid = Number(containerId);
  if (!cid) {
    const err = new Error("Invalid container ID");
    err.statusCode = 400;
    throw err;
  }
  const companyId = helper.resolveCompanyId(userContext.companyId);
  const container = await getStoneById(cid);
  if (!container) {
    const err = new Error("Container not found");
    err.statusCode = 404;
    throw err;
  }

  const childIdSet = new Set(
    String(container.box_products || container.parcel_products || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n !== cid)
  );

  let query = `
    SELECT 
      p.id, p.sku, p.group_type, p.polish_pcs, p.polish_carat, p.price, p.amount,
      p.cost, p.location, p.mfg_code, p.lab, p.visibility,
      pv.shape, pv.color, pv.clarity, pv.cut, pv.polish, pv.symmentry, pv.report_no
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ? AND (p.parent_id = ? OR p.box_id = ? OR p.parcel_id = ?) AND p.id <> ?
  `;
  const params = [companyId, cid, cid, cid, cid];
  if (childIdSet.size > 0) {
    query += ` OR (p.company = ? AND p.id IN (${[...childIdSet].map(() => "?").join(",")}))`;
    params.push(companyId, ...childIdSet);
  }
  query += ` ORDER BY p.id ASC LIMIT 500`;

  const rows = await helper.query(query, params);
  return {
    ok: true,
    container: {
      id: container.id,
      sku: container.sku,
      group_type: container.group_type,
      polish_pcs: container.polish_pcs,
      polish_carat: container.polish_carat,
      price: container.price,
      amount: container.amount,
    },
    children: (rows || []).map((r) => ({
      id: r.id,
      sku: r.sku,
      mfgCode: r.mfg_code,
      groupType: r.group_type || "single",
      pcs: Number(r.polish_pcs) || 1,
      carat: Number(r.polish_carat) || 0,
      price: Number(r.price) || 0,
      amount: Number(r.amount) || 0,
      location: r.location || "",
      lab: r.lab || "",
      shape: r.shape || "",
      color: r.color || "",
      clarity: r.clarity || "",
      cut: r.cut || "",
      reportNo: r.report_no || "",
    })),
  };
}

/**
 * Unbox / Release single stones from a Box or Parcel container back to standalone inventory.
 */
async function unboxStonesFromContainer({ containerId, stoneIds }, userContext = {}) {
  const cid = Number(containerId);
  if (!cid) {
    const err = new Error("Invalid container ID");
    err.statusCode = 400;
    throw err;
  }
  const rawIds = (stoneIds || []).map(Number).filter(Boolean);
  if (!rawIds.length) {
    const err = new Error("Please select at least one stone to unbox");
    err.statusCode = 400;
    throw err;
  }
  const companyId = helper.resolveCompanyId(userContext.companyId);
  const container = await getStoneById(cid);
  if (!container) {
    const err = new Error("Container not found");
    err.statusCode = 404;
    throw err;
  }
  const effectiveCompanyId = Number(container.company) || companyId;

  const isParcel = container.group_type === "parcel";
  const productsField = isParcel ? "parcel_products" : "box_products";
  const containerField = isParcel ? "parcel_id" : "box_id";
  const existingList = String(container[productsField] || "").split(",").filter(Boolean);

  let deductPcs = 0;
  let deductCarat = 0;
  let deductAmount = 0;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const unboxedSkus = [];

  for (const stoneId of rawIds) {
    const stone = await getStoneById(stoneId);
    if (!stone) continue;

    deductPcs += Number(stone.polish_pcs || 1);
    deductCarat += Number(stone.polish_carat || 0);
    deductAmount += Number(stone.amount || 0);
    unboxedSkus.push(stone.sku);

    // Restore stone to active inventory and detach from container
    const stoneCompany = Number(stone.company) || effectiveCompanyId;
    await helper.query(
      `UPDATE dai_product SET visibility = 1, parent_id = 0, ${containerField} = NULL, rapnet_upload = 0 WHERE id = ? AND company = ?`,
      [stoneId, stoneCompany]
    );

    await addHistoryAudited({
      product_id: stone.id,
      action: isParcel ? "from_parcel" : "from_box",
      date: now,
      description: `Unboxed from ${container.group_type} ${container.sku}`,
      sku: stone.sku,
      pcs: stone.polish_pcs,
      carat: stone.polish_carat,
      amount: stone.amount,
      balance_pcs: stone.polish_pcs,
      balance_carat: stone.polish_carat,
    });
  }

  // Update container totals
  const updatedProductList = existingList.filter((idStr) => !rawIds.includes(Number(idStr)));
  const newPcs = Math.max(0, Number(container.polish_pcs || 0) - deductPcs);
  const newCarat = Math.max(0, Number((Number(container.polish_carat || 0) - deductCarat).toFixed(3)));
  const newAmount = Math.max(0, Number((Number(container.amount || 0) - deductAmount).toFixed(2)));
  const newPrice = newCarat > 0 ? Number((newAmount / newCarat).toFixed(2)) : container.price;

  await helper.query(
    `UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ? AND company = ?`,
    [newPcs, newCarat, newAmount, newPrice, updatedProductList.length, updatedProductList.join(","), cid, effectiveCompanyId]
  );

  await addHistoryAudited({
    product_id: container.id,
    action: "unboxing",
    date: now,
    description: `Unboxed ${rawIds.length} stone(s) (${unboxedSkus.join(", ")})`,
    sku: container.sku,
    pcs: deductPcs,
    carat: deductCarat,
    amount: deductAmount,
    balance_pcs: newPcs,
    balance_carat: newCarat,
  });

  return {
    ok: true,
    message: `Successfully unboxed ${rawIds.length} stone(s) from ${container.sku}`,
    unboxedCount: rawIds.length,
    remainingCarat: newCarat,
    remainingPcs: newPcs,
  };
}

/**
 * Separate / Breakdown carats from a Box or Parcel into new single diamond(s).
 */
async function separateContainerStones({ containerId, records }, userContext = {}) {
  const cid = Number(containerId);
  if (!cid) {
    const err = new Error("Invalid container ID");
    err.statusCode = 400;
    throw err;
  }
  const rows = (records || []).filter((r) => Number(r.polish_carat) > 0);
  if (!rows.length) {
    const err = new Error("Please specify at least one valid stone row with carat > 0");
    err.statusCode = 400;
    throw err;
  }

  const companyId = helper.resolveCompanyId(userContext.companyId);
  const container = await getStoneById(cid);
  if (!container) {
    const err = new Error("Container not found");
    err.statusCode = 404;
    throw err;
  }

  let totalSepCarat = 0;
  let totalSepPcs = 0;
  for (const r of rows) {
    totalSepCarat += Number(r.polish_carat || 0);
    totalSepPcs += Number(r.polish_pcs || 1);
  }

  if (totalSepCarat > Number(container.polish_carat || 0) + 0.001) {
    const err = new Error(`Cannot separate ${totalSepCarat.toFixed(2)} ct: Exceeds container stock carat (${container.polish_carat} ct)`);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const createdStones = [];
  let totalSepAmount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const pcs = Number(row.polish_pcs || 1);
    const carat = Number(row.polish_carat || 0);
    const price = Number(row.price || container.price || 0);
    const amount = Number(row.amount || (carat * price).toFixed(2));
    totalSepAmount += amount;

    const sku = String(row.sku || "").trim() || `${container.sku}-S${idx + 1}-${Date.now().toString().slice(-4)}`;

    const newProd = {
      sku,
      mfg_code: row.mfg_code || container.mfg_code || "",
      date: now,
      company: companyId,
      user: userContext.userId || helper.DEFAULT_USER_ID,
      polish_pcs: pcs,
      polish_carat: carat,
      price,
      amount,
      cost: Number(row.cost || container.cost || 0),
      group_type: row.group_type || (pcs > 1 ? "box" : (pcs === 0 ? "parcel" : "single")),
      visibility: 1,
      parent_id: container.id,
      location: row.location || container.location || "",
      lab: row.lab || container.lab || "",
      remark: row.remark || `Separated from ${container.group_type} ${container.sku} on ${now.slice(0, 10)}`,
      main_color: row.color || container.color || "",
    };

    const [cols, vals] = helper.insertString(newProd);
    const insertRes = await helper.query(`INSERT INTO dai_product (${cols}) VALUES (${vals})`);
    const newId = insertRes.insertId;

    const newAttr = {
      product_id: newId,
      shape: row.shape || container.shape || "",
      color: row.color || container.color || "",
      clarity: row.clarity || container.clarity || "",
      cut: row.cut || container.cut || "",
      polish: row.polish || container.polish || "",
      symmentry: row.symmetry || row.symmentry || container.symmentry || "",
      report_no: row.report_no || "",
    };
    const [aCols, aVals] = helper.insertString(newAttr);
    await helper.query(`INSERT INTO dai_product_value (${aCols}) VALUES (${aVals})`);

    await addHistoryAudited({
      product_id: newId,
      action: container.group_type === "parcel" ? "from_parcel" : "from_box",
      date: now,
      description: `Separated from ${container.group_type} ${container.sku}`,
      sku,
      pcs,
      carat,
      amount,
      price,
      balance_pcs: pcs,
      balance_carat: carat,
    });

    createdStones.push({ id: newId, sku, carat, pcs, amount });
  }

  // Deduct from container
  const newPcs = Math.max(0, Number(container.polish_pcs || 0) - totalSepPcs);
  const newCarat = Math.max(0, Number((Number(container.polish_carat || 0) - totalSepCarat).toFixed(3)));
  const newAmount = Math.max(0, Number((Number(container.amount || 0) - totalSepAmount).toFixed(2)));
  const newPrice = newCarat > 0 ? Number((newAmount / newCarat).toFixed(2)) : container.price;

  const effectiveCompanyId = Number(container.company) || companyId;
  await helper.query(
    `UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, amount = ?, price = ? WHERE id = ? AND company = ?`,
    [newPcs, newCarat, newAmount, newPrice, cid, effectiveCompanyId]
  );

  await addHistoryAudited({
    product_id: container.id,
    action: "unboxing",
    date: now,
    description: `Separated ${createdStones.length} stone(s) (${createdStones.map((s) => s.sku).join(", ")})`,
    sku: container.sku,
    pcs: totalSepPcs,
    carat: totalSepCarat,
    amount: totalSepAmount,
    balance_pcs: newPcs,
    balance_carat: newCarat,
  });

  return {
    ok: true,
    message: `Successfully separated ${createdStones.length} stone(s) from ${container.sku}`,
    createdStones,
    remainingCarat: newCarat,
    remainingPcs: newPcs,
  };
}

/**
 * Transfer stones or carats between containers (Box to Box, Box to Parcel, Parcel to Box, Parcel to Parcel).
 */
async function transferBetweenContainers(
  { sourceContainerId, targetContainerId, mode, newContainerSku, newContainerType, stoneIds, carat, pcs },
  userContext = {}
) {
  const srcId = Number(sourceContainerId);
  if (!srcId) {
    const err = new Error("Invalid source container ID");
    err.statusCode = 400;
    throw err;
  }
  const companyId = helper.resolveCompanyId(userContext.companyId);
  const source = await getStoneById(srcId);
  if (!source) {
    const err = new Error("Source container not found");
    err.statusCode = 404;
    throw err;
  }

  // Case A: Transferring specific child stones
  if (Array.isArray(stoneIds) && stoneIds.length > 0) {
    // 1. Unbox from source
    await unboxStonesFromContainer({ containerId: srcId, stoneIds }, userContext);

    // 2. Add to target container
    const targetType = newContainerType || "box";
    if (mode === "new" || !targetContainerId) {
      if (targetType === "parcel") {
        return addSinglesToParcel(
          { mode: "new", newParcelSku: newContainerSku, stoneIds, remark: `Transferred from ${source.sku}` },
          userContext
        );
      }
      return addSinglesToBox(
        { mode: "new", newBoxSku: newContainerSku, stoneIds, remark: `Transferred from ${source.sku}` },
        userContext
      );
    }

    if (targetType === "parcel") {
      return addSinglesToParcel({ mode: "existing", parcelId: targetContainerId, stoneIds }, userContext);
    }
    return addSinglesToBox({ mode: "existing", boxId: targetContainerId, stoneIds }, userContext);
  }

  // Case B: Transferring bulk carat weight
  const transferCarat = Number(carat || 0);
  const transferPcs = Number(pcs || 1);
  if (transferCarat <= 0 || transferCarat > Number(source.polish_carat || 0)) {
    const err = new Error("Invalid transfer carat amount");
    err.statusCode = 400;
    throw err;
  }

  // Separate virtual lot from source
  const sepResult = await separateContainerStones(
    {
      containerId: srcId,
      records: [
        {
          sku: `TRF-${Date.now().toString().slice(-6)}`,
          polish_pcs: transferPcs,
          polish_carat: transferCarat,
          price: source.price,
          amount: Number((transferCarat * (source.price || 0)).toFixed(2)),
          group_type: "single",
        },
      ],
    },
    userContext
  );

  const newStoneId = sepResult.createdStones[0].id;
  const targetType = newContainerType || "box";

  if (mode === "new" || !targetContainerId) {
    if (targetType === "parcel") {
      return addSinglesToParcel(
        { mode: "new", newParcelSku: newContainerSku, stoneIds: [newStoneId], remark: `Transferred from ${source.sku}` },
        userContext
      );
    }
    return addSinglesToBox(
      { mode: "new", newBoxSku: newContainerSku, stoneIds: [newStoneId], remark: `Transferred from ${source.sku}` },
      userContext
    );
  }

  if (targetType === "parcel") {
    return addSinglesToParcel({ mode: "existing", parcelId: targetContainerId, stoneIds: [newStoneId] }, userContext);
  }
  return addSinglesToBox({ mode: "existing", boxId: targetContainerId, stoneIds: [newStoneId] }, userContext);
}

module.exports = {
  addSinglesToBox,
  addSinglesToParcel,
  getCategorizeTree,
  assignCategory,
  getCategoryStats,
  assignPair,
  unpairProducts,
  findPairCandidates,
  getContainerChildren,
  unboxStonesFromContainer,
  separateContainerStones,
  transferBetweenContainers,
};

