const connection = require("../connection.js");

/**
 * All activity audit rows live on the meta DB so reads/writes stay consistent
 * regardless of company/year tenant pool selection.
 */
function auditQuery(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.getMetaPool().query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

module.exports = { auditQuery };
