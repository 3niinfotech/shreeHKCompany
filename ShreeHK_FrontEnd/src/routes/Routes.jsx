import React from "react";
import { hasPagePermission } from "../config/permissionRegistry";
import ContactSupport from "../pages/contactSupport/ContactSupport";

// ----**** Login/SignIn Page ****----
const Login = React.lazy(() => import("../pages/auth/Login"));

// --- 1. COMMON COMPONENT ---
const Dashboard = React.lazy(() => import("../pages/DashBoard"));

// --- 2. MASTER DROPDOWN PAGE ---
const Company = React.lazy(() => import("../pages/master/Company"));
const Shipping = React.lazy(() => import("../pages/master/Shipping"));
const Origin = React.lazy(() => import("../pages/master/Origin"));
const Lab = React.lazy(() => import("../pages/master/Lab"));
const Category = React.lazy(() => import("../pages/master/Category"));
const RapNetPriceList = React.lazy(() => import("../pages/master/RapNetPriceList"));
const BulkUpdate = React.lazy(() => import("../pages/master/BulkUpdate"));
const ImportFormat = React.lazy(() => import("../pages/master/ImportFormat"));
const Attribute = React.lazy(() => import("../pages/master/Attribute"));
const RefreshStock = React.lazy(() => import("../pages/master/RefreshStock"));
const Integrations = React.lazy(() => import("../pages/master/Integrations"));

// --- 3. INVENTORY DROPDOWN PAGE ---
const DiamondInventoryTable = React.lazy(() => import("../pages/inventory/DiamondInventoryTable"));
const SingleToBox = React.lazy(() => import("../pages/inventory/SingleToBox"));
const SingleToParcel = React.lazy(() => import("../pages/inventory/SingleToParcel"));
const OnHandStock = React.lazy(() => import("../pages/inventory/OnHandStock"));
const Barcode = React.lazy(() => import("../pages/inventory/Barcode"));
const Box = React.lazy(() => import("../pages/inventory/Box"));
const Parcel = React.lazy(() => import("../pages/inventory/Parcel"));
const Pair = React.lazy(() => import("../pages/inventory/Pair"));
const CycleCount = React.lazy(() => import("../pages/inventory/CycleCount"));
const Categories = React.lazy(() => import("../pages/inventory/Category"));

// --- 4. TRANSACTION DROPDOWN PAGE ---
const InwardPurchase = React.lazy(() => import("../pages/transaction/inward/InwardPurchase"));
const InWardImport = React.lazy(() => import("../pages/transaction/inward/InwordImport"));
const InMemo = React.lazy(() => import("../pages/transaction/inward/InMemo"));
const InConsignment = React.lazy(() => import("../pages/transaction/inward/InConsignment"));
const StoneUpdate = React.lazy(() => import("../pages/transaction/StoneUpdate"));
const GIAMemoStock = React.lazy(() => import("../pages/transaction/stock/GIAMemoStock"));
const InMemoStock = React.lazy(() => import("../pages/transaction/stock/InMemoStock"));
const OutMemoStock = React.lazy(() => import("../pages/transaction/stock/OutMemoStock"));
const SaleStock = React.lazy(() => import("../pages/transaction/stock/SaleStock"));
const PurchaseStock = React.lazy(() => import("../pages/transaction/stock/PurchaseStock"));
const InMemoEntry = React.lazy(() => import("../pages/transaction/stock/InMemoEntry"));
const PurchaseEntry = React.lazy(() => import("../pages/transaction/stock/PurchaseEntry"));
const OutMemoEntry = React.lazy(() => import("../pages/transaction/stock/OutMemoEntry"));
const SaleEntry = React.lazy(() => import("../pages/transaction/stock/SaleEntry"));
const GIAEntry = React.lazy(() => import("../pages/transaction/stock/GIAEntry"));
const ExportEntry = React.lazy(() => import("../pages/transaction/stock/ExportEntry"));
const ConsignEntry = React.lazy(() => import("../pages/transaction/stock/ConsignEntry"));

// --- 5. ACCOUNTING DROPDOWN PAGE ---
const Expanse = React.lazy(() => import("../pages/accounting/Expanse"));
const AdvancePayment = React.lazy(() => import("../pages/accounting/AdvancePayment"));
const MyBalance = React.lazy(() => import("../pages/accounting/my-balance/MyBalance"));
const Transaction = React.lazy(() => import("../pages/accounting/Transaction"));
const AdvanceTransaction = React.lazy(() => import("../pages/accounting/AdvanceTransaction"));
const PartyWiseTransaction = React.lazy(() => import("../pages/accounting/PartyWiseTransaction"));
const AccParty = React.lazy(() => import("../pages/accounting/AccParty"));
const AccPartyReport = React.lazy(() => import("../pages/accounting/AccPartyReport"));
const ExpanseTableData = React.lazy(() => import("../pages/accounting/FormTable/ExpanseTableData"));
const AdvanceTableData = React.lazy(() => import("../pages/accounting/FormTable/AdvanceTableData"));
const AccGroup = React.lazy(() => import("../pages/accounting/AccGroup"));
const AccSubgroup = React.lazy(() => import("../pages/accounting/AccSubgroup"));

// --- 6. REPORTS DROPDOWN PAGE ---
const TransactionReport = React.lazy(() => import("../pages/reports/TransactionReport"));
const OutStandingReport = React.lazy(() => import("../pages/reports/OutStandingReport"));
const GroupReport = React.lazy(() => import("../pages/reports/GroupReport"));
const StoneHistory = React.lazy(() => import("../pages/reports/StoneHistory"));
const TransferHistory = React.lazy(() => import("../pages/reports/TransferHistory"));
const SaleStoneReport = React.lazy(() => import("../pages/reports/SaleStoneReport"));
const StoneInfoReport = React.lazy(() => import("../pages/reports/StoneInfoReport"));

// --- 6. ADMIN DROPDOWN PAGE ---
const AdvancedRollPage = React.lazy(() => import("../pages/admin/AdvancedRollPage"));
const ManageUser = React.lazy(() => import("../pages/admin/ManageUser"));
const FiscalYearAdmin = React.lazy(() => import("../pages/admin/FiscalYearAdmin"));
const ActivityHistory = React.lazy(() => import("../pages/admin/ActivityHistory"));
const LegacyAppsScope = React.lazy(() => import("../pages/admin/LegacyAppsScope"));
const TenantCompanyList = React.lazy(() => import("../pages/admin/TenantCompanyList"));

// --- 8. OUTWARD DROPDOWN PAGE ---
const Outward = React.lazy(() => import("../pages/outword/OutWord"));

// --- 9 MY ACCOUNT ---
const MyAccount = React.lazy(() => import("../pages/myAccount/MyAccount"));
const Setting = React.lazy(() => import("../pages/myAccount/Setting"));

// --- ERRORS ---
const Forbidden = React.lazy(() => import("../pages/errors/Forbidden"));

const ROLE_ACCESS = {
  SUPER_ADMIN: "super_admin",
};

const getUserPermissions = (user) => {
  const perms = user?.permissions;
  return Array.isArray(perms) ? perms : [];
};

const getUserRoleValue = (user) => {
  if (!user) return null;
  return user.roll ?? user.userroll ?? user.role_id ?? null;
};

/** DB roll id only — ignore login `role` string ("admin" / "super_admin"). */
const getAssignedRollId = (user) => {
  const roll = getUserRoleValue(user);
  if (roll === null || roll === undefined || roll === "") return null;
  const num = Number(roll);
  if (Number.isNaN(num) || num === 0) return null;
  return num;
};

const isSuperAdminUser = (user) => getAssignedRollId(user) === 1;

const HIDDEN_NAV_PATHS = new Set(["/my-account", "/settings", "/forbidden"]);

/**
 * Block app access → show Forbidden only (no dashboard).
 * True when: no roll, OR roll exists but permissions array is empty.
 */
const userLacksRoleAccess = (user) => {
  if (!user) return true;
  if (isSuperAdminUser(user)) return false;

  const rollId = getAssignedRollId(user);
  if (rollId === null) return true;

  const perms = getUserPermissions(user);
  if (!perms.length) return true;

  return false;
};

const userHasAssignedRole = (user) => getAssignedRollId(user) !== null;

const getPostLoginPath = (user) => {
  if (userLacksRoleAccess(user)) return "/forbidden";
  if (canAccessRoute({ path: "/", permissionKey: "core.dashboard" }, user)) return "/";
  const flat = flattenRoutes(filterRoutesByAccess(allProtectedRoutes, user));
  const first = flat.find(
    (r) => r.path && r.element && !r.hideFromNav && r.path !== "/forbidden" && !String(r.path).includes(":")
  );
  return first?.path || "/forbidden";
};

const canAccessRoute = (route, user) => {
  if (userLacksRoleAccess(user)) {
    return HIDDEN_NAV_PATHS.has(route.path);
  }

  if (!hasRouteAccess(route, user)) return false;
  if (isSuperAdminUser(user)) return true;
  if (route.alwaysAllow || (route.permissionKey == null && !route.permissionKeys?.length)) return true;
  if (route.permissionKeys?.length) {
    const perms = getUserPermissions(user);
    return route.permissionKeys.some((k) => hasPagePermission(perms, k));
  }
  return hasPagePermission(getUserPermissions(user), route.permissionKey);
};

const hasRouteAccess = (route, user) => {
  if (!route?.requiredRole) return true;

  if (route.requiredRole === ROLE_ACCESS.SUPER_ADMIN) {
    return isSuperAdminUser(user);
  }

  return true;
};

const filterRoutesByAccess = (routes, user) =>
  routes
    .map((route) => {
      if (route.children) {
        const children = filterRoutesByAccess(route.children, user);
        if (!children.length) return null;
        return { ...route, children };
      }
      return canAccessRoute(route, user) ? route : null;
    })
    .filter(Boolean);

const allProtectedRoutes = [
  { path: "/", name: "Dashboard", icon: "House", element: <Dashboard />, permissionKey: "core.dashboard" },

  {
    name: "Master",
    path: "/master",
    icon: "Settings",
    children: [
      { path: "/master/company-details", name: "Company", element: <Company />, permissionKey: "master.company" },
      { path: "/master/shipping-details", name: "Shipping", element: <Shipping />, permissionKey: "master.shipping" },
      { path: "/master/origin", name: "Origin", element: <Origin />, permissionKey: "master.origin" },
      { path: "/master/lab", name: "Lab", element: <Lab />, permissionKey: "master.lab" },
      { path: "/master/category", name: "Category", element: <Category />, permissionKey: "master.category" },
      { path: "/master/rapnet-pricelist", name: "RapNet PriceList", element: <RapNetPriceList />, permissionKey: "master.rapnet" },
      { path: "/master/bulk-update", name: "Bulk Update", element: <BulkUpdate />, permissionKey: "master.bulk_update" },
      { path: "/master/import-format", name: "Import Format", element: <ImportFormat />, permissionKey: "master.import_format" },
      // { path: "/master/attribute", name: "Attribute", element: <Attribute />, permissionKey: "master.attribute" },
      { path: "/master/refresh-stock", name: "Refresh Stock", element: <RefreshStock />, permissionKey: "master.refresh_stock" },
      { path: "/master/integrations", name: "Integrations", element: <Integrations />, permissionKey: "master.integrations" },
    ]
  },
  {
    name: "Inventory",
    path: "/inventory",
    icon: "Package",
    children: [
      { path: "/inventory/my-inventory", name: "My Inventory", element: <DiamondInventoryTable />, permissionKey: "inventory.my_inventory" },
      { path: "/inventory/categorize-inventory", name: "Categorize", element: <Categories />, permissionKey: "inventory.categorize" },
      {
        name: "Single/Two",
        path: "/inventory/singal-two",
        children: [
          { path: "/inventory/box", name: "Box To", element: <SingleToBox />, permissionKey: "inventory.single_to_box" },
          { path: "/inventory/parcel", name: "Parcel To", element: <SingleToParcel />, permissionKey: "inventory.single_to_parcel" }
        ]
      },
      { path: "/inventory/on-hand-stock", name: "On Hand Stock", element: <OnHandStock />, permissionKey: "inventory.on_hand_stock" },
      { path: "/inventory/barcode", name: "Barcode", element: <Barcode />, permissionKey: "inventory.barcode" },
      { path: "/inventory/cycle-count", name: "Cycle Count", element: <CycleCount />, permissionKey: "inventory.on_hand_stock" },
      { path: "/inventory/box-to", name: "Box", element: <Box />, permissionKey: "inventory.box" },
      { path: "/inventory/parcel-to", name: "Parcel", element: <Parcel />, permissionKey: "inventory.parcel" },
      { path: "/inventory/pair", name: "Pair", element: <Pair />, permissionKey: "inventory.pair" },
    ]
  },
  {
    name: "Transaction",
    path: "/transaction/inward/",
    icon: "Repeat",
    children: [
      {
        name: "Inward",
        path: "/transaction/inward/import",
        element: <InWardImport />,
        permissionKey: "transaction.inward"
        // children: [
        //   { path: "/transaction/inward/import", name: "Import", element: <InWardImport />, permissionKey: "transaction.inward" },
        // { path: "/transaction/inward/purchase", name: "Purchase", element: <InwardPurchase />, permissionKey: "transaction.inward" },
        // { path: "/transaction/inward/inmemo", name: "In Memo", element: <InMemo />, permissionKey: "transaction.inward" },
        // { path: "/transaction/inward/inconsignment", name: "In Consignment", element: <InConsignment />, permissionKey: "transaction.inward" },
        // ],
      },
      {
        path: "/transaction/stone-update",
        name: "Stone Update",
        element: <StoneUpdate />,
        permissionKey: "transaction.stone_update"
      },
      {
        path: "/transaction/gia-memo",
        name: "GIA-Memo",
        element: <GIAMemoStock />,
        permissionKey: "transaction.gia_memo"
      },
      {
        path: "/transaction/gia-memo/entry",
        name: "GIA Memo Entry",
        element: <GIAEntry />,
        permissionKey: "transaction.gia_memo",
        hideFromNav: true
      },
      {
        path: "/transaction/in-memo",
        name: "In Memo",
        element: <InMemoStock />,
        permissionKey: "transaction.in_memo"
      },
      {
        path: "/transaction/in-memo/entry",
        name: "In Memo Entry",
        element: <InMemoEntry />,
        permissionKey: "transaction.in_memo",
        hideFromNav: true
      },
      {
        path: "/transaction/out-memo",
        name: "Out Memo",
        element: <OutMemoStock />,
        permissionKey: "transaction.out_memo"
      },
      {
        path: "/transaction/out-memo/entry",
        name: "Out Memo Entry",
        element: <OutMemoEntry />,
        permissionKey: "transaction.out_memo",
        hideFromNav: true
      },  
      {
        path: "/transaction/sale",
        name: "Sale",
        element: <SaleStock />,
        permissionKey: "transaction.sale_stock"
      },
      {
        path: "/transaction/sale/entry",
        name: "Sale Entry", 
        element: <SaleEntry />,
        permissionKey: "transaction.sale_stock",
        hideFromNav: true
      },
      {
        path: "/transaction/purchase",
        name: "Purchase",
        element: <PurchaseStock />,
        permissionKey: "transaction.purchase_stock"
      },
      {
        path: "/transaction/purchase/entry",
        name: "Purchase Entry",
        element: <PurchaseEntry />,
        permissionKey: "transaction.purchase_stock",
        hideFromNav: true
      },
    ]
  },
  {
    name: "Accounting",
    path: "/accounting",
    icon: "Book",
    children: [
      { path: "/accounting/expanse", name: "Expanse", element: <Expanse />, permissionKey: "accounting.expanse" },
      { path: "/accounting/expanse/table-data", name: "Expanse List", element: <ExpanseTableData />, permissionKey: "accounting.expanse_list" },
      { path: "/accounting/advance", name: "AdvancePayment", element: <AdvancePayment />, permissionKey: "accounting.advance" },
      { path: "/accounting/advance/table-data", name: "Advance List", element: <AdvanceTableData />, permissionKey: "accounting.advance_list" },
      { path: "/accounting/my-balance", name: "My Balance", element: <MyBalance />, permissionKey: "accounting.my_balance" },
      { path: "/accounting/account-transaction", name: "Transactions", element: <Transaction />, permissionKey: "accounting.transactions" },
      { path: "/accounting/advance-transaction", name: "Adv Transaction", element: <AdvanceTransaction />, permissionKey: "accounting.advance_transaction" },
      { path: "/accounting/party-wise-transaction", name: "Party Wise Transaction", element: <PartyWiseTransaction />, permissionKey: "accounting.party_wise" },
      { path: "/accounting/party", name: "Accounting Party", element: <AccParty />, permissionKey: "accounting.party" },
      { path: "/accounting/party-report", name: "Party Report", element: <AccPartyReport />, permissionKey: "accounting.party_report" },
      { path: "/accounting/group", name: "Group", element: <AccGroup />, permissionKey: "accounting.group" },
      { path: "/accounting/subgroup", name: "Sub Group", element: <AccSubgroup />, permissionKey: "accounting.subgroup" },
    ]
  },
  {
    name: "Reports",
    path: "/report",
    icon: "BarChart",
    children: [
      { path: "/report/transaction", name: "Trans. Report", element: <TransactionReport />, permissionKey: "reports.transaction" },
      { path: "/report/outstanding", name: "Outstanding", element: <OutStandingReport />, permissionKey: "reports.outstanding" },
      { path: "/report/group-report", name: "Group Report", element: <GroupReport />, permissionKey: "reports.group_report" },
      { path: "/report/stone-history", name: "Stone History", element: <StoneHistory />, permissionKey: "reports.stone_history" },
      { path: "/report/stone-tranfer-history", name: "Transfer History", element: <TransferHistory />, permissionKey: "reports.transfer_history" },
      { path: "/report/sale-stock", name: "Sale Stock Report", element: <SaleStoneReport />, permissionKey: "reports.sale_stock" },
      { path: "/report/stone-info", name: "Party Stone Info", element: <StoneInfoReport />, permissionKey: "reports.stone_info" },
    ]
  },
  {
    name: "Admin",
    path: "/admin",
    icon: "User",
    children: [
      { path: "/admin/tenant-company", name: "Company", element: <TenantCompanyList />, requiredRole: ROLE_ACCESS.SUPER_ADMIN, permissionKey: "admin.tenant_company" },
      { path: "/admin/manage-user", name: "Manage User", element: <ManageUser />, requiredRole: ROLE_ACCESS.SUPER_ADMIN, permissionKey: "admin.manage_user" },
      { path: "/admin/roll", name: "Roll", element: <AdvancedRollPage />, requiredRole: ROLE_ACCESS.SUPER_ADMIN, permissionKey: "admin.role" },
      { path: "/admin/fiscal-year", name: "Fiscal Year", element: <FiscalYearAdmin />, requiredRole: ROLE_ACCESS.SUPER_ADMIN, permissionKey: "admin.fiscal_year" },
      { path: "/admin/activity-history", name: "Activity History", element: <ActivityHistory />, permissionKeys: ["admin.activity_history", "admin.auditor"] },
      { path: "/admin/legacy-apps", name: "Legacy Apps", element: <LegacyAppsScope />, requiredRole: ROLE_ACCESS.SUPER_ADMIN, permissionKey: "admin.legacy_apps" },
    ]
  },
  { path: "/outward", name: "Outward", icon: "ExternalLink", element: <Outward />, permissionKey: "outward.main" },
  { path: "/my-account", element: <MyAccount />, alwaysAllow: true, hideFromNav: true },
  { path: "/settings", element: <Setting />, alwaysAllow: true, hideFromNav: true },
  // { path: "/contact-support", element: <ContactSupport />, alwaysAllow: true, hideFromNav: true },
  { path: "/forbidden", element: <Forbidden />, alwaysAllow: true, hideFromNav: true },
];

// for login
export const publicRoutes = [
  { path: "/login", element: <Login /> },
  { path: "/auth/login", element: <Login /> },
];

const flattenRoutes = (routes, flatRoutes = []) => {
  routes.forEach((item) => {
    if (item.element) {
      flatRoutes.push(item);
    }
    if (item.children) {
      flattenRoutes(item.children, flatRoutes);
    }
  });
  return flatRoutes;
};

const filterHiddenFromNav = (routes) =>
  routes
    .filter((route) => !route.hideFromNav)
    .map((route) => {
      if (!route.children) return route;
      return { ...route, children: filterHiddenFromNav(route.children) };
    });

export const getAuthorizedRouteMeta = (user) => {
  const routes = filterRoutesByAccess(allProtectedRoutes, user);
  return {
    routes: filterHiddenFromNav(routes),
    flatRoutes: flattenRoutes(routes),
  };
};

export const getAuthorizedFlattenRoutes = (user) =>
  flattenRoutes(filterRoutesByAccess(allProtectedRoutes, user));

export {
  isSuperAdminUser,
  getUserRoleValue,
  getUserPermissions,
  getAssignedRollId,
  userHasAssignedRole,
  userLacksRoleAccess,
  getPostLoginPath,
  ROLE_ACCESS,
};

export { normalizeAuthUser } from "../utils/authUtils";