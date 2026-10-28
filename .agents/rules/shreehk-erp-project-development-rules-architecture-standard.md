---
trigger: always_on
---

# ShreeHK ERP — Always Follow (Permanent Reference)

Applies to: `ShreeHK_FrontEnd` + `ShreeHK_BackEnd`.

Before doing ANY task in this repository, you MUST:

1. Read `AI_RULES.md` in the repo root and follow it strictly.
2. Read the relevant parts of `ARCHITECTURE.md`, `STYLE_GUIDE.md` and `API_REFERENCE.md`.
3. Inspect the existing related files first. Never assume.
4. Give a short plan (files, reasons, reuse, risks) BEFORE writing code.
5. Do not change existing working logic, UI, theme or folder structure unless explicitly asked.
6. Reuse existing components, hooks, services. Do not add packages without permission.
7. After finishing, report changed files, rationale and impact.

If anything is unclear or conflicts with these rules, ask the user first.

---

## 🔴 DO-NOT-TOUCH LIST (Permission Required)

- **Backend Core**: `connection.js`, `tenantHelper.js`, `authMiddleware.js`, `permissionHelper.js`, `config/permissionRegistry.js`, `middleware/audit*`, `tenantContext.js`, `tokenBlacklist.js`
- **Frontend Core**: `src/api/client/axiosInstance.js`, `src/store/Auth.Store.jsx`, `Tabs.Store.jsx`, `Ui.Store.jsx`, `src/routes/AppRoutes.jsx`, `routes.config.jsx`, `src/theme/colors.ts`, `applyTheme.ts`, `antdTheme.ts`
- **Env**: `.env` files (never modify or output values)
- **Dead/Scratch folders**: `src/constants/`, `src/services/`, `routes/addTask/`, `routes/hold_status/`, `_diag*.js`

---

## 🛠️ MANDATORY REUSE DIRECTORY

| Requirement | Use Existing File |
|---|---|
| Master table | `src/components/common/table/MasterListTable.jsx` |
| Form modal / popup | `src/components/common/modals/BaseModal.jsx` (`FormModal`, `WarningActionModal`) |
| Form inputs | `src/components/common/ui/DynamicFormField.jsx` |
| Filter bar | `src/components/common/filters/GenericFilterBar.jsx` |
| Page header | `src/components/common/PageHeroHeader.jsx` |
| Excel export | `src/components/common/ExportExcelButton.jsx` |
| Stock entry | `STOCK_ENTRY_CONFIG` in `src/pages/transaction/stock/TransactionStockEntry.jsx` |
| Toast notification | `src/utils/toastNotify.js` |
| Axios client | `src/api/client/axiosInstance.js` |
| Endpoints | `src/api/endpoints.js` |
| Dynamic scroll height | `src/hooks/useTableBodyScrollHeight.js` |
| SKU modal | `src/hooks/useSkuModalAction.jsx` |
| Backend layering | 4-layer: `routes/` -> `validators/` -> `services/` -> `repositories/` |
| Backend query isolation | `company = ?` (mandatory tenant filter) |