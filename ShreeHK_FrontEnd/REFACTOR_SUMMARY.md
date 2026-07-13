# Frontend refactor summary (foundation-first)

## Files changed

| File / area | Reason |
|-------------|--------|
| `src/api/axiosInstance.js`, `src/api/Axios.jsx`, `src/api/endpoints.js`, `src/api/index.js` | Central HTTP client; re-export from `Axios.jsx` |
| `src/constants/endpoints.js` | Single source for API paths + `QUERY_KEYS` |
| `src/api/services/*.js` | Domain API functions (company, masters, inward, outward, accounting, etc.) |
| `src/api/ApiFunction.jsx` | Import `api` from `axiosInstance` |
| `src/components/common/modals/BaseModal.jsx` | Extracted modal shell (was `GlobalTableFormsModal`) |
| `src/hooks/GlobalTableFormsModal.jsx` | Re-export `BaseModal` (backward compatible) |
| `src/components/common/table/MasterListTable.jsx` | Extracted master list UI from `MasterPageTemplate` |
| `src/components/common/masterCommon/MasterPageTemplate.jsx` | Composes `MasterListTable` + `BaseModal` |
| `src/components/common/masterCommon/MasterFormAddModal.jsx`, `MasterFormEditModal.jsx` | Shared add/edit form modals for migrated masters |
| `src/components/common/accounting/AccountingMasterTemplate.jsx` | Moved from `hooks/`; uses `BaseModal` |
| `src/hooks/api/*`, `src/hooks/common/*` | `useEntityList`, mutations, `useModal`, `useDebounce` |
| `src/utils/masterColumns.js` | Shared "No" column helper |
| `src/pages/master/{Company,Origin,Lab,Shipping,Category}/index.jsx` | Thin composers + entity services |
| `src/pages/master/{Company,Origin,...}.jsx` | Re-export `./Entity/index` |
| `src/components/pages/{Company,Origin,Lab,Shipping,Category}/*` | Per-page columns, mappers, excel (Company) |
| All API-consuming pages under `src/pages/` | `ENDPOINTS.*` instead of inline URL strings |

## New shared files

| File | Contains | Used by |
|------|----------|---------|
| `constants/endpoints.js` | `ENDPOINTS`, `QUERY_KEYS` | Services + pages |
| `api/services/*Service.js` | Imperative GET/POST/DELETE | Migrated masters; available for all domains |
| `components/common/modals/BaseModal.jsx` | Modal shell | `MasterPageTemplate`, form modals, `GlobalTableFormsModal` alias |
| `components/common/table/MasterListTable.jsx` | Master table card + search + actions | Migrated masters, `MasterPageTemplate` |
| `hooks/api/useEntityList.js` | React Query list wrapper | Company, Origin, Lab, Shipping, Category |
| `hooks/api/useEntityMutation.js` | Post/delete + invalidate + toast | Same |
| `hooks/common/useModal.js` | Modal open/close state | Migrated masters |
| `utils/masterColumns.js` | Row number column | Simple masters |

## Files left unchanged (by design)

| File | Reason |
|------|--------|
| `store/Auth.Store.jsx`, `store/Ui.Store.jsx` | Auth/permissions; no behavior change requested |
| `pages/inventory/MasterTableTemplate.jsx` | Inventory-specific; not in master migration batch |
| Mock-only pages (Dashboard, Setting, some reports) | No API layer to extract |
| `hooks/DynamicFormField.jsx` | Stable shared form renderer; optional move deferred |
| Backend | Out of scope |

## Pages fully migrated (`components/pages/` + `index.jsx`)

- Company (scroll load, Excel, row selection)
- Origin, Lab, Shipping, Category

## Pages using `ENDPOINTS` + services (structure unchanged)

- Login, inward (×4), StoneUpdate, DiamondInventoryTable, OutWord, accounting, reports, admin, MyAccount, RapNet, BulkUpdate, ManageUser

## Issues flagged (not fixed)

- Company `DELETE` uses `deleteId`; backend may expect `id` on `/company/delete`
- `PartyWiseTransaction` delete may pass custom URL to `mutate` — hook ignores it
- `OutWord.jsx` may call `useFetchApi` inside an event handler (Rules of Hooks)
- `StoneUpdate` third argument to `usePostApiRequest` is ignored by hook
- Master search inputs still not wired to API (pre-existing)
- `api/Users.Api.jsx` + `providers/Users.Query.jsx` unused by pages

## Verify manually

```bash
cd frontEnd && npm run lint && npm run build
```

Then: login → Company / Origin / Lab / Shipping / Category CRUD → spot-check Outward, Inward, Inventory list.
