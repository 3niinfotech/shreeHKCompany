/**
 * Canonical page-level permission registry.
 * Keys: module.page (e.g. master.company)
 * legacyKeys: old coarse module keys from roll.resource (pre-migration)
 */

const PAGE_ENTRIES = [
  // Core — UI always visible; APIs mostly profile/common
  { key: "core.dashboard", label: "Dashboard", path: "/", moduleKey: "core", apiPrefixes: ["/ai/chat", "/session/", "/dashboard/"], alwaysAllow: true },
  { key: "core.task_manager", label: "Task Manager", path: "/task-manager", moduleKey: "core", apiPrefixes: ["/dashboard/quick-notes"] },
  { key: "core.my_account", label: "My Account", path: "/my-account", moduleKey: "core", apiPrefixes: ["/api/profile"], alwaysAllow: true },
  { key: "core.settings", label: "Settings", path: "/settings", moduleKey: "core", apiPrefixes: [], alwaysAllow: true },
  { key: "core.forbidden", label: "Forbidden", path: "/forbidden", moduleKey: "core", apiPrefixes: [], alwaysAllow: true },

  // Master
  { key: "master.company", label: "Company", path: "/master/company-details", moduleKey: "master", apiPrefixes: ["/master/company", "/company/", "/ai/customer-insight"], legacyKeys: ["company"] },
  { key: "master.shipping", label: "Shipping", path: "/master/shipping-details", moduleKey: "master", apiPrefixes: ["/master/shipping", "/shipping/"], legacyKeys: ["attribute"] },
  { key: "master.origin", label: "Origin", path: "/master/origin", moduleKey: "master", apiPrefixes: ["/master/origin", "/origin/"], legacyKeys: ["attribute"] },
  { key: "master.lab", label: "Lab", path: "/master/lab", moduleKey: "master", apiPrefixes: ["/master/lab", "/lab/"], legacyKeys: ["lab", "attribute"] },
  { key: "master.category", label: "Category", path: "/master/category", moduleKey: "master", apiPrefixes: ["/master/category", "/category/"], legacyKeys: ["attribute"] },
  { key: "master.rapnet", label: "RapNet Price List", path: "/master/rapnet-pricelist", moduleKey: "master", apiPrefixes: ["/rapnet/"], legacyKeys: ["rap_net"] },
  { key: "master.bulk_update", label: "Bulk Update", path: "/master/bulk-update", moduleKey: "master", apiPrefixes: ["/bulk-update"], legacyKeys: ["bulk"] },
  { key: "master.import_format", label: "Import Format", path: "/master/import-format", moduleKey: "master", apiPrefixes: [], legacyKeys: ["attribute"] },
  { key: "master.attribute", label: "Attribute", path: "/master/attribute", moduleKey: "master", apiPrefixes: ["/master/attribute", "/attribute/"], legacyKeys: ["attribute"] },
  { key: "master.refresh_stock", label: "Refresh Stock", path: "/master/refresh-stock", moduleKey: "master", apiPrefixes: ["/integration/refresh-rapnet-stock"], legacyKeys: ["rap_net"] },
  { key: "master.integrations", label: "Integrations", path: "/master/integrations", moduleKey: "master", apiPrefixes: ["/integration/"], legacyKeys: ["rap_net"] },

  // Inventory
  { key: "inventory.my_inventory", label: "My Inventory", path: "/inventory/my-inventory", moduleKey: "inventory", apiPrefixes: ["/product/inventory", "/product/detail", "/product/save", "/product/change-price", "/product/holdDetail", "/product/history", "/product/package/", "/product/pair/", "/outward/sendTo", "/integration/refresh-rapnet-stock", "/integration/website-sync", "/ai/stock-alert", "/ai/barcode-lookup"], legacyKeys: ["inventory"] },
  { key: "inventory.categorize", label: "Categorize", path: "/inventory/categorize-inventory", moduleKey: "inventory", apiPrefixes: ["/product/inventory", "/product/categorize/", "/product/holdDetail", "/product/export", "/product/label", "/product/label-a4", "/outward/hold"], legacyKeys: ["inventory"] },
  { key: "inventory.single_to_box", label: "Box To", path: "/inventory/box", moduleKey: "inventory", apiPrefixes: ["/product/"], legacyKeys: ["box", "inventory"] },
  { key: "inventory.single_to_parcel", label: "Parcel To", path: "/inventory/parcel", moduleKey: "inventory", apiPrefixes: ["/product/"], legacyKeys: ["parcel", "inventory"] },
  { key: "inventory.on_hand_stock", label: "On Hand Stock", path: "/inventory/on-hand-stock", moduleKey: "inventory", apiPrefixes: ["/product/", "/ai/stock-alert"], legacyKeys: ["inventory", "stock_report"] },
  { key: "inventory.barcode", label: "Barcode", path: "/inventory/barcode", moduleKey: "inventory", apiPrefixes: ["/product/inventory", "/product/holdDetail", "/product/history", "/product/change-price", "/product/export", "/product/i-export", "/product/mail", "/product/label", "/product/label-a4", "/outward/hold", "/ai/barcode-lookup"], legacyKeys: ["inventory"] },
  { key: "inventory.box", label: "Box", path: "/inventory/box-to", moduleKey: "inventory", apiPrefixes: ["/product/"], legacyKeys: ["box", "inventory"] },
  { key: "inventory.parcel", label: "Parcel", path: "/inventory/parcel-to", moduleKey: "inventory", apiPrefixes: ["/product/"], legacyKeys: ["parcel", "inventory"] },
  { key: "inventory.pair", label: "Pair", path: "/inventory/pair", moduleKey: "inventory", apiPrefixes: ["/product/", "/product/pair/"], legacyKeys: ["pair", "inventory"] },

  // Transaction
  { key: "transaction.inward", label: "Inward", path: "/transaction/inward", moduleKey: "transaction", apiPrefixes: ["/inward/"], legacyKeys: ["purchase", "import_consignment", "import_memo"] },
  { key: "transaction.stone_update", label: "Stone Update", path: "/transaction/stone-update", moduleKey: "transaction", apiPrefixes: ["/product/save", "/product/", "/ai/price-suggest"], legacyKeys: ["sale"] },
  { key: "transaction.gia_memo", label: "GIA-Memo", path: "/transaction/gia-memo", moduleKey: "transaction", apiPrefixes: ["/transaction/gia", "/transaction/print"], legacyKeys: ["gia"] },
  { key: "transaction.in_memo", label: "In Memo", path: "/transaction/in-memo", moduleKey: "transaction", apiPrefixes: ["/transaction/inward-stock", "/transaction/print"], legacyKeys: ["i_memo", "import_memo"] },
  { key: "transaction.out_memo", label: "Out Memo", path: "/transaction/out-memo", moduleKey: "transaction", apiPrefixes: ["/transaction/outward-stock", "/transaction/print"], legacyKeys: ["o_memo", "outward_memo"] },
  { key: "transaction.sale_stock", label: "Sale", path: "/transaction/sale", moduleKey: "transaction", apiPrefixes: ["/transaction/outward-stock", "/transaction/print"], legacyKeys: ["sale"] },
  { key: "transaction.purchase_stock", label: "Purchase", path: "/transaction/purchase", moduleKey: "transaction", apiPrefixes: ["/transaction/purchase-stock", "/transaction/inward-stock", "/transaction/print"], legacyKeys: ["purchase"] },

  // Accounting
  { key: "accounting.expanse", label: "Expanse", path: "/accounting/expanse", moduleKey: "accounting", apiPrefixes: ["/expanse/"], legacyKeys: ["expanse", "account"] },
  { key: "accounting.expanse_list", label: "Expanse List", path: "/accounting/expanse/table-data", moduleKey: "accounting", apiPrefixes: ["/expanse/"], legacyKeys: ["expanse", "account"] },
  { key: "accounting.advance", label: "Advance Payment", path: "/accounting/advance", moduleKey: "accounting", apiPrefixes: ["/advance/"], legacyKeys: ["account"] },
  { key: "accounting.advance_list", label: "Advance List", path: "/accounting/advance/table-data", moduleKey: "accounting", apiPrefixes: ["/advance/"], legacyKeys: ["account"] },
  { key: "accounting.my_balance", label: "My Balance", path: "/accounting/my-balance", moduleKey: "accounting", apiPrefixes: ["/balance/", "/my-balance"], legacyKeys: ["my_balance", "account"] },
  { key: "accounting.transactions", label: "Transactions", path: "/accounting/account-transaction", moduleKey: "accounting", apiPrefixes: ["/transaction"], legacyKeys: ["account"] },
  { key: "accounting.advance_transaction", label: "Adv Transaction", path: "/accounting/advance-transaction", moduleKey: "accounting", apiPrefixes: ["/advance/", "/transaction"], legacyKeys: ["account"] },
  { key: "accounting.party_wise", label: "Party Wise Transaction", path: "/accounting/party-wise-transaction", moduleKey: "accounting", apiPrefixes: ["/partywisetransaction", "/ai/customer-insight"], legacyKeys: ["account_party", "account"] },
  { key: "accounting.group", label: "Group", path: "/accounting/group", moduleKey: "accounting", apiPrefixes: ["/accounting/group"], legacyKeys: ["account"] },
  { key: "accounting.subgroup", label: "Sub Group", path: "/accounting/subgroup", moduleKey: "accounting", apiPrefixes: ["/accounting/subgroup"], legacyKeys: ["account"] },

  // Reports
  { key: "reports.transaction", label: "Trans. Report", path: "/report/transaction", moduleKey: "reports", apiPrefixes: ["/report/transaction", "/ai/sales-report"], legacyKeys: ["report_transaction", "account_report"] },
  { key: "reports.outstanding", label: "Outstanding", path: "/report/outstanding", moduleKey: "reports", apiPrefixes: ["/report/outstanding", "/ai/sales-report"], legacyKeys: ["outstanding", "account_report"] },
  { key: "reports.group_report", label: "Group Report", path: "/report/group-report", moduleKey: "reports", apiPrefixes: ["/report/"], legacyKeys: ["account_report", "stock_report"] },
  { key: "reports.stone_history", label: "Stone History", path: "/report/stone-history", moduleKey: "reports", apiPrefixes: ["/report/", "/product/history"], legacyKeys: ["stone_report", "gia", "account_report"] },
  { key: "reports.transfer_history", label: "Transfer History", path: "/report/stone-tranfer-history", moduleKey: "reports", apiPrefixes: ["/report/"], legacyKeys: ["stone_report", "account_report"] },
  { key: "reports.sale_stock", label: "Sale Stock Report", path: "/report/sale-stock", moduleKey: "reports", apiPrefixes: ["/report/sale-stock"], legacyKeys: ["transaction", "stock_report"] },
  { key: "reports.stone_info", label: "Party Stone Info", path: "/report/stone-info", moduleKey: "reports", apiPrefixes: ["/report/stone-info"], legacyKeys: ["stone_report"] },

  // Admin
  { key: "admin.tenant_company", label: "Company (Tenant)", path: "/admin/tenant-company", moduleKey: "admin", apiPrefixes: ["/admin/tenant-company"], legacyKeys: ["company"] },
  { key: "admin.manage_user", label: "Manage User", path: "/admin/manage-user", moduleKey: "admin", apiPrefixes: ["/getAdminManageUser", "/admin-manage-user", "/manage-user/", "/getLoginAllUsers", "/addNewUser"], legacyKeys: ["user"] },
  { key: "admin.role", label: "Roll & Permissions", path: "/admin/roll", moduleKey: "admin", apiPrefixes: ["/role-list", "/role-add", "/role-update", "/role-delete", "/permission-registry"], legacyKeys: ["role"] },
  { key: "admin.fiscal_year", label: "Fiscal Year", path: "/admin/fiscal-year", moduleKey: "admin", apiPrefixes: ["/portal/year", "/portal/years"], legacyKeys: ["role"] },
  { key: "admin.legacy_apps", label: "Legacy Apps", path: "/admin/legacy-apps", moduleKey: "admin", apiPrefixes: ["/config/legacy-apps"], legacyKeys: ["role"] },
  { key: "admin.activity_history", label: "Activity History", path: "/admin/activity-history", moduleKey: "admin", apiPrefixes: ["/admin/activity-log"], legacyKeys: ["role"] },
  { key: "admin.auditor", label: "Auditor", path: "/admin/activity-history", moduleKey: "admin", apiPrefixes: ["/admin/activity-log"], legacyKeys: ["role"] },

  // Outward
  { key: "outward.main", label: "Outward", path: "/outward", moduleKey: "outward", apiPrefixes: ["/outward/"], legacyKeys: ["outward_memo", "export", "sale"] },
];

/** Legacy module keys → all page keys in that module */
const LEGACY_MODULE_MAP = {
  all: null,
  user: ["admin.manage_user"],
  company: ["master.company", "admin.tenant_company"],
  role: ["admin.role"],
  attribute: PAGE_ENTRIES.filter((p) => p.moduleKey === "master").map((p) => p.key),
  inventory: PAGE_ENTRIES.filter((p) => p.moduleKey === "inventory").map((p) => p.key),
  bulk: ["master.bulk_update"],
  parcel: ["inventory.parcel", "inventory.single_to_parcel"],
  box: ["inventory.box", "inventory.single_to_box"],
  lab: ["master.lab"],
  ems: PAGE_ENTRIES.filter((p) => p.moduleKey === "inventory").map((p) => p.key),
  pacage: PAGE_ENTRIES.filter((p) => p.moduleKey === "inventory").map((p) => p.key),
  purchase: ["transaction.inward", "transaction.purchase_stock"],
  sale: ["transaction.stone_update", "outward.main", "transaction.sale_stock"],
  import_consignment: ["transaction.inward"],
  export: ["outward.main", "transaction.sale_stock"],
  import_memo: ["transaction.inward", "transaction.in_memo"],
  outward_memo: ["outward.main", "transaction.out_memo"],
  account: PAGE_ENTRIES.filter((p) => p.moduleKey === "accounting").map((p) => p.key),
  expanse: ["accounting.expanse", "accounting.expanse_list"],
  outstanding: ["reports.outstanding"],
  my_balance: ["accounting.my_balance"],
  account_party: ["accounting.party_wise"],
  account_report: PAGE_ENTRIES.filter((p) => p.moduleKey === "reports").map((p) => p.key),
  stock_report: ["inventory.on_hand_stock", "reports.group_report"],
  report_transaction: ["reports.transaction"],
  gia: ["transaction.gia_memo", "reports.stone_history"],
  i_memo: ["transaction.in_memo"],
  o_memo: ["transaction.out_memo"],
  stone_report: ["reports.stone_history", "reports.transfer_history"],
  rap_net: ["master.rapnet"],
};

const MODULE_TREE = [
  { key: "master", label: "Master", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "master") },
  { key: "inventory", label: "Inventory & Warehouse", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "inventory") },
  { key: "transaction", label: "Supply Chain & Trade", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "transaction") },
  { key: "accounting", label: "Accounting & Finance", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "accounting") },
  { key: "reports", label: "Reporting & MIS", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "reports") },
  { key: "admin", label: "Administration", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "admin") },
  { key: "outward", label: "Outward", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "outward") },
];

const ALL_PAGE_KEYS = PAGE_ENTRIES.map((p) => p.key);

const PAGE_BY_KEY = Object.fromEntries(PAGE_ENTRIES.map((p) => [p.key, p]));

/** API paths allowed for any authenticated user */
const PUBLIC_API_PREFIXES = [
  "/health",
  "/user/login",
  "/user/logout",
  "/session/keepalive",
  "/session/context",
  "/portal/company-years",
  "/common/",
  "/notification",
  "/api/profile/",
  "/currency-rate/",
  "/uploads/",
  "/company/getOption",
  "/admin/activity-log/track",
  "/admin/activity-log/track-ui",
];

const SUPER_ADMIN_ROLL_ID = 1;

/** Pages admin can assign on Roll — includes Dashboard; excludes always-on profile/settings */
const getConfigurablePageEntries = () =>
  PAGE_ENTRIES.filter(
    (p) =>
      (p.moduleKey !== "core" || p.key === "core.dashboard" || p.key === "core.task_manager") &&
      !(p.alwaysAllow && p.key !== "core.dashboard" && p.key !== "core.task_manager")
  );

const CONFIGURABLE_PAGE_KEYS = getConfigurablePageEntries().map((p) => p.key);

const mapPageForCatalog = (p) => ({
  key: p.key,
  label: p.label,
  path: p.path,
});

const buildPagesCatalog = () => ({
  modules: [
    {
      key: "core",
      label: "Core",
      children: PAGE_ENTRIES.filter((p) => p.key === "core.dashboard" || p.key === "core.task_manager").map(mapPageForCatalog),
    },
    ...MODULE_TREE.map((mod) => ({
      key: mod.key,
      label: mod.label,
      children: mod.children.map(mapPageForCatalog),
    })),
  ],
  allKeys: CONFIGURABLE_PAGE_KEYS,
});

module.exports = {
  PAGE_ENTRIES,
  LEGACY_MODULE_MAP,
  MODULE_TREE,
  ALL_PAGE_KEYS,
  PAGE_BY_KEY,
  PUBLIC_API_PREFIXES,
  SUPER_ADMIN_ROLL_ID,
  getConfigurablePageEntries,
  CONFIGURABLE_PAGE_KEYS,
  buildPagesCatalog,
};
