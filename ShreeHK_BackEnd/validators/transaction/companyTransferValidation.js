function validateTransferPayload(body = {}) {
  const from_company_id = Number(body.from_company_id);
  const to_company_id = Number(body.to_company_id);

  if (!from_company_id || from_company_id <= 0) {
    throw new Error("Source company (from_company_id) is required.");
  }

  if (!to_company_id || to_company_id <= 0) {
    throw new Error("Target company (to_company_id) is required.");
  }

  if (from_company_id === to_company_id) {
    throw new Error("Source company and target company cannot be the same.");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error("At least one stone item is required for transfer.");
  }

  const validatedItems = body.items.map((item, idx) => {
    const rowNo = idx + 1;
    const product_id = Number(item.product_id);
    const sku = String(item.sku || "").trim();
    const pcs = Number(item.pcs);
    const carat = Number(item.carat);
    const price = Number(item.price);
    const amount = Number(item.amount || (carat * price));

    if (!product_id || product_id <= 0) {
      throw new Error(`Row ${rowNo}: Valid product_id is required.`);
    }
    if (!sku) {
      throw new Error(`Row ${rowNo}: SKU is required.`);
    }
    if (Number.isNaN(pcs) || pcs <= 0) {
      throw new Error(`Row ${rowNo} (${sku}): Pcs must be greater than 0.`);
    }
    if (Number.isNaN(carat) || carat <= 0) {
      throw new Error(`Row ${rowNo} (${sku}): Carat must be greater than 0.`);
    }
    if (Number.isNaN(price) || price < 0) {
      throw new Error(`Row ${rowNo} (${sku}): Price must be a valid number.`);
    }

    return {
      product_id,
      sku,
      pcs,
      carat,
      price,
      amount: Math.round(amount * 100) / 100,
    };
  });

  return {
    from_company_id,
    to_company_id,
    to_party: String(body.to_party || "").trim(),
    transfer_date: body.transfer_date ? String(body.transfer_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: String(body.notes || "").trim(),
    items: validatedItems,
  };
}

function validateReturnPayload(body = {}) {
  const transfer_id = Number(body.transfer_id || body.id);
  if (!transfer_id || transfer_id <= 0) {
    throw new Error("Valid transfer_id is required for sale return.");
  }
  return {
    transfer_id,
    notes: String(body.notes || body.narretion || "").trim(),
  };
}

module.exports = {
  validateTransferPayload,
  validateReturnPayload,
};
