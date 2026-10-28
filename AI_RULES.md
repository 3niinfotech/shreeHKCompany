# AI Rules — ShreeHK ERP

Applies to: `ShreeHK_FrontEnd` + `ShreeHK_BackEnd`.  
Before ANY task, read this file, then read the relevant sections of  
`ARCHITECTURE.md`, `STYLE_GUIDE.md`, `API_REFERENCE.md` (all in repo root).  
Do NOT read or follow files inside docs/_archive/. They are outdated.

---

## 1. Golden Rules (mandatory)

1. **Read first, never assume.** Before writing code, read the related existing
   files fully. Check what already exists and what is missing.
2. **Plan before code.** Give a short plan first: files to create/modify, why,
   which existing components/hooks/services will be reused, and any risk.
   Wait for approval on non-trivial changes.
3. **Do not touch working code or UI.** Existing logic, UI, layout, styling and
   behavior must not change unless the user explicitly asks. No unrequested
   cleanup, refactor, renaming, formatting or "improvements".
4. **Minimal change.** Change only what was asked. Smallest possible diff.
5. **Reuse, zero duplication.** Use existing components, hooks, utils, services.
   Create new ones only if no existing one can do the job.
6. **Ask when unclear.** If the request is ambiguous or conflicts with existing
   structure/schema, ask before coding.
7. **No new packages** without explicit user permission.
8. **Follow the pattern of the file you are editing.** Match its naming, import
   order, state handling and style, even if it is not the "ideal" pattern.

---

## 2. Do-Not-Touch (edit only with explicit permission)

**Backend:**
- `connection.js`, `tenantHelper.js`, `authMiddleware.js`, `permissionHelper.js`
- `config/permissionRegistry.js`
- `middleware/auditContext.js`, `auditPreSnapshot.js`, `auditHttpLogger.js`,
  `tenantContext.js`, `tokenBlacklist.js`

**Frontend:**
- `src/api/client/axiosInstance.js`
- `src/store/Auth.Store.jsx`, `Tabs.Store.jsx`, `Ui.Store.jsx`
- `src/routes/AppRoutes.jsx`, `routes.config.jsx` (only ADD a new route entry
  when a new page is requested; never modify existing entries)
- `src/theme/colors.ts`, `applyTheme.ts`, `antdTheme.ts`
- `.env` files: never edit, never print values.

**Legacy / Scratch Folders:**
- `ShreeHK_FrontEnd/src/constants/`, `src/services/` (empty folders)
- `routes/addTask/`, `routes/hold_status/` (empty legacy backend folders)
- Root diagnostic scripts (`_diag*.js`)

---

## 3. Frontend Rules

### 3.1 Reuse checklist (`src/components/common/`)
| Need | Use | Path |
|---|---|---|
| Page header | `PageHeroHeader` | `src/components/common/PageHeroHeader.jsx` |
| Master listing table | `MasterListTable` | `src/components/common/table/MasterListTable.jsx` |
| Modals | `BaseModal`, `FormModal`, `WarningActionModal` | `src/components/common/modals/BaseModal.jsx` |
| Form fields | `DynamicFormField` | `src/components/common/ui/DynamicFormField.jsx` |
| Filters | `GenericFilterBar`, `AdvancedFilterPanel` | `src/components/common/filters/GenericFilterBar.jsx` |
| Excel export | `ExportExcelButton` | `src/components/common/ExportExcelButton.jsx` |
| Bulk review modal | `ValidationTableModal` | `src/components/common/modals/ValidationTableModal.jsx` |
| Master page layout | `MasterPageTemplate` | `src/components/common/masterCommon/MasterPageTemplate.jsx` |
| Accounting page layout | `AccountingMasterTemplate` | `src/components/common/accounting/AccountingMasterTemplate.jsx` |
| Toasts | `src/utils/toastNotify.js` only | `src/utils/toastNotify.js` |

### 3.2 Hooks (`src/hooks/`)
`useTableBodyScrollHeight`, `useFormHandleChange`, `useAuthUser`,
`useSkuModalAction`, `useInventoryActions`, `useDebounce`.  
*Table pages must use `useTableBodyScrollHeight` for dynamic viewport calculations.*

### 3.3 API layer
- Always use `api` from `src/api/client/axiosInstance.js`. Never create a new axios instance.
- Add endpoints only in `src/api/endpoints.js` (inside the right category).
- Domain functions go in `src/api/services/<module>Service.js`.
- **Two patterns exist (migration incomplete):**
  - Old: `src/api/ApiFunction.jsx` (`useFetchApi`, `usePostApiRequest`)
  - New: `src/api/query/` (`useApiQuery`, `useApiMutation`)
  - Rule: when editing an existing file, keep the pattern it already uses.
    For brand-new files use `useApiQuery` / `useApiMutation`.
    Never migrate old files to the new pattern unless asked.

### 3.4 Stock transaction pages (critical)
Never create a standalone entry page for Purchase, Sale, In/Out Memo, GIA,
Consign, Export. Add a config entry in `STOCK_ENTRY_CONFIG` inside
`src/pages/transaction/stock/TransactionStockEntry.jsx` and use
`InwardEntryForm` / `OutwardEntryForm` / `TransactionStockTemplate`.

### 3.5 State
Only 3 Zustand stores exist: `useAuthStore`, `useTabsStore`, `useUIStore`.
Do not create new global stores without permission. Use local state or React Query otherwise.

### 3.6 Styling
- Use tokens from `src/assets/scss/_variables.scss` or `var(--color-*)`.
- No hardcoded hex colors in NEW code. Do not "fix" existing hex colors in old files.
- Do not add new CSS frameworks or UI libraries (Ant Design + SCSS only).
- Control height 32px, input radius 4px, card radius 12px, no focus glow rings.
- Follow `STYLE_GUIDE.md` for exact values. Support dark mode via CSS variables.

---

## 4. Backend Rules

### 4.1 Layering
- **Brand-new modules:** 4 layers: `routes/` -> `validators/` -> `services/` -> `repositories/`
  (reference: `expensePaymentRoutes.js` chain).
- **Existing monolithic modules** (`master`, `inward`, `report`, `product`):
  edit in place with minimal change. Do NOT split or refactor into layers unless asked.
- Naming: camelCase files (`companyTransferService.js`).

### 4.2 Tenant isolation (never skip)
- Use `connection.getActivePool()` for tenant queries, `connection.getMetaPool()` for meta tables
  (`user`, `roll`, `branch`, `company_year`, `dai_activity_log`).
- Every SELECT/UPDATE/DELETE on tenant tables must include `company = ?`.
- Parameterized SQL only (`?`). Never concatenate user input into SQL.

### 4.3 Response format
Success: `{ "status": true, "message": "...", "data": ... }`  
Error: `{ "status": false, "message": "..." }`  
Some legacy routes return `"Data"` (capital). Keep legacy routes as they are.

### 4.4 New routes
Register in `index.js` following the existing order and add permission mapping in
`config/permissionRegistry.js` (ask user first since it is a do-not-touch file).
Audit middleware runs automatically on mutations; do not bypass it.

---

## 5. Security Rules
- Never write new hardcoded secrets, tokens, API keys or passwords in code. Use `.env`.
- Never print or commit `.env` contents.
- Do not copy the existing fallback secret pattern (`JWT_SECRET` fallback) into new files.

---

## 6. Language & Text
- Keep UI text language the same as existing screens (do not translate or reword existing labels).
- Match the existing spelling used in code (e.g. `expanse`, `OutWord`, `Roll`) for existing
  routes/files. Do not "correct" them.
- Never correct spelling of existing DB columns, routes or file names (see Legacy Database Quirks in ARCHITECTURE.md).

---

## 7. After Every Task, Report
1. Files created/changed (with paths)
2. Why each change was made
3. Impact on existing features (should be "none" unless requested)
4. How the user can test it in the UI

---

## 8. If a Rule Conflicts With the Request
Stop and ask the user. Never silently break a rule.
