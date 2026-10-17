const connection = require("../../connection.js");

function queryWith(executor, sql, values = []) {
  try {
    const res = executor(sql, values);
    if (res && typeof res.then === "function") {
      return res;
    }
  } catch (err) {
    return Promise.reject(err);
  }
  return new Promise((resolve, reject) => {
    executor(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

const companyTransferRepository = {
  async getNextTransferNo(q) {
    const rows = await queryWith(
      q,
      "SELECT transfer_no FROM dai_company_transfer ORDER BY id DESC LIMIT 1"
    );
    if (!rows.length || !rows[0].transfer_no) return "TRF-1";
    const lastStr = String(rows[0].transfer_no);
    const n = parseInt(lastStr.replace(/\D/g, ""), 10) || 0;
    return `TRF-${n + 1}`;
  },

  async insertTransfer(q, data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => "?").join(",");
    const values = keys.map((k) => data[k]);
    const sql = `INSERT INTO dai_company_transfer (${keys.join(",")}) VALUES (${placeholders})`;
    const result = await queryWith(q, sql, values);
    return result.insertId;
  },

  async insertTransferItem(q, data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => "?").join(",");
    const values = keys.map((k) => data[k]);
    const sql = `INSERT INTO dai_company_transfer_item (${keys.join(",")}) VALUES (${placeholders})`;
    const result = await queryWith(q, sql, values);
    return result.insertId;
  },

  async findById(db, id) {
    const executor = db.query.bind(db);
    const sql = `
      SELECT t.*,
             fc.name AS from_company_name,
             tc.name AS to_company_name,
             COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.user_name, '') AS created_by_username
      FROM dai_company_transfer t
      LEFT JOIN company fc ON fc.id = t.from_company_id
      LEFT JOIN company tc ON tc.id = t.to_company_id
      LEFT JOIN user u ON u.user_id = t.created_by
      WHERE t.id = ?
      LIMIT 1
    `;
    const rows = await queryWith(executor, sql, [id]);
    return rows[0] || null;
  },

  async getItemsByTransferId(db, transferId) {
    const executor = db.query.bind(db);
    const sql = `
      SELECT ti.*,
             sp.lab,
             pv.shape, pv.color, pv.clarity, pv.cut, pv.polish
      FROM dai_company_transfer_item ti
      LEFT JOIN dai_product sp ON sp.id = ti.source_product_id
      LEFT JOIN dai_product_value pv ON pv.product_id = sp.id
      WHERE ti.transfer_id = ?
      ORDER BY ti.id ASC
    `;
    return queryWith(executor, sql, [transferId]);
  },

  async listTransfers(db, { fromDate, toDate, sku, fromCompanyId, toCompanyId, status, offset = 0, limit = 50 }, allowedCompanyIds = []) {
    const executor = db.query.bind(db);
    const values = [];
    let whereClauses = ["1=1"];

    if (allowedCompanyIds.length > 0) {
      const ph = allowedCompanyIds.map(() => "?").join(",");
      whereClauses.push(`(t.from_company_id IN (${ph}) OR t.to_company_id IN (${ph}))`);
      values.push(...allowedCompanyIds, ...allowedCompanyIds);
    }

    if (fromCompanyId) {
      whereClauses.push("t.from_company_id = ?");
      values.push(fromCompanyId);
    }

    if (toCompanyId) {
      whereClauses.push("t.to_company_id = ?");
      values.push(toCompanyId);
    }

    if (status) {
      whereClauses.push("t.status = ?");
      values.push(status);
    }

    if (fromDate) {
      whereClauses.push("t.transfer_date >= ?");
      values.push(fromDate);
    }

    if (toDate) {
      whereClauses.push("t.transfer_date <= ?");
      values.push(toDate);
    }

    if (sku) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM dai_company_transfer_item ti
        WHERE ti.transfer_id = t.id AND (
          UPPER(TRIM(ti.sku)) LIKE UPPER(?) OR
          UPPER(TRIM(COALESCE(ti.source_sku, ''))) LIKE UPPER(?)
        )
      )`);
      values.push(`%${sku.trim()}%`, `%${sku.trim()}%`);
    }

    const whereStr = whereClauses.join(" AND ");

    const countSql = `SELECT COUNT(*) AS total FROM dai_company_transfer t WHERE ${whereStr}`;
    const countRows = await queryWith(executor, countSql, values);
    const total = countRows[0]?.total || 0;

    const listSql = `
      SELECT t.*,
             fc.name AS from_company_name,
             tc.name AS to_company_name,
             COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.user_name, '') AS created_by_username,
             (
               SELECT GROUP_CONCAT(DISTINCT CONCAT(ti.sku, IF(ti.source_sku IS NOT NULL AND ti.source_sku != '' AND ti.source_sku != ti.sku, CONCAT(' (From: ', ti.source_sku, ')'), '')) SEPARATOR ', ')
               FROM dai_company_transfer_item ti
               WHERE ti.transfer_id = t.id
             ) AS skus
      FROM dai_company_transfer t
      LEFT JOIN company fc ON fc.id = t.from_company_id
      LEFT JOIN company tc ON tc.id = t.to_company_id
      LEFT JOIN user u ON u.user_id = t.created_by
      WHERE ${whereStr}
      ORDER BY t.id DESC
      LIMIT ?, ?
    `;

    const rows = await queryWith(executor, listSql, [...values, Number(offset), Number(limit)]);
    return { rows, total };
  },

  async updateTransferStatus(q, transferId, status, returnDate = null) {
    const sql = "UPDATE dai_company_transfer SET status = ?, return_date = ? WHERE id = ?";
    return queryWith(q, sql, [status, returnDate, transferId]);
  },

  async updateItemStatus(q, itemId, status) {
    const sql = "UPDATE dai_company_transfer_item SET status = ? WHERE id = ?";
    return queryWith(q, sql, [status, itemId]);
  },
};

module.exports = companyTransferRepository;
