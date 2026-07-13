const parseIds = (body = {}) => {
  if (Array.isArray(body.ids)) {
    return body.ids;
  }
  if (typeof body.exportProducts === "string" && body.exportProducts.trim()) {
    return body.exportProducts.split(",");
  }
  return [];
};

const validateInventoryMailBody = (body = {}) => {
  const ids = parseIds(body)
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!ids.length) {
    return { ok: false, message: "Please Select Item" };
  }

  const email = String(body.email || body.toEmail || "").trim();
  if (!email) {
    return { ok: false, message: "To Email Address is required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Invalid email address" };
  }

  const subject = String(body.subject || "Stone Proposal").trim() || "Stone Proposal";
  const content =
    String(body.content || body.message || "").trim() ||
    "Heres your information for required stone. Review your required stone and get started using our stone.";

  return {
    ok: true,
    ids,
    email,
    subject,
    content,
  };
};

module.exports = {
  validateInventoryMailBody,
};
