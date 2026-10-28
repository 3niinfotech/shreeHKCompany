# ShreeHK ERP — Backend API Reference

> Complete documentation of backend REST API endpoints, request headers, payload structures, and response formats for ShreeHK ERP.

---

## 1. Network & Protocol Conventions

### Base URL & Ports
- **Backend Service**: `http://localhost:3500`
- **Frontend Dev Client**: `http://localhost:5173`
- In development, the frontend communicates with the backend via the Vite dev server proxy (avoiding browser CORS pre-flight bottlenecks). `VITE_NODE_API_URL` is intentionally empty in the frontend `.env`.

### Mandatory Request Headers
Protected API routes require the following headers injected automatically by `src/api/client/axiosInstance.js`:

| Header Name | Type | Description |
|---|---|---|
| `Authorization` | `string` | Format: `Bearer <jwt_token>` |
| `X-Company-Id` | `string` | Active company ID (e.g., `"1"`) for row-level tenant filtering |
| `X-Year-Id` | `string` | Active fiscal year ID (e.g., `"2024"`) for dynamic tenant DB pool |
| `X-Branch-Id` | `string` | Active branch ID (e.g., `"HK"`, `"DXB"`) |
| `X-Audit-Page-Path` | `string` | Current frontend URL path (for `dai_activity_log` record tracking) |
| `X-Audit-Page-Label`| `string` | Human-readable screen title for audit logs |

---

## 2. Standard Response Envelopes

### 2.1 Success Response (`200 OK`)
```json
{
  "status": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "id": 101,
      "company": 1,
      "name": "Example Record"
    }
  ]
}
```
*(Note: Some legacy endpoints return payload in uppercase `"Data"` key; both are parsed by `src/utils/apiMessage.js`)*

### 2.2 Error Response (`400 Bad Request` / `500 Internal Server Error`)
```json
{
  "status": false,
  "message": "Invalid stone SKU provided"
}
```

### 2.3 Forbidden Access (`403 Forbidden`)
```json
{
  "status": false,
  "code": "FORBIDDEN_PAGE",
  "message": "You do not have permission to access this resource"
}
```

---

## 3. API Endpoints Catalog

### 3.1 Authentication & User Management
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/user/login` | Authenticate username/password, issue JWT with user claims |
| `POST` | `/user/logout` | Revoke current token JTI into blacklist cache |
| `GET` | `/getAdminManageUser` | List all users with assigned roles (super-admin only) |
| `POST` | `/admin-manage-user` | Create or update user profile, credentials, and company access |
| `POST` | `/manage-user/delete` | Soft delete / deactivate user account |
| `GET` | `/getLoginAllUsers` | Fetch lightweight user list for dropdown selectors |
| `GET` | `/api/profile/me` | Fetch active profile of currently logged-in user |
| `POST` | `/api/profile/update` | Update personal name, email, avatar |
| `POST` | `/api/profile/change-password` | Update personal account password |

### 3.2 Session & Multi-Tenant Portal
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/session/context` | Handshake current token, company, and year context |
| `POST` | `/session/context` | Switch active company/year/branch and reissue new JWT |
| `GET` | `/session/keepalive` | Polling heartbeat to track online user presence |
| `GET` | `/portal/company-years` | Get all available fiscal years for a specific company |
| `GET` | `/portal/branch-companies`| Get all companies mapped to the selected branch |
| `GET` | `/portal/years` | Get global fiscal years master list |
| `POST` | `/portal/year` | Add or update fiscal year boundary dates |

### 3.3 Master Data Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/master/company` | List company/party accounts with filter parameters |
| `POST` | `/company/save` | Create or update party master details |
| `POST` | `/company/delete` | Delete or deactivate party master record |
| `GET` | `/company/getOption` | Fast lookup options for party dropdowns |
| `GET` | `/master/shipping` | List shipping agents / carrier options |
| `POST` | `/shipping/save` | Create or update shipping agent record |
| `POST` | `/shipping/delete` | Delete shipping agent record |
| `GET` | `/master/origin` | List stone origin options (e.g. Russia, Botswana) |
| `POST` | `/origin/save` | Save or update origin record |
| `POST` | `/origin/delete` | Delete origin record |
| `GET` | `/master/lab` | List grading laboratories (GIA, IGI, HRD) |
| `POST` | `/lab/post` | Save or update lab record |
| `POST` | `/lab/delete` | Delete lab record |
| `GET` | `/master/category` | List stone shape categories (Round, Fancy, Pear) |
| `POST` | `/category/save` | Save or update shape category |
| `POST` | `/category/delete` | Delete shape category |
| `GET` | `/master/attribute` | List stone attributes (Color, Clarity, Cut, Polish) |
| `POST` | `/attribute/save` | Save attribute master value |
| `POST` | `/attribute/delete` | Delete attribute master value |
| `GET` | `/common/getIncrement` | Fetch next sequential document entry number |

### 3.4 Product & Diamond Inventory
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/product/inventory` | Search, filter, and paginate complete diamond inventory |
| `POST` | `/product/inventory/summary` | Aggregate total carats, total pieces, and values for filtered stones |
| `GET` | `/product/inventory/suggest` | Autocomplete stone SKUs and certificate numbers |
| `POST` | `/product/detail` | Fetch full technical diamond specifications by SKU/ID |
| `POST` | `/product/save` | Update diamond stone specifications, remarks, or prices |
| `POST` | `/product/holdDetail` | Apply, extend, or release hold reservation on diamonds |
| `POST` | `/product/change-price` | Bulk recalculate Rap discount % and per-carat prices |
| `POST` | `/product/label/print` | Generate PDF barcode stickers for thermal label printers |
| `POST` | `/product/label-a4/print` | Generate multi-stone A4 printable barcode sheets |
| `POST` | `/product/export` | Download diamond inventory as formatted Excel workbook |
| `POST` | `/product/i-export` | Download custom client-facing inventory spreadsheet |
| `POST` | `/product/mail` | Email selected diamond specifications to client |
| `GET` | `/product/history` | Audit lifecycle history of a specific diamond stone |
| `POST` | `/product/box/add-stones` | Assign loose diamond stones into a named Box container |
| `POST` | `/product/parcel/add-stones`| Assign loose diamond stones into a mixed Parcel container |
| `POST` | `/product/pair/assign` | Pair two matching diamonds together |
| `POST` | `/product/pair/unpair` | Separate paired diamonds back into single stones |

### 3.5 Inward & Outward Transactions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/inward/checkExist` | Validate if stone SKUs or certificate numbers already exist |
| `POST` | `/inward/save` | Post inward purchase or memo stock entry |
| `GET` | `/inward/:id` | Fetch inward document details by ID |
| `POST` | `/inward/update` | Modify an existing inward purchase/memo invoice |
| `POST` | `/outward/list` | Filter and paginate outward documents |
| `POST` | `/outward/save` | Post new outward invoice (Sale, Memo, Consignment, Lab) |
| `GET` | `/outward/:id` | Fetch outward document details with stone line items |
| `POST` | `/outward/update` | Update outward invoice details |
| `POST` | `/outward/delete` | Cancel outward document and return stones to safe |
| `POST` | `/outward/hold` | Place selected stones on customer hold |

### 3.6 Transaction Stock Movements
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/transaction/gia/list` | List diamonds currently out for GIA/IGI lab certification |
| `POST` | `/transaction/gia/return` | Process lab return (update graded specs and return to safe) |
| `POST` | `/transaction/inward-stock/list` | List stones received on In-Memo |
| `POST` | `/transaction/inward-stock/return` | Return In-Memo stones back to supplier |
| `POST` | `/transaction/inward-stock/memo-to-purchase`| Convert In-Memo stones into firm Purchase |
| `POST` | `/transaction/purchase-stock/list` | List all historical inward purchases |
| `POST` | `/transaction/outward-stock/list` | List stones given out on Out-Memo |
| `POST` | `/transaction/outward-stock/return` | Return Out-Memo stones back into safe |
| `POST` | `/transaction/outward-stock/memo-to-sale` | Convert Out-Memo stones into formal Sales invoice |
| `POST` | `/transaction/outward-stock/to-export` | Convert Out-Memo into international Export consignment |
| `POST` | `/transaction/print` | Fetch formatted print invoice data for A4 printing |
| `POST` | `/transaction/company-transfer` | Transfer stones between affiliated sister companies |
| `GET` | `/transaction/company-transfer/list` | List historical inter-company stone transfers |

### 3.7 Accounting & Double-Entry Ledger
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/expanse/get` | Fetch filtered expense entries |
| `POST` | `/expanse-payment` | Post operational expense voucher (Electricity, Salary, Rent) |
| `POST` | `/expanse-delete` | Delete expense entry |
| `GET` | `/advance/get` | List advance payment deposits |
| `POST` | `/advance-payment` | Post advance customer deposit or supplier advance |
| `POST` | `/advance-delete` | Void advance deposit record |
| `POST` | `/transaction` | Search double-entry general ledger books |
| `POST` | `/partywisetransaction` | Fetch party account statements, debit/credit ledger |
| `POST` | `/partywisetransaction/save` | Post manual accounting journal entry |
| `POST` | `/partywisetransaction/delete`| Delete manual journal entry |
| `GET` | `/balance/get` | List Cash and Bank accounts balance summary |
| `POST` | `/my-balance-book` | Record fund transfer between internal bank/cash books |
| `GET` | `/currency-rate/get` | List live currency exchange rates (USD, HKD, EUR, INR) |
| `POST` | `/currency-rate` | Set or update daily foreign exchange conversion rate |
| `GET` | `/accounting/group` | List primary accounting groups (Assets, Liabilities, etc.) |
| `GET` | `/accounting/subgroup` | List accounting sub-ledgers |

### 3.8 Reports & Business Analytics
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/report/outstanding` | Calculate outstanding receivables & payables balances |
| `POST` | `/report/outstanding/charge` | Apply interest or penalty charges on overdue invoices |
| `POST` | `/report/group` | Generate grouped financial trial balance reports |
| `POST` | `/report/sale-stock` | Sales performance report by diamond shape, color, clarity |
| `POST` | `/report/stone-history` | Audit trail of every transaction a diamond stone underwent |
| `POST` | `/report/transfer-history`| Report of all inter-branch/company transfers |
| `POST` | `/report/stone-info` | Search stones purchased by a specific client |
| `POST` | `/report/transaction` | Master transaction audit listing |

### 3.9 Admin, Roles & Activity Logs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/branch` | List configured business branches (HK, Dubai, Surat) |
| `POST` | `/admin/branch/save` | Add or update branch configuration |
| `GET` | `/admin/tenant-company` | List registered tenant companies |
| `POST` | `/admin/tenant-company/save`| Register or update tenant company profile |
| `GET` | `/role-list` | Fetch all user access roles |
| `POST` | `/role-add` | Create new role with granular permission matrix |
| `POST` | `/role-update` | Update permissions of an existing role |
| `POST` | `/role-delete` | Delete role |
| `GET` | `/permission-registry` | Fetch system catalog of all 65+ page permissions |
| `POST` | `/admin/activity-log` | Search audit trail log records (`dai_activity_log`) |
| `POST` | `/admin/activity-log/summary` | Aggregate audit logs by user, action type, and date |
| `POST` | `/admin/activity-log/export` | Export audit trail to PDF or Excel |

### 3.10 External Integrations (Lab & RapNet)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/lab/fetch` | Automatically query GIA/IGI API for official grading report |
| `POST` | `/api/lab/fetch-bulk` | Batch query official certificates for multiple stones |
| `POST` | `/api/lab/apply-to-stone` | Copy verified lab specs directly onto diamond record |
| `GET` | `/api/lab/providers/status` | Check API credentials status for GIA / IGI |
| `GET` | `/rapnet/prices` | Fetch current Rapaport price sheet benchmark matrix |
| `POST` | `/rapnet/update-price` | Update system diamond inventory against new Rap price list |
| `GET` | `/rapnet/live` | Stream live Rapaport ticker changes |

### 3.11 AI Assistant & Vision OCR
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/chat` | Send natural language prompt to AI Assistant |
| `POST` | `/ai/agent/query` | Execute autonomous database lookup via AI tool orchestrator |
| `POST` | `/ai/ocr/certificate` | Upload lab certificate image for Gemini Vision data extraction |
| `POST` | `/ai/stock-alert` | Generate AI inventory aging and low-stock alerts |
| `POST` | `/ai/price-suggest` | Generate AI competitive market pricing recommendations |
