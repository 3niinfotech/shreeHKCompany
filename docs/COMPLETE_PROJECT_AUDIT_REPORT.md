# Complete Project Audit Report

## 1. Executive Summary

* **Project name:** ShreeHK Company (Diamond inventory / ERP)
* **Audit date:** 21 September 2026
* **Frontend technology:** React 19.2, Vite 7.3, React Router 7.13, Ant Design 6.3, TanStack React Query 5.90, Zustand 5.0, Axios 1.13, SCSS Modules
* **Backend technology:** Node.js, Express 4.19, `mysql` 2.18, JWT (`jsonwebtoken`), Multer, PDFKit, Groq/Gemini AI SDKs
* **Database:** MySQL (multi-tenant pools via `AsyncLocalStorage`; meta DB + company/year DBs)
* **Modules inspected (completed scope):**
  * **Frontend:** Auth/routing/ACL, Axios client, delete hooks, inventory (hold/reservation), transaction stock (out memo/sale/inward/GIA), accounting (transaction/advance/expense/subgroup/party report), master Attribute, admin (users/fiscal year/roles), outward list, reports (transaction report), notifications SSE, AI shell
  * **Backend:** `index.js` mount surface, auth/permission middleware, tenant helper, product inventory filters, outward/inward/transaction-stock services, accounting routers, user login, notification stream, AI barcode route, hold cron
* **Tests executed:** Static code review and FE↔BE contract tracing (primary). Automated lint/build/API live tests were **blocked** in this session (shell execution did not return usable results). Backend `npm test` is a stub that exits with failure by design.
* **Overall audit scope:** Full-stack discovery + deep audit of auth, inventory/stock, accounting, and security-sensitive SQL/auth paths. **Not** a claim of 100% line coverage of every page/service. Remaining scope is listed in §11.
* **Code changes:** None (audit-only).

---

## 2. Testing Summary

| Area | Tested | Passed | Failed | Blocked | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend | Static review of routes, auth, forms, delete hooks, key pages | Partial | Multiple confirmed runtime/contract bugs | Live UI browser pass | No end-to-end browser session |
| Backend | Static review of routers/services/middleware | Partial | Multiple confirmed integrity/security bugs | Live HTTP against running server | No hanging Node process available for this session |
| API Integration | Contract matrix for delete, stock, accounting, hold | Several match | Systemic `useDeleteApiRequest` mismatch; stock deletes broken | Live payload round-trips | Compared FE callers to BE handlers |
| Database | Query/transaction review in critical paths | N/A (no live DB) | Integrity risks confirmed in code | Schema live validation | No DB credentials exercised |
| Security | Auth, JWT, passwords, SQLi, uploads, SSE | N/A | Critical/High issues confirmed | Penetration testing | Evidence from source only |
| Build/Lint | Attempted `npm run lint` / build | — | — | **Blocked** | Shell tool did not produce reliable command output; do not treat prior numeric lint counts as re-verified here |

---

## 3. Critical and High-Severity Bugs

### BUG-C01 — Systemic delete API contract mismatch
* **Bug ID:** BUG-C01
* **Severity:** CRITICAL
* **Module:** Cross-cutting API / Accounting / Admin / Attribute / Transaction stock / Outward
* **File path:** `ShreeHK_FrontEnd/src/api/ApiFunction.jsx` vs multiple BE delete routes
* **Function/component:** `useDeleteApiRequest`
* **Description:** Frontend issues `DELETE ${url}/${id}`. Most backends register a path **without** `:id` and read `req.query.deleteId`. Correct alternate helper already exists: `useApiDeleteMutation` / entity services use `{ params: { deleteId: id } }`.
* **Evidence:**
  * FE: `api.delete(\`${url}/${id}\`)` in `ApiFunction.jsx` (~L114–116)
  * BE examples: `Advance_payment.js` `/advance-delete` + `req.query.deleteId`; `transactionStockRoutes.js` `/transaction/outward-stock` + `req.query.deleteId`; `attributeRoutes.js`, `AddAdminUser.js`, `portalRoutes.js`, expense/subgroup/group/balance/currency/partywise
* **Affected FE callers (non-exhaustive):** `AdvanceTableData.jsx`, `ExpanseTableData.jsx`, `AccSubgroup.jsx`, `AccGroup.jsx`, `Attribute.jsx`, `ManageUser.jsx`, `FiscalYearAdmin.jsx`, `PartyWiseTransaction.jsx`, `BalanceBook.jsx`, `CurrancyRate.jsx`, `TransactionStockTemplate.jsx`, `OutWord.jsx`
* **Not affected (correct pattern):** Company / Lab / Origin / Shipping / Category via `useEntityDeleteMutation` + services; Role delete uses `DELETE /role-delete/:id` which BE supports; Quick Notes BE accepts both `:id` and `deleteId`
* **Steps to reproduce:** Open Advance/Expense/Attribute/Users/Fiscal Year/Out Memo list → Delete → confirm
* **Expected:** Record deleted, list refreshes
* **Actual:** 404 / 400; delete never reaches intended handler
* **Business impact:** Users cannot remove ledger, master attribute, admin, fiscal year, or stock list rows through normal UI
* **Suggested fix direction:** Change `useDeleteApiRequest` to match `useApiDeleteMutation` (`params: { deleteId: id }`), or dual-support on BE. Prefer one contract project-wide.
* **Confidence:** Confirmed

---

### BUG-C02 — Delete outward stock does not restore product `outward` flags
* **Bug ID:** BUG-C02
* **Severity:** CRITICAL
* **Module:** Transaction stock / Inventory
* **File path:** `ShreeHK_BackEnd/routes/transaction/transactionStockService.js`
* **Function/component:** `deleteOutwardStock`
* **Description:** Deletes `dai_outward` row only. Does not clear `dai_product.outward` / visibility / parent splits. Contrast: `deleteGia` updates products to clear outward.
* **Evidence:** `deleteOutwardStock` (~L988–1002) — `DELETE FROM dai_outward` + audit only
* **Steps to reproduce:** Create out-memo/sale → (if delete API fixed) delete header → inventory still shows stones as memo/sale
* **Expected:** Stones return to available / prior state consistent with business rules
* **Actual:** Orphaned outward flags; stock stuck unsellable/invisible
* **Business impact:** Permanent inventory corruption after “successful” delete
* **Suggested fix direction:** Mirror return/delete-GIA logic: restore products, merge parents if needed, inside a DB transaction
* **Confidence:** Confirmed

---

### BUG-C03 — SQL injection in inventory and report filters
* **Bug ID:** BUG-C03
* **Severity:** CRITICAL
* **Module:** Product inventory / Outward list / Reports
* **File path:** `productRoutes.js`, `outwardRoutes.js`, `reportRoutes.js`
* **Description:** Authenticated request fields interpolated into SQL (`LIKE '%${v}%'`, `ORDER BY ${post.sort}`, `party = ${post.party}`, invoice LIKE strings).
* **Evidence:**
  * `productRoutes.js` shape/overtone loops and `sort` / `sorttype` (~L189–356)
  * `outwardRoutes.js` party/invoice/date (~L78–87)
  * `reportRoutes.js` outstanding filters (~L147–155)
* **Steps to reproduce:** Authenticated call to inventory/list/outstanding with crafted filter values
* **Expected:** Parameterized queries / column allow-lists
* **Actual:** Raw SQL concatenation
* **Business impact:** Data exfiltration, tenant DB compromise, destructive queries (MySQL config dependent)
* **Suggested fix direction:** Bound parameters for all values; whitelist ORDER BY columns and ASC/DESC only
* **Confidence:** Confirmed

---

### BUG-C04 — Hardcoded / fallback JWT signing secret
* **Bug ID:** BUG-C04
* **Severity:** CRITICAL
* **Module:** Authentication
* **File path:** `authMiddleware.js`, `userRoutes.js`, `sessionRoutes.js`, `notificationRoutes.js`, `auditPreSnapshot.js`; `commonRoutes.js` hardcodes secret with **no** env fallback
* **Description:** `process.env.JWT_SECRET || "NitechDigitalServices"` (and hardcode in `commonRoutes.js`)
* **Evidence:** Multiple files use fallback string `"NitechDigitalServices"`
* **Steps to reproduce:** Run API without `JWT_SECRET` → forge JWT with known secret → call authenticated APIs
* **Expected:** Process refuses to start without strong secret
* **Actual:** Known default enables impersonation
* **Business impact:** Full account takeover if env misconfigured or secret leaked from source
* **Suggested fix direction:** Fail closed at boot; rotate secrets; single config module; remove literals from repo
* **Confidence:** Confirmed

---

### BUG-C05 — MD5 password storage / verification
* **Bug ID:** BUG-C05
* **Severity:** CRITICAL
* **Module:** User auth / Admin users / Profile
* **File path:** `routes/user/userRoutes.js` (login), also admin/profile create/update paths using `md5`
* **Description:** `const hash = md5(password)` compared to `user.pass`
* **Evidence:** `userRoutes.js` ~L111–114
* **Expected:** Modern KDF (bcrypt/argon2id) + salt
* **Actual:** Fast unsalted MD5
* **Business impact:** DB leak → mass credential recovery
* **Suggested fix direction:** Migrate hashes; rehash-on-login; lockout + tighter rate limits
* **Confidence:** Confirmed

---

### BUG-C06 — Negative / over-deduct box–parcel stock on partial outward
* **Bug ID:** BUG-C06
* **Severity:** CRITICAL
* **Module:** Outward
* **File path:** `routes/outward/outwardService.js` — `separateSale` / `sendTo`
* **Description:** Subtracts pcs/carat without non-negative floor; validation outside transaction (TOCTOU)
* **Evidence:** `separateSale` (~L232–236) unconditional subtract; `sendTo` validates then `withTransaction` later
* **Steps to reproduce:** Outward more carat/pcs than remaining on box; or concurrent memos on same parent
* **Expected:** Reject oversell; lock rows; re-validate in txn
* **Actual:** Negative balances / double allocation possible
* **Business impact:** Corrupt stock valuations and physical inventory
* **Suggested fix direction:** `SELECT … FOR UPDATE`, re-check qty inside txn, reject if insufficient
* **Confidence:** Confirmed

---

### BUG-C07 — Inward save without transaction + parallel parent updates
* **Bug ID:** BUG-C07
* **Severity:** CRITICAL
* **Module:** Inward
* **File path:** `routes/inward/inwardRoutes.js` — `POST /inward/save`
* **Description:** Header, increment, and product inserts/updates without `START TRANSACTION`; `Promise.all` on lines that bump shared `child_count`
* **Evidence:** Multi-query flow with parallel product handling (~L184–245 region per audit inspection)
* **Steps to reproduce:** Multi-line inward merging into one box; kill connection mid-batch
* **Expected:** All-or-nothing commit
* **Actual:** Partial headers/products; duplicate/skips child SKUs possible
* **Business impact:** Orphan invoices and wrong parent carat/pcs
* **Suggested fix direction:** `helper.runInTransaction` / `withTransaction`; serialize parent updates
* **Confidence:** Confirmed

---

### BUG-H01 — `OutwardEntryForm` ReferenceError after successful submit
* **Bug ID:** BUG-H01
* **Severity:** HIGH
* **Module:** Out Memo / Sale entry
* **File path:** `ShreeHK_FrontEnd/src/pages/transaction/stock/OutwardEntryForm.jsx`
* **Function/component:** `executeSubmit` (~L466–468)
* **Description:** Uses `TRANSACTION_STOCK_KEYS` with no import
* **Evidence:** Import list has no `TRANSACTION_STOCK_KEYS`; usages at L466–468
* **Steps to reproduce:** Submit out-memo/sale form through confirm modal
* **Expected:** Invalidate queries and navigate/toast success
* **Actual:** `ReferenceError: TRANSACTION_STOCK_KEYS is not defined` after API may already have succeeded → stuck UI / duplicate risk
* **Business impact:** Broken post-submit UX; duplicate invoice risk if user retries
* **Suggested fix direction:** Import keys from `transactionStockService`
* **Confidence:** Confirmed

---

### BUG-H02 — `AccPartyReport` crashes on render (`isLoading` undefined)
* **Bug ID:** BUG-H02
* **Severity:** HIGH
* **Module:** Accounting party report
* **File path:** `ShreeHK_FrontEnd/src/pages/accounting/AccPartyReport.jsx`
* **Description:** Declares `isTableLoading` but references `isLoading` at L170, L181, L184
* **Evidence:** L44 vs L170/181/184
* **Steps to reproduce:** Open Acc Party Report page
* **Expected:** Page renders with loading state
* **Actual:** `ReferenceError: isLoading is not defined`
* **Business impact:** Report unusable
* **Suggested fix direction:** Use `isTableLoading` consistently
* **Confidence:** Confirmed

---

### BUG-H03 — `OutWord` print crashes (`setPrintData` undefined)
* **Bug ID:** BUG-H03
* **Severity:** HIGH
* **Module:** Outward list
* **File path:** `ShreeHK_FrontEnd/src/pages/outword/OutWord.jsx`
* **Description:** `handleDirectPrint` calls undeclared `setPrintData`
* **Evidence:** L313–314, print icon L349
* **Steps to reproduce:** Click printer icon on outward row
* **Expected:** Print preview / PDF
* **Actual:** ReferenceError
* **Business impact:** Cannot print from list
* **Suggested fix direction:** Wire print state or call `/transaction/print/:type/:id`
* **Confidence:** Confirmed

---

### BUG-H04 — `outwardMemoToSale` does not bump increment counters
* **Bug ID:** BUG-H04
* **Severity:** HIGH
* **Module:** Memo → Sale
* **File path:** `transactionStockService.js` — `outwardMemoToSale`
* **Description:** Uses `helper.getIncrementEntry` which **only SELECTs** (`helper.js` L60–80). Unlike `outwardService.sendTo`, never `UPDATE dai_incrementid`. Also no surrounding transaction; empty remaining products does not set `close_memo`.
* **Evidence:** L677–678 read IDs; insert sale; L785–788 only updates memo `products`
* **Steps to reproduce:** Convert memo→sale twice in succession
* **Expected:** Unique outbound/invoice numbers; empty memo closed
* **Actual:** Duplicate entry/invoice numbers possible; memo may stay open
* **Business impact:** Invoice collisions and torn memo/sale state
* **Suggested fix direction:** Reuse sendTo increment bump inside a transaction; close empty memos
* **Confidence:** Confirmed

---

### BUG-H05 — Return outward only clears `outward='memo'`
* **Bug ID:** BUG-H05
* **Severity:** HIGH
* **Module:** Out memo return
* **File path:** `transactionStockService.js` — `returnOutwardMemo`
* **Evidence:** `WHERE outward='memo' AND id = ?` (~L630)
* **Steps to reproduce:** Return consign (or other non-memo) stones via return API/UI
* **Expected:** Clear matching outward status
* **Actual:** Header may update while product flag remains
* **Business impact:** Stuck inventory for consign returns
* **Suggested fix direction:** Clear by product id / allow status set matching document type
* **Confidence:** Confirmed

---

### BUG-H06 — `outwardToExport` updates header only
* **Bug ID:** BUG-H06
* **Severity:** HIGH
* **Module:** Outward type conversion
* **File path:** `transactionStockService.js` — `outwardToExport` (~L934–940)
* **Description:** Updates `dai_outward.type/status` only; products keep prior `outward` values
* **Expected:** Product flags align with document type
* **Actual:** Header/product status diverge
* **Business impact:** Filters/lists show inconsistent availability
* **Suggested fix direction:** Update all linked product `outward` values in same transaction
* **Confidence:** Confirmed

---

### BUG-H07 — Inventory filter globals (request cross-talk)
* **Bug ID:** BUG-H07
* **Severity:** HIGH
* **Module:** Product inventory
* **File path:** `productRoutes.js` (~L85–102)
* **Description:** `let pair = (location = sku = … = "")` declares only `pair`; other names become process globals in non-strict mode
* **Expected:** Per-request locals
* **Actual:** Concurrent requests can overwrite shared filter fragments
* **Business impact:** Wrong inventory results under load / multi-tenant bleed in filter SQL
* **Suggested fix direction:** `let location = "", sku = "", …` or single filters object
* **Confidence:** Confirmed

---

### BUG-H08 — Soft RBAC / empty company → all companies
* **Bug ID:** BUG-H08
* **Severity:** HIGH
* **Module:** AuthZ / Tenant
* **File path:** `authMiddleware.js` `enforceApiPermission`; `tenantHelper.js` company allow-list
* **Description:** Global permission middleware soft-fails (`next()` on missing/invalid token). Empty roll.company returns **all** companies from meta DB.
* **Evidence:** `enforceApiPermission` early `next()`; tenant helper “allow all companies” when allowed list empty
* **Expected:** Fail closed; deny empty company ACL
* **Actual:** Auth depends entirely on per-route `authenticateToken`; misconfigured roles get cross-company context
* **Business impact:** Over-privileged tenant access; weaker defense-in-depth
* **Suggested fix direction:** Default-deny unmapped APIs; deny empty company lists; keep per-route auth
* **Confidence:** Confirmed

---

### BUG-H09 — Accounting edit can wipe book/cheque/other_party; weak tenant WHERE
* **Bug ID:** BUG-H09
* **Severity:** HIGH
* **Module:** Accounting expense/advance
* **File path:** `ExpanseTableData.jsx` / `AdvanceTableData.jsx` + `Expanse_Payment.js` / `Advance_payment.js`
* **Description:** List edit forms omit book/cheque/other_party but BE UPDATE sets all columns → blanks. Mutate/delete often `WHERE id = ?` without company; body may override company on advance.
* **Expected:** Partial update or full fields; always scope by company from JWT context
* **Actual:** Silent field wipe; cross-tenant id guess risk
* **Business impact:** Ledger corruption; multi-tenant isolation gap
* **Suggested fix direction:** Partial SQL updates; `AND company = ?` from `buildUserContext`; ignore body company
* **Confidence:** Confirmed

---

### BUG-H10 — JWT in notification SSE query string + stream auth weaker than main
* **Bug ID:** BUG-H10
* **Severity:** HIGH
* **Module:** Notifications
* **File path:** FE `NotificationDropdown.jsx`; BE `notificationRoutes.js` `authenticateStreamToken`
* **Description:** FE builds `/notification/stream?token=…`. BE verifies JWT but skips blacklist / full tenant attach used by `authenticateToken`.
* **Evidence:** FE ~L277; BE stream auth comments/behavior
* **Expected:** Header or short-lived ticket; full revoke semantics
* **Actual:** Token leakage via logs/Referer; revoked tokens may still stream
* **Business impact:** Session theft / lingering access after logout on multi-instance setups
* **Suggested fix direction:** Align with main auth; avoid JWT in URLs
* **Confidence:** Confirmed

---

### BUG-H11 — Hold path non-transactional; holds without expiry never auto-clear
* **Bug ID:** BUG-H11
* **Severity:** HIGH
* **Module:** Inventory hold / reservation
* **File path:** `outwardService.js` `holdProducts` (comment admits no DB txn); `holdCron.js`; FE `ReservationModal.jsx` allows omit date
* **Description:** Partial hold updates possible; `dai_hold` row only when date present → cron never releases
* **Expected:** Atomic hold/unhold; require or default expiry
* **Actual:** Mixed hold flags; permanent holds
* **Business impact:** Stones locked incorrectly for sales
* **Suggested fix direction:** Transactional hold; require expiry or cron-safe default
* **Confidence:** Confirmed

---

### BUG-H12 — `deleteInwardStock` hard-deletes products without outward checks
* **Bug ID:** BUG-H12
* **Severity:** HIGH
* **Module:** Inward stock
* **File path:** `transactionStockService.js` `deleteInwardStock`
* **Description:** Deletes `dai_product` / `dai_product_value` for IDs on inward even if already outward; soft-deletes inward header
* **Expected:** Block delete if stones sold/memo’d (as return path does)
* **Actual:** Can wipe sold inventory history rows
* **Business impact:** Irrecoverable stock/history loss
* **Suggested fix direction:** Guard like `returnInwardMemo`; prefer soft-delete + restore policy
* **Confidence:** Confirmed

---

## 4. Medium and Low-Severity Issues

### BUG-M01 — Auth gate trusts `isAuthenticated` without requiring token
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Files:** `AppRoutes.jsx`, `Auth.Store.jsx`
* **Description:** Protected shell mounts when `isAuthenticated === true` even if `token` null (crafted `localStorage`)
* **Fix:** Require `isAuthenticated && token`; sanitize on rehydrate

### BUG-M02 — Login merges empty permissions with previous store perms
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `Auth.Store.jsx` `login`
* **Description:** Empty `permissions` array falls back to `existingPerms` → over-privilege risk
* **Fix:** Always take API permissions (including `[]`)

### BUG-M03 — Logout/401 does not clear dashboard tabs
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Files:** `Auth.Store.jsx`, `Tabs.Store.jsx` (`tabs-storage` sessionStorage)
* **Fix:** Reset tabs on logout and 401 wipe

### BUG-M04 — Post-login `from` path not ACL-checked
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `Login.jsx`
* **Fix:** `canAccessRoute` before navigate

### BUG-M05 — Permissions never refreshed mid-session
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `Auth.Store.setPermissions` unused
* **Fix:** Refresh on keepalive/profile

### BUG-M06 — Soft-delete inconsistency on accounting tables
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Files:** `Transaction.js` filters `deleted`; expense list / advance-report often do not; deletes are hard DELETE
* **Fix:** Uniform soft-delete filter + UPDATE deleted=1

### BUG-M07 — Expense and Transaction share `acc_transaction` without source discriminator
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Impact:** Expense entries appear in general transaction reports
* **Fix:** `module`/`source` column or separate table

### BUG-M08 — Advance `other_party` sent by FE, ignored by BE
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Files:** `AdvancePayment.jsx` vs `Advance_payment.js` insert columns
* **Fix:** Persist column or remove FE field

### BUG-M09 — Fake pagination (limit/offset ignored) + query key mismatch
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Files:** Advance/Expense tables vs BE list endpoints; cache keys `advanceData` vs `advanceData_page_*`
* **Fix:** Server LIMIT/OFFSET; shared invalidate prefix

### BUG-M10 — TransactionReport Location field not wired
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `TransactionReport.jsx` — Form `name="location"` but search reads `v.company`
* **Fix:** Align field name or map `location` → payload

### BUG-M11 — `/outward/list` uses `moment` without import
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `outwardRoutes.js` date filter
* **Impact:** Runtime `ReferenceError` when `from`/`to` provided
* **Fix:** `require("moment")` or use dayjs/native Date

### BUG-M12 — In-memory JWT blacklist
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `tokenBlacklist.js`
* **Impact:** Logout ineffective across processes/restarts
* **Fix:** Shared store or short-lived tokens

### BUG-M13 — Unauthenticated `/uploads` static + weak profile upload filter
* **Severity:** MEDIUM · **Confidence:** Confirmed / Suspected (XSS via upload)
* **Fix:** Auth/signed URLs; MIME allow-list

### BUG-M14 — Party id vs name inconsistency across accounting UIs
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Fix:** Persist party id; join for display

### BUG-M15 — `balance_amount` not server-computed
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Fix:** Compute/validate on BE

### BUG-M16 — Acc subgroup/group lists not company-scoped
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **Fix:** Tenant column + filter if multi-company

### BUG-M17 — Box/parcel add ignores hold flag
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `boxParcelService.js` `validateSingles`
* **Fix:** Reject `hold == 1`

### BUG-M18 — AI barcode `logger` after `res.json`
* **Severity:** MEDIUM · **Confidence:** Confirmed
* **File:** `aiRoutes.js` L159–164
* **Note:** Response is usually already sent; throw hits catch and may attempt secondary error handling. Not a guaranteed client 500, but unclean and log-unsafe.
* **Fix:** Remove or import logger **before** `res.json`

### BUG-L01 — Legacy stone-detail aliases `alwaysAllow`
* **Severity:** LOW · **Confidence:** Confirmed · `routes.config.jsx`

### BUG-L01b — `normalizeAuthUser` labels null roll as `role: "admin"`
* **Severity:** LOW · **Confidence:** Confirmed · `authUtils.js`

### BUG-L02 — Floating AI chat not gated by page permission
* **Severity:** LOW · **Confidence:** Suspected (FE exposure); BE must enforce

### BUG-L03 — HTTP 201 used for error bodies in some routers
* **Severity:** LOW · **Confidence:** Confirmed
* **Impact:** Axios treats as success

### BUG-L04 — Advance table “Book Type” column bound to Dr/Cr `type`
* **Severity:** LOW · **Confidence:** Confirmed

### BUG-L05 — Login user enumeration messages
* **Severity:** LOW–MEDIUM · **Confidence:** Confirmed · distinct “User not found” vs “Invalid password”

### BUG-L06 — CORS reflects any origin when `NODE_ENV !== "production"`
* **Severity:** LOW (dev) / MEDIUM if mis-set · **Confidence:** Confirmed

### BUG-L07 — Rate limiter optional if require fails; login allow 50/15m
* **Severity:** LOW · **Confidence:** Confirmed

---

## 5. Frontend Findings

### Module inventory (high level)

| Area | Key paths |
| --- | --- |
| Entry / routes | `main.jsx`, `AppRoutes.jsx`, `routes.config.jsx`, `routeAcl.js`, `roleExemptPaths.js` |
| Auth | `Auth.Store.jsx`, `Login.jsx`, `axiosInstance.js`, `useSessionKeepalive.js` |
| Layout / tabs | `LayoutShell.jsx`, `RoleAccessGuard.jsx`, `TabBar.jsx`, `Tabs.Store.jsx` |
| API | `ApiFunction.jsx`, `api/query/useApiMutation.js`, `api/services/*`, `constants/endpoints.js` |
| Inventory | `pages/inventory/*`, hold/reservation modals, inventory hooks |
| Transactions | `pages/transaction/stock/*`, `OutWord.jsx` |
| Accounting | `pages/accounting/*`, reports |
| Admin | ManageUser, roles, fiscal year, activity history |
| Masters | Company/Lab/Origin/Shipping/Category (entity delete OK); Attribute (broken delete) |

### Summary

* Route ACL is UI-level (filtered route registration + RoleAccessGuard for empty-role case). Server must enforce.
* Systemic delete bug dominates functional failures outside migrated master services.
* Several **confirmed** render/submit ReferenceErrors block major workflows (party report, outward print, post-submit invalidate).
* Auth persistence in `localStorage` + SSE query token are elevated session-theft vectors (XSS / logs).

---

## 6. Backend Findings

### Module inventory (high level)

| Area | Key paths |
| --- | --- |
| Boot | `index.js` (CORS, rate limit, audit, routers, optional hold cron) |
| Auth | `authMiddleware.js`, `permissionHelper.js`, `permissionRegistry.js`, `tokenBlacklist.js` |
| DB | `connection.js` pools + tenant ALS |
| Stock | `outwardService.js`, `outwardRoutes.js`, `inwardRoutes.js`, `transactionStockService.js` |
| Product | `productRoutes.js`, box/parcel/label/export services |
| Accounting | `Transaction.js`, `Advance_payment.js`, `Expanse_Payment.js`, subgroup/group, partywise |
| Admin | users, rolls, portal years, activity log, tenant company |
| AI / RapNet / Bulk / Dashboard | mounted under `/`, `/ai`, `/rapnet` |

### Summary

* Most business routers use `authenticateToken`; residual risk is crypto weakness, SQLi on authenticated filters, incomplete stock mutations, soft global RBAC.
* `sendTo` correctly bumps increments inside a transaction; `outwardMemoToSale` does not — inconsistency is a concrete invoice bug.
* Hold and inward paths lack atomicity comparable to newer audited helpers (`runInTransaction`).

---

## 7. API Contract Verification

| Frontend | Backend | Result |
| --- | --- | --- |
| `useDeleteApiRequest` → `DELETE url/id` | Most deletes expect `?deleteId=` | **FAIL** |
| Entity master deletes (`params.deleteId`) | Master delete routes | **PASS** |
| `DELETE /role-delete/:id` | `Roll.js` `:id` | **PASS** |
| Quick notes delete path or query | Dual handlers | **PASS** |
| `POST /outward/sendTo` | `outwardRoutes` + `sendTo` | **PASS** (payload) |
| `POST /outward/hold` + ReservationModal | `holdProducts` | **PASS** (shape); expiry optional → BUG-H11 |
| `POST` memo-to-sale | Route matches | **PASS** route; **FAIL** increment/close logic |
| Stock/outward deletes via `useDeleteApiRequest` | `?deleteId=` | **FAIL** |
| AccPartyReport filters | Transaction party endpoints | Mostly aligned; page crashes before use (BUG-H02) |
| TransactionReport `location` | expects company-like filter | **FAIL** wiring |

---

## 8. Database and Data Integrity Findings

1. **Confirmed:** Outward delete without product restore (BUG-C02).
2. **Confirmed:** Negative stock risk on partial box/parcel outward (BUG-C06).
3. **Confirmed:** Inward / hold / memo-to-sale missing or incomplete transactional boundaries.
4. **Confirmed:** Duplicate invoice risk from non-bumping `getIncrementEntry` in memo-to-sale (BUG-H04).
5. **Confirmed:** Soft-delete / hard-delete inconsistency on accounting ledgers.
6. **Suspected:** Module-level column caches across tenant DBs with divergent schemas.
7. **Suspected:** Concurrent `sendTo` after pre-txn validation (TOCTOU) under load.
8. **Live schema constraints / FK cascades:** Not verified against a running MySQL instance (blocked).

---

## 9. Security Findings

| ID | Severity | Issue | Confidence |
| --- | --- | --- | --- |
| BUG-C03 | Critical | SQL injection (inventory/outward/reports) | Confirmed |
| BUG-C04 | Critical | JWT default/hardcoded secret | Confirmed |
| BUG-C05 | Critical | MD5 passwords | Confirmed |
| BUG-H07 | High | Global filter vars (cross-request) | Confirmed |
| BUG-H08 | High | Soft RBAC + empty company → all | Confirmed |
| BUG-H10 | High | JWT in SSE query + weak stream auth | Confirmed |
| BUG-H09 | High | Accounting updates without company WHERE | Confirmed |
| BUG-M12–M13, L05–L07 | Med/Low | Blacklist, uploads, enumeration, CORS, rate limit | Confirmed |

**Note:** No secrets/tokens/credentials from `.env` are reproduced in this report.

---

## 10. Test Evidence

| Command / method | Scope | Result | Notes |
| --- | --- | --- | --- |
| Static source review | FE+BE modules listed in §1 | Completed | Primary evidence source |
| FE↔BE delete contract trace | `useDeleteApiRequest` callers vs BE | Failed contracts documented | |
| `npm run lint` (FrontEnd) | ESLint | **Blocked** | Shell did not return reliable artifacts in this session |
| `npm run build` (FrontEnd) | Vite production build | **Blocked** | Same |
| `npm test` (BackEnd) | package script | **Would fail by design** | `"Error: no test specified" && exit 1` — no automated suite |
| Live API / browser E2E | Workflows | **Not executed** | No running app/DB session in audit environment |
| Hold cron | `jobs/holdCron.js` | Static only | Requires `ENABLE_HOLD_CRON` + DB |

Static confirmation of symbols that typically fail `no-undef`:
* `TRANSACTION_STOCK_KEYS` in `OutwardEntryForm.jsx`
* `isLoading` in `AccPartyReport.jsx`
* `setPrintData` in `OutWord.jsx`
* `logger` in `aiRoutes.js` (post-response)
* `moment` in `outwardRoutes.js` (date filter path)

---

## 11. Untested Areas

* Live login, company/year switch, and keepalive against a real server
* RapNet live sync, GIA external APIs, real Groq/Gemini keys
* Full master CRUD happy-paths in browser (beyond delete contract)
* Bulk update, label print PDF generation, media proxy under load
* Dashboard KPI correctness vs DB aggregates
* Activity log UI end-to-end with migration-applied meta DB
* Performance / 50+ concurrent stock mutations
* Penetration test beyond static SQLi/auth review
* Automated lint/build counts (blocked this session)
* Remaining frontend pages not listed in completed scope (some reports, categorize, pair, barcode tooling nuances)

---

## 12. Recommended Fix Priority

1. **P0 — Security:** Parameterize inventory/outward/report SQL; require `JWT_SECRET`; plan MD5→bcrypt migration; remove hardcoded secrets.
2. **P0 — Data integrity:** Fix delete outward restore + stock delete query contract; floor/lock box–parcel deductions; transactional inward & memo-to-sale with increment bump.
3. **P0 — Runtime blockers:** `TRANSACTION_STOCK_KEYS`, `isLoading`, `setPrintData`, outward `moment` import.
4. **P1 — Systemic deletes:** Align `useDeleteApiRequest` with `?deleteId=` (one-line fix unblocks many modules).
5. **P1 — Accounting:** Company-scoped WHERE; stop field wipe on edit; soft-delete consistency; AccPartyReport rename.
6. **P2 — Auth UX/hardening:** Token required for gate; permission merge; SSE auth; logout clears tabs; refresh ACL.
7. **P3 — Consistency/quality:** HTTP status codes, party id standardization, pagination, AI logger, React Compiler lint debt.

---

## 13. Final Audit Conclusion

### Confirmed bugs
* Critical: delete contract mismatch; outward delete without stock restore; SQLi; JWT fallback; MD5; negative/partial stock; inward non-atomic save.
* High: multiple FE ReferenceErrors; memo-to-sale increment/close gaps; consign return / to-export product mismatch; inventory globals; soft RBAC/tenant over-allow; accounting wipe/tenant WHERE; SSE token; hold integrity; inward delete without guards.

### Suspected issues
* Column-cache cross-tenant schema drift; AI chat over-exposure if BE miss-enforces; upload-based XSS if non-image stored under `/uploads`.

### Verified passing checks (static)
* Hydration wait in `AppRoutes` before auth routing.
* Many master deletes (Company/Lab/Origin/Shipping/Category) correctly use `deleteId` query params.
* Role delete path-param contract matches BE.
* Quick notes delete dual contract.
* `sendTo` increments IDs inside a transaction (contrast with memo-to-sale).
* ReservationModal payload shape matches hold API.
* Production CORS whitelist path exists when `NODE_ENV === "production"`.

### Blocked tests
* Frontend lint & production build (shell).
* Live HTTP/API/DB/browser E2E.
* Backend automated tests (none implemented).

### Areas requiring further testing
* Full regression of inventory after P0 stock fixes; multi-tenant isolation under concurrent load; RapNet/AI live; accounting balance reconciliation across Transaction vs Expense vs Advance reports.

**This audit does not claim the project is bug-free.** Findings are limited to inspected modules and static/contract evidence. Remaining untested surfaces may contain additional defects.
