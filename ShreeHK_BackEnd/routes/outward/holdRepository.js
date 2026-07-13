const helper = require("../../helper.js");

const TABLE_HOLD = "dai_hold";

/**
 * @param {(sql: string, values?: any[]) => Promise<any>} q
 */
async function getHoldByProductId(q, productId) {
  const rows = await q(`SELECT * FROM ${TABLE_HOLD} WHERE product_id = ? LIMIT 1`, [
    String(productId),
  ]);
  return rows.length ? rows[0] : null;
}

/**
 * @param {(sql: string, values?: any[]) => Promise<any>} q
 */
async function getUserName(q, userId) {
  const rows = await q(
    `SELECT first_name, last_name FROM user WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) return "";
  return `${rows[0].first_name || ""} ${rows[0].last_name || ""}`.trim();
}

/**
 * Port of outwardModel hold branch — dai_hold upsert when status=1 and date set.
 * @param {(sql: string, values?: any[]) => Promise<any>} q
 */
async function upsertHoldRow(q, { product_id, date, description, user }) {
  const existing = await getHoldByProductId(q, product_id);
  if (existing) {
    await q(
      `UPDATE ${TABLE_HOLD} SET date = ?, description = ?, user = ? WHERE product_id = ?`,
      [date, description || "", user, String(product_id)]
    );
    return;
  }
  const row = {
    product_id: String(product_id),
    date,
    description: description || "",
    user,
  };
  const data = helper.insertString(row);
  await q(`INSERT INTO ${TABLE_HOLD} (${data[0]}) VALUES (${data[1]})`);
}

/**
 * @param {(sql: string, values?: any[]) => Promise<any>} q
 */
async function deleteHoldByProductId(q, productId) {
  await q(`DELETE FROM ${TABLE_HOLD} WHERE product_id = ?`, [String(productId)]);
}

/**
 * Rows with hold date strictly before given date (PHP: date < today).
 * @param {(sql: string, values?: any[]) => Promise<any>} q
 */
async function findExpiredHolds(q, beforeDate) {
  return q(`SELECT * FROM ${TABLE_HOLD} WHERE date < ?`, [beforeDate]);
}

module.exports = {
  getHoldByProductId,
  getUserName,
  upsertHoldRow,
  deleteHoldByProductId,
  findExpiredHolds,
};
