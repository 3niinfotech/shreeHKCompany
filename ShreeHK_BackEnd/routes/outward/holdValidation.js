/**
 * Validates POST /outward/hold body (stricter than legacy PHP; does not require date on hold).
 */
function validateHoldBody(body) {
  const errors = [];
  let ids = body?.ids;

  if (typeof ids === "string") {
    ids = ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    errors.push("ids must be a non-empty array of product ids");
  } else {
    for (const id of ids) {
      const n = parseInt(id, 10);
      if (!Number.isFinite(n) || n <= 0) {
        errors.push(`invalid product id: ${id}`);
        break;
      }
    }
  }

  const status = body?.status;
  if (status !== 0 && status !== 1 && status !== "0" && status !== "1") {
    errors.push("status must be 0 or 1");
  }

  const dateVal = body?.date != null && body.date !== "" ? body.date : (body?.holdUntil != null && body.holdUntil !== "" ? body.holdUntil : null);
  if (dateVal != null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateVal))) {
      errors.push("date must be YYYY-MM-DD");
    }
  }

  return { errors, ids: Array.isArray(ids) ? ids.map((id) => parseInt(id, 10)) : [] };
}

function validateHoldBodyMiddleware(req, res, next) {
  const { errors, ids } = validateHoldBody(req.body);
  if (errors.length) {
    return res.status(400).json({ status: false, message: errors[0] });
  }
  const dateVal = req.body.date || req.body.holdUntil || "";
  const descVal = req.body.description != null
    ? String(req.body.description)
    : (req.body.remarks != null ? String(req.body.remarks) : "");

  req.validatedHold = {
    ids,
    status: parseInt(req.body.status, 10),
    date: dateVal,
    description: descVal,
  };
  next();
}

module.exports = { validateHoldBody, validateHoldBodyMiddleware };
