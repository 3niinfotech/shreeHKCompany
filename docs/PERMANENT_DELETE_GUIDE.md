# Permanent Delete Architecture & Operational Guide

## Overview

The Permanent Delete feature in ShreeHK ERP enables authorized Super Admins to permanently and irreversibly purge all records associated with a **Company** or an entire **Branch** (and all companies belonging to it) across both the shared Meta database and all tenant fiscal-year databases.

---

## 1. Architecture & Multi-Tenant Data Discovery

### Architecture Summary
* **Shared Meta DB (`META_DB`)**: Houses system-wide entities: `branch`, `company`, `company_year`, `user`, `roll`, `notification`, `dai_quick_notes`, `dai_ai_conversation`, `user_track`, and `dai_activity_log`.
* **Fiscal Year Tenant DBs (`company_year.db_name`)**: Company transactional data (inventory, sales, invoices, purchases, memos, transfers, ledger entries) spans all fiscal years defined in `company_year`. Several companies share each tenant database, partitioned by the integer `company` column.
* **No Cascading Foreign Keys**: Relational integrity is enforced at the application layer. Deletion must systematically purge child tables prior to parent tables.
* **Never Deleted Tables**:
  - `dai_activity_log`: Persistent audit history.
  - `company_year`: Defines fiscal periods shared across all companies.
  - `user`: User accounts remain global; only company references are cleared.

### Runtime Schema Discovery
Before attempting to count or delete from any table in any database, `permanentDeleteService.js` queries `information_schema.TABLES` and `information_schema.COLUMNS`. If a table or column does not exist in a given DB, the operation cleanly skips it and appends a notice to `response.warnings`.

---

## 2. Mandatory Rules & Safeguards

1. **Atomic Branch Transactions**:
   A Branch delete executes in **ONE single database transaction** covering all companies within the branch. If any deletion fails, all operations roll back completely.
2. **`dai_gia` Special Isolation**:
   GIA diamond certificate records (`dai_gia`) do not have a `company` column (keyed by `sku`). The delete statement only purges SKUs that belong to the deleted company and do **not** exist in `dai_product` of any other active company.
3. **Session Safety Blocks**:
   - Deleting the company currently active in the user's session (`req.user.companyId === id`) is rejected with HTTP 400.
   - Deleting a branch that contains the user's active session company is rejected with HTTP 400.
4. **Strong Authentication & Confirmation**:
   - Double password verification (`password` and `confirmPassword` must match).
   - Exact entity name typed in uppercase/lowercase (`confirmName === entity.name`, paste disabled).
   - Super Admin authorization (`authenticateToken` + `isSuperAdmin`).
5. **Rate Limiting (Failures Only)**:
   - Tracks failed password attempts per `user_id`.
   - 5 consecutive failures triggers a 15-minute lockout (HTTP 429).
6. **Data Type Strictness**:
   - `user_track.company` is `VARCHAR(250)` storing company name (string comparison).
   - `notification.company` is `INT(11)` (numeric ID comparison).
   - `user.company_name` is safely set to `NULL` upon company deletion.
   - `roll.company` JSON array is cleanly updated to remove the deleted company ID.
7. **Post-Commit Audit Trail**:
   Audit entries (`PERMANENT_DELETE` in `dai_activity_log`) are written **after transaction commit** using a dedicated database connection to ensure they persist even if any subsequent client operation disconnects.
8. **File Cleanup**:
   Company logos stored in `uploads/company-logos/` are unlinked from disk post-commit.

---

## 3. How to Register a New Table in `permanentDeleteConfig.js`

To add a new table to the permanent deletion flow:

1. Open `ShreeHK_BackEnd/config/permanentDeleteConfig.js`.
2. Determine whether the table resides in tenant databases or the Meta database:

### A. For Tenant Database Tables
Add an entry to `TENANT_TABLES`:
```javascript
{
  table: "your_table_name",
  moduleLabel: "Module/Name",
  dbScope: "tenant",        // 'tenant' or 'meta'
  deleteType: "direct",     // 'direct', 'subquery', 'transfer_special', 'gia_special'
  companyColumn: "company", // or 'company_id'
  deleteOrder: 33           // set order so children delete before parents
}
```

### B. For Meta Database Tables
Add an entry to `META_TABLES`:
```javascript
{
  table: "your_meta_table",
  moduleLabel: "Module/Name",
  companyColumn: "company_id",
  matchType: "id_int",      // 'id_int' for INT ID, 'name_string' for VARCHAR company name
  deleteOrder: 5
}
```

---

## 4. Test Checklist & Verification Matrix

| # | Test Scenario | Expected Outcome | Result |
|---|---------------|------------------|--------|
| 1 | Impact Preview (`/delete-impact`) | Accurately calculates row count across all tenant DBs + meta DB | PASS |
| 2 | Wrong Password | HTTP 403, increments failure counter, keeps modal open | PASS |
| 3 | Mismatched Passwords | Form error displayed inline, submission prevented | PASS |
| 4 | Mismatched Name Confirmation | Form validation error, submission prevented | PASS |
| 5 | Non-Super-Admin Access | HTTP 403 from `isSuperAdmin` middleware | PASS |
| 6 | Delete Current Session Company | HTTP 400 "Cannot delete the company you are currently logged into" | PASS |
| 7 | Delete Current Session Branch | HTTP 400 "Cannot delete the branch your current session belongs to" | PASS |
| 8 | Multi-Company Branch Deletion | Single transaction purges all companies, branch_year, and branch | PASS |
| 9 | Shared Transfer Isolation | Removes transfer records without modifying other company's stock | PASS |
| 10 | Rollback on Failure | Transaction rolls back, 0 records deleted, database intact | PASS |
| 11 | 5 Failed Attempts Threshold | 6th attempt returns HTTP 429 with countdown timer | PASS |
| 12 | Post-Commit Audit & File Cleanup | Logo unlinked from disk, `PERMANENT_DELETE` logged in `dai_activity_log` | PASS |

