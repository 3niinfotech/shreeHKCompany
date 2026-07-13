/**
 * Maps API paths to DB tables for pre-mutation snapshots (used when a route
 * has no explicit logAudit / logAuditInTx call).
 *
 * idSource:
 *   body.id | body.<field> | query.deleteId | query.id | jwt.user_id
 */
const RULES = [
  { method: "POST", path: "/expanse-payment", table: "acc_transaction", idSource: "body.id" },
  { method: "DELETE", path: "/expanse-delete", table: "acc_transaction", idSource: "query.deleteId" },
  { method: "POST", path: "/advance-payment", table: "acc_advance", idSource: "body.id" },
  { method: "DELETE", path: "/advance-delete", table: "acc_advance", idSource: "query.deleteId" },
  { method: "POST", path: "/my-balance-book", table: "dai_balance", idSource: "body.id", fallbackSource: "body.currency", fallbackField: "currency" },
  { method: "DELETE", path: "/my-balance-delete", table: "dai_balance", idSource: "query.deleteId" },
  { method: "POST", path: "/currency-rate", table: "dai_currencyrate", idSource: "body.currency", idColumn: "currency" },
  { method: "DELETE", path: "/currency-rate-delete", table: "dai_currencyrate", idSource: "query.deleteId" },
  { method: "DELETE", path: "/outward", table: "dai_outward", idSource: "query.deleteId" },
  { method: "POST", path: "/company/save", table: "dai_party", idSource: "body.id" },
  { method: "DELETE", path: "/company/delete", table: "dai_party", idSource: "query.deleteId" },
  { method: "POST", path: "/lab/post", table: "dai_lab", idSource: "body.id" },
  { method: "DELETE", path: "/lab/delete", table: "dai_lab", idSource: "query.deleteId" },
  { method: "POST", path: "/category/save", table: "dai_category", idSource: "body.id" },
  { method: "DELETE", path: "/category/delete", table: "dai_category", idSource: "query.deleteId" },
  { method: "POST", path: "/origin/save", table: "dai_origin", idSource: "body.id" },
  { method: "DELETE", path: "/origin/delete", table: "dai_origin", idSource: "query.deleteId" },
  { method: "POST", path: "/shipping/save", table: "dai_shipping", idSource: "body.id" },
  { method: "DELETE", path: "/shipping/delete", table: "dai_shipping", idSource: "query.deleteId" },
  { method: "POST", path: "/attribute/save", table: "dai_attribute", idSource: "body.id" },
  { method: "DELETE", path: "/attribute/delete", table: "dai_attribute", idSource: "query.deleteId" },
  { method: "POST", path: "/accounting/group/save", table: "acc_group", idSource: "body.id" },
  { method: "DELETE", path: "/accounting/group/delete", table: "acc_group", idSource: "query.deleteId" },
  { method: "POST", path: "/accounting/subgroup/save", table: "acc_subgroup", idSource: "body.id" },
  { method: "DELETE", path: "/accounting/subgroup/delete", table: "acc_subgroup", idSource: "query.deleteId" },
  { method: "POST", path: "/partywisetransaction/save", table: "acc_partywise", idSource: "body.id" },
  { method: "DELETE", path: "/partywisetransaction/delete", table: "acc_partywise", idSource: "query.deleteId" },
  { method: "POST", path: "/product/save", table: "dai_product", idSource: "body.id" },
  { method: "DELETE", path: "/transaction/inward-stock", table: "dai_inward", idSource: "query.deleteId" },
  { method: "DELETE", path: "/transaction/gia", table: "dai_outward", idSource: "query.deleteId" },
  { method: "DELETE", path: "/transaction/outward-stock", table: "dai_outward", idSource: "query.deleteId" },
  { method: "POST", path: "/admin-manage-user", table: "user", idSource: "body.id", idColumn: "user_id" },
  { method: "DELETE", path: "/manage-user/delete", table: "user", idSource: "query.deleteId", idColumn: "user_id" },
  { method: "DELETE", path: "/deleteUser", table: "user", idSource: "query.deleteId", idColumn: "user_id" },
  { method: "DELETE", path: "/role-delete", table: "roll", idSource: "query.deleteId" },
  { method: "POST", path: "/api/profile/update", table: "user", idSource: "jwt.user_id", idColumn: "user_id" },
  { method: "POST", path: "/admin/tenant-company/save", table: "dai_company", idSource: "body.id" },
  { method: "POST", path: "/inward/save", table: "dai_inward", idSource: "body.id" },
  { method: "POST", path: "/product/save", table: "dai_product", idSource: "body.id" },
  { method: "POST", path: "/product/change-price", table: "dai_product", idSource: "body.id" },
  { method: "POST", path: "/outward/sendTo", table: "dai_outward", idSource: "body.id" },
  { method: "DELETE", path: "/attribute/delete", table: "dai_attribute", idSource: "query.deleteId" },
  { method: "DELETE", path: "/shipping/delete", table: "dai_shipping", idSource: "query.deleteId" },
  { method: "DELETE", path: "/origin/delete", table: "dai_origin", idSource: "query.deleteId" },
  { method: "DELETE", path: "/category/delete", table: "dai_category", idSource: "query.deleteId" },
];

function resolveIdSource(source, req) {
  if (!source) return null;
  if (source === "jwt.user_id") return req.user?.user_id ?? null;

  const [root, key] = source.split(".");
  if (root === "body") {
    const raw = req.body?.[key];
    if (key === "id") {
      if (typeof raw === "object" && raw !== null) {
        return Number(raw.id ?? raw.value ?? raw.data ?? 0) || null;
      }
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    return raw ?? null;
  }
  if (root === "query") {
    const raw = req.query?.[key];
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}

function findRule(method, path) {
  const normalized = String(path || "").split("?")[0];
  return RULES.find((r) => r.method === method && r.path === normalized) || null;
}

module.exports = {
  RULES,
  findRule,
  resolveIdSource,
};
