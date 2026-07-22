# Venya PHP → Node/React Migration Map

## Glossary

| Term | Meaning |
|------|---------|
| **venya/** | Legacy PHP DAI ERP source (~2,900 app files). Authoritative business-rule reference. |
| **`company` table** | Tenant / legal entity (e.g. Shree International (HK) Ltd). |
| **`dai_party`** | Business parties (customers/vendors), scoped by `dai_party.company`. |
| **`company_year`** | Fiscal year metadata + `db_name` for per-year MySQL database. |
| **`roll.company`** | JSON array of tenant `company.id` values — user ACL for context switch. |

## PHP → Node file mapping

| Legacy PHP | Node/React |
|------------|------------|
| `venya/controller/user/login.php` | `backend/routes/user/userRoutes.js` |
| `venya/checkResource.php` | `backend/authMiddleware.js`, `backend/permissionHelper.js`, `backend/tenantHelper.js` |
| `venya/dai/setSession.php` | `backend/routes/session/sessionRoutes.js` → `POST /session/context` |
| `venya/dai/checkSession.php` | `backend/routes/session/sessionRoutes.js` → `GET /session/keepalive` |
| `venya/dashboard.php` | `frontEnd/src/components/layout/CompanyYearPicker.jsx` + `backend/routes/portal/portalRoutes.js` |
| `venya/company.php`, `newCompany.php`, `saveCompany.php` | `backend/routes/admin/tenantCompanyRoutes.js`, `frontEnd/src/pages/admin/TenantCompanyList.jsx` |
| `venya/roll.php`, `newRoll.php`, `saveRoll.php` | `backend/routes/adminUser/Roll.js`, `frontEnd/src/pages/admin/AdvancedRollPage.jsx` |
| `venya/user.php` | `backend/routes/adminUser/AddAdminUser.js`, `frontEnd/src/pages/admin/ManageUser.jsx` |
| `venya/saveYear.php` | Partial: `backend/routes/portal/portalRoutes.js` (metadata only; DB clone manual) |
| `venya/dai/Helper.php` | `backend/helper.js` |
| `venya/dai/module/inventory/inventoryModel.php` | `backend/routes/product/productRoutes.js` + inventory services |
| `venya/dai/module/inward/inwardModel.php` | `backend/routes/inward/inwardRoutes.js` |
| `venya/dai/module/outward/outwardModel.php` | `backend/routes/outward/outwardService.js`, `outwardRoutes.js` |
| `venya/dai/module/party/partyModel.php` | `backend/routes/master/companyRoutes.js` (`dai_party`) |
| `venya/dai/module/bulk/bulkModel.php` | `backend/routes/bulk/bulkModel.js` |
| `venya/dai/module/report/reportHelper.php` | `backend/routes/report/reportService.js` |
| `venya/holdcron.php` | `backend/jobs/holdCron.js` |
| `venya/database.php` | `backend/connection.js` (pools + `getPoolForDb`) |
| Master company (party) UI | `frontEnd/src/pages/master/Company/` |

## API contracts (multi-company)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/tenant-company` | List tenants (`company` table) |
| GET | `/admin/tenant-company/:id` | Tenant detail |
| POST | `/admin/tenant-company/save` | Create/update tenant + seed `dai_incrementid` on insert |
| GET | `/admin/tenant-company/options` | Id/name for role company checkboxes |
| GET | `/portal/company-years` | Company × year tiles (ACL-filtered) |
| POST | `/session/context` | Switch JWT `companyId`, `yearId`, `dbName` |
| GET | `/session/keepalive` | `s0` / `s1` / `s2` session parity |

## Tenant isolation architecture

1. **JWT context:** `companyId`, `yearId`, `dbName`
2. **DB switching:** `connection.getPoolForDb(dbName)` via `middleware/tenantContext.js` + AsyncLocalStorage
3. **Row filter:** `WHERE company = ?` on `dai_*` tables using `req.companyId` / `buildUserContext(req)`
4. **ACL:** `roll.company` JSON checked in `tenantHelper.userCanAccessCompany`

## Isolation checklist (key tables)

| Table | Filter by `company` | Status |
|-------|---------------------|--------|
| `dai_product` | Yes | Audited in product/inventory routes |
| `dai_inward` | Yes | `inwardRoutes.js` |
| `dai_outward` | Yes | `outwardService.js`, reports |
| `dai_party` | Yes | `companyRoutes.js` |
| `dai_attribute` | Yes | `attributeRoutes.js` |
| `dai_incrementid` | Yes | `commonRoutes.js`, `helper.getIncrementEntry` |
| `dai_history` / tracks | Yes | `helper.addHistory`, `addUserTrack` defaults |
| `company` | Meta DB (catalog) | `tenantCompanyRoutes.js` |
| `roll`, `user` | Meta DB | Admin routes |

## Out of scope

Per `backend/config/legacyApps.js`:

- EMS (`venya/ems/`)
- SMS (`venya/sms/`)
- Jewelry (`venya/dai/module/jewelry/`)

## Manual test checklist

### Multi-company isolation

1. Login as super-admin → **Admin → Company** → create Company B
2. **Admin → Roll** → assign Company B checkbox to a test role → assign role to test user
3. Log in as test user → pick Company B + fiscal year in context picker
4. Verify empty lists on inventory, inward, outward, party master, reports
5. Create one record in Company B → switch to Company A → record must not appear
6. Open two tabs with different company context → keepalive returns `s2` on mismatch

### Regression

7. Company A existing data unchanged after migration
8. Party master (`/master/company-details`) still CRUD on `dai_party`, scoped to active company

### Fiscal year DB

9. Switch year → API uses `company_year.db_name` from JWT
10. `GET /common/getIncrement` returns row for active `companyId`

### Lint

11. `cd frontEnd && npm run lint`

## New company provisioning note

PHP `saveCompany.php` creates the `company` row and `dai_incrementid` seeds in the catalog DB. A **new empty fiscal-year database** still requires legacy `saveYear.php` workflow (or manual DB clone + `company_year` row) before transactional data entry in that year DB.
