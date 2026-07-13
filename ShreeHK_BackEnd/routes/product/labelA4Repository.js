const helper = require("../../helper.js");

const getProductsByIds = async (ids) => {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const sql = `SELECT * FROM dai_product p
    INNER JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.id IN (${placeholders})
    ORDER BY p.sku`;
  return helper.query(sql, ids);
};

const loadDataBySku = async (sku) => {
  const rows = await helper.query(
    `SELECT * FROM dai_product p
      INNER JOIN dai_product_value pv ON p.id = pv.product_id
      WHERE p.sku = ?
      LIMIT 1`,
    [sku]
  );
  return rows[0] || null;
};

const getMaxBarcode = async () => {
  const rows = await helper.query(
    "SELECT MAX(barcode) AS barcode FROM dai_product WHERE barcode IS NOT NULL AND barcode != '' AND barcode != 0"
  );
  const value = rows[0]?.barcode;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const saveNewBarcode = async (id) => {
  const nextBarcode = (await getMaxBarcode()) + 1;
  await helper.query("UPDATE dai_product SET barcode = ? WHERE id = ?", [nextBarcode, id]);
  return nextBarcode;
};

module.exports = {
  getProductsByIds,
  loadDataBySku,
  saveNewBarcode,
};
