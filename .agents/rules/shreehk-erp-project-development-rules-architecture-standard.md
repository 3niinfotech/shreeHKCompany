---
trigger: always_on
---

# ShreeHK ERP — Project Development Rules & Architecture Standard
**(Antigravity ke liye permanent reference — har naye prompt/task ke saath ye rules follow karo)**

> Ye document poore ShreeHK_FrontEnd + ShreeHK_BackEnd project ka "single source of truth" hai. Koi bhi naya feature, bug fix, ya change karte waqt, pehle is document ko check karo ki koi existing reusable component/hook/pattern already available hai ya nahi. **Naya duplicate code kabhi mat banao agar equivalent cheez pehle se exist karti hai.**

---

## 🔴 GOLDEN RULE (Sabse Zaroori)

**Kisi bhi naye component, hook, form, filter, table, modal, ya backend route ko likhne se PEHLE, is document ke matching section ko check karo. Agar similar cheez pehle se hai, to USE karo — naya mat banao.**

Agar koi naya reusable pattern banana zaroori lage (kyunki existing cheez fit nahi ho rahi), to:
1. Pehle user se confirm karo ki naya pattern banana zaroori hai
2. Naya pattern banane ke baad, is document ko bhi update karo (naya entry add karo)

---

## SECTION 1: FRONTEND — REUSABLE COMPONENTS (`src/components/common/`)

**Koi bhi naya UI element banane se pehle ye list check karo:**

| Zaroorat | Use Karo | Path |
|---|---|---|
| Page ka header/title/breadcrumb/actions | `PageHeroHeader` | `src/components/common/PageHeroHeader.jsx` |
| Dynamic form field (text/number/select/date/switch) | `DynamicFormField` | `src/components/common/ui/DynamicFormField.jsx` |
| Master/CRUD listing table | `MasterListTable` (aka `UniversalTable`) | `src/components/common/table/MasterListTable.jsx` |
| Koi bhi modal/popup | `BaseModal` family (`FormModal`, `WarningActionModal`) | `src/components/common/modals/BaseModal.jsx` |
| Filter bar (search + dropdowns + reset) | `GenericFilterBar` / `AdvancedFilterPanel` | `src/components/common/filters/GenericFilterBar.jsx` |
| Bulk import/entry validation review | `ValidationTableModal` | `src/components/common/modals/ValidationTableModal.jsx` |
| Excel export button | `ExportExcelButton` | `src/components/common/ExportExcelButton.jsx` |
| Accounting listing/form (Ledger, Payments) | `AccountingMasterTemplate` | `src/components/common/accounting/AccountingMasterTemplate.jsx` |
| Toast/notification UI | `AppToaster` (root, already mounted) | `src/components/common/AppToaster.jsx` |

**❌ Ye MAT karo:**
- Naya custom modal mat likho — `BaseModal` ko extend karo
- Naya custom table mat likho — `MasterListTable` use karo (unless heavy customization genuinely zaroori ho jaise `DiamondInventoryTable`)
- Naya filter bar component mat banao — `GenericFilterBar` use karo

---

## SECTION 2: FRONTEND — CUSTOM HOOKS (`src/hooks/`, `src/api/query/`)

| Zaroorat | Use Karo | Signature |
|---|---|---|
| Table scroll height dynamically calculate karna | `useTableBodyScrollHeight` | `({ offsetBottom, minHeight }) => number` |
| Form state management (inputs/selects/dates) | `useFormHandleChange` | `(initialState) => [values, handleChange, setValues, reset]` |
| Current logged-in user/role/permissions | `useAuthUser` | `() => { user, role, permissions, companyId, isSuperAdmin }` |
| Diamond inventory actions (Hold/Export/Mail/Label/etc.) | `useInventoryActions` | `({ onSuccess }) => { holdModal, triggerAction, submitExport, ... }` |
| API data fetching (GET/list) | `useApiQuery` | `(queryKey, queryFn, options) => UseQueryResult` |
| API mutation (Create/Update/Delete) | `useApiMutation` | `(mutationFn, options) => UseMutationResult` |
| Search input debounce | `useDebounce` | `(value, delay = 300) => debouncedValue` |
| Clickable SKU link + stone detail modal | `useSkuModalAction` | `() => { SkuLink, openStoneModal, StoneModalComponent }` |

**❌ Ye MAT karo:**
- Inventory ke liye naya action hook mat banao (Hold/Export/Mail/etc.) — `useInventoryActions` mein naya `actionType` add karo agar naya action chahiye
- API calling ke liye naya custom fetch hook mat banao — `useApiQuery`/`useApiMutation` use karo
- Naya debounce/scroll-height logic mat likho — existing hooks use karo

---

## SECTION 3: FRONTEND — FORMS & TRANSACTION ENTRY PATTERN

**Stock/Transaction Entry (Purchase, Sale, Memo, Consign, GIA, Export type ka koi bhi naya transaction):**

❌ **KABHI bhi naya standalone entry page mat banao.**

✅ Iske bajaye:
1. `src/pages/transaction/stock/TransactionStockEntry.jsx` ke `STOCK_ENTRY_CONFIG` object mein naya config entry add karo
2. Underlying engine `InwardEntryForm` (inward flows) ya `OutwardEntryForm` (outward flows) use karo
3. Naye type ke unique fields/logic ko config object ke through pass karo (jaise `outwardType`, `status`, `confirmBeforeSubmit`, `returnPath`)
4. Route ko `<TransactionStockEntry type="NEW_TYPE" />` par point karo

**Reference existing types**: `PURCHASE`, `IN_MEMO`, `SALE`, `OUT_MEMO`, `CONSIGN`, `GIA`, `EXPORT`

**Filters**: Master pages ke liye `GenericFilterBar`/`FilterFormFields` use karo. Complex multi-parameter filters ke liye `AdvancedFilterPanel` use karo.

---

## SECTION 4: FRONTEND — STATE MANAGEMENT

### Zustand Stores (naya global state chahiye ho to pehle check karo)
| Store | Path | Kya Manage Karta Hai |
|---|---|---|
| `AuthStore` | `src/store/Auth.Store.jsx` | User session, token, companyId, fiscal year, permissions |
| `TabsStore` | `src/store/Tabs.Store.jsx` | Multi-tab navigation |
| `UiStore` | `src/store/Ui.Store.jsx` | Theme, sidebar, notifications drawer |

**❌ Naya global store mat banao agar existing store mein fit ho sakta hai.**

### React Query Cache Keys (naya query add karte waqt in existing keys se collide mat karo)
| Query Key Pattern | Domain |
|---|---|
| `["GetProductData", params]` | Diamond Inventory |
| `["MASTER_LIST", entityKey]` | Master Entities |
| `["EXPOSE_PAYMENT_LIST", companyId]` | Expense Payment |
| `["ADVANCE_PAYMENT_LIST", companyId]` | Advance Payment |
| `["TRANSACTION_LEDGER", params]` | Accounting Ledger |
| `["ACTIVITY_LOGS", params]` | Admin Audit History |

**Naye query key banate waqt**: Naming convention follow karo `["DOMAIN_ENTITY", params]` — descriptive aur unique rakho.

---

## SECTION 5: FRONTEND — API / SERVICE LAYER

**STRICT RULES:**
1. **Axios**: Hamesha `src/api/client/axiosInstance.js` se import karo. Koi naya axios instance kabhi mat banao.
2. **Endpoints**: Hamesha `src/api/endpoints.js` se import karo. Koi naya endpoints file mat banao, is file mein add karo.
3. **Toast Notifications**: Hamesha `src/utils/toastNotify.js` se import karo (`toastSuccess`, `toastError`, `toastWarning`, `toastInfo`, `toastApiSuccess`, `toastApiError`).
4. **Naya API service** banate waqt `src/api/services/` folder mein naya file banao (existing pattern follow karo: `productService.js`, `expanseService.js`, etc.) — service function endpoints.js ke endpoints use kare, axiosInstance ke through calls kare.

---

## SECTION 6: BACKEND — MANDATORY 4-LAYER ARCHITECTURE

**Koi bhi NAYA backend route banate waqt, ya koi EXISTING monolithic route ko touch karte waqt, ye 4-layer structure STRICTLY follow karo:**

```
routes/<module>/<name>Routes.js       → SIRF HTTP handling (req parse, validation call, service call, response)
validators/<module>/<name>Validation.js → Input parsing, validation, normalization
services/<module>/<name>Service.js     → Business logic, calculations, audit log triggers
repositories/<module>/<name>Repository.js → Raw SQL queries, parameterized bindings ONLY
```

**Reference / Gold Standard examples** (inhi jaisa naya code likho):
- `routes/accounting/expensePaymentRoutes.js` + `expensePaymentRepository.js` + `expensePaymentValidation.js` + `expensePaymentService.js`
- `routes/accounting/advancePaymentRoutes.js` (same pattern)
- `routes/accounting/Transaction.js` (same pattern)
- `routes/outward/outwardRoutes.js` + `holdRepository.js` + `holdValidation.js` + `outwardService.js`

**❌ KABHI bhi route file ke andar raw SQL query mat likho.** Route sirf request receive kare aur response bheje.

### Mandatory Tenant Isolation
**Har SELECT, UPDATE, DELETE query mein `company = ?` (ya `p.company = ?` joins ke case mein) condition ZAROOR honi chahiye**, `buildUserContext(req).companyId` se liya gaya. Isse missing karne se data leakage ho sakti hai cross-tenant.

### File Naming Convention
Backend route files **camelCase** mein hone chahiye: `expensePaymentRoutes.js`, `advancePaymentRoutes.js` — snake_case ya PascalCase (`Expanse_Payment.js`, `AddAdminUser.js`) avoid karo.

### ⚠️ Abhi Bhi Purane Pattern Mein Hain (Agar Touch Karo To Refactor Karo)
- `routes/accounting/PartyWiseTransaction.js`
- `routes/accounting/accGroupRoutes.js`
- `routes/accounting/accSubgroupRoutes.js`
- `routes/master/categoryRoutes.js`, `companyRoutes.js`, `labRoutes.js`, etc.

**Rule**: Agar in files mein se kisi ko bhi future mein modify karna pade, to modify karte waqt use bhi 4-layer architecture mein convert karo (jaisa Expense/Advance/Transaction ke saath kiya tha) — ek route ek waqt mein, test karke.

---

## SECTION 7: STYLING / DESIGN SYSTEM

- **SCSS Variables**: Hamesha `src/assets/scss/_variables.scss` aur `_design-system.scss` ke tokens use karo — hardcoded hex colors (`#fff`, `#3a3f55`, etc.) mat likho
- **Colors**: `$primary: #1e3a8a`, `$accent: #0284c7`, `$success: #16a34a`, `$danger: #dc2626`, `$warning: #ea580c`
- **Dark Mode**: CSS variables use karo (`--bg-primary`, `--text-primary`, `--border-color`, `--card-bg`)
- **Border Radius**: `$radius-sm: 4px`, `$radius-md: 8px`, `$radius-lg: 12px`
- **Ant Design Theme**: `src/theme/` ke tokens use karo (`colorPrimary: '#1e3a8a'`, `borderRadius: 6`)

**⚠️ Known Issue**: Project mein already 200+ hardcoded hex colors hain. Naya code likhte waqt inhe repeat MAT karo — variables use karo. (Existing hardcoded colors ka cleanup ek separate future task hai.)

---

## 🛠️ NAYA FEATURE BANATE WAQT — CHECKLIST

Antigravity ko har naye task se pehle ye checklist follow karni chahiye:

- [ ] Kya ye UI element already `components/common/` mein exist karta hai? → Use karo
- [ ] Kya ye hook already `hooks/` ya `api/query/` mein exist karta hai? → Use karo
- [ ] Kya ye ek naya stock/transaction entry type hai? → `TransactionStockEntry.jsx` config mein add karo, naya page mat banao
- [ ] Kya ye backend route hai? → 4-layer architecture follow karo (Route → Validator → Service → Repository)
- [ ] Kya query mein tenant isolation (`company = ?`) hai?
- [ ] Kya axios/endpoints/toast standard files se import ho rahe hain (naya instance nahi bana)?
- [ ] Kya naming convention consistent hai (camelCase backend files, existing component naming pattern)?
- [ ] Agar naya reusable pattern banaya, kya is document ko update karna chahiye?

---

## 📌 STRICT BEHAVIORAL RULE (Har Prompt Ke Liye)

**Antigravid, is project mein koi bhi task karte waqt:**
1. Pehle is document ko reference karo
2. Agar existing component/hook/pattern available hai jo zaroorat fulfill karta hai, USE karo — naya mat likho
3. Agar existing working functionality ko touch karna pade, to usse EXACT SAME behavior preserve karte hue hi refactor karo (koi naya unintended behavior change nahi)
4. Koi bhi naya duplicate axios instance, endpoints file, toast utility, ya monolithic backend route mat banao
5. Agar confusion ho ki konsa existing pattern use karna hai, to pehle poocho, khud se assume mat karo