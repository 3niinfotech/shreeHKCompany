const helper = require("../../helper.js");

const getExportInventoryByIds = async (ids, companyId = helper.DEFAULT_COMPANY_ID) => {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const sql = `SELECT * FROM dai_product p
    INNER JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.company = ? AND p.visibility = 1 AND p.id IN (${placeholders})
    ORDER BY p.sku`;
  return helper.query(sql, [helper.resolveCompanyId(companyId), ...ids]);
};

module.exports = {
  getExportInventoryByIds,
};
