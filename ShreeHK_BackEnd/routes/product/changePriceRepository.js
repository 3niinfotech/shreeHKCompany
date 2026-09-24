const helper = require("../../helper.js");

const getProductDetail = async (id, companyId = null) => {
  let sql = `
    SELECT p.*, pv.*
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.id = ?
  `;
  const params = [id];
  if (companyId) {
    sql += " AND p.company = ?";
    params.push(companyId);
  }
  sql += " LIMIT 1";
  const rows = await helper.query(sql, params);
  return rows?.[0] || null;
};

const updateProductById = async (id, updates, companyId = null) => {
  const setParts = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    setParts.push(`${key} = ?`);
    values.push(value);
  });

  if (!setParts.length) return { affectedRows: 0 };

  let sql = `UPDATE dai_product SET ${setParts.join(", ")} WHERE id = ?`;
  values.push(id);
  if (companyId) {
    sql += " AND company = ?";
    values.push(companyId);
  }
  return helper.query(sql, values);
};

module.exports = {
  getProductDetail,
  updateProductById,
};
