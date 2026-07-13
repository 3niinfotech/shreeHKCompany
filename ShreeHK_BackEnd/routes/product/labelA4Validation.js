const validateLabelA4Body = (body = {}) => {
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = rawIds
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!ids.length) {
    return { ok: false, message: "Please Select Item" };
  }

  const type = body.type === "a4d" ? "a4" : String(body.type || "a4");
  const copies = Math.max(1, parseInt(body.copies, 10) || 1);
  const diaPair = body.dia_pair || body.diaPair || "";

  return {
    ok: true,
    ids,
    type,
    copies,
    diaPair,
  };
};

module.exports = {
  validateLabelA4Body,
};
