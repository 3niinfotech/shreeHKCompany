# ShreeHK ERP — System Architecture & Codebase Map

> Comprehensive architecture specification, folder structure, database design, and feature-to-file mapping for ShreeHK ERP.

---

## 1. System Overview & Tech Stack

ShreeHK ERP is a full-featured enterprise diamond manufacturing, inventory management, multi-branch trading, and double-entry accounting platform.

```
┌─────────────────────────────────────────────────────────────┐
│             ShreeHK_FrontEnd (React 19 + Vite)              │
│  - Ant Design 6.3  - TanStack Query 5.90  - Zustand 5.0     │
│  - SCSS Design System  - Multi-tab UI  - Sonner Toaster     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / SSE (Port 3500)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               ShreeHK_BackEnd (Node + Express)              │
│  - 4-Layer Architecture (Route/Validator/Service/Repository)│
│  - JWT Auth + Dynamic Role ACL (65+ Permission Keys)        │
│  - Automated Audit Trail Middleware (dai_activity_log)      │
│  - Multi-tenant Connection Pooling (AsyncLocalStorage)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Parameterized SQL queries
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 MySQL Multi-Tenant Storage                  │
│  - Meta Database: Users, Branches, Companies, Fiscal Years  │
│  - Tenant Databases: dai_product, inward, outward, ledger   │
└─────────────────────────────────────────────────────────────┘
```

### Exact Technology Versions & Libraries

#### Frontend (`ShreeHK_FrontEnd/package.json`)
| Package | Version | Purpose |
|---|---|---|
| `react` / `react-dom` | `^19.2.0` | Core UI framework with React 19 compiler |
| `vite` | `^7.3.1` | Next-generation frontend bundler & dev server |
| `antd` | `^6.3.0` | Enterprise UI components (Tables, Inputs, Modals, DatePickers) |
| `react-router-dom` | `^7.13.0` | Client-side routing with lazy route resolution |
| `@tanstack/react-query`| `^5.90.21` | Server state caching, background sync, pagination |
| `zustand` | `^5.0.11` | Client state management (Auth, Multi-Tabs, UI theme) |
| `sass-embedded` | `^1.97.3` | High-performance Dart Sass compiler for SCSS tokens |
| `axios` | `^1.13.5` | HTTP client with multi-tenant interceptors |
| `sonner` | `^2.0.7` | Modern toast notifications system |
| `lucide-react` | `^0.575.0` | Consistent vector iconography |
| `recharts` | `^2.15.3` | Dashboard financial and inventory analytics charts |
| `dayjs` | `^1.11.19` | Date parsing, manipulation and formatting |
| `exceljs` / `xlsx-js-style` | `^4.4.0` / `^1.2.0` | Excel spreadsheet generation, styling and exports |
| `@radix-ui/react-select`| `^2.3.3` | Accessible dropdown primitives |

#### Backend (`ShreeHK_BackEnd/package.json`)
| Package | Version | Purpose |
|---|---|---|
| `express` | `^4.19.2` | Core HTTP server framework |
| `mysql` | `^2.18.1` | Native MySQL driver with dynamic pooling |
| `jsonwebtoken` | `^9.0.2` | Stateless authentication tokens (JWT) |
| `bcryptjs` | `^3.0.3` | Salted password hashing |
| `express-rate-limit` | `^7.5.1` | Brute force prevention (Login: 50/15m, Global API: 300/m) |
| `multer` | `^2.1.1` | Multipart file upload handling (Logos, certificates) |
| `xlsx` (SheetJS) | `^0.18.5` | Excel parsing and data importing engine |
| `pdfkit` | `^0.17.1` | Server-side PDF generation for reports |
| `nodemailer` | `^6.9.16` | Transactional email delivery with SMTP |
| `@google/generative-ai` | `^0.24.0` | Gemini LLM & Vision for diamond certificate OCR & chat |
| `groq-sdk` | `^0.37.0` | High-speed LLM provider for natural language queries |
| `nodemon` | `^3.1.14` | Development auto-restart utility |

---

## 2. Directory Structure & File Organization

### 2.1 Backend Folder Structure (`ShreeHK_BackEnd/`)
```
ShreeHK_BackEnd/
├── index.js                     # Server entry point, middleware chain & route registration
├── connection.js                # Dynamic MySQL connection pools & AsyncLocalStorage
├── authMiddleware.js            # JWT verification & API permission enforcement
├── permissionHelper.js          # Permission matrix matching & caching
├── tenantHelper.js              # Tenant database resolution & company access checks
├── helper.js                    # Query helper, escape utilities, history logger
├── productHelper.js             # Diamond stock calculation helpers
├── schemaHelper.js              # Dynamic schema inspection & company column injector
├── .env                         # Environment variables configuration
├── config/                      # System configuration registries
│   ├── permissionRegistry.js    # 65+ page permissions with URL prefix matching
│   ├── auditSnapshotRegistry.js # 47 snapshot rules for entity mutation diffing
│   └── legacyApps.js            # Out-of-scope legacy ERP modules registry
├── middleware/                  # Request lifecycle interceptors
│   ├── auditContext.js          # Injects user/session context into AsyncLocalStorage
│   ├── auditPreSnapshot.js      # Captures database state BEFORE mutation executes
│   ├── auditHttpLogger.js       # Captures response & diffs changes for dai_activity_log
│   ├── tenantContext.js         # Attaches active tenant database pool to request
│   └── tokenBlacklist.js        # In-memory JTI revocation cache
├── routes/                      # Route definitions (HTTP layer)
│   ├── accounting/              # Ledger, Expense, Advance, Groups
│   ├── admin/                   # Activity history, Branch, Tenant Company
│   ├── adminUser/               # User management, Role matrix
│   ├── ai/                      # AI assistant, certificate OCR, inventory query
│   ├── bulk/                    # Excel bulk stone update engine
│   ├── common/                  # Auto-increment generator, SSE notifications
│   ├── dashboard/               # Executive dashboard KPIs & quick notes
│   ├── integration/             # External platforms (RapNet, GIA, website sync)
│   ├── inward/                  # Purchase & Memo stone inward entry
│   ├── lab/                     # GIA/IGI online certificate fetch & cache
│   ├── master/                  # Company, Lab, Origin, Shipping, Category, Attribute
│   ├── media/                   # Stone video/image reverse proxy
│   ├── my_Balance/              # Cash/Bank balance book & Currency rates
│   ├── my_Profile/              # User settings & password change
│   ├── outward/                 # Sales, Memo, Consignment, Hold, Return
│   ├── portal/                  # Multi-tenant branch/company/year switcher
│   ├── product/                 # Inventory stock, barcode, box/parcel, labels
│   ├── rapnet/                  # Live Rapaport price sheets & synchronization
│   ├── report/                  # Outstanding, stone history, transaction logs
│   ├── session/                 # Session keep-alive & user context handshake
│   ├── transaction/             # Stock transaction lists & company transfers
│   └── user/                    # Authentication login & logout
├── validators/                  # Input validation schemas (accounting, lab, transaction)
├── services/                    # Business logic & transaction orchestration
├── repositories/                # Direct SQL execution & parameterized queries
├── jobs/                        # Scheduled cron workers (holdCron.js for auto-release)
├── migrations/                  # Database migration SQL scripts
└── scripts/                     # Maintenance, migration runners & schema bootstraps
```

### 2.2 Frontend Folder Structure (`ShreeHK_FrontEnd/`)
```
ShreeHK_FrontEnd/
├── index.html                   # HTML5 shell
├── vite.config.js               # Vite configuration with React compiler plugin
├── package.json                 # Dependencies and build scripts
└── src/
    ├── main.jsx                 # Client entry point: StrictMode, QueryProvider, Theme
    ├── App.css / index.scss     # Root style entry imports
    ├── api/                     # Network communication layer
    │   ├── client/
    │   │   └── axiosInstance.js # Central Axios instance with multi-tenant headers
    │   ├── endpoints.js         # Central registry of all backend API endpoints
    │   ├── query/
    │   │   ├── useApiQuery.js   # TanStack Query GET wrapper
    │   │   └── useApiMutation.js# TanStack Query POST/PUT/DELETE wrapper
    │   └── services/            # Domain-specific API callers (24 modules)
    ├── assets/scss/             # Global SCSS stylesheets & component styles
    │   ├── _variables.scss      # SCSS variable aliases mapped to CSS variables
    │   ├── _design-system.scss  # Ant Design token overrides & component sizing
    │   ├── _dark-theme.scss     # Dark mode custom properties
    │   ├── _modals-popups.scss  # BaseModal & dialog styling
    │   ├── _table-layout.scss   # Grid & table sizing utilities
    │   └── _toast.scss          # Sonner toast visual styling
    ├── components/              # Modular UI components
    │   ├── common/              # REUSABLE foundational components
    │   │   ├── PageHeroHeader.jsx # Breadcrumb & title banner
    │   │   ├── AppToaster.jsx     # Global toast container
    │   │   ├── ExportExcelButton.jsx
    │   │   ├── accounting/        # AccountingMasterTemplate
    │   │   ├── filters/           # GenericFilterBar, AdvancedFilterPanel
    │   │   ├── masterCommon/      # MasterPageTemplate, Master modals
    │   │   ├── modals/            # BaseModal, FormModal, WarningActionModal
    │   │   ├── skeleton/          # PageSkeleton, table skeleton hooks
    │   │   ├── table/             # MasterListTable (Universal Table)
    │   │   └── ui/                # DynamicFormField
    │   ├── layout/              # Application layout chrome
    │   │   ├── LayoutShell.jsx    # Main wrapper (Header, Sidebar, TabBar)
    │   │   ├── Header.jsx         # App bar with company/branch context
    │   │   ├── TabBar.jsx         # Multi-tab persistent navigation
    │   │   └── CompanyYearPicker.jsx # Modal for switching company/year/branch
    │   └── ...                  # Feature-specific subcomponents (inventory, ai, etc.)
    ├── hooks/                   # Custom React hooks
    │   ├── useAuthUser.js       # Current user, companyId, permissions
    │   ├── useTableBodyScrollHeight.js # Auto-fit table height to viewport
    │   ├── useFormHandleChange.jsx     # Form state helper
    │   ├── useSkuModalAction.jsx       # Interactive SKU link & detail modal
    │   ├── useInventoryActions.js      # Hold, Mail, Export, Label trigger
    │   └── useDebounce.js              # Debounce utility
    ├── pages/                   # Application views / screens
    │   ├── DashBoard.jsx        # Executive dashboard
    │   ├── TaskManager.jsx      # Task & reminder management
    │   ├── auth/                # Login page
    │   ├── master/              # Party, Shipping, Origin, Lab, Category, Attributes
    │   ├── inventory/           # DiamondInventoryTable, OnHandStock, Barcode
    │   ├── transaction/         # Inward, Outward, Stock Entries, Company Transfer
    │   ├── accounting/          # Expense, Advance, Ledger, Party Reports, Groups
    │   ├── reports/             # Outstanding, Stone History, Sales Reports
    │   └── admin/               # Role matrix, User management, Activity logs
    ├── providers/               # Context providers (QueryClientProvider)
    ├── routes/                  # Routing system
    │   ├── AppRoutes.jsx        # Central route switcher & authentication guard
    │   ├── routes.config.jsx    # Complete lazy-loaded route declarations & permissions
    │   ├── routeAcl.js          # Permission check logic
    │   └── routeMeta.js         # Menu tree flattening & post-login path resolution
    ├── store/                   # Zustand global stores
    │   ├── Auth.Store.jsx       # User profile, JWT, active company/branch/year
    │   ├── Tabs.Store.jsx       # Multi-tab navigation session
    │   └── Ui.Store.jsx         # Dark mode, sidebar toggle, global modals
    ├── theme/                   # Single source of truth for styles & tokens
    │   ├── colors.ts            # Light, dark, and dashboard color tokens
    │   ├── spacing.ts           # Spacing scale and corner radii
    │   ├── typography.ts        # Font families, sizes, and line heights
    │   ├── antdTheme.ts         # Ant Design theme algorithm adapter
    │   └── applyTheme.ts        # Injects CSS variables onto document.documentElement
    └── utils/                   # Helper functions (toasts, formatting, templates)
```

---

## 3. Backend 4-Layer Architecture

Every new or refactored route in `ShreeHK_BackEnd` strictly follows this pattern:

```
[ Client Request ]
       │
       ▼
1. Route Handler (`routes/<module>/<name>Routes.js`)
   - HTTP method & route matching (`router.post('/...', ...)`)
   - Extracts payload: `req.body`, `req.query`, `req.params`
   - Injects user context: `const userCtx = buildUserContext(req);`
   - Calls validator -> Calls service -> Returns standard JSON response
       │
       ▼
2. Validator (`validators/<module>/<name>Validation.js`)
   - Checks presence of required fields (e.g. `party_id`, `amount`, `stone_sku`)
   - Normalizes data types (e.g. `Number(val) || 0`, string trim, uppercase)
   - Throws descriptive validation errors if constraints fail
       │
       ▼
3. Service (`services/<module>/<name>Service.js`)
   - Pure business logic & orchestration
   - Manages database transactions: `conn.beginTransaction()`, `commit()`, `rollback()`
   - Calculates diamond weight balances, currency exchange, accounting balances
   - Triggers explicit audit logs via `logAuditInTx()`
       │
       ▼
4. Repository (`repositories/<module>/<name>Repository.js`)
   - Encapsulates SQL statements
   - Enforces parameterized bindings: `SELECT ... WHERE company = ? AND id = ?`
   - Executes on the active connection or tenant pool
```

---

## 4. Multi-Tenancy & Database Architecture

The system operates a **hybrid multi-tenant structure**:

### Meta Database (`shreehkweb_snj2024_test`)
Contains platform-wide records:
- `user`: User credentials, assigned roles, active status.
- `roll`: Role names and assigned JSON permissions.
- `branch`: Branch definitions (e.g., Hong Kong, Dubai, Surat).
- `company`: Subscribed companies and legal details.
- `company_year`: Fiscal accounting years linked to dynamic tenant databases.
- `dai_activity_log`: Central tamper-evident audit history.

### Tenant Databases (e.g., `snj2024`, `shreehk_hk_2024`)
Contains operational business records for that company × fiscal year:
- `dai_product`, `dai_product_value`: Diamond inventory stones and specs.
- `dai_inward`, `dai_inward_item`: Stone purchase and inward memo documents.
- `dai_outward`, `dai_outward_item`: Stone sales, outward memo, and export documents.
- `acc_transaction`: General ledger double-entry bookkeeping records.
- `dai_party`: Accounts, suppliers, and customer details.

### Dynamic Pool Allocation & Execution Flow
1. User logs in -> JWT includes `{ user_id, username, roll, companyId, yearId }`.
2. Frontend Axios interceptor sends `X-Company-Id` and `X-Year-Id` headers.
3. `middleware/tenantContext.js` resolves the target database name from `company_year`.
4. `connection.js` creates or retrieves a cached pool for `dbName` using `AsyncLocalStorage`.
5. Every `connection.query()` automatically targets the resolved tenant database.
6. Row-level tenant isolation is maintained by enforcing `company = ?` across all queries.

---

## 5. Diamond State Lifecycle & Stock Movement

Diamonds flow through the following state machine in `dai_product`:

```
                 ┌────────────────────────────┐
                 │        INWARD ENTRY        │
                 │  - Purchase (outward=NULL) │
                 │  - In-Memo (outward=NULL)  │
                 └─────────────┬──────────────┘
                               │
                               ▼
                 ┌────────────────────────────┐
                 │       IN SAFE (ON HAND)    │
                 │ visibility=1, outward=NULL │
                 └──────┬──────────────┬──────┘
                        │              │
       ┌────────────────┘              └────────────────┐
       ▼                                                ▼
┌────────────────────────────┐            ┌────────────────────────────┐
│      OUTWARD - MEMO        │            │       OUTWARD - SALE       │
│ outward='memo', active=1   │            │ outward='sale', active=0   │
└──────┬──────────────┬──────┘            └────────────────────────────┘
       │              │
       ▼              ▼
┌──────────────┐ ┌──────────────┐
│ MEMO RETURN  │ │ MEMO TO SALE │
│ outward=NULL │ │ outward='sale│
└──────────────┘ └──────────────┘
```

Other Outward States:
- `outward = 'lab'`: Stone sent for grading (GIA/IGI).
- `outward = 'consign'`: Stone placed with an external broker.
- `outward = 'export'`: International shipping consignment.
- `hold = 1`: Reserved stone with an expiry timer (unheld automatically by `jobs/holdCron.js`).

---

## 6. Complete Feature-to-File Mapping

| Functional Module | Route Path (Frontend) | Page Component | Backend Route / Service |
|---|---|---|---|
| **Authentication** | `/auth/login` | `pages/auth/Login.jsx` | `routes/user/userRoutes.js` |
| **Dashboard** | `/dashboard` | `pages/DashBoard.jsx` | `routes/dashboard/dashboardRoutes.js` |
| **Task Manager** | `/task-manager` | `pages/TaskManager.jsx` | `routes/dashboard/quickNotesRoutes.js` |
| **Master - Party/Company** | `/master/company-details` | `pages/master/Company/index.jsx` | `routes/master/companyRoutes.js` |
| **Master - Shipping** | `/master/shipping-details` | `pages/master/Shipping/index.jsx` | `routes/master/shippingRoutes.js` |
| **Master - Origin** | `/master/origin` | `pages/master/Origin/index.jsx` | `routes/master/originRoutes.js` |
| **Master - Lab** | `/master/lab` | `pages/master/Lab/index.jsx` | `routes/master/labRoutes.js` |
| **Master - Category** | `/master/category` | `pages/master/Category/index.jsx` | `routes/master/categoryRoutes.js` |
| **Master - RapNet PriceList** | `/master/rapnet-pricelist` | `pages/master/RapNetPriceList.jsx` | `routes/rapnet/rapnetRoutes.js` |
| **Master - Bulk Update** | `/master/bulk-update` | `pages/master/BulkUpdate.jsx` | `routes/bulk/bulkRoutes.js` |
| **Master - Import Format** | `/master/import-format` | `pages/master/ImportFormat.jsx` | `routes/master/categoryRoutes.js` |
| **Master - Refresh Stock** | `/master/refresh-stock` | `pages/master/RefreshStock.jsx` | `routes/integration/integrationRoutes.js` |
| **Master - Integrations** | `/master/integrations` | `pages/master/Integrations.jsx` | `routes/lab/labRoutes.js` |
| **Inventory - My Inventory** | `/inventory/my-inventory` | `pages/inventory/DiamondInventoryTable.jsx` | `routes/product/productRoutes.js` |
| **Inventory - Categorize** | `/inventory/categorize-inventory`| `pages/inventory/Category.jsx` | `routes/product/boxParcelService.js` |
| **Inventory - On Hand Stock** | `/inventory/on-hand-stock` | `pages/inventory/OnHandStock.jsx` | `routes/product/productRoutes.js` |
| **Inventory - Barcode** | `/inventory/barcode` | `pages/inventory/Barcode.jsx` | `routes/product/productRoutes.js` |
| **Inventory - Cycle Count** | `/inventory/cycle-count` | `pages/inventory/CycleCount.jsx` | `routes/product/productRoutes.js` |
| **Inward - Purchase Entry** | `/transaction/purchase/entry` | `pages/transaction/stock/PurchaseEntry.jsx` | `routes/inward/inwardRoutes.js` |
| **Inward - Memo Entry** | `/transaction/in-memo/entry` | `pages/transaction/stock/InMemoEntry.jsx` | `routes/inward/inwardRoutes.js` |
| **Inward - Import (Excel)** | `/transaction/inward/import` | `pages/transaction/inward/InwordImport.jsx` | `routes/inward/inwardRoutes.js` |
| **Stock - GIA Memo List** | `/transaction/gia-memo` | `pages/transaction/stock/GIAMemoStock.jsx` | `routes/transaction/transactionStockRoutes.js` |
| **Stock - In Memo List** | `/transaction/in-memo` | `pages/transaction/stock/InMemoStock.jsx` | `routes/transaction/transactionStockRoutes.js` |
| **Stock - Out Memo List** | `/transaction/out-memo` | `pages/transaction/stock/OutMemoStock.jsx` | `routes/transaction/transactionStockRoutes.js` |
| **Stock - Sale List** | `/transaction/sale` | `pages/transaction/stock/SaleStock.jsx` | `routes/transaction/transactionStockRoutes.js` |
| **Stock - Purchase List** | `/transaction/purchase` | `pages/transaction/stock/PurchaseStock.jsx` | `routes/transaction/transactionStockRoutes.js` |
| **Stock - Stone Update** | `/transaction/stone-update` | `pages/transaction/StoneUpdate.jsx` | `routes/product/productRoutes.js` |
| **Outward - Main** | `/outward` | `pages/outword/OutWord.jsx` | `routes/outward/outwardRoutes.js` |
| **Accounting - Expense Entry** | `/accounting/expanse` | `pages/accounting/Expanse.jsx` | `routes/accounting/expensePaymentRoutes.js` |
| **Accounting - Expense List** | `/accounting/expanse/table-data` | `pages/accounting/FormTable/ExpanseTableData.jsx` | `routes/accounting/expensePaymentRoutes.js` |
| **Accounting - Advance Entry** | `/accounting/advance` | `pages/accounting/AdvancePayment.jsx` | `routes/accounting/advancePaymentRoutes.js` |
| **Accounting - Advance List** | `/accounting/advance/table-data` | `pages/accounting/FormTable/AdvanceTableData.jsx` | `routes/accounting/advancePaymentRoutes.js` |
| **Accounting - Adv Transaction**| `/accounting/advance-transaction`| `pages/accounting/AdvanceTransaction.jsx` | `routes/accounting/advancePaymentRoutes.js` |
| **Accounting - My Balance** | `/accounting/my-balance` | `pages/accounting/my-balance/MyBalance.jsx` | `routes/my_Balance/balanceBookRoutes.js` |
| **Accounting - Transactions** | `/accounting/account-transaction` | `pages/accounting/Transaction.jsx` | `routes/accounting/Transaction.js` |
| **Accounting - Party Master** | `/accounting/party` | `pages/accounting/AccParty.jsx` | `routes/accounting/PartyWiseTransaction.js` |
| **Accounting - Party Report** | `/accounting/party-report` | `pages/accounting/AccPartyReport.jsx` | `routes/accounting/PartyWiseTransaction.js` |
| **Accounting - Groups** | `/accounting/group` | `pages/accounting/AccGroup.jsx` | `routes/accounting/accGroupRoutes.js` |
| **Accounting - Subgroups** | `/accounting/subgroup` | `pages/accounting/AccSubgroup.jsx` | `routes/accounting/accSubgroupRoutes.js` |
| **Reports - Transactions** | `/report/transaction` | `pages/reports/TransactionReport.jsx` | `routes/report/reportRoutes.js` |
| **Reports - Outstanding** | `/report/outstanding` | `pages/reports/OutStandingReport.jsx` | `routes/report/reportRoutes.js` |
| **Reports - Group Report** | `/report/group-report` | `pages/reports/GroupReport.jsx` | `routes/report/reportRoutes.js` |
| **Reports - Stone History** | `/report/stone-history` | `pages/reports/StoneHistory.jsx` | `routes/report/reportRoutes.js` |
| **Reports - Transfer History** | `/report/stone-transfer-history` | `pages/reports/TransferHistory.jsx` | `routes/report/reportRoutes.js` |
| **Reports - Sale Stock** | `/report/sale-stock` | `pages/reports/SaleStoneReport.jsx` | `routes/report/reportRoutes.js` |
| **Reports - Party Stone Info**| `/report/stone-info` | `pages/reports/StoneInfoReport.jsx` | `routes/report/reportRoutes.js` |
| **Admin - Branches** | `/admin/branch` | `pages/admin/BranchList.jsx` | `routes/admin/branchRoutes.js` |
| **Admin - Tenant Companies** | `/admin/tenant-company` | `pages/admin/TenantCompanyList.jsx` | `routes/admin/tenantCompanyRoutes.js` |
| **Admin - Manage Users** | `/admin/manage-user` | `pages/admin/ManageUser.jsx` | `routes/adminUser/addAdminUserRoutes.js` |
| **Admin - Roles & Permissions**| `/admin/roll` | `pages/admin/AdvancedRollPage.jsx` | `routes/adminUser/rollRoutes.js` |
| **Admin - Fiscal Years** | `/admin/fiscal-year` | `pages/admin/FiscalYearAdmin.jsx` | `routes/portal/portalRoutes.js` |
| **Admin - Activity History** | `/admin/activity-history` | `pages/admin/ActivityHistory.jsx` | `routes/admin/activityLogRoutes.js` |
| **Admin - Legacy Apps Scope** | `/admin/legacy-apps` | `pages/admin/LegacyAppsScope.jsx` | `index.js` (`/config/legacy-apps`) |
| **Inter-Transfer - Stock** | `/inter-transfer/*` | `pages/interTransfer/*` | `routes/transaction/companyTransferRoutes.js` |
| **AI Assistant** | Floating UI Drawer | `components/ai/*` | `routes/ai/aiRoutes.js` |

---

## 7. Legacy Database Quirks

> **IMPORTANT NOTE:** Ye spelling galat dikhti hai lekin DB me yahi hai. SQL me kabhi correct mat karo, exactly yahi use karo.

### 7.1 Primary Diamond Tables Schema

- **`dai_product`**: Stone primary identity & state:
  `id`, `sku`, `polish_carat`, `price`, `amount`, `lab`, `location`, `outward`, `hold`, `pair`, `company`
- **`dai_product_value`**: Stone 4Cs & technical specifications:
  - `shape`, `color`, `clarity`, `cut`, `polish`
  - `symmentry` ⚠️ *(Spelled with double 'm', NOT symmetry)*
  - `mesurment` ⚠️ *(Spelled without 'e'/'a', NOT measurement)*
  - `fluorescence`, `report_no`
  - `table_pc` ⚠️ *(Table percentage)*
  - `depth_pc` ⚠️ *(Depth percentage)*
- **`dai_inward`**: Inward document header:
  `inward_no`, `inward_date`, `party_id`, `inward_type`, `total_carat`, `total_amount`
- **`dai_outward`**: Outward document header:
  `outward_no`, `outward_date`, `party_id`, `outward_type`, `status`

---

## 8. Existing Business Tools (Do Not Duplicate or Modify)

The project includes 5 specialized production tools that must be reused instead of recreated:

| Tool Name | File Path | Purpose | Where Used |
|---|---|---|---|
| **Audio Barcode Chimes** | `src/utils/audioBeep.js` | Synthesizes real-time Web Audio API chimes with distinct frequencies for Success, Warning, and Error during barcode scanning. | Global barcode inputs, `/inventory/barcode`, `/settings` |
| **RAP LIVE Discount Calculator** | `src/components/rapaport/RapaportLivePanel.jsx` & `src/hooks/useRapaportLive.js` | Real-time discount slider (-50% to +5%), net price/carat computation, total amount calculation, and 1-click clipboard copy. | Floating "RAP LIVE" panel in header/layout |
| **1-Click WhatsApp Diamond Card** | `src/components/inventory/StoneDetailModal.jsx` / `src/pages/transaction/StoneUpdate.jsx` | Generates emoji-formatted diamond specification text summary card ready for instant WhatsApp Web / mobile sharing. | Stone Detail Modal, Inventory table, Stone Update screen |
| **Smart Pair Matching Engine** | `src/utils/resolveDiaPair.js` & `src/pages/inventory/Pair.jsx` | Algorithmic diamond pairing based on shape, carat tolerance ($\pm 0.04$ct), and color/clarity score matching. | `/inventory/categorize-inventory`, Pair tab |
| **Physical Stock Audit Scanner** | `src/components/inventory/InventoryTableSection.jsx` / `src/pages/inventory/DiamondInventoryTable.jsx` | Rapid barcode auditing scanner with live physical verification status tracking and CSV audit report export. | Diamond Inventory Table Toolbar |

---

## 9. Technical Quirks

1. **Meta-Only Route Prefixes (`tenantHelper.js`)**:
   The following routes are hardcoded to bypass tenant-database routing and always execute on `connection.getMetaPool()`:
   ```javascript
   const META_ONLY_PREFIXES = [
     "/user/",
     "/session/",
     "/portal/",
     "/admin/tenant-company",
     "/admin/branch",
     "/admin/activity-log",
     "/getAdminManageUser",
     "/admin-manage-user",
     "/manage-user/",
     "/getLoginAllUsers",
     "/addNewUser",
     "/deleteUser",
     "/role-",
     "/permission-registry",
     "/admin-user",
     "/config/",
     "/health",
   ];
   ```
2. **Headless Chrome CLI Label PDF Generation**:
   Label stickers for thermal printers are generated in `routes/product/labelStickerPdf.js` via Headless Chrome / Edge CLI (`--headless --print-to-pdf`) execution, rather than node-canvas or browser DOM printing.
3. **Disabled IGI Lab Provider**:
   `services/lab/igiProvider.js` is currently a disabled stub; only the GIA provider (`services/lab/giaProvider.js`) is active.
4. **Encoding / Mojibake Characters**:
   `AccParty.jsx`, `holdService.js`, and `auditUiTracker.js` contain legacy mojibake characters (`->`, `—`). Do NOT attempt to "clean" or re-encode these characters unless explicitly requested by the user.
5. **AI Assistant Tool Registry**:
   `services/ai/tools/toolRegistry.js` defines exactly 23 structured tools orchestrated by a 2-pass LLM pipeline (intent classification -> tool execution).

---

## 10. Known Technical Debt

1. **Dual API Patterns**:
   Two data-fetching patterns coexist during migration:
   - Legacy: `src/api/ApiFunction.jsx` (`useFetchApi`, `usePostApiRequest`)
   - Modern: `src/api/query/` (`useApiQuery`, `useApiMutation`)
   - Rule: Keep the existing pattern in old files; use `useApiQuery`/`useApiMutation` only for brand-new files.
2. **Monolithic Legacy Routes**:
   Older backend modules (`routes/master/*`, `routes/inward/inwardRoutes.js`, `routes/report/*`, `routes/product/*`) contain inline SQL queries instead of 4-layer separation. Edit them in place with minimal changes.
3. **Hardcoded Hex in SCSS**:
   ~200+ legacy hardcoded hex color values exist in older stylesheets. Do not mass-refactor them into CSS variables unless explicitly assigned.
4. **Hardcoded JWT_SECRET Fallback**:
   Fallback string `"NitechDigitalServices"` exists in 5 backend files if `.env` is unconfigured. Never copy or rely on this fallback in new code.

