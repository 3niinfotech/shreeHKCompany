/**
 * Parse and normalize expense payment request body
 * @param {Object} body
 */
function parseExpensePaymentBody(body = {}) {
  const rawId = body.id;
  const id =
    typeof rawId === "object" && rawId !== null
      ? Number(rawId.id ?? rawId.value ?? rawId.data ?? 0)
      : Number(rawId);
  const party = body.party;
  const date = body.date;
  const type = body.type;
  const amount = body.amount;
  const other_party = body.other_party ?? body.otherpartyname ?? "";
  const book = body.book ?? body.booktype ?? "";
  const cheque = body.cheque ?? body.cheque_no ?? "";
  const description = body.description ?? "";
  const isUpdate = Number.isFinite(id) && id > 0;

  return {
    id,
    party,
    date,
    type,
    amount,
    other_party,
    book,
    cheque,
    description,
    isUpdate,
  };
}

/**
 * Validate delete expense payment query parameters and tenant context
 * @param {Object} query
 * @param {number} companyId
 */
function validateDeleteExpenseQuery(query = {}, companyId) {
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
  parseExpensePaymentBody,
  validateDeleteExpenseQuery,
};
