# ShreeHK Inventory ERP — Complete Audit & Gap Analysis Report (2026 ERP Standards)

**Generated Date:** August 25, 2026  
**Project Name:** ShreeHK Diamond Inventory ERP  
**Scope:** Full Codebase Audit (Backend & Frontend), 2026 Industry ERP Standards Comparison, Gap Analysis & Strategic Roadmap.

---

## Executive Summary

The **ShreeHK Inventory ERP** is a domain-specialized, multi-tenant Diamond & Jewelry Inventory, Accounting, and Business Operations Management System. It handles complex diamond inward operations (Import, Purchase, In-Memo, In-Consignment), inventory management (Single/Box/Parcel/Pair, Stock Categorization, Cycle Count, Barcode printing), outward operations (Out-Memo, Out-Consignment, Sales, Exports, GIA Lab shipments), financial accounting (Vouchers, Advance/Expense payments, Party ledgers, Currency rates), and executive dashboards with embedded AI features (AI Command Bar, AI Certificate Scanner, AI Sales & Price recommendations).

This report provides:
1. **Phase 1:** Complete Code Audit (Backend directory map, Database schema, API catalog, Frontend page map, and Current Features Inventory).
2. **Phase 2:** Benchmark comparison against 2026 Modern ERP Standards (NetSuite, Zoho, Cin7, Acumatica).
3. **Phase 3:** Detailed Gap Analysis Matrix, Top 10 High-Priority Missing Features, Quick Wins, and Long-Term Roadmap.

---

# PHASE 1: EXISTING PROJECT FULL CODE AUDIT

## 1. Backend Architecture & Directory Audit (`ShreeHK_BackEnd`)

### Directory & File Structure
```
ShreeHK_BackEnd/
├── index.js                     # Express server setup, CORS, rate-limiting, route mounting, cron scheduler
├── connection.js                # Multi-tenant AsyncLocalStorage MySQL pool manager (Meta DB vs Tenant DB)
├── authMiddleware.js            # JWT authentication & granular permission middleware
├── permissionHelper.js          # Permission evaluator helpers
├── tenantHelper.js              # Tenant context resolver (company_id, user_id)
├── helper.js / productHelper.js # Stock calculation, formula parsing, and data formatters
├── routes/                      # Route handlers directory
│   ├── master/                  # Company, Shipping, Origin, Lab, Category, Attribute routes
│   ├── product/                 # Product CRUD, Inventory filters, Box/Parcel, Barcode, Labels, Mail, Export
│   ├── inward/                  # Inward transactions (Import, Purchase, In-Memo, In-Consignment)
│   ├── outward/                 # Outward transactions (Out-Memo, Out-Consignment, Sale, Export, Hold)
│   ├── transaction/             # Stock conversion registers (GIA, In-Memo, Out-Memo, Sale, Purchase)
│   ├── accounting/              # Vouchers, Expense, Advance, Party transactions, Acc Group/Subgroup
│   ├── my_Balance/              # Balance book & Currency rate management
│   ├── report/                  # Transaction, Outstanding, Group, Stone History, Transfer History reports
│   ├── admin/ & adminUser/      # Tenant companies, User management, RBAC Roles, Activity Log
│   ├── ai/                      # Conversational AI assistant & prompt orchestrator routes
│   ├── bulk/                    # Bulk stock updates
│   ├── common/ & notification/  # Increment counters, dropdown options, system notifications
│   ├── dashboard/               # Dashboard summary, trend statistics, quick notes
│   ├── rapnet/                  # Rapaport price list integration & live prices
│   ├── session/                 # Keep-alive & user context session routes
│   ├── portal/                  # Public party / customer portal endpoints
│   └── integration/             # External integration configs
├── services/                    # Business logic services
│   ├── ai/                      # AI Brain, Data provider, Prompt builder, OCR scanner
│   ├── inventorySummaryService  # Stock aggregation & inventory stats
│   ├── dashboardTrendsService  # Trend calculation (Sales, Stock value, Lab/Memo flow)
│   ├── auditService.js          # Activity audit trail & snapshot service
│   ├── userPresenceService.js   # Real-time online user tracker
│   └── notificationRealtime     # Internal notification dispatchers
└── jobs/                        # Cron jobs (Hold auto-release scheduler)
```

### Database Schema & Multi-Tenant Architecture
- **Multi-Tenancy:** Uses dynamic MySQL pool switching via `AsyncLocalStorage` (`connection.js`). 
  - **Meta Database (`shreehkweb_snj2024`):** Stores system-wide configuration, `company`, `company_year`, `user`, `roll` (RBAC permissions), `dai_activity_log`, `dai_ai_conversation`.
  - **Tenant Databases:** Stores tenant-isolated inventory and financial data (`dai_product`, `dai_product_value`, `dai_inward`, `dai_outward`, `acc_transaction`, `dai_balance`, `dai_hold`, etc.).
- **Key Tables:**
  - `dai_product` & `dai_product_value`: Product SKU, carat, pcs, pricing (cost/rap/price), outward state (`memo`/`consign`/`sale`/`export`/`lab`), shape, clarity, color, cut, polish, symmetry, fluorescence, measurement, cert #.
  - `dai_inward`: Stock entry header (Entry No, Invoice No, Party ID, Date, Terms, Total Carat, Total Pcs, Total Amount, Inward Type: `import`/`purchase`/`memo`/`consign`).
  - `dai_outward`: Outward entry header (Entry No, Ref No, Party ID, Broker ID, Date, Terms, Outward Type: `memo`/`consign`/`sale`/`export`/`lab`, Status).
  - `dai_hold`: Stone hold registry (Product ID, Party ID, Hold Date, Auto-release Date, Status).
  - `acc_transaction`, `acc_group`, `acc_subgroup`, `acc_advance`: Financial ledgers, voucher entries, party debit/credit, subgroup classifications.
  - `dai_balance`, `dai_currencyrate`: Party account balances, Multi-currency rates (USD, INR, HKD, etc.).
  - `roll`, `user`: RBAC role permission definitions (`perms` JSON key array) and user credentials.

### Existing Backend API Catalog

| Module | HTTP Method | Endpoint | Purpose |
|---|---|---|---|
| **Auth & User** | POST | `/user/login` | User authentication & JWT issuance |
| **Auth & User** | POST | `/user/logout` | Session invalidation |
| **User & RBAC** | GET / POST | `/api/admin/users`, `/api/admin/users/create` | User management |
| **User & RBAC** | GET / POST | `/admin/roll/list`, `/admin/roll/save` | RBAC Role & permission matrix CRUD |
| **Master Data** | GET / POST | `/master/company`, `/master/shipping`, `/master/origin`, `/master/lab`, `/master/category`, `/master/attribute` | Master dropdown and entity CRUD |
| **Product / Inventory** | GET | `/product/inventory` | Filtered & paginated inventory stock list |
| **Product / Inventory** | GET | `/product/inventory/summary` | Live stock summary (Pcs, Carat, Total Value) |
| **Product / Inventory** | GET | `/product/inventory/suggest` | Auto-complete stock search suggestion |
| **Product / Inventory** | POST | `/product/save` | Single product create/update |
| **Product / Inventory** | POST | `/product/change-price` | Bulk stone price update |
| **Product / Inventory** | POST | `/product/label/print`, `/product/label-a4/print` | Barcode sticker & A4 label generation |
| **Product / Inventory** | POST | `/product/export`, `/product/i-export`, `/product/mail` | Excel export & stock email dispatch |
| **Inward** | POST | `/inward/save` | Stock Inward transaction (Import, Purchase, Memo, Consignment) |
| **Inward** | GET | `/inward/list`, `/inward/get/:id` | Inward registers & detail fetching |
| **Outward** | POST | `/outward/save` | Outward transaction (Out-Memo, Out-Consignment, Sale, Export) |
| **Outward & Hold** | POST / GET | `/outward/hold/save`, `/outward/hold/list` | Stone hold placement & auto-release |
| **Transaction Stock** | POST | `/transaction/inward-stock/list`, `/transaction/outward-stock/list` | Stock transformation registers |
| **Transaction Stock** | POST | `/transaction/outward-stock/memo-to-sale` | Out-Memo to Sale conversion |
| **Transaction Stock** | POST | `/transaction/inward-stock/memo-to-purchase` | In-Memo to Purchase conversion |
| **Accounting** | GET / POST | `/accounting/transaction/list`, `/accounting/transaction/save` | General ledger voucher entries |
| **Accounting** | GET / POST | `/accounting/expanse/save`, `/accounting/advance/save` | Expense & Advance payment entries |
| **Balance & Currency** | GET / POST | `/my-balance/list`, `/currency-rate/list` | Balance book & Currency exchange rates |
| **Reports** | POST | `/report/transaction`, `/report/outstanding`, `/report/sale-stock`, `/report/group` | Transaction, Outstanding & Sales reports |
| **Reports** | GET | `/report/stone-history`, `/report/transfer-history`, `/report/stone-info` | Stone audit timeline & location tracking |
| **Dashboard** | GET | `/dashboard/summary`, `/dashboard/trends` | KPI summary cards & graphical trend series |
| **RapNet** | GET / POST | `/rapnet/prices`, `/rapnet/update-price`, `/rapnet/live` | Rapaport price syncing & live pricing |
| **AI Assistant** | POST | `/ai/chat`, `/ai/ocr-cert` | Conversational AI queries & Certificate OCR scanning |
| **Activity Log** | GET | `/admin/activity-log` | System audit trail logs |

---

## 2. Frontend Architecture & Directory Audit (`ShreeHK_FrontEnd`)

### Directory & File Structure
```
ShreeHK_FrontEnd/src/
├── routes/
│   ├── Routes.jsx               # Protected route tree, RBAC route guard, Lazy-loaded pages
│   └── AppRoutes.jsx            # Main router provider
├── pages/
│   ├── DashBoard.jsx            # Real-time KPI summary, Sales trends, Flow bar, Due payments, Quick notes
│   ├── TaskManager.jsx          # Workflow task board & task assignment
│   ├── master/                  # Company, Shipping, Origin, Lab, Category, Attribute, RapNet, Integrations
│   ├── inventory/               # DiamondInventoryTable, SingleToBox, SingleToParcel, OnHandStock, Barcode, CycleCount
│   ├── transaction/             # InwardImport, StoneUpdate, GIAMemoStock, InMemoStock, OutMemoStock, SaleStock, PurchaseStock
│   ├── accounting/              # Expanse, AdvancePayment, MyBalance, Transaction, PartyWiseTransaction, AccGroup, AccSubgroup
│   ├── reports/                  # TransactionReport, OutStandingReport, GroupReport, StoneHistory, TransferHistory, SaleStoneReport
│   ├── admin/                   # AdvancedRollPage, ManageUser, FiscalYearAdmin, ActivityHistory, TenantCompanyList
│   └── outword/                 # Outward memo/sale dispatch entry form
├── components/
│   ├── dashboard/               # KpiCard, StockValueTrendCard, FlowBarCard, DuePaymentsPanel, QuickNotesCard, TopPartiesPanel
│   ├── inventory/               # OnMemoModal, AddDiamondToBoxModal, ShopTopActionFilter, MasterTableTemplate
│   ├── transaction/             # InwardEntryForm, OutwardEntryForm, TransactionStockTemplate
│   ├── ai/                      # FloatingAIChat, AICertificateScannerModal, AIAgentCommandBar, AIInsightCard
│   └── common/                  # Skeletons, Modals, Custom tables, Data filters
```

### Page & Component Operations Summary

| Page / Screen | Operations & Capabilities | Filters & Actions |
|---|---|---|
| **Dashboard (`DashBoard.jsx`)** | Visual KPIs (Total Stock Value, In Lab, Out on Memo, Total Sales), Stock trends graph, Flow bar (Sales/Purchase/Memo), Due Payments panel, Top Parties, Quick Actions. | Date range selector (`1m`, `3m`, `6m`, `1y`), Quick action navigation links. |
| **Diamond Inventory Table (`DiamondInventoryTable.jsx`)** | Master inventory grid, Multi-select bulk operations (Send to Memo, Send to Sale, Hold stone, Change price, Single to Box/Parcel, Print barcode). | Category dropdown, Shape/Color/Clarity sliders, SKU search, Column toggle, Excel export, PDF print. |
| **On-Hand Stock (`OnHandStock.jsx`)** | Live available stock overview, carat weight distribution, stock breakdown by color/clarity/shape. | Multi-attribute filters, Quick stock status toggle, Export to Excel. |
| **Single/Box/Parcel (`SingleToBox.jsx`, `SingleToParcel.jsx`)** | Transform loose single stones into box/parcel collections or vice-versa. | Search SKU, select target box/parcel, weight allocation input. |
| **Barcode & Cycle Count (`Barcode.jsx`, `CycleCount.jsx`)** | Generate barcode stickers/A4 sheets, perform physical inventory count vs system count comparison. | Barcode format picker, batch print trigger, count discrepancy highlighter. |
| **Inward Import (`InwardImport.jsx`)** | Import diamond stock (Import, Purchase, In-Memo, In-Consignment), upload Excel stock list, auto-fill attributes. | Excel file mapper, Party selector, Currency & rate input, Submit/Draft save. |
| **Outward Entry (`OutWord.jsx`)** | Dispatch stock to parties for Memo, Consignment, Direct Sale, or Export. | Party search, Broker select, Terms (Days), Payment method, Invoice print preview. |
| **Stock Registers (`PurchaseStock`, `InMemoStock`, `OutMemoStock`, `SaleStock`, `GIAMemoStock`)** | Register lists for each transaction state, return memo stones, convert In-Memo to Purchase or Out-Memo to Sale. | Date range, Party filter, Status filter (Active/Returned/Converted), Excel export, Print voucher. |
| **Accounting Vouchers (`Transaction.jsx`, `Expanse.jsx`, `AdvancePayment.jsx`)** | Record debit/credit journal vouchers, expense payments, advance party payments. | Voucher type, Party selector, Account Group/Subgroup, Currency, Receipt print. |
| **Party Ledgers (`PartyWiseTransaction.jsx`, `AccPartyReport.jsx`)** | Complete financial transaction history per party, running balance calculation, aging analysis. | Party dropdown, Date range, Transaction type filter, PDF export. |
| **Reports (`StoneHistory`, `OutStandingReport`, `TransactionReport`, `SaleStoneReport`)** | Audit stone movement timeline from inward to current state, party payment outstanding aging, sales performance reports. | Stone SKU search, Outstanding due date ranges, Group by Party/Category, Excel download. |
| **Admin & Security (`AdvancedRollPage`, `ManageUser`, `ActivityHistory`)** | RBAC permission grid, User creation, Multi-tenant company setup, System audit trail viewing. | Role selector, Permission checkbox matrix, User active/inactive toggle, Audit log search. |
| **AI Assistant (`FloatingAIChat`, `AICertificateScannerModal`)** | Natural language queries ("Show stock over 2 carats VVS1"), GIA/IGI diamond certificate OCR auto-parsing. | Text prompt input, Certificate photo drag-and-drop, Auto-fill form trigger. |

---

## 3. CURRENT FEATURES INVENTORY (Module-Wise Summary)

- **Product & Stock Master:**
  - Full attribute mapping (Carat, Pcs, Cost, Price, Rap Price, Shape, Color, Clarity, Cut, Polish, Symmetry, Fluorescence, Measurement, GIA Cert #).
  - Multi-form inventory views (Single, Box, Parcel, Pair).
  - Bulk price modification, hold placement with auto-expiry.
  - Barcode sticker & A4 label printing.

- **Inward Management:**
  - Multi-type stock entry (Import, Purchase, In-Memo, In-Consignment).
  - Bulk Excel stock upload with automated column mapping.
  - Automated product generation linked to inward entry headers.

- **Outward & Sales Management:**
  - Multi-state dispatch (Out-Memo, Out-Consignment, Direct Sale, Export, GIA Lab).
  - In-Memo to Purchase and Out-Memo to Sale status conversions.
  - Returns processing (In-Memo return, Out-Memo return, GIA return).

- **Accounting & Finance:**
  - Double-entry transaction ledger (Debit/Credit).
  - Expense & Advance payment vouchers.
  - Account Group & Subgroup classification tree.
  - Multi-currency rate management (USD/INR conversion).
  - Party ledger & running balance calculation.

- **Reporting & Analytics:**
  - Real-time stock value summary (Total Carats, Pcs, Amount).
  - Outstanding party aging report.
  - Detailed Stone History timeline & stone transfer tracking.
  - Sales stock performance report.

- **Security & Multi-Tenancy:**
  - Multi-tenant database isolation.
  - Role-Based Access Control (RBAC) with granular permission keys.
  - User activity log & audit snapshot recorder (`dai_activity_log`).
  - Session timeout & rate limiting.

- **Embedded AI Capabilities:**
  - Floating AI Chat assistant for natural language stock queries.
  - AI GIA Certificate OCR scanner for fast stock entry.
  - AI Customer purchase suggestion & Price suggestion modules.

---

# PHASE 2: COMPARISON AGAINST 2026 MODERN ERP STANDARDS

We compared ShreeHK against verified 2026 Tier-1 ERP standards (NetSuite, Zoho ERP, Cin7, Acumatica):

1. **STOCK MANAGEMENT:**
   - *Real-time updates:* **HAVE (Partial)** — Stock updates live on database save, but lacks WebSockets/Server-Sent Events for multi-user live UI push.
   - *Multi-warehouse / multi-location:* **PARTIAL** — Has single `location` field per stone, lacks multi-bin/warehouse transfer workflow.
   - *Batch / Lot / Serial tracking:* **HAVE** — SKU and Diamond No serve as unique serial numbers. Box/Parcel serves as batch/lot.
   - *Expiry date tracking:* **MISSING** — Not applicable for diamonds, but missing for hold auto-release notification alerts.
   - *Low stock / reorder alerts:* **MISSING** — No threshold-based proactive stockout warning system.
   - *Stock aging / dead stock:* **PARTIAL** — Stone history stores dates, but lacks dedicated dead-stock aging analytics matrix (>90/>180 days).
   - *Valuation methods (FIFO/LIFO/Weighted Avg):* **PARTIAL** — Uses exact cost/price per stone; lacks standard FIFO/LIFO financial reporting option.

2. **AUTOMATION & AI:**
   - *AI demand forecasting:* **MISSING** — No predictive sales/demand ML model.
   - *AI auto reorder suggestions:* **MISSING** — No automated PO generation on low stock.
   - *Barcode / QR scanning:* **HAVE** — Barcode printing and cycle count scanning supported.
   - *Auto stock deduction:* **HAVE** — Auto updates outward state on sale/export.
   - *Anomaly detection:* **MISSING** — Lacks fraud detection / stock discrepancy AI flags.
   - *Conversational AI chatbot:* **HAVE** — Floating AI Chat and AI Command Bar integrated.

3. **PURCHASE & SALES:**
   - *Purchase Order (PO) workflow + approval:* **MISSING** — Direct inward entry only; no PO creation -> approval -> receive flow.
   - *Sales Order (SO) management:* **MISSING** — Direct sale/outward creation only; no quotation/SO workflow.
   - *Auto PO on low stock:* **MISSING** — No automated vendor PO generation.
   - *Vendor comparison & rating:* **MISSING** — Lacks vendor evaluation scorecards.

4. **REPORTING & DASHBOARD:**
   - *Real-time KPI dashboard:* **HAVE** — Top KPIs, flow charts, stock breakdowns implemented.
   - *Profit margin analysis per product/category:* **PARTIAL** — Cost vs Price exists in tables, but lacks dedicated margin analysis dashboard.
   - *Custom report builder:* **MISSING** — Fixed pre-built reports only.
   - *Sales/Purchase trend analysis:* **HAVE** — Visual charts on dashboard.

5. **MULTI-ENTITY:**
   - *Multi-company:* **HAVE** — Full multi-tenant database & company year switching.
   - *Multi-branch stock transfer:* **MISSING** — No inter-branch transfer order (ITR) document flow.
   - *Multi-currency support:* **HAVE** — Multi-currency rates & voucher currency conversions.

6. **INTEGRATIONS:**
   - *Accounting software (Tally/GST):* **MISSING** — Tally XML/JSON export and GST portal filing integration missing.
   - *E-commerce (Shopify/Amazon):* **MISSING** — No live web shop sync API.
   - *Payment gateway:* **MISSING** — No Razorpay/Stripe payment link integration.
   - *Third-party API support:* **PARTIAL** — RapNet API integration built; general OpenAPI/Webhook support missing.

7. **USER & SECURITY:**
   - *Role-Based Access Control (RBAC):* **HAVE** — Comprehensive role permission matrix.
   - *Audit trail / activity log:* **HAVE** — Detailed activity logging and HTTP mutation snapshots.
   - *Data backup & export:* **HAVE** — Excel, CSV, PDF label export.
   - *Session & login security:* **PARTIAL** — Rate limiting & JWT token security present; lacks 2FA (TOTP/SMS).

8. **UX & MODERN STANDARDS:**
   - *Mobile-responsive UI:* **PARTIAL** — Desktop optimized Ant Design grid; mobile responsiveness is limited.
   - *Guided workflows:* **HAVE** — Quick action bars & top action filters.
   - *Notification system:* **PARTIAL** — Internal database notifications present; Email/WhatsApp automated notifications missing.
   - *Offline mode with sync:* **MISSING** — Pure online client-server app.

---

# PHASE 3: FINAL IMPLEMENTATION GAP REPORT MATRIX

| Feature Category | Feature | Status | Priority | Implementation Effort | Notes |
|---|---|---|---|---|---|
| **Stock Management** | Real-time Stock Updates | **Partial** | High | Medium | Currently DB synced; needs WebSocket/SSE push for multi-user live stock updates. |
| **Stock Management** | Multi-Warehouse / Location Tracking | **Partial** | High | Medium | Add location hierarchy (Warehouse -> Zone -> Safe -> Tray) and Transfer Orders. |
| **Stock Management** | Batch / Lot / Serial Number Tracking | **Have** | Low | Low | Fully supported via SKU, Diamond No, Box ID, and Parcel ID. |
| **Stock Management** | Expiry / Hold Expiry Auto-Alerts | **Partial** | Medium | Low | Cron job releases hold; needs automated user notification/email on expiry. |
| **Stock Management** | Low Stock / Reorder Point Proactive Alerts | **Missing** | High | Medium | Set min/max threshold levels per category/size; trigger alert before stockout. |
| **Stock Management** | Stock Aging & Dead Stock Analysis | **Partial** | High | Low | Create dedicated >60/>120/>180 days aging bucket report with holding cost metrics. |
| **Stock Management** | Stock Valuation Methods (FIFO / LIFO / Avg) | **Partial** | Medium | Medium | Implement standard financial valuation methods alongside exact cost tracking. |
| **Automation & AI** | AI-Based Demand Forecasting | **Missing** | Low | High | Predictive machine learning model based on historical sales trends. |
| **Automation & AI** | AI-Based Auto Reorder Suggestions | **Missing** | Medium | High | Recommend purchasing quantities based on seasonal velocity and supplier lead times. |
| **Automation & AI** | Barcode / QR Code Scanning | **Have** | Low | Low | Sticker & A4 barcode creation + scanning supported. |
| **Automation & AI** | Auto Stock Deduction on Sale | **Have** | Low | Low | Outward sale/export automatically updates product availability. |
| **Automation & AI** | Anomaly Detection (Stock Mismatch / Fraud) | **Missing** | Medium | Medium | AI audit rule engine to flag suspicious price overrides, inventory loss, or duplicate SKUs. |
| **Automation & AI** | Conversational AI Chatbot / Query Assistant | **Have** | Low | Low | Floating AI Chat with database Context Provider active. |
| **Purchase & Sales** | Purchase Order (PO) Management & Approval | **Missing** | High | Medium | Add PO creation, Multi-tier Approval workflow, and Receiving GRN matching. |
| **Purchase & Sales** | Sales Order (SO) & Quotation Management | **Missing** | High | Medium | Add Sales Quotation -> Sales Order -> Invoice dispatch workflow. |
| **Purchase & Sales** | Auto PO Generation on Low Stock | **Missing** | Medium | High | Automatically draft POs when stock falls below reorder points. |
| **Purchase & Sales** | Vendor / Supplier Rating & Scorecard | **Missing** | Medium | Low | Track vendor lead times, quality rejection rates, and pricing variance. |
| **Reporting & Dashboard** | Real-time KPI Dashboard | **Have** | Low | Low | Modern KPI dashboard with stock value, memo/lab flow, due payments live. |
| **Reporting & Dashboard** | Profit Margin Analysis per Category/Stone | **Partial** | High | Low | Create Gross Profit Margin (%) report per sale invoice, party, and stone category. |
| **Reporting & Dashboard** | Custom Report Builder & Column Customizer | **Missing** | Medium | High | Drag-and-drop report builder allowing users to save custom SQL views/exports. |
| **Reporting & Dashboard** | Sales & Purchase Visual Trend Analytics | **Have** | Low | Low | Trend charts and Flow bar charts present on Dashboard. |
| **Multi-Entity** | Multi-Company & Fiscal Year Switching | **Have** | Low | Low | Multi-tenant company context and fiscal year switching supported. |
| **Multi-Entity** | Multi-Branch Stock Transfer (ITR) | **Missing** | High | Medium | Transfer order workflow between branch locations with transit state tracking. |
| **Multi-Entity** | Multi-Currency Support | **Have** | Low | Low | USD/INR exchange rate conversion & currency ledger support. |
| **Integrations** | Accounting Software Integration (Tally / GST) | **Missing** | High | Medium | One-click Tally XML export and GST e-way bill / e-invoice JSON generator. |
| **Integrations** | E-commerce / B2B Web Portal Integration | **Missing** | Medium | High | REST/GraphQL APIs for live B2B website inventory sync (Shopify, WooCommerce). |
| **Integrations** | Payment Gateway Integration | **Missing** | Medium | Medium | Razorpay / Stripe payment links embedded in outward invoice PDFs. |
| **Integrations** | RapNet & External API Integration | **Have** | Low | Low | RapNet price list synchronization fully implemented. |
| **User & Security** | Role-Based Access Control (RBAC) | **Have** | Low | Low | Granular permission registry and route guard active. |
| **User & Security** | Audit Trail / Activity Log | **Have** | Low | Low | HTTP mutation logging, entity pre-snapshots, and activity history table. |
| **User & Security** | Data Backup & Multi-Format Export | **Have** | Low | Low | Excel stock export, PDF invoice/label generation. |
| **User & Security** | Two-Factor Authentication (2FA) Security | **Missing** | High | Low | Add TOTP (Google Authenticator) / WhatsApp OTP verification on login. |
| **UX & Modern** | Mobile-Responsive UI & Mobile PWA | **Partial** | High | High | Optimize table views for tablet/mobile devices & PWA offline manifest. |
| **UX & Modern** | Guided Workflows & Fast Keys | **Have** | Low | Low | Quick action toolbar, keyboard shortcuts on inventory tables. |
| **UX & Modern** | Notification System (WhatsApp / Email / SMS) | **Partial** | High | Low | In-app notifications exist; add Twilio / WhatsApp Business API trigger. |
| **UX & Modern** | Offline Mode with Background Sync | **Missing** | Low | High | Service worker offline caching for mobile stock check. |

---

## TOP 10 HIGH-PRIORITY MISSING FEATURES
*(Immediate Business Value & Maximum Impact)*

1. **Purchase Order (PO) & Quotation Workflow (Sales Order):**
   - *Why:* Prevents unauthorized purchases and enables strict approval hierarchy before stock inward. Allows formal sales quotations before direct outward.
2. **Tally ERP / GST Portal Integration:**
   - *Why:* Saves hours of manual accounting entry by generating Tally XML vouchers and official GST E-Way Bill JSON files directly from Sales/Purchase invoices.
3. **Multi-Warehouse & Multi-Bin Location Management:**
   - *Why:* Provides exact physical location tracking (Warehouse -> Safe -> Tray -> Box) with formal Inter-Branch Transfer Orders (ITR).
4. **Stock Aging & Dead-Stock Intelligence Matrix:**
   - *Why:* Identifies slow-moving/capital-locking inventory (>90/>180 days) with holding cost calculation to boost cash flow.
5. **Real-Time Automated Notification System (WhatsApp / Email / SMS):**
   - *Why:* Auto-sends Out-Memo due alerts, payment reminders, and invoice PDFs directly to customers via WhatsApp API.
6. **Profit Margin & Profitability Analysis per Stone/Category:**
   - *Why:* Real-time profit percentage (% margin) tracking per transaction to ensure sales reps maintain target gross margins.
7. **Proactive Low Stock & Reorder Point Warnings:**
   - *Why:* Prevents stockouts in high-velocity categories by raising automated low-stock warnings.
8. **Two-Factor Authentication (2FA) & IP Access Restrictions:**
   - *Why:* Protects high-value financial and diamond inventory data against credential theft.
9. **Mobile-Responsive PWA / Tablet Interface:**
   - *Why:* Enables field sales executives and trade-show representatives to check live stock and issue Memos from iPads/mobile devices.
10. **WebSocket Real-Time Multi-User Stock Sync:**
    - *Why:* Prevents double-allocation of stones when multiple sales reps access the same stock list simultaneously.

---

## QUICK WINS
*(Low Effort + High Priority — Quick Implementation < 1 Week)*

1. **Stock Aging Report & Dead-Stock Bucket:** Low effort SQL query grouping stones by `inward_date` (>60, >90, >180 days).
2. **Profit Margin Column on Sales & Reports:** Compute `((Sale Price - Cost) / Cost) * 100` dynamically on existing screens.
3. **Two-Factor Authentication (2FA via TOTP/Email OTP):** Integrate `speakeasy` / `qrcode` node packages into current `/user/login` flow.
4. **Automated WhatsApp / Email Invoice Dispatch:** Integrate WhatsApp Cloud API endpoint into existing `/product/mail` service.
5. **Vendor Performance & Scorecard View:** Aggregate average lead time and rejection rate per supplier from `dai_inward`.

---

## LONG-TERM ROADMAP ITEMS
*(High Effort Advanced Features — Future Phases)*

1. **AI-Driven Predictive Demand Forecasting & Auto-PO Generation (Phase 4):** ML models predicting category demand based on historical seasonal trends.
2. **B2B E-commerce Portal & Live API Webhooks (Phase 4):** Exposing real-time API gateways for Shopify, RapNet B2B, and custom customer portals.
3. **Custom Drag-and-Drop Report Builder (Phase 5):** Dynamic report query generator allowing custom column selection and saved views.
4. **Offline PWA Engine with IndexedDB Sync (Phase 5):** Complete offline inventory browsing and draft memo creation for trade shows without internet.
5. **AI Anomaly & Fraud Detection Engine (Phase 5):** Automated background scanner flagging abnormal price discounts or inventory discrepancies.
