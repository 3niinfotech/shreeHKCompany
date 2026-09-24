const advanceRepository = require("../../repositories/accounting/advancePaymentRepository.js");
const { logAudit } = require("../auditIntegration.js");

/**
 * Fetch advance payment records for a tenant company
 * @param {number} companyId
 */
async function getAdvancePayments(companyId) {
  if (!companyId || companyId <= 0) {
    return {
      status: 200,
      data: {
        message: "Advance Payment Data fetch Successfully",
        Data: [],
      },
    };
  }

  const rows = await advanceRepository.getAdvancePaymentsByCompany(companyId);
  return {
    status: 200,
    data: {
      message: "Advance Payment Data fetch Successfully",
      Data: rows || [],
    },
  };
}

/**
 * Create or Update an advance payment record
 * @param {Object} payload
 * @param {number} contextCompanyId
 * @param {Object} auditContext
 */
async function saveAdvancePayment(payload, contextCompanyId, auditContext = {}) {
  const {
    id,
    party,
    date,
    type,
    book,
    cheque,
    amount,
    use_amount,
    balance_amount,
    invoice,
    assign_date,
    description,
    company,
    user,
    isUpdate,
  } = payload;

  const newValue = {
    party,
    other_party: "",
    date,
    type,
    book,
    cheque,
    amount,
    use_amount,
    balance_amount,
    invoice,
    assign_date,
    description,
    company,
    user,
  };

  let oldValue = null;

  if (isUpdate) {
    const existingRow = await advanceRepository.getAdvancePaymentByIdAndCompany(id, contextCompanyId);
    if (!existingRow) {
      return {
        status: 404,
        data: { error: "Advance record not found" },
      };
    }
    oldValue = existingRow;

    await advanceRepository.updateAdvancePayment({
      id,
      party,
      date,
      type,
      book,
      cheque,
      amount,
      use_amount,
      balance_amount,
      invoice,
      assign_date,
      description,
      company,
      user,
      contextCompanyId,
    });
  } else {
    const insertId = await advanceRepository.insertAdvancePayment({
      party,
      date,
      type,
      book,
      cheque,
      amount,
      use_amount,
      balance_amount,
      invoice,
      assign_date,
      description,
      company,
      user,
    });
    payload.id = insertId;
  }

  const savedId = isUpdate ? id : payload.id;

  logAudit({
    actionType: isUpdate ? "UPDATE" : "CREATE",
    moduleName: "Advance Payment",
    recordId: savedId,
    recordReference: String(description || amount || party || savedId || ""),
    oldValue: oldValue
      ? {
          record: oldValue,
          pageContext: { path: "/accounting/advance", label: "Advance Payment" },
        }
      : null,
    newValue: {
      record: { ...newValue, id: savedId },
      requestPath: "/advance-payment",
      requestMethod: "POST",
      pageContext: {
        path: auditContext.pagePath || "/accounting/advance",
        label: auditContext.pageLabel || "Advance Payment",
      },
    },
    companyId: contextCompanyId,
    description: isUpdate
      ? `Advance Payment updated — ${description || amount || savedId}`
      : `Advance Payment created — ${description || amount || party}`,
  }).catch(() => {});

  return {
    status: isUpdate ? 200 : 201,
    data: {
      message: isUpdate ? "Advance payment updated successfully!" : "Advance payment created successfully!",
      Data: {
        id: savedId,
        party,
        date,
        type,
        cheque,
        amount,
        use_amount,
        balance_amount,
        invoice,
        assign_date,
        book,
        description,
        company,
        user,
      },
    },
  };
}

/**
 * Delete an advance payment record
 * @param {number} id
 * @param {number} companyId
 * @param {Object} auditContext
 */
async function deleteAdvancePayment(id, companyId, auditContext = {}) {
  const oldRow = await advanceRepository.getAdvancePaymentFullByIdAndCompany(id, companyId);
  if (!oldRow) {
    return {
      status: 404,
      data: { error: "Advance record not found" },
    };
  }

  await advanceRepository.deleteAdvancePaymentByIdAndCompany(id, companyId);

  logAudit({
    actionType: "DELETE",
    moduleName: "Advance Payment",
    recordId: id,
    recordReference: String(oldRow?.description || oldRow?.amount || id),
    oldValue: {
      record: oldRow,
      requestPath: "/advance-delete",
      requestMethod: "DELETE",
      pageContext: {
        path: auditContext.pagePath || "/accounting/advance",
        label: auditContext.pageLabel || "Advance Payment",
      },
    },
    companyId,
    description: `Advance Payment deleted — #${id}`,
  }).catch(() => {});

  return {
    status: 201,
    data: { message: "Advance-Payment deleted successfully" },
  };
}

/**
 * Fetch assigned invoice details with attached stones and transactions
 * @param {string|number} invoiceId
 * @param {'outward'|'inward'} type
 * @param {number} companyId
 */
async function getAssignedInvoice(invoiceId, type = "outward", companyId) {
  if (!companyId || companyId <= 0) {
    return {
      status: 200,
      data: { status: false, message: "Invalid company context", Data: null },
    };
  }

  if (!invoiceId) {
    return {
      status: 400,
      data: { status: false, message: "Missing invoiceId" },
    };
  }

  const result = await advanceRepository.getAssignedInvoiceDetails(invoiceId, type, companyId);
  return {
    status: 200,
    data: {
      status: true,
      message: "Assigned invoice fetched successfully",
      Data: result,
    },
  };
}

module.exports = {
  getAdvancePayments,
  saveAdvancePayment,
  deleteAdvancePayment,
  getAssignedInvoice,
};
