const auditService = require("./auditService.js");

/**
 * Log audit entry (standalone transaction).
 * Use logAuditInTx inside existing runInTransaction callbacks.
 */
async function logAudit(payload) {
  return auditService.logActivity(payload);
}

async function logAuditInTx(q, payload) {
  return auditService.logActivityTx(q, payload);
}

async function logBulkRowAudit({
  actionType = "UPDATE",
  moduleName,
  recordId,
  recordReference,
  oldValue,
  newValue,
  description,
}) {
  return logAudit({
    actionType,
    moduleName,
    recordId,
    recordReference,
    oldValue,
    newValue,
    description,
  });
}

module.exports = {
  logAudit,
  logAuditInTx,
  logBulkRowAudit,
};
