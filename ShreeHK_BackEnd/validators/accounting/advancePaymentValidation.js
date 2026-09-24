const { parseBodyId } = require("../../services/auditMutationHelper.js");

/**
 * Parse and normalize advance payment request body
 * @param {Object} body
 * @param {number} contextCompanyId
 */
function parseAdvancePaymentBody(body = {}, contextCompanyId) {
  const id = parseBodyId(body.id);
  const party = body.party ?? body.name ?? "";
  const date = body.date && body.date !== "" ? body.date : new Date().toISOString().slice(0, 10);
  const book = body.book ?? body.booktype ?? "";
  const type = body.type ?? body["dr-cr"] ?? "";
  const cheque = body.cheque ?? body.cheque_no ?? "";
  const amount = body.amount !== undefined && body.amount !== null && body.amount !== "" ? body.amount : 0;
  const use_amount = body.use_amount !== undefined && body.use_amount !== null && body.use_amount !== "" ? body.use_amount : 0;
  const balance_amount =
    body.balance_amount !== undefined && body.balance_amount !== null && body.balance_amount !== ""
      ? body.balance_amount
      : Number(amount) - Number(use_amount || 0);
  const invoice = body.invoice ?? body.invoice_id ?? "";
  const assign_date =
    body.assign_date && body.assign_date !== ""
      ? body.assign_date
      : body.use_date && body.use_date !== ""
      ? body.use_date
      : date;
  const description = body.description ?? "";
  const company = body.company ?? contextCompanyId;
  const user = body.user ?? "";
  const isUpdate = Number.isFinite(id) && id > 0;

  return {
    id,
    party,
    date,
    book,
    type,
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
  };
}

/**
 * Validate delete advance payment query parameters and tenant context
 * @param {Object} query
 * @param {number} companyId
 */
function validateDeleteAdvanceQuery(query = {}, companyId) {
  const id = parseInt(query.deleteId, 10);
  if (!id || isNaN(id)) {
    return { isValid: false, statusCode: 400, error: "Invalid or missing deleteId" };
  }
  if (!companyId || companyId <= 0) {
    return { isValid: false, statusCode: 400, error: "Invalid tenant company context" };
  }
  return { isValid: true, id };
}

module.exports = {
  parseAdvancePaymentBody,
  validateDeleteAdvanceQuery,
};
