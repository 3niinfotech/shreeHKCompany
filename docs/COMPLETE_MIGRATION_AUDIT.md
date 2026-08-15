# Complete Venya → ShreeHK Migration Audit

**Date:** 2026-08-15  
**OLD_PROJECT:** [`venya`](../venya)  
**NEW_PROJECT:** [`ShreeHK_FrontEnd`](../ShreeHK_FrontEnd) + [`ShreeHK_BackEnd`](../ShreeHK_BackEnd)  
**Machine-readable evidence:** [`docs/migration-audit/`](./migration-audit/)

---

## 1. Scope and methodology

### In scope
- Portal admin pages under `venya/` (login, dashboard, company, user, roll, year, profile, cron, mail helpers)
- DAI ERP under `venya/dai/` (masters, inventory, transactions, reports, accounting)
- React routes, API endpoints, Express routers, jobs, migrations

### Intentionally excluded (not parity failures)
Per [`ShreeHK_BackEnd/config/legacyApps.js`](../ShreeHK_BackEnd/config/legacyApps.js):

| Key | Legacy path | Reason |
|-----|-------------|--------|
| EMS | `venya/ems/` | Separate app |
| SMS | `venya/sms/` | Separate app |
| Jewelry | `venya/dai/module/jewelry/` | Menu commented / legacy disabled |

Also treated as **not active legacy requirements** (commented in PHP menus): Branch Transfer, Stock Report menu item, Jewelry submenu.

### Evidence rules
- Prior docs ([`MIGRATION_MAP.md`](./MIGRATION_MAP.md), [`STONE-FLOW-GUIDE.md`](./STONE-FLOW-GUIDE.md)) used as **leads only**; every status below was re-checked against code.
- Status grades:
  - **FULLY MIGRATED** — equivalent FE+BE logic found
  - **PARTIALLY MIGRATED** — exists but missing automation / validation / route / edge case
  - **MISSING** — active legacy capability not found in new stack
  - **INTENTIONALLY EXCLUDED** — out of scope
  - **EXTRA / NEW** — new-only capability
  - **RUNTIME VERIFICATION REQUIRED** — static parity present; not executed against live DB/SMTP/external APIs in this audit

### Inventory completeness note
Recursive `Get-ChildItem` / `git ls-files` against `venya/` could not be completed in this environment (shell runner returned no exit status; Cursor Glob returns 0 under nested `venya/.git`). Completeness for legacy was achieved via:

1. Exhaustive menu extraction from `left.php`, `header.php`, `account_left.php`, `dashMenu.php`
2. Direct `Read` probes of every menu destination and high-risk AJAX/action PHP file
3. Cross-check against new `Routes.jsx`, `endpoints.js`, Express mounts, and permission registries

Vendor/assets (`venya/vendor`, ACE/jQuery assets) are classified as non-feature and not parity-mapped.

---

## 2. Coverage totals

| Grade | Count (feature groups) |
|-------|------------------------|
| FULLY MIGRATED | 32 |
| PARTIALLY MIGRATED | 8 |
| MISSING | 3 |
| INTENTIONALLY EXCLUDED | 6 |
| EXTRA / NEW | 5 |
| Features flagged RUNTIME VERIFY | 9 |

**New stack surface (approx.):** 65 protected React routes, 167 FE endpoint keys, ~180 BE route registrations, FE 59 / BE 57 permission keys.

**Follow-up (2026-08-15 probes):** Accounting confirmed at `venya/dai/account/` (not under `module/`). Additional gaps: on-hand `dai_stockmanage` snapshots, James/Nivoda feeds, WhatsApp gateway, `dai_book` transfers. Missing `*Controller.php` files are a legacy pattern (models/pages), not a ShreeHK gap. `forget.php` was already non-functional.

---

## 3. Prioritized gaps (action list)

### P0 — blocks full operational parity
1. **Fiscal year DB clone / inventory transfer** (`saveYear.php` → `/portal/year`)  
   Node only inserts/updates `company_year` metadata and requires an already-existing `dbName`. Missing: `CREATE DATABASE`, table structure copy, master-data seed list, on-hand inventory/history transfer, rollback.
2. **Attribute master UI disabled**  
   BE `attributeRoutes.js` is live; FE `/master/attribute` is commented in `Routes.jsx`. Legacy menu still exposes Attribute.

### P1 — partial / hybrid / ACL / feed gaps
3. **On-hand stock snapshots** — legacy `dai_stockmanage` save/restore by date not found; `OnHandStock` / `CycleCount` are live-only.
4. **James / Nivoda / global feeds + SFTP** — `venya/james/` not migrated.
5. **Print/labels hybrid PHP** — `openLegacyPdf("print/stone-label.php")` needs `VITE_LEGACY_PDF_URL`.
6. **Integrations vs siteSynchro** — website sync flips `site_upload` flags; GIA external lookup stubbed.
7. **My Balance books** — PHP `dai_book` + currency-convert transfers vs Node `dai_balance` cash/bank/credit model.
8. **Accounting party permission keys** — `accounting.party` and `accounting.party_report` exist only on FE registry.
9. **ExportEntry / ConsignEntry** imported but not routed (still reachable via inventory sendTo).

### P2 — smaller / confirm
10. **WhatsApp / public awsmail gateway** — inventory SMTP mail exists; WhatsApp multi-send gateway not migrated (also a legacy security smell).
11. **Portal `setting.php`** — linked from `dashMenu.php` but file not found; no clear new equivalent beyond `/settings` profile UI.
12. **Hold cron multi-tenant year DBs** — port exists; confirm every year DB.
13. **Lab table rename** — PHP `dai_product_lab` vs Node `dai_lab`.
14. **Other table aliases** — `category` vs `dai_category`, `dai_party` vs `acc_partywise`.

---

## 4. Feature mapping (OLD → NEW)

### 4.1 Auth / portal / admin

| Old feature | Old files | New equivalent | Status |
|-------------|-----------|----------------|--------|
| Login | `controller/user/login.php` | `Login.jsx` + `POST /user/login` | FULLY |
| Logout | `logout.php` | `POST /user/logout` + token blacklist | FULLY |
| Session check | `dai/checkSession.php` | `GET /session/keepalive` | FULLY |
| Company/year pick | `dashboard.php`, `setSession.php` | `CompanyYearPicker` + `/session/context` + `/portal/company-years` | FULLY |
| Tenant company | `company.php` / save | `TenantCompanyList` + `/admin/tenant-company/*` | FULLY |
| Users | `user.php` | `ManageUser` + admin user routes | FULLY |
| Roles | `roll.php`, `checkResource.php` | `AdvancedRollPage` + `permissionRegistry` + `LEGACY_MODULE_MAP` | FULLY |
| Fiscal year transfer | `saveYear.php` | `FiscalYearAdmin` + `/portal/year` (metadata only) | **PARTIAL** |
| My Profile | `profile.php` | `/my-account` + `/api/profile/*` | FULLY |
| Portal Setting | `setting.php` (menu link) | Not found / not migrated | **MISSING** |

### 4.2 Masters

| Old | New | Status |
|-----|-----|--------|
| Party (`module/party`) | `/master/company-details` | FULLY |
| Attribute | BE yes / FE route commented | **PARTIAL** |
| Shipping / Origin / Lab / Category | matching `/master/*` routes | FULLY |
| Bulk Update | `/master/bulk-update` + `POST /bulk-update` | FULLY (runtime verify types) |
| Import Format | `/master/import-format` | FULLY |
| RapNet Price | `/master/rapnet-pricelist` + `/rapnet/*` | FULLY (+ extras) |
| Refresh Stock | `RefreshStock` + `/integration/refresh-rapnet-stock` | FULLY |
| siteSynchro / GIA | `Integrations` page | **PARTIAL** |

### 4.3 Inventory

| Old | New | Status |
|-----|-----|--------|
| My Inventory + hold/memo/sale/mail/price/export/label | `DiamondInventoryTable` + product/outward APIs | FULLY (runtime verify actions) |
| On Hand Stock | matching inventory routes | FULLY (live list) |
| On-hand **snapshot** save (`dai_stockmanage`) | Not found | **MISSING** |
| Barcode | matching inventory routes | FULLY |
| Single↔Box/Parcel | Box/Parcel pages + APIs | FULLY |
| Add to Package | `/product/package/assign` | FULLY |
| Pair page | `/inventory/pair` | **EXTRA** |
| Cycle Count | `/inventory/cycle-count` (legacy stocktaking was commented) | **EXTRA** |

### 4.4 Transactions

| Old | New | Status |
|-----|-----|--------|
| Inward import/purchase/memo/consign | `/transaction/inward/import` + entry pages + `POST /inward/save` | FULLY (UI consolidated) |
| Outward export/sale/memo/lab/consign | Inventory sendTo + `outwardService` | FULLY |
| Stone Update | `/transaction/stone-update` | FULLY |
| GIA / In-Memo / Out-Memo / Sale / Purchase registers + returns | `transaction/stock/*` + `transactionStockService` | FULLY (runtime verify conversions) |
| Print / PDF / labels | Node print + React templates + **legacy PDF URL** | **PARTIAL** |
| Outward list | `/outward` | FULLY |

### 4.5 Reports & accounting

| Old | New | Status |
|-----|-----|--------|
| Transaction / Sale Stock / Group / Stone History / Transfer / Stone Info / Outstanding | `/report/*` | FULLY (runtime verify filters) |
| Expense / Advance / My Balance / Currency | `/accounting/*` | FULLY for expense/advance/currency rates; **PARTIAL** for books (`dai_book` transfers → `dai_balance`) |
| Group / Subgroup | `/accounting/group|subgroup` (`venya/dai/account/` confirmed) | FULLY |
| Acc Party + Party/Advance/Txn reports | AccParty / AccPartyReport / Transaction pages | **PARTIAL** (permission registry + confirm report fields) |

### 4.6 Ops

| Old | New | Status |
|-----|-----|--------|
| `holdcron.php` | `jobs/holdCron.js` | FULLY (runtime verify tenancy) |
| `ajax.php` notifications | `notificationRoutes` (+ SSE) | FULLY |
| Inventory SMTP mail | nodemailer inventory mail | FULLY (runtime SMTP) |
| `awsmail.php` WhatsApp gateway | — | **PARTIAL** (WhatsApp + public gateway missing) |
| `siteSynchro` | Integrations page | **PARTIAL** |
| James / Nivoda / SFTP feeds | — | **MISSING** |

### 4.7 Exclusions

| Feature | Status |
|---------|--------|
| EMS | INTENTIONALLY EXCLUDED |
| SMS | INTENTIONALLY EXCLUDED |
| Jewelry | INTENTIONALLY EXCLUDED |
| Branch Transfer (commented) | INTENTIONALLY EXCLUDED / dead |
| Forgot password (`forget.php` non-functional) | INTENTIONALLY EXCLUDED / dead legacy UI |
| Missing `*Controller.php` references | INTENTIONALLY EXCLUDED (legacy model/page pattern) |

### 4.8 Extra / new-only in ShreeHK

| Feature | Location |
|---------|----------|
| AI chat / OCR / insights | `/ai/*` |
| Activity History / mutation audit | `/admin/activity-history`, `dai_activity_log` |
| Task Manager / Quick Notes | `/task-manager`, `dai_quick_notes` |
| Legacy Apps admin page | `/admin/legacy-apps` |
| Dashboard charts/trends | `/dashboard/summary|trends` |
| Pair inventory UI | `/inventory/pair` |
| Cycle Count | `/inventory/cycle-count` |
| RapNet live/history/snapshot | `/rapnet/live*` |
| Rate limits, JWT blacklist, API permission middleware | backend hardening |

---

## 5. Validation & edge-case checklist (commonly missed)

| Area | Legacy observation | New observation | Gap? |
|------|--------------------|-----------------|------|
| Form required fields | Mix of HTML `required`, JS alerts, server checks | Ant Design `rules` + server toasts; no Zod/Yup | Per-form runtime verify |
| Inward types | Separate menu URLs `t=import|purchase|memo|consign` | Single import page + type dropdown + entry wrappers | Functionally OK; dedicated children commented |
| Disabled fields | PHP forms disable fields that are not posted | Ant Design forms must mirror | Runtime verify |
| Hold expiry | Cron hard-coded DB | Env-driven job; optional enable | Confirm multi-DB |
| Company isolation | `$_SESSION['companyId']` on queries (inconsistent) | JWT + tenant pools + `company = ?` | Better architecture; re-audit fat routes |
| Fiscal year | Full DB clone | Metadata only | **Yes — P0** |
| Attribute UI | Active menu | Route commented | **Yes — P0** |
| Print | PHP PDF | Hybrid | **Yes — P1** |
| Permissions FE/BE | Single PHP resource list | Dual registries | **Yes — party keys** |

---

## 6. Endpoint / permission reconciliation

### FE endpoint catalog vs BE mounts
Primary inventory endpoints, masters, inward/outward, transaction stock, reports, accounting, portal, RapNet, AI, activity-log — **registered on both sides** (see `new-stack-inventory.json`).

### Permission registry mismatch
| Key | FE | BE |
|-----|----|----|
| `accounting.party` | yes (route) | **missing** |
| `accounting.party_report` | yes (route) | **missing** |

API permission enforcement for those pages may fall through shared `/partywisetransaction` / report prefixes — treat as ACL drift until registries sync.

### Commented / unrouted FE surfaces
- `/master/attribute`
- Inward child routes (purchase/inmemo/consignment)
- `ExportEntry` / `ConsignEntry` imported, not in route tree
- Contact Support commented

---

## 7. Orphans / backups / vendor (classification)

| Class | Examples | Audit treatment |
|-------|----------|-----------------|
| Vendor/assets | `venya/vendor`, ACE/Bootstrap/jQuery | Not features |
| Backup/dated | `account_07_07`, `parcel-old`, `*Copy*`, `report1` | Inactive candidates — not mapped as required unless menu-linked |
| Generated | Excel/PDF outputs, SQL dump data rows | Not features; secrets redacted |
| Unreachable but existent | `inventory/stock.php` (menu commented) | Superseded by Cycle Count EXTRA |

---

## 8. Runtime verification backlog

Execute against a non-prod year DB with two companies:

1. Login / roll ACL / forbidden empty perms  
2. Company+year switch + keepalive `s2` mismatch  
3. Inward save for each type + Excel import  
4. Inventory hold / unhold / sendTo memo|sale|export|lab|consign  
5. Memo return, memo→sale, memo→purchase, to-export, purchase toggle-type  
6. Box/parcel/package/pair  
7. Bulk update each type  
8. All report filters + Excel export  
9. Accounting expense/advance/balance/party reports  
10. Hold cron with expired rows across year DBs  
11. Mail send (SMTP)  
12. Label A4 + sticker + legacy PDF fallback  
13. Fiscal year: prove current Node path cannot clone DB; document manual runbook  
14. Attribute: re-enable route and CRUD smoke test  
15. On-hand snapshot: confirm whether business still needs `dai_stockmanage` save/restore  
16. James/Nivoda: confirm whether feeds are still consumed externally  
17. My Balance: compare `dai_book` transfer scenarios vs `dai_balance` UI  
18. Lab: verify year DBs use `dai_lab` (not only `dai_product_lab`)  

---

## 9. Verdict

**Core DAI ERP (inventory / inward / outward / masters / reports / accounting / portal ACL) is largely migrated** with modern JWT multi-tenant architecture and several **new** capabilities (AI, activity audit, task manager, dashboards).

**It is not yet 100% feature parity.** Blocking/partial items:

1. Fiscal-year **database clone + stock transfer** still depends on legacy `saveYear.php` (or manual DBA work).  
2. **Attribute** management UI is disabled despite backend support.  
3. **On-hand snapshot** persistence (`dai_stockmanage`) is missing.  
4. **James/Nivoda** (and related) stock feeds are missing.  
5. Some **print** flows still require live PHP.  
6. **Integrations** are thinner than `siteSynchro`; WhatsApp gateway not migrated.  
7. **My Balance** model shifted from `dai_book` transfers to `dai_balance`.  
8. **Permission registry** FE/BE drift on accounting party pages.  
9. Portal **setting** page appears missing.

Treat extras (AI, activity history, etc.) as **new value**, not missing PHP features.

---

## 10. Artifact index

| File | Contents |
|------|----------|
| [`migration-audit/legacy-menu-inventory.json`](./migration-audit/legacy-menu-inventory.json) | Legacy menus, AJAX, exclusions |
| [`migration-audit/new-stack-inventory.json`](./migration-audit/new-stack-inventory.json) | Routes, endpoints, registries |
| [`migration-audit/feature-mapping.json`](./migration-audit/feature-mapping.json) | Feature-level grades + evidence |
| [`migration-audit/db-tables.json`](./migration-audit/db-tables.json) | Tables / naming mismatches |
| [`migration-audit/coverage-summary.json`](./migration-audit/coverage-summary.json) | Counts + priority gaps |

**Credentials:** Hard-coded DB passwords observed in `venya/holdcron.php` were **not** copied into these artifacts. Rotate those credentials in the legacy environment.
