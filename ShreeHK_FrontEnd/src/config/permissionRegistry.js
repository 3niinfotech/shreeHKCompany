/**
 * Frontend permission registry — keys must match backend/config/permissionRegistry.js
 */

export const PAGE_ENTRIES = [
  { key: "core.dashboard", label: "Dashboard", path: "/", moduleKey: "core", alwaysAllow: true },
  { key: "core.task_manager", label: "Task Manager", path: "/task-manager", moduleKey: "core" },
  { key: "core.my_account", label: "My Account", path: "/my-account", moduleKey: "core", alwaysAllow: true },
  { key: "core.settings", label: "Settings", path: "/settings", moduleKey: "core", alwaysAllow: true },
  { key: "core.forbidden", label: "Forbidden", path: "/forbidden", moduleKey: "core", alwaysAllow: true },

  { key: "master.company", label: "Company", path: "/master/company-details", moduleKey: "master" },
  { key: "master.shipping", label: "Shipping", path: "/master/shipping-details", moduleKey: "master" },
  { key: "master.origin", label: "Origin", path: "/master/origin", moduleKey: "master" },
  { key: "master.lab", label: "Lab", path: "/master/lab", moduleKey: "master" },
  { key: "master.category", label: "Category", path: "/master/category", moduleKey: "master" },
  { key: "master.rapnet", label: "RapNet Price List", path: "/master/rapnet-pricelist", moduleKey: "master" },
  { key: "master.bulk_update", label: "Bulk Update", path: "/master/bulk-update", moduleKey: "master" },
  { key: "master.import_format", label: "Import Format", path: "/master/import-format", moduleKey: "master" },
  { key: "master.attribute", label: "Attribute", path: "/master/attribute", moduleKey: "master" },
  { key: "master.refresh_stock", label: "Refresh Stock", path: "/master/refresh-stock", moduleKey: "master" },
  { key: "master.integrations", label: "Integrations", path: "/master/integrations", moduleKey: "master" },

  { key: "inventory.my_inventory", label: "My Inventory", path: "/inventory/my-inventory", moduleKey: "inventory" },
  { key: "inventory.categorize", label: "Categorize", path: "/inventory/categorize-inventory", moduleKey: "inventory" },
  { key: "inventory.single_to_box", label: "Box To", path: "/inventory/box", moduleKey: "inventory" },
  { key: "inventory.single_to_parcel", label: "Parcel To", path: "/inventory/parcel", moduleKey: "inventory" },
  { key: "inventory.on_hand_stock", label: "On Hand Stock", path: "/inventory/on-hand-stock", moduleKey: "inventory" },
  { key: "inventory.barcode", label: "Barcode", path: "/inventory/barcode", moduleKey: "inventory" },
  { key: "inventory.box", label: "Box", path: "/inventory/box-to", moduleKey: "inventory" },
  { key: "inventory.parcel", label: "Parcel", path: "/inventory/parcel-to", moduleKey: "inventory" },
  { key: "inventory.pair", label: "Pair", path: "/inventory/pair", moduleKey: "inventory" },

  { key: "transaction.inward", label: "Inward", path: "/transaction/inward", moduleKey: "transaction" },
  { key: "transaction.stone_update", label: "Stone Update", path: "/transaction/stone-update", moduleKey: "transaction" },
  { key: "transaction.gia_memo", label: "GIA-Memo", path: "/transaction/gia-memo", moduleKey: "transaction" },
  { key: "transaction.in_memo", label: "In Memo", path: "/transaction/in-memo", moduleKey: "transaction" },
  { key: "transaction.out_memo", label: "Out Memo", path: "/transaction/out-memo", moduleKey: "transaction" },
  { key: "transaction.sale_stock", label: "Sale", path: "/transaction/sale", moduleKey: "transaction" },
  { key: "transaction.purchase_stock", label: "Purchase", path: "/transaction/purchase", moduleKey: "transaction" },

  { key: "accounting.expanse", label: "Expanse", path: "/accounting/expanse", moduleKey: "accounting" },
  { key: "accounting.expanse_list", label: "Expanse List", path: "/accounting/expanse/table-data", moduleKey: "accounting" },
  { key: "accounting.advance", label: "Advance Payment", path: "/accounting/advance", moduleKey: "accounting" },
  { key: "accounting.advance_list", label: "Advance List", path: "/accounting/advance/table-data", moduleKey: "accounting" },
  { key: "accounting.my_balance", label: "My Balance", path: "/accounting/my-balance", moduleKey: "accounting" },
  { key: "accounting.transactions", label: "Transactions", path: "/accounting/account-transaction", moduleKey: "accounting" },
  { key: "accounting.advance_transaction", label: "Adv Transaction", path: "/accounting/advance-transaction", moduleKey: "accounting" },
  { key: "accounting.party_wise", label: "Party Wise Transaction", path: "/accounting/party-wise-transaction", moduleKey: "accounting" },
  { key: "accounting.party", label: "Accounting Party", path: "/accounting/party", moduleKey: "accounting" },
  { key: "accounting.party_report", label: "Party Report", path: "/accounting/party-report", moduleKey: "accounting" },
  { key: "accounting.group", label: "Group", path: "/accounting/group", moduleKey: "accounting" },
  { key: "accounting.subgroup", label: "Sub Group", path: "/accounting/subgroup", moduleKey: "accounting" },

  { key: "reports.transaction", label: "Trans. Report", path: "/report/transaction", moduleKey: "reports" },
  { key: "reports.outstanding", label: "Outstanding", path: "/report/outstanding", moduleKey: "reports" },
  { key: "reports.group_report", label: "Group Report", path: "/report/group-report", moduleKey: "reports" },
  { key: "reports.stone_history", label: "Stone History", path: "/report/stone-history", moduleKey: "reports" },
  { key: "reports.transfer_history", label: "Transfer History", path: "/report/stone-tranfer-history", moduleKey: "reports" },
  { key: "reports.sale_stock", label: "Sale Stock Report", path: "/report/sale-stock", moduleKey: "reports" },
  { key: "reports.stone_info", label: "Party Stone Info", path: "/report/stone-info", moduleKey: "reports" },

  { key: "admin.tenant_company", label: "Company (Tenant)", path: "/admin/tenant-company", moduleKey: "admin" },
  { key: "admin.manage_user", label: "Manage User", path: "/admin/manage-user", moduleKey: "admin" },
  { key: "admin.role", label: "Roll & Permissions", path: "/admin/roll", moduleKey: "admin" },
  { key: "admin.fiscal_year", label: "Fiscal Year", path: "/admin/fiscal-year", moduleKey: "admin" },
  { key: "admin.legacy_apps", label: "Legacy Apps", path: "/admin/legacy-apps", moduleKey: "admin" },
  { key: "admin.activity_history", label: "Activity History", path: "/admin/activity-history", moduleKey: "admin" },
  { key: "admin.auditor", label: "Auditor (read-only)", path: "/admin/activity-history", moduleKey: "admin" },

  { key: "outward.main", label: "Outward", path: "/outward", moduleKey: "outward" },
];

export const MODULE_TREE = [
  { key: "master", label: "Master", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "master") },
  { key: "inventory", label: "Inventory & Warehouse", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "inventory") },
  { key: "transaction", label: "Supply Chain & Trade", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "transaction") },
  { key: "accounting", label: "Accounting & Finance", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "accounting") },
  { key: "reports", label: "Reporting & MIS", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "reports") },
  { key: "admin", label: "Administration", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "admin") },
  { key: "outward", label: "Outward", children: PAGE_ENTRIES.filter((p) => p.moduleKey === "outward") },
];

export const ALL_PAGE_KEYS = PAGE_ENTRIES.map((p) => p.key);

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

const isPageKey = (key) => ALL_PAGE_KEYS.includes(key);

const expandLegacyKey = (key) => {
  if (key === "all") return ["all"];
  if (isPageKey(key)) return [key];
  if (LEGACY_MODULE_MAP[key]) return LEGACY_MODULE_MAP[key];
  return [];
};

export const hasPagePermission = (permissions, pageKey) => {
  if (!pageKey) return true;
  if (!permissions?.length) return false;
  if (permissions.includes("all")) return true;
  if (permissions.includes(pageKey)) return true;

  for (const perm of permissions) {
    const expanded = expandLegacyKey(perm);
    if (expanded.includes("all") || expanded.includes(pageKey)) return true;
  }
  return false;
};

export const buildPermissionTreeData = () =>
  MODULE_TREE.map((mod) => ({
    key: `module:${mod.key}`,
    title: mod.label,
    children: mod.children.map((page) => ({
      key: page.key,
      title: page.label,
      isLeaf: true,
    })),
  }));

export const getAllConfigurablePageKeys = () =>
  PAGE_ENTRIES.filter(
    (p) =>
      (p.moduleKey !== "core" || p.key === "core.dashboard" || p.key === "core.task_manager") &&
      !(p.alwaysAllow && p.key !== "core.dashboard" && p.key !== "core.task_manager")
  ).map((p) => p.key);

const toCheckboxField = (page) => ({
  name: page.key,
  label: page.label,
  type: "checkbox",
  span: 6,
});

const masterExceptCompany = PAGE_ENTRIES.filter(
  (p) => p.moduleKey === "master" && p.key !== "master.company"
);

/** Grouped checkbox layout — matches Roll page UI sections */
export const PERMISSION_FORM_GROUPS = [
  {
    group: "Core & Access",
    showMasterToggle: true,
    items: [
      { name: "all", label: "All Permissions", type: "checkbox", required: false, span: 6 },
      { name: "core.dashboard", label: "Dashboard", type: "checkbox", span: 6 },
      { name: "core.task_manager", label: "Task Manager", type: "checkbox", span: 6 },
      { name: "master.company", label: "Company Profile", type: "checkbox", span: 6 },
      ...masterExceptCompany.map(toCheckboxField),
    ],
  },
  {
    group: "Inventory & Warehouse (IMS)",
    items: PAGE_ENTRIES.filter((p) => p.moduleKey === "inventory").map(toCheckboxField),
  },
  {
    group: "Supply Chain & Trade",
    items: [
      ...PAGE_ENTRIES.filter((p) => p.moduleKey === "transaction").map(toCheckboxField),
      ...PAGE_ENTRIES.filter((p) => p.moduleKey === "outward").map(toCheckboxField),
    ],
  },
  {
    group: "Accounting & Finance",
    items: PAGE_ENTRIES.filter((p) => p.moduleKey === "accounting").map(toCheckboxField),
  },
  {
    group: "Reporting & MIS",
    items: PAGE_ENTRIES.filter((p) => p.moduleKey === "reports").map(toCheckboxField),
  },
  {
    group: "Administration",
    items: PAGE_ENTRIES.filter((p) => p.moduleKey === "admin").map(toCheckboxField),
  },
];

export const buildPermissionFormGroupsFromModules = (modules) => {
  if (!modules?.length) return PERMISSION_FORM_GROUPS;

  return modules.map((mod, idx) => ({
    group: mod.label,
    showMasterToggle: idx === 0,
    items: [
      ...(idx === 0
        ? [{ name: "all", label: "All Permissions", type: "checkbox", required: false, span: 6 }]
        : []),
      ...(mod.children || []).map((p) => ({
        name: p.key,
        label: p.label,
        type: "checkbox",
        span: 6,
      })),
    ],
  }));
};

export const getPermissionFormFieldNames = (groups = PERMISSION_FORM_GROUPS) => {
  const names = new Set(["all"]);
  groups.forEach((g) => {
    g.items.forEach((item) => names.add(item.name));
  });
  return [...names];
};
