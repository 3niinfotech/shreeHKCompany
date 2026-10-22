const helper = require("../../helper.js");

const getExportInventoryByIds = async (ids, companyIds = null) => {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const params = [...ids];
  let companyFilter = "";

  if (companyIds != null) {
    const list = (Array.isArray(companyIds) ? companyIds : [companyIds])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);
    if (list.length > 0) {
      const compPlaceholders = list.map(() => "?").join(",");
      companyFilter = ` AND p.company IN (${compPlaceholders})`;
      params.push(...list);
    }
  }

  const sql = `SELECT * FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.id IN (${placeholders})${companyFilter}
    ORDER BY p.sku`;
  return helper.query(sql, params);
};

module.exports = {
  getExportInventoryByIds,
};

