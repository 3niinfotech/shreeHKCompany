const hasValue = (value) => value !== undefined && value !== null && value !== "";

const normalizeProductPayload = (product) => {
  if (!product || typeof product !== "object") return {};
  return product;
};

const validateChangePriceBody = (body = {}) => {
  const fn = body.fn;
  const product = normalizeProductPayload(body.product);

  if (fn && fn !== "updatePrice") {
    return { ok: false, message: "Invalid fn value" };
  }

  if (!Object.keys(product).length) {
    return { ok: false, message: "product data is required" };
  }

  const hasAnyUpdatableField = Object.values(product).some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return hasValue(entry.cost) || hasValue(entry.price) || hasValue(entry.rap_price);
  });

  if (!hasAnyUpdatableField) {
    return { ok: false, message: "Please enter at least one cost, price or rap price" };
  }

  return { ok: true, product };
};

module.exports = {
  validateChangePriceBody,
};
