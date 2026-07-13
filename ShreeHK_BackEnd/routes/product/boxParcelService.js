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

  for (const stone of stones) {
    addPcs += Number(stone.polish_pcs || 0);
    addCarat += Number(stone.polish_carat || 0);
    addAmount += Number(stone.amount || 0);

    await helper.query(
      `UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ?`,
      [container.id, container.id, stone.id],
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
    `UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ?`,
    [newPcs, newCarat, newAmount, newPrice, productList.length, productList.join(","), container.id],
  );

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

  const buildNode = (cat) => ({
    title: `${cat.name} (${countMap[String(cat.id)] || 0})`,
    key: String(cat.id),
    children: (categories || [])
      .filter((ch) => ch.parent === cat.name)
      .map(buildNode),
  });

  const rootCats = (categories || []).filter(
    (c) => !c.parent || c.parent === "" || !(categories || []).some((x) => x.name === c.parent),
  );
  return rootCats.map(buildNode);
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
  await helper.query(
    `UPDATE dai_product SET category = ? WHERE id IN (${placeholders})`,
    [cat, ...ids],
  );
  return { ok: true, message: "Category assigned successfully", count: ids.length };
}

async function getCategoryStats(categoryId) {
  const rows = await helper.query(
    `SELECT COUNT(*) AS total, SUM(polish_pcs) AS pcs, SUM(polish_carat) AS carat, SUM(amount) AS amount
     FROM dai_product WHERE visibility = 1 AND category = ?`,
    [String(categoryId)],
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
  return { status: true, message: `${ids.length} stone(s) unpaired` };
}

module.exports = {
  addSinglesToBox,
  addSinglesToParcel,
  getCategorizeTree,
  assignCategory,
  getCategoryStats,
  assignPair,
  unpairProducts,
};
