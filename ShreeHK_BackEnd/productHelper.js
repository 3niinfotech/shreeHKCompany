const connection = require("./connection.js");

const ALLOWED_BY_COLUMNS = ["id", "p.id", "p.sku", "p.mfg_code", "pv.report_no"];

const VALUE_COLUMNS =
  "v.report_no, v.shape, v.clarity, v.size, v.f_intensity, v.cut, v.polish, v.symmentry, v.table_pc, v.depth_pc, v.mesurment, v.gridle, v.intensity, v.overtone, v.color, v.package, v.bgm, v.eyeclean";

const getDetail = (id, by) => {
  return new Promise((resolve, reject) => {
    try {
      if (!ALLOWED_BY_COLUMNS.includes(by)) {
        return reject({ error: "Invalid column specifier" });
      }
      const query = `SELECT p.*, ${VALUE_COLUMNS} FROM dai_product p LEFT JOIN dai_product_value v ON p.id = v.product_id WHERE ${by}=?`;
      connection.query(query, [id], (error, data) => {
        if (error) {
          return reject({ error: "Error occurred while fetching product data by " + by });
        }
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/** Company-scoped SKU lookup (case-insensitive) — matches inventory list scope. */
const getDetailBySku = (sku, companyId) => {
  return new Promise((resolve, reject) => {
    try {
      const trimmed = String(sku || "").trim();
      if (!trimmed) return resolve(null);
      const sql = `SELECT p.*, ${VALUE_COLUMNS} FROM dai_product p LEFT JOIN dai_product_value v ON p.id = v.product_id WHERE p.company = ? AND UPPER(TRIM(p.sku)) = UPPER(?) LIMIT 1`;
      connection.query(sql, [companyId, trimmed], (error, data) => {
        if (error) {
          return reject({ error: "Error occurred while fetching product data by sku" });
        }
        resolve(data.length > 0 ? data[0] : null);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const getDetailTest = (id, by) => {
  try {
    if (!ALLOWED_BY_COLUMNS.includes(by)) return null;
    const query = `SELECT p.*, ${VALUE_COLUMNS} FROM dai_product p LEFT JOIN dai_product_value v ON p.id = v.product_id WHERE ${by}=?`;
    connection.query(query, [id], (error, data) => {
      if (data && data.length > 0) {
        return data[0];
      } else {
        return null;
      }
    });
  } catch (error) {
    return null;
  }
};

module.exports = { getDetail, getDetailBySku, getDetailTest };
