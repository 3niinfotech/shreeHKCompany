const connection = require("../connection.js");
const { logAudit } = require("./auditIntegration.js");

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function fetchRowById(table, id, idColumn = "id") {
  if (id == null || id === "") return null;
  const rows = await queryAsync(
    `SELECT * FROM \`${table}\` WHERE \`${idColumn}\` = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function fetchRowByField(table, field, value) {
  if (value == null || value === "") return null;
  const rows = await queryAsync(
    `SELECT * FROM \`${table}\` WHERE \`${field}\` = ? LIMIT 1`,
    [value],
  );
  return rows[0] || null;
}

/**
 * Log CREATE / UPDATE / DELETE with consistent shape for Activity History UI.
 */
async function auditCrud({
  actionType,
  moduleName,
  recordId,
  recordReference,
  oldValue,
  newValue,
  description,
}) {
  await logAudit({
    actionType,
    moduleName,
    recordId,
    recordReference: recordReference != null ? String(recordReference) : null,
    oldValue: oldValue || null,
    newValue: newValue || null,
    description,
  });
}

function parseBodyId(rawId) {
  if (typeof rawId === "object" && rawId !== null) {
    return Number(rawId.id ?? rawId.value ?? rawId.data ?? 0);
  }
  return Number(rawId);
}

module.exports = {
  queryAsync,
  fetchRowById,
  fetchRowByField,
  auditCrud,
  parseBodyId,
};
