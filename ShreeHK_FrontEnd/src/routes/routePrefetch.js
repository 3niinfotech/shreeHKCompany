const prefetched = new Set();

const routeImporters = {
  "/login": () => import("../pages/auth/Login"),
  "/auth/login": () => import("../pages/auth/Login"),
  "/dashboard": () => import("../pages/DashBoard"),
  "/task-manager": () => import("../pages/TaskManager"),
  "/master/company-details": () => import("../pages/master/Company"),
  "/master/shipping-details": () => import("../pages/master/Shipping"),
  "/master/origin": () => import("../pages/master/Origin"),
  "/master/lab": () => import("../pages/master/Lab"),
  "/master/category": () => import("../pages/master/Category"),
  "/master/rapnet-pricelist": () => import("../pages/master/RapNetPriceList"),
  "/master/bulk-update": () => import("../pages/master/BulkUpdate"),
  "/master/import-format": () => import("../pages/master/ImportFormat"),
  "/master/attribute": () => import("../pages/master/Attribute"),
  "/master/refresh-stock": () => import("../pages/master/RefreshStock"),
  "/master/integrations": () => import("../pages/master/Integrations"),
  "/inventory/my-inventory": () => import("../pages/inventory/DiamondInventoryTable"),
  "/inventory/categorize-inventory": () => import("../pages/inventory/Category"),
  "/inventory/box": () => import("../pages/inventory/SingleToBox"),
  "/inventory/parcel": () => import("../pages/inventory/SingleToParcel"),
  "/inventory/on-hand-stock": () => import("../pages/inventory/OnHandStock"),
  "/inventory/barcode": () => import("../pages/inventory/Barcode"),
  "/inventory/cycle-count": () => import("../pages/inventory/CycleCount"),
  "/inventory/box-to": () => import("../pages/inventory/Box"),
  "/inventory/parcel-to": () => import("../pages/inventory/Parcel"),
  "/inventory/pair": () => import("../pages/inventory/Pair"),
  "/transaction/inward/import": () => import("../pages/transaction/inward/InwordImport"),
  "/transaction/inward/purchase": () => import("../pages/transaction/inward/InwardPurchase"),
  "/transaction/inward/inmemo": () => import("../pages/transaction/inward/InMemo"),
  "/transaction/inward/inconsignment": () => import("../pages/transaction/inward/InConsignment"),
  "/transaction/stone-update": () => import("../pages/transaction/StoneUpdate"),
  "/transaction/gia-memo": () => import("../pages/transaction/stock/GIAMemoStock"),
  "/transaction/gia-memo/entry": () => import("../pages/transaction/stock/GIAEntry"),
  "/transaction/in-memo": () => import("../pages/transaction/stock/InMemoStock"),
  "/transaction/in-memo/entry": () => import("../pages/transaction/stock/InMemoEntry"),
  "/transaction/out-memo": () => import("../pages/transaction/stock/OutMemoStock"),
  "/transaction/out-memo/entry": () => import("../pages/transaction/stock/OutMemoEntry"),
  "/transaction/sale": () => import("../pages/transaction/stock/SaleStock"),
  "/transaction/sale/entry": () => import("../pages/transaction/stock/SaleEntry"),
  "/transaction/purchase": () => import("../pages/transaction/stock/PurchaseStock"),
  "/transaction/purchase/entry": () => import("../pages/transaction/stock/PurchaseEntry"),
  "/outward": () => import("../pages/outword/OutWord"),
  "/accounting/expanse": () => import("../pages/accounting/Expanse"),
  "/accounting/expanse/table-data": () => import("../pages/accounting/FormTable/ExpanseTableData"),
  "/accounting/advance": () => import("../pages/accounting/AdvancePayment"),
  "/accounting/advance/table-data": () => import("../pages/accounting/FormTable/AdvanceTableData"),
  "/accounting/my-balance": () => import("../pages/accounting/my-balance/MyBalance"),
  "/accounting/account-transaction": () => import("../pages/accounting/Transaction"),
  "/accounting/advance-transaction": () => import("../pages/accounting/AdvanceTransaction"),
  "/accounting/party-wise-transaction": () => import("../pages/accounting/PartyWiseTransaction"),
  "/accounting/party": () => import("../pages/accounting/AccParty"),
  "/accounting/party-report": () => import("../pages/accounting/AccPartyReport"),
  "/accounting/group": () => import("../pages/accounting/AccGroup"),
  "/accounting/subgroup": () => import("../pages/accounting/AccSubgroup"),
  "/report/transaction": () => import("../pages/reports/TransactionReport"),
  "/report/outstanding": () => import("../pages/reports/OutStandingReport"),
  "/report/group-report": () => import("../pages/reports/GroupReport"),
  "/report/stone-history": () => import("../pages/reports/StoneHistory"),
  "/report/stone-transfer-history": () => import("../pages/reports/TransferHistory"),
  "/report/sale-stock": () => import("../pages/reports/SaleStoneReport"),
  "/report/stone-info": () => import("../pages/reports/StoneInfoReport"),
  "/admin/tenant-company": () => import("../pages/admin/TenantCompanyList"),
  "/admin/manage-user": () => import("../pages/admin/ManageUser"),
  "/admin/roll": () => import("../pages/admin/AdvancedRollPage"),
  "/admin/fiscal-year": () => import("../pages/admin/FiscalYearAdmin"),
  "/admin/activity-history": () => import("../pages/admin/ActivityHistory"),
  "/admin/legacy-apps": () => import("../pages/admin/LegacyAppsScope"),
  "/my-account": () => import("../pages/myAccount/MyAccount"),
  "/settings": () => import("../pages/myAccount/Setting"),
  "/forbidden": () => import("../pages/errors/Forbidden"),
};

export const prefetchRoute = (path) => {
  if (!path || prefetched.has(path)) return;
  const load = routeImporters[path];
  if (typeof load !== "function") return;
  prefetched.add(path);
  load().catch(() => {
    prefetched.delete(path);
  });
};

export const prefetchRouteTree = (route) => {
  if (!route) return;
  if (route.path) prefetchRoute(route.path);
  if (Array.isArray(route.children)) {
    route.children.forEach(prefetchRouteTree);
  }
};

const collectRoutePaths = (routes, paths = []) => {
  if (!Array.isArray(routes)) return paths;
  routes.forEach((route) => {
    if (route?.path?.startsWith("/")) {
      paths.push(route.path);
    }
    if (Array.isArray(route?.children)) {
      collectRoutePaths(route.children, paths);
    }
  });
  return paths;
};

/** Gradually prefetch authorized route chunks during browser idle time. */
export const prefetchAuthorizedRoutesIdle = (routes) => {
  const paths = collectRoutePaths(routes);
  if (!paths.length) return undefined;

  let index = 0;
  let cancelled = false;
  let cancelScheduled = null;

  const step = () => {
    if (cancelled || index >= paths.length) return;
    prefetchRoute(paths[index]);
    index += 1;
    if (index < paths.length) {
      cancelScheduled = scheduleIdle(step);
    }
  };

  cancelScheduled = scheduleIdle(step);

  return () => {
    cancelled = true;
    cancelScheduled?.();
  };
};

function scheduleIdle(callback) {
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(callback, { timeout: 2500 });
    return () => window.cancelIdleCallback(idleId);
  }
  const timer = window.setTimeout(callback, 80);
  return () => window.clearTimeout(timer);
}
