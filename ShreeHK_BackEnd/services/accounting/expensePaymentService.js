const expenseRepository = require("../../repositories/accounting/expensePaymentRepository.js");
const { logAudit } = require("../auditIntegration.js");

/**
 * Fetch expense payments for a company
 * @param {number} companyId
 */
async function getExpensePayments(companyId) {
  if (!companyId || companyId <= 0) {
    return {
      status: 200,
      data: {
        message: "Expense payment data fetched successfully",
        Data: [],
      },
    };
  }

  const rows = await expenseRepository.getExpensePaymentsByCompany(companyId);
  return {
    status: 200,
    data: {
      message: "Expense payment data fetched successfully",
      Data: rows || [],
    },
  };
}

/**
 * Create or Update an expense payment record
 * @param {Object} payload Normalized expense payment payload
 * @param {number} companyId
 * @param {Object} auditContext Request headers and context for audit logging
 */
async function saveExpensePayment(payload, companyId, auditContext = {}) {
  const { id, party, date, type, amount, other_party, book, cheque, description, isUpdate } = payload;

  const newValue = {
    party,
    other_party,
    date,
    type,
    book,
    cheque,
    amount,
    description,
  };

  let oldValue = null;

  if (isUpdate) {
    const existingRow = await expenseRepository.getExpensePaymentByIdAndCompany(id, companyId);
    if (!existingRow) {
      return {
        status: 404,
        data: { error: "Expense record not found or access denied" },
      };
    }
    oldValue = existingRow;

    await expenseRepository.updateExpensePayment({
      id,
      party,
      other_party,
      date,
      type,
      book,
      cheque,
      amount,
      description,
      companyId,
    });
  } else {
    const insertId = await expenseRepository.insertExpensePayment({
      party,
      other_party,
      date,
      type,
      book,
      cheque,
      amount,
      description,
      companyId,
    });
    payload.id = insertId;
  }

  const savedId = isUpdate ? id : payload.id;

  logAudit({
    actionType: isUpdate ? "UPDATE" : "CREATE",
    moduleName: "Expense",
    recordId: savedId,
    recordReference: String(description || amount || party || savedId || ""),
    oldValue: oldValue ? { record: oldValue, pageContext: { path: "/accounting/expanse", label: "Expense" } } : null,
    newValue: {
      record: newValue,
      requestPath: "/expanse-payment",
      requestMethod: "POST",
      pageContext: {
        path: auditContext.pagePath || "/accounting/expanse",
        label: auditContext.pageLabel || "Expense",
      },
    },
    companyId,
    description: isUpdate
      ? `Expense updated — ${description || amount || savedId}`
      : `Expense created — ${description || amount || party}`,
  }).catch(() => {});

  return {
    status: isUpdate ? 200 : 201,
    data: {
      message: isUpdate ? "Expense payment updated successfully!" : "Expense payment created successfully!",
      Data: {
        id: savedId,
        party,
        other_party,
        date,
        type,
        cheque,
        amount,
        book,
        description,
      },
    },
  };
}

/**
 * Delete an expense payment record
 * @param {number} id
 * @param {number} companyId
 * @param {Object} auditContext
 */
async function deleteExpensePayment(id, companyId, auditContext = {}) {
  const oldRow = await expenseRepository.getExpensePaymentFullByIdAndCompany(id, companyId);
  if (!oldRow) {
    return {
      status: 404,
      data: { error: "Expense record not found" },
    };
  }

  await expenseRepository.deleteExpensePaymentByIdAndCompany(id, companyId);

  await logAudit({
    actionType: "DELETE",
    moduleName: "Expense",
    recordId: id,
    recordReference: String(oldRow?.description || oldRow?.amount || id),
    oldValue: { record: oldRow, pageContext: { path: "/accounting/expanse", label: "Expense" } },
    newValue: {
      requestPath: "/expanse-delete",
      requestMethod: "DELETE",
      pageContext: {
        path: auditContext.pagePath || "/accounting/expanse",
        label: auditContext.pageLabel || "Expense",
      },
    },
    companyId,
  });

  return {
    status: 201,
    data: { message: "Expense deleted successfully" },
  };
}

module.exports = {
  getExpensePayments,
  saveExpensePayment,
  deleteExpensePayment,
};
