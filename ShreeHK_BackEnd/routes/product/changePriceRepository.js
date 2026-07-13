const helper = require("../../helper.js");

const getProductDetail = async (id) => {
  const sql = `
    SELECT p.*, pv.*
    FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.id = ?
    LIMIT 1
  `;
  const rows = await helper.query(sql, [id]);
  return rows?.[0] || null;
};

const updateProductById = async (id, updates) => {
  const setParts = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    setParts.push(`${key} = ?`);
    values.push(value);
  });

  if (!setParts.length) return { affectedRows: 0 };

  const sql = `UPDATE dai_product SET ${setParts.join(", ")} WHERE id = ?`;
  values.push(id);
  return helper.query(sql, values);
};

module.exports = {
  getProductDetail,
  updateProductById,
};
