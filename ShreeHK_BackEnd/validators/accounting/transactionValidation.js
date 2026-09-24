/**
 * Parse and normalize general transaction report filter payload
 * @param {Object} body
 */
function parseTransactionFilters(body = {}) {
  return {
    book: body.book,
    party: body.party,
    partyId: body.partyId,
    other_party: body.other_party,
    otherParty: body.otherParty,
    fromDate: body.fromDate,
    toDate: body.toDate,
  };
}

/**
 * Parse and normalize advance transaction report filter payload
 * @param {Object} body
 */
function parseAdvanceReportFilters(body = {}) {
  return {
    party: body.party,
    book: body.book,
    fromDate: body.fromDate,
    toDate: body.toDate,
  };
}

module.exports = {
  parseTransactionFilters,
  parseAdvanceReportFilters,
};
