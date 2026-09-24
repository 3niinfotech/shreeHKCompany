# Database Schema & Comparison Report
**Generated on:** 17/9/2026, 7:21:50 pm  
**Scope:** New Project (Node.js Backend & React/Vite Frontend - `shreehkweb_snj2024`) vs Old PHP Project (`venya` - `src.sql`)

---

## 📊 Summary Overview

| Metric | Old PHP Project (`venya`) | New Project (`shreehkweb_snj2024`) | Difference |
| :--- | :--- | :--- | :--- |
| **Total Tables** | **53** | **62** | **+9** New Tables |
| **New Tables Exclusively in New Project** | — | **9** | — |
| **Tables with New Columns Added** | — | **40** tables | — |
| **Old Tables Removed** | — | **0** | None |

---

## 1. 🆕 (a) NEW TABLES (Sirf Naye Project Me Available Hain)

Ye tables purane PHP project me bilkul nahi the, inhe naye project ke features ke liye banaya gaya hai:

| # | Table Name | Purpose / Description | Primary Key | Total Columns |
| :- | :--- | :--- | :--- | :- |
| 1 | `acc_transaction_copy` | Transaction backup / archive table | `id` | 20 |
| 2 | `admin_users` | Super-admin & management user credentials | `id` | 9 |
| 3 | `company_demo` | Demo / sandbox company setup template | `None` | 9 |
| 4 | `dai_activity_log` | User activity & audit trail logging | `id` | 18 |
| 5 | `dai_ai_conversation` | AI Chat Assistant conversation threads & messages | `id` | 8 |
| 6 | `dai_quick_notes` | Quick scratchpad & sticky notes system | `id` | 14 |
| 7 | `dai_rapnet_live_snapshot` | Live RapNet diamond price snapshots | `id` | 10 |
| 8 | `notification_read_state` | Per-user notification read/unread status | `user_id` | 3 |
| 9 | `dai_boxhistory` | Diamond box movement / audit tracking | `None` | 4 |

### New Tables Column Details:

#### Table: `acc_transaction_copy`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRI** |
| `book` | `varchar(20)` | YES | `NULL` | - |
| `currency` | `varchar(20)` | YES | `NULL` | - |
| `party` | `varchar(20)` | YES | `NULL` | - |
| `cheque` | `varchar(25)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `0.00` | - |
| `description` | `text` | YES | `NULL` | - |
| `type` | `varchar(20)` | YES | `NULL` | - |
| `balance` | `decimal(25,2)` | YES | `0.00` | - |
| `date` | `date` | YES | `NULL` | - |
| `under_group` | `int(11)` | YES | `NULL` | - |
| `under_subgroup` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `0` | - |
| `sale_id` | `varchar(20)` | YES | `NULL` | - |
| `purchase_id` | `varchar(20)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `0` | - |
| `deleted` | `tinyint(1)` | YES | `0` | - |
| `cross_id` | `varchar(50)` | YES | `NULL` | - |
| `date_time` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |
| `other_party` | `varchar(100)` | NO | NULL | - |


#### Table: `admin_users`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRI** |
| `username` | `varchar(255)` | NO | NULL | - |
| `password` | `varchar(255)` | NO | NULL | - |
| `email` | `varchar(255)` | YES | `NULL` | - |
| `created_at` | `timestamp` | NO | `current_timestamp()` | - |
| `fname` | `varchar(100)` | YES | `NULL` | - |
| `lname` | `varchar(100)` | YES | `NULL` | - |
| `mobileno` | `varchar(20)` | YES | `NULL` | - |
| `userroll` | `varchar(100)` | YES | `NULL` | - |


#### Table: `company_demo`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(100)` | NO | NULL | - |
| `company` | `varchar(100)` | YES | `NULL` | - |
| `cddress` | `varchar(100)` | YES | `NULL` | - |
| `country` | `varchar(100)` | YES | `NULL` | - |
| `email` | `varchar(100)` | YES | `NULL` | - |
| `contact_no` | `varchar(100)` | YES | `NULL` | - |
| `contact_person` | `varchar(100)` | YES | `NULL` | - |
| `website` | `varchar(100)` | YES | `NULL` | - |
| `bank_name` | `varchar(100)` | YES | `NULL` | - |


#### Table: `dai_activity_log`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint(20) unsigned` | NO | NULL | **PRI** |
| `company_id` | `int(11)` | NO | `1` | - |
| `user_id` | `int(11)` | YES | `NULL` | - |
| `user_name` | `varchar(255)` | NO | `''` | - |
| `user_role` | `varchar(100)` | NO | `''` | - |
| `user_role_id` | `int(11)` | YES | `NULL` | - |
| `action_type` | `varchar(50)` | NO | NULL | - |
| `module_name` | `varchar(100)` | NO | `''` | - |
| `record_id` | `varchar(64)` | YES | `NULL` | - |
| `record_reference` | `varchar(255)` | YES | `NULL` | - |
| `old_value` | `longtext` | YES | `NULL` | - |
| `new_value` | `longtext` | YES | `NULL` | - |
| `changed_fields` | `longtext` | YES | `NULL` | - |
| `description` | `text` | YES | `NULL` | - |
| `ip_address` | `varchar(64)` | YES | `NULL` | - |
| `user_agent` | `varchar(512)` | YES | `NULL` | - |
| `status` | `enum('success','attempted')` | NO | `'SUCCESS'` | - |
| `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | - |


#### Table: `dai_ai_conversation`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRI** |
| `user_id` | `int(11)` | NO | NULL | - |
| `company_id` | `int(11)` | NO | NULL | - |
| `thread_id` | `varchar(100)` | NO | NULL | - |
| `title` | `varchar(255)` | YES | `'New Conversation'` | - |
| `messages` | `longtext` | NO | NULL | - |
| `created_at` | `datetime` | YES | `current_timestamp()` | - |
| `updated_at` | `datetime` | YES | `current_timestamp()` | on update current_timestamp() |


#### Table: `dai_quick_notes`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRI** |
| `user_id` | `int(11)` | NO | NULL | - |
| `company_id` | `int(11)` | NO | NULL | - |
| `assigned_to` | `int(11)` | YES | `NULL` | - |
| `assigned_at` | `timestamp` | YES | `current_timestamp()` | - |
| `created_by` | `int(11)` | YES | `NULL` | - |
| `text` | `text` | NO | NULL | - |
| `target_date` | `date` | NO | NULL | - |
| `priority` | `enum('low','medium','high')` | NO | `'Medium'` | - |
| `completed` | `tinyint(1)` | NO | `0` | - |
| `completed_at` | `timestamp` | YES | `NULL` | - |
| `completed_by` | `int(11)` | YES | `NULL` | - |
| `created_at` | `timestamp` | NO | `current_timestamp()` | - |
| `updated_at` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


#### Table: `dai_rapnet_live_snapshot`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRI** |
| `recorded_at` | `datetime` | NO | NULL | - |
| `benchmark_price` | `decimal(14,4)` | NO | NULL | - |
| `change_pct` | `decimal(10,4)` | YES | `NULL` | - |
| `daily_high` | `decimal(14,4)` | YES | `NULL` | - |
| `daily_low` | `decimal(14,4)` | YES | `NULL` | - |
| `shape` | `varchar(32)` | YES | `NULL` | - |
| `color` | `varchar(16)` | YES | `NULL` | - |
| `clarity` | `varchar(16)` | YES | `NULL` | - |
| `source` | `varchar(16)` | NO | `'poll'` | - |


#### Table: `notification_read_state`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `int(11)` | NO | NULL | **PRI** |
| `last_read_notification_id` | `int(11)` | NO | `0` | - |
| `updated_at` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


#### Table: `dai_boxhistory`
| Column Name | Data Type | Nullable | Default | Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `product_id` | `int` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `party` | `varchar` | YES | NULL | - |


---

## 2. ➕ (b) NEW COLUMNS IN EXISTING TABLES (Purane Tables Me Naye Columns)

Niche di gayi tables purane project me bhi thi, lekin naye project me inme naye columns add kiye gaye hain:


### Table: `acc_advance` (+13 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `use_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `balance_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `type` | `varchar(150)` | YES | `NULL` | - |
| `book` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `deleted` | `tinyint(1)` | YES | `0` | - |
| `transaction_id` | `int(11)` | YES | `NULL` | - |
| `invoice` | `varchar(250)` | YES | `NULL` | - |
| `cheque` | `varchar(250)` | NO | NULL | - |
| `description` | `varchar(500)` | NO | NULL | - |
| `invoice_id` | `varchar(10)` | NO | NULL | - |
| `assign_date` | `date` | NO | NULL | - |


### Table: `acc_subgroup` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `under` | `int(11)` | YES | `NULL` | - |


### Table: `acc_transaction` (+18 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `currency` | `varchar(20)` | YES | `NULL` | - |
| `party` | `varchar(20)` | YES | `NULL` | - |
| `cheque` | `varchar(25)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `0.00` | - |
| `description` | `text` | YES | `NULL` | - |
| `type` | `varchar(20)` | YES | `NULL` | - |
| `balance` | `decimal(25,2)` | YES | `0.00` | - |
| `date` | `date` | YES | `NULL` | - |
| `under_group` | `int(11)` | YES | `NULL` | - |
| `under_subgroup` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `0` | - |
| `sale_id` | `varchar(20)` | YES | `NULL` | - |
| `purchase_id` | `varchar(20)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `0` | - |
| `deleted` | `tinyint(1)` | YES | `0` | - |
| `cross_id` | `varchar(50)` | YES | `NULL` | - |
| `date_time` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |
| `other_party` | `varchar(100)` | NO | NULL | - |


### Table: `applist` (+7 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `mobile` | `varchar(100)` | YES | `NULL` | - |
| `uuid` | `varchar(70)` | YES | `NULL` | - |
| `platform` | `varchar(70)` | YES | `NULL` | - |
| `version` | `varchar(70)` | YES | `NULL` | - |
| `company` | `varchar(70)` | YES | `NULL` | - |
| `serial` | `varchar(70)` | YES | `NULL` | - |
| `datetime` | `timestamp` | YES | `NULL` | on update current_timestamp() |


### Table: `category` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `company` | `int(11)` | NO | `1` | - |


### Table: `company` (+25 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `varchar(500)` | YES | `NULL` | - |
| `number` | `varchar(15)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `type` | `varchar(60)` | YES | `NULL` | - |
| `partner` | `varchar(500)` | YES | `NULL` | - |
| `city` | `varchar(50)` | YES | `NULL` | - |
| `state` | `varchar(50)` | YES | `NULL` | - |
| `pincode` | `varchar(10)` | YES | `NULL` | - |
| `country` | `varchar(30)` | YES | `NULL` | - |
| `email` | `varchar(80)` | YES | `NULL` | - |
| `website` | `varchar(80)` | YES | `NULL` | - |
| `panno` | `varchar(30)` | YES | `NULL` | - |
| `tinno` | `varchar(30)` | YES | `NULL` | - |
| `iecno` | `varchar(30)` | YES | `NULL` | - |
| `vatno` | `varchar(30)` | YES | `NULL` | - |
| `vwef` | `date` | YES | `NULL` | - |
| `cstno` | `varchar(30)` | YES | `NULL` | - |
| `cwef` | `date` | YES | `NULL` | - |
| `period` | `varchar(30)` | YES | `NULL` | - |
| `startdate` | `date` | YES | `NULL` | - |
| `enddate` | `date` | YES | `NULL` | - |
| `rapnet_id` | `varchar(100)` | YES | `NULL` | - |
| `rapnet_password` | `varchar(100)` | YES | `NULL` | - |
| `shortcutName` | `varchar(255)` | YES | `NULL` | - |
| `logo` | `varchar(500)` | YES | `NULL` | - |


### Table: `dai_attribute` (+6 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `varchar(100)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `status` | `tinyint(1)` | YES | `NULL` | - |
| `required` | `tinyint(1)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `short_order` | `int(11)` | YES | `NULL` | - |


### Table: `dai_attribute_value` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `label` | `varchar(150)` | YES | `NULL` | - |


### Table: `dai_balance` (+5 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRI** |
| `bank` | `varchar(255)` | YES | `NULL` | - |
| `cash` | `decimal(25,2)` | YES | `NULL` | - |
| `credit` | `decimal(25,2)` | YES | `NULL` | - |
| `company` | `int(11)` | NO | `1` | - |


### Table: `dai_bank` (+4 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `account_number` | `varchar(100)` | YES | `NULL` | - |
| `bank` | `varchar(150)` | YES | `NULL` | - |
| `bank_code` | `varchar(50)` | YES | `NULL` | - |
| `swift_code` | `varchar(100)` | YES | `NULL` | - |


### Table: `dai_book` (+3 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `currency` | `varchar(100)` | YES | `NULL` | - |
| `balance` | `decimal(25,2)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |


### Table: `dai_currencyrate` (+3 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `USD` | `decimal(25,2)` | YES | `NULL` | - |
| `HKD` | `decimal(25,2)` | YES | `NULL` | - |
| `company` | `int(11)` | NO | `1` | - |


### Table: `dai_errors` (+2 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `error_message` | `text` | YES | `NULL` | - |
| `date` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


### Table: `dai_gia` (+2 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `report` | `varchar(50)` | YES | `NULL` | - |
| `value` | `text` | YES | `NULL` | - |


### Table: `dai_history` (+16 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `date` | YES | `NULL` | - |
| `action` | `varchar(250)` | YES | `NULL` | - |
| `party` | `varchar(10)` | YES | `NULL` | - |
| `description` | `text` | YES | `NULL` | - |
| `narretion` | `text` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `invoice` | `varchar(50)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `entryno` | `int(11)` | YES | `NULL` | - |
| `entry_from` | `varchar(100)` | YES | `NULL` | - |
| `balance_pcs` | `decimal(25,0)` | YES | `NULL` | - |
| `balance_carat` | `decimal(25,3)` | YES | `NULL` | - |


### Table: `dai_incrementid` (+5 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `outward` | `varchar(50)` | YES | `NULL` | - |
| `reference` | `varchar(50)` | YES | `NULL` | - |
| `invoice` | `varchar(50)` | YES | `NULL` | - |
| `memo_invoice` | `varchar(10)` | YES | `NULL` | - |
| `lab_invoice` | `varchar(10)` | YES | `NULL` | - |


### Table: `dai_inward` (+28 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `varchar(255)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `reference` | `varchar(255)` | YES | `NULL` | - |
| `invoiceno` | `varchar(255)` | YES | `NULL` | - |
| `invoicedate` | `date` | YES | `NULL` | - |
| `terms` | `varchar(255)` | YES | `NULL` | - |
| `duedate` | `date` | YES | `NULL` | - |
| `party` | `varchar(255)` | YES | `NULL` | - |
| `inward_type` | `varchar(255)` | YES | `NULL` | - |
| `company` | `varchar(255)` | YES | `NULL` | - |
| `narretion` | `varchar(500)` | YES | `NULL` | - |
| `products` | `text` | YES | `NULL` | - |
| `return_products` | `text` | YES | `NULL` | - |
| `final_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `paid_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `due_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `shipping_name` | `varchar(150)` | YES | `NULL` | - |
| `shipping_charge` | `decimal(25,2)` | YES | `NULL` | - |
| `charge` | `decimal(25,2)` | YES | `NULL` | - |
| `origin_of` | `varchar(50)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `deleted` | `tinyint(1)` | YES | `NULL` | - |


### Table: `dai_jewelry` (+14 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `date` | YES | `NULL` | - |
| `gross_cts` | `decimal(25,2)` | YES | `NULL` | - |
| `labour_fee` | `decimal(25,2)` | YES | `NULL` | - |
| `gold_type` | `varchar(150)` | YES | `NULL` | - |
| `gold_gram` | `decimal(25,2)` | YES | `NULL` | - |
| `gold_price` | `decimal(25,2)` | YES | `NULL` | - |
| `gold_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `total_pcs` | `int(11)` | YES | `NULL` | - |
| `total_carat` | `decimal(25,2)` | YES | `NULL` | - |
| `total_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `cost_price` | `decimal(25,2)` | YES | `NULL` | - |
| `percentage` | `decimal(25,2)` | YES | `NULL` | - |
| `final_cost` | `decimal(25,2)` | YES | `NULL` | - |
| `narretion` | `text` | YES | `NULL` | - |


### Table: `dai_jewelry_products` (+6 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `report` | `varchar(150)` | YES | `NULL` | - |
| `color` | `varchar(150)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,2)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `total_amount` | `decimal(25,2)` | YES | `NULL` | - |


### Table: `dai_lab` (+4 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `date` | YES | `NULL` | - |
| `products` | `varchar(1000)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `user` | `varchar(50)` | YES | `NULL` | - |


### Table: `dai_mail` (+5 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `subject` | `varchar(500)` | YES | `NULL` | - |
| `content` | `longtext` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `exportProducts` | `longtext` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |


### Table: `dai_origin` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `company` | `int(11)` | NO | `1` | - |


### Table: `dai_outward` (+39 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `varchar(255)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `reference` | `varchar(255)` | YES | `NULL` | - |
| `invoiceno` | `varchar(255)` | YES | `NULL` | - |
| `invoicedate` | `date` | YES | `NULL` | - |
| `terms` | `varchar(255)` | YES | `NULL` | - |
| `duedate` | `date` | YES | `NULL` | - |
| `party` | `varchar(255)` | YES | `NULL` | - |
| `type` | `varchar(255)` | YES | `NULL` | - |
| `company` | `varchar(255)` | YES | `NULL` | - |
| `narretion` | `varchar(500)` | YES | `NULL` | - |
| `products` | `text` | YES | `NULL` | - |
| `return_products` | `text` | YES | `NULL` | - |
| `status` | `varchar(150)` | YES | `NULL` | - |
| `paid_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `due_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `part` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `final_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `charge` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `shipping_charge` | `decimal(25,2)` | YES | `NULL` | - |
| `shipping_name` | `varchar(150)` | YES | `NULL` | - |
| `origin_of` | `varchar(50)` | YES | `NULL` | - |
| `cif` | `varchar(255)` | YES | `NULL` | - |
| `lab` | `varchar(255)` | NO | NULL | - |
| `out_product` | `text` | YES | `NULL` | - |
| `bank` | `int(11)` | YES | `NULL` | - |
| `invoice_from` | `int(11)` | NO | NULL | - |
| `boc` | `int(11)` | NO | NULL | - |
| `citi` | `int(11)` | NO | NULL | - |
| `dbs` | `int(11)` | NO | NULL | - |
| `sc` | `int(11)` | NO | NULL | - |
| `boc_sksm` | `int(11)` | NO | NULL | - |
| `citi_sksm` | `int(11)` | NO | NULL | - |
| `other_party` | `varchar(100)` | NO | NULL | - |


### Table: `dai_party` (+18 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `text` | YES | `NULL` | - |
| `country` | `varchar(100)` | YES | `NULL` | - |
| `pincode` | `varchar(20)` | YES | `NULL` | - |
| `email` | `varchar(100)` | YES | `NULL` | - |
| `contact_number` | `varchar(30)` | YES | `NULL` | - |
| `fax` | `varchar(20)` | YES | `NULL` | - |
| `contact_person` | `varchar(150)` | YES | `NULL` | - |
| `website` | `varchar(50)` | YES | `NULL` | - |
| `bank_name` | `varchar(150)` | YES | `NULL` | - |
| `bank_address` | `varchar(500)` | YES | `NULL` | - |
| `account_number` | `varchar(30)` | YES | `NULL` | - |
| `branch` | `varchar(50)` | YES | `NULL` | - |
| `swift_code` | `varchar(50)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `under_group` | `int(11)` | YES | `NULL` | - |
| `under_subgroup` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |


### Table: `dai_product` (+54 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `diamond_no` | `varchar(255)` | YES | `NULL` | - |
| `sku` | `varchar(255)` | YES | `NULL` | - |
| `pair` | `varchar(255)` | YES | `NULL` | - |
| `rought_pcs` | `int(11)` | YES | `NULL` | - |
| `rought_carat` | `decimal(25,3)` | YES | `NULL` | - |
| `polish_pcs` | `int(11)` | YES | `NULL` | - |
| `polish_carat` | `decimal(25,3)` | YES | `NULL` | - |
| `cost` | `decimal(25,2)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `main_group` | `varchar(255)` | YES | `NULL` | - |
| `sub_group` | `varchar(255)` | YES | `NULL` | - |
| `remark` | `varchar(255)` | YES | `NULL` | - |
| `location` | `varchar(50)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `company` | `varchar(255)` | YES | `NULL` | - |
| `inward_id` | `int(11)` | YES | `NULL` | - |
| `group_type` | `varchar(50)` | YES | `NULL` | - |
| `lab` | `varchar(100)` | YES | `NULL` | - |
| `send_to_lab` | `tinyint(1)` | YES | `NULL` | - |
| `outward` | `varchar(50)` | YES | `NULL` | - |
| `box_products` | `varchar(500)` | YES | `NULL` | - |
| `parcel_products` | `varchar(500)` | YES | `NULL` | - |
| `box_id` | `varchar(50)` | YES | `NULL` | - |
| `parcel_id` | `varchar(50)` | YES | `NULL` | - |
| `hold` | `tinyint(1)` | NO | `0` | - |
| `site_upload` | `tinyint(1)` | YES | `NULL` | - |
| `rapnet_upload` | `tinyint(1)` | YES | `NULL` | - |
| `is_uploadsite` | `tinyint(1)` | NO | `1` | - |
| `is_uploadrapnet` | `tinyint(1)` | NO | `1` | - |
| `visibility` | `tinyint(1)` | NO | `1` | - |
| `parent_id` | `int(11)` | YES | `NULL` | - |
| `transaction` | `varchar(15)` | YES | `NULL` | - |
| `main_color` | `varchar(200)` | YES | `NULL` | - |
| `outward_parent` | `int(11)` | YES | `NULL` | - |
| `child_count` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `sell_price` | `decimal(25,2)` | YES | `NULL` | - |
| `sell_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `hide` | `tinyint(1)` | YES | `0` | - |
| `purchase_carat` | `decimal(25,3)` | YES | `NULL` | - |
| `purchase_pcs` | `int(11)` | YES | `NULL` | - |
| `purchase_price` | `decimal(25,2)` | YES | `NULL` | - |
| `purchase_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `rap_price` | `decimal(25,2)` | YES | `NULL` | - |
| `rap_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `inward` | `varchar(255)` | YES | `NULL` | - |
| `barcode` | `varchar(50)` | YES | `NULL` | - |
| `indexonline_id` | `varchar(100)` | NO | NULL | - |
| `category` | `varchar(500)` | NO | NULL | - |
| `argyle_color` | `varchar(100)` | NO | NULL | - |
| `in_house_clarity` | `varchar(100)` | NO | NULL | - |
| `mining` | `varchar(100)` | NO | NULL | - |
| `origin` | `varchar(100)` | NO | NULL | - |


### Table: `dai_product_delete` (+6 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `pcs` | `decimal(25,2)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `inward_id` | `int(11)` | YES | `NULL` | - |
| `description` | `varchar(500)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |


### Table: `dai_product_return` (+8 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |


### Table: `dai_product_value` (+18 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `report_no` | `varchar(250)` | YES | `NULL` | - |
| `shape` | `varchar(250)` | YES | `NULL` | - |
| `color` | `varchar(250)` | YES | `NULL` | - |
| `clarity` | `varchar(250)` | YES | `NULL` | - |
| `size` | `varchar(250)` | YES | `NULL` | - |
| `polish` | `varchar(250)` | YES | `NULL` | - |
| `f_intensity` | `varchar(250)` | YES | `NULL` | - |
| `symmentry` | `varchar(250)` | YES | `NULL` | - |
| `cut` | `varchar(250)` | YES | `NULL` | - |
| `mesurment` | `varchar(250)` | YES | `NULL` | - |
| `table_pc` | `varchar(250)` | YES | `NULL` | - |
| `depth_pc` | `varchar(250)` | YES | `NULL` | - |
| `gridle` | `varchar(250)` | YES | `NULL` | - |
| `intensity` | `varchar(250)` | YES | `NULL` | - |
| `overtone` | `varchar(250)` | YES | `NULL` | - |
| `package` | `varchar(250)` | YES | `NULL` | - |
| `bgm` | `varchar(255)` | YES | `NULL` | - |
| `eyeclean` | `varchar(255)` | YES | `NULL` | - |


### Table: `dai_rapnetprice` (+6 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `low_size` | `varchar(255)` | YES | `NULL` | - |
| `high_size` | `varchar(255)` | YES | `NULL` | - |
| `color` | `varchar(255)` | YES | `NULL` | - |
| `clarity` | `varchar(255)` | YES | `NULL` | - |
| `caratprice` | `varchar(255)` | YES | `NULL` | - |
| `date` | `varchar(100)` | YES | `NULL` | - |


### Table: `dai_shipping` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `company` | `int(11)` | NO | `1` | - |


### Table: `dai_temp` (+3 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `no` | `int(11)` | YES | `NULL` | - |
| `code` | `varchar(250)` | YES | `NULL` | - |
| `value` | `longtext` | YES | `NULL` | - |


### Table: `notification` (+5 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `message` | `varchar(500)` | YES | `NULL` | - |
| `image` | `varchar(255)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `datetine` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


### Table: `resource` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `varchar(100)` | YES | `NULL` | - |


### Table: `roll` (+3 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `resource` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `company` | `text` | YES | `NULL` | - |


### Table: `sms_external` (+7 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `varchar(50)` | YES | `NULL` | - |
| `qty` | `int(11)` | YES | `NULL` | - |
| `price` | `decimal(10,0)` | YES | `NULL` | - |
| `chalan` | `varchar(50)` | YES | `NULL` | - |
| `remark` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `stock` | `int(11)` | YES | `NULL` | - |


### Table: `sms_internal` (+7 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `person` | `varchar(50)` | YES | `NULL` | - |
| `item` | `varchar(50)` | YES | `NULL` | - |
| `qty` | `int(11)` | YES | `NULL` | - |
| `price` | `decimal(10,0)` | YES | `NULL` | - |
| `inhouse` | `int(11)` | YES | `NULL` | - |
| `remark` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |


### Table: `sms_stock` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `datetime` | YES | `NULL` | - |


### Table: `user` (+26 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `user_email` | `varchar(255)` | YES | `NULL` | - |
| `pass` | `varchar(255)` | YES | `NULL` | - |
| `first_name` | `varchar(100)` | YES | `NULL` | - |
| `last_name` | `varchar(100)` | YES | `NULL` | - |
| `address` | `text` | YES | `NULL` | - |
| `company_name` | `varchar(255)` | YES | `NULL` | - |
| `tel_no` | `varchar(25)` | YES | `NULL` | - |
| `fax_no` | `varchar(25)` | YES | `NULL` | - |
| `rapnet_id` | `varchar(50)` | YES | `NULL` | - |
| `skype_id` | `varchar(50)` | YES | `NULL` | - |
| `wechat_id` | `varchar(50)` | YES | `NULL` | - |
| `qq_id` | `varchar(50)` | YES | `NULL` | - |
| `mobile` | `varchar(20)` | YES | `NULL` | - |
| `welcommess` | `text` | YES | `NULL` | - |
| `formality` | `varchar(255)` | YES | `NULL` | - |
| `type` | `varchar(12)` | YES | `NULL` | - |
| `roll` | `int(11)` | YES | `NULL` | - |
| `online` | `tinyint(1)` | YES | `NULL` | - |
| `profile_image` | `varchar(150)` | YES | `NULL` | - |
| `is_active` | `tinyint(1)` | NO | `1` | - |
| `designation` | `varchar(150)` | YES | `NULL` | - |
| `department` | `varchar(150)` | YES | `NULL` | - |
| `joining_date` | `date` | YES | `NULL` | - |
| `created_by` | `int(11)` | YES | `NULL` | - |
| `created_at` | `datetime` | YES | `current_timestamp()` | - |
| `updated_at` | `datetime` | YES | `current_timestamp()` | on update current_timestamp() |


### Table: `user_old` (+16 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `e_mail` | `varchar(255)` | YES | `NULL` | - |
| `password` | `varchar(255)` | YES | `NULL` | - |
| `verify_key` | `varchar(255)` | YES | `NULL` | - |
| `status` | `varchar(20)` | YES | `NULL` | - |
| `subscription` | `varchar(50)` | YES | `NULL` | - |
| `created_at` | `datetime` | YES | `NULL` | - |
| `expired_at` | `datetime` | YES | `NULL` | - |
| `type` | `varchar(12)` | YES | `NULL` | - |
| `firstname` | `varchar(100)` | YES | `NULL` | - |
| `lastname` | `varchar(100)` | YES | `NULL` | - |
| `address` | `text` | YES | `NULL` | - |
| `company_name` | `varchar(255)` | YES | `NULL` | - |
| `mobile` | `varchar(20)` | YES | `NULL` | - |
| `roll` | `int(11)` | YES | `NULL` | - |
| `online` | `tinyint(1)` | YES | `NULL` | - |
| `profile_image` | `varchar(300)` | YES | `NULL` | - |


### Table: `user_track` (+1 New Columns)
| Column Name | Data Type | Nullable | Default Value | Key / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `company` | `varchar(250)` | YES | `NULL` | - |


---

## 3. 🔄 (c) DATA TYPE & DEFINITION CHANGES (Purane vs Naye me badlaav)

Purane vs naye schema me columns ke type, default ya nullability me hue major badlaav:


### Table: `acc_advance`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `party` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `amount` | `decimal` | `decimal(25,2)` | YES | YES | NULL | `NULL` |


### Table: `acc_group`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(200)` | YES | YES | NULL | `NULL` |


### Table: `acc_subgroup`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(500)` | YES | YES | NULL | `NULL` |


### Table: `acc_transaction`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `book` | `varchar` | `varchar(20)` | YES | YES | NULL | `NULL` |


### Table: `applist`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(100)` | YES | YES | NULL | `NULL` |


### Table: `category`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `parent` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `chat_history`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `sender` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `receiver` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `new` | `tinyint` | `tinyint(1)` | YES | YES | NULL | `NULL` |


### Table: `company`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `company_year`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `dai_attribute`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(100)` | YES | YES | NULL | `NULL` |


### Table: `dai_attribute_value`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `attribute_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `code` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_balance`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `currency` | `varchar` | `varchar(50)` | YES | YES | NULL | `NULL` |


### Table: `dai_bank`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `ac_name` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_book`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `book` | `varchar` | `varchar(100)` | YES | YES | NULL | `NULL` |


### Table: `dai_currencyrate`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `currency` | `varchar` | `varchar(100)` | YES | YES | NULL | `NULL` |


### Table: `dai_errors`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `error_id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `product_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `sku` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_gia`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `sku` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_history`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `product_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `sku` | `varchar` | `varchar(250)` | YES | YES | NULL | `NULL` |


### Table: `dai_hold`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `user` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `dai_incrementid`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `company` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `inward` | `varchar` | `varchar(50)` | YES | YES | NULL | `NULL` |


### Table: `dai_invoice`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `dai_inward`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `entryno` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_jewelry`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `sku` | `varchar` | `varchar(100)` | YES | YES | NULL | `NULL` |


### Table: `dai_jewelry_products`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `jewelry_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `product_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `sku` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_lab`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `lab` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_mail`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `email` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_note`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `user` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `company` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `status` | `tinyint` | `tinyint(1)` | YES | YES | NULL | `0` |


### Table: `dai_origin`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `dai_outward`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `entryno` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_party`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `dai_product`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `mfg_code` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_product_delete`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `product_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `sku` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_product_lab`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `deleted` | `tinyint` | `tinyint(4)` | NO | NO | NULL | NULL |


### Table: `dai_product_return`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `product_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `outward_id` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `sku` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_product_value`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pid` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `product_id` | `varchar` | `varchar(11)` | YES | YES | NULL | `NULL` |


### Table: `dai_rapnetprice`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `rapnetprice_id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `shape` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `dai_shipping`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `dai_stockmanage`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `dai_temp`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `user` | `varchar` | `varchar(500)` | YES | YES | NULL | `NULL` |


### Table: `error`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |


### Table: `notification`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `title` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `resource`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `code` | `varchar` | `varchar(50)` | YES | YES | NULL | `NULL` |


### Table: `roll`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(150)` | YES | YES | NULL | `NULL` |


### Table: `sms_department`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(80)` | YES | YES | NULL | `NULL` |


### Table: `sms_external`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `vendor` | `varchar` | `varchar(50)` | YES | YES | NULL | `NULL` |


### Table: `sms_internal`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `department` | `varchar` | `varchar(50)` | YES | YES | NULL | `NULL` |


### Table: `sms_item`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(80)` | YES | YES | NULL | `NULL` |


### Table: `sms_person`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(80)` | YES | YES | NULL | `NULL` |


### Table: `sms_stock`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `external` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `qty` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `price` | `decimal` | `decimal(10,0)` | YES | YES | NULL | `NULL` |


### Table: `sms_vendor`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `name` | `varchar` | `varchar(80)` | YES | YES | NULL | `NULL` |


### Table: `user`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `user_id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `user_name` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `user_old`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `user_name` | `varchar` | `varchar(255)` | YES | YES | NULL | `NULL` |


### Table: `user_track`
| Column Name | Old Type (PHP `venya`) | New Type (Node `shreehkweb`) | Old Nullable | New Nullable | Old Default | New Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | `int(11)` | NO | NO | NULL | NULL |
| `user` | `int` | `int(11)` | YES | YES | `NULL` | `NULL` |
| `action` | `varchar` | `varchar(250)` | YES | YES | NULL | `NULL` |


---

## 4. 🗄️ COMPLETE SCHEMA: NAYA PROJECT (`shreehkweb_snj2024`)

Naye project ke saare **62 tables** ka complete column-by-column schema:


### 1. `acc_advance`
- **Primary Key(s):** `id`
- **Total Columns:** 17

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `party` | `int(11)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `use_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `balance_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `type` | `varchar(150)` | YES | `NULL` | - |
| `book` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `deleted` | `tinyint(1)` | YES | `0` | - |
| `transaction_id` | `int(11)` | YES | `NULL` | - |
| `invoice` | `varchar(250)` | YES | `NULL` | - |
| `cheque` | `varchar(250)` | NO | NULL | - |
| `description` | `varchar(500)` | NO | NULL | - |
| `invoice_id` | `varchar(10)` | NO | NULL | - |
| `assign_date` | `date` | NO | NULL | - |


### 2. `acc_group`
- **Primary Key(s):** `id`
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(200)` | YES | `NULL` | - |


### 3. `acc_subgroup`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(500)` | YES | `NULL` | - |
| `under` | `int(11)` | YES | `NULL` | - |


### 4. `acc_transaction`
- **Primary Key(s):** `id`
- **Total Columns:** 20

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `book` | `varchar(20)` | YES | `NULL` | - |
| `currency` | `varchar(20)` | YES | `NULL` | - |
| `party` | `varchar(20)` | YES | `NULL` | - |
| `cheque` | `varchar(25)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `0.00` | - |
| `description` | `text` | YES | `NULL` | - |
| `type` | `varchar(20)` | YES | `NULL` | - |
| `balance` | `decimal(25,2)` | YES | `0.00` | - |
| `date` | `date` | YES | `NULL` | - |
| `under_group` | `int(11)` | YES | `NULL` | - |
| `under_subgroup` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `0` | - |
| `sale_id` | `varchar(20)` | YES | `NULL` | - |
| `purchase_id` | `varchar(20)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `0` | - |
| `deleted` | `tinyint(1)` | YES | `0` | - |
| `cross_id` | `varchar(50)` | YES | `NULL` | - |
| `date_time` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |
| `other_party` | `varchar(100)` | NO | NULL | - |


### 5. `acc_transaction_copy`
- **Primary Key(s):** `id`
- **Total Columns:** 20

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `book` | `varchar(20)` | YES | `NULL` | - |
| `currency` | `varchar(20)` | YES | `NULL` | - |
| `party` | `varchar(20)` | YES | `NULL` | - |
| `cheque` | `varchar(25)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `0.00` | - |
| `description` | `text` | YES | `NULL` | - |
| `type` | `varchar(20)` | YES | `NULL` | - |
| `balance` | `decimal(25,2)` | YES | `0.00` | - |
| `date` | `date` | YES | `NULL` | - |
| `under_group` | `int(11)` | YES | `NULL` | - |
| `under_subgroup` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `0` | - |
| `sale_id` | `varchar(20)` | YES | `NULL` | - |
| `purchase_id` | `varchar(20)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `0` | - |
| `deleted` | `tinyint(1)` | YES | `0` | - |
| `cross_id` | `varchar(50)` | YES | `NULL` | - |
| `date_time` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |
| `other_party` | `varchar(100)` | NO | NULL | - |


### 6. `admin_users`
- **Primary Key(s):** `id`
- **Total Columns:** 9

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `username` | `varchar(255)` | NO | NULL | - |
| `password` | `varchar(255)` | NO | NULL | - |
| `email` | `varchar(255)` | YES | `NULL` | - |
| `created_at` | `timestamp` | NO | `current_timestamp()` | - |
| `fname` | `varchar(100)` | YES | `NULL` | - |
| `lname` | `varchar(100)` | YES | `NULL` | - |
| `mobileno` | `varchar(20)` | YES | `NULL` | - |
| `userroll` | `varchar(100)` | YES | `NULL` | - |


### 7. `applist`
- **Primary Key(s):** `id`
- **Total Columns:** 9

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(100)` | YES | `NULL` | - |
| `mobile` | `varchar(100)` | YES | `NULL` | - |
| `uuid` | `varchar(70)` | YES | `NULL` | - |
| `platform` | `varchar(70)` | YES | `NULL` | - |
| `version` | `varchar(70)` | YES | `NULL` | - |
| `company` | `varchar(70)` | YES | `NULL` | - |
| `serial` | `varchar(70)` | YES | `NULL` | - |
| `datetime` | `timestamp` | YES | `NULL` | on update current_timestamp() |


### 8. `category`
- **Primary Key(s):** `id`
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(100)` | NO | NULL | - |
| `parent` | `int(11)` | NO | NULL | - |
| `company` | `int(11)` | NO | `1` | - |


### 9. `chat_history`
- **Primary Key(s):** `id`
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `sender` | `int(11)` | YES | `NULL` | - |
| `receiver` | `int(11)` | YES | `NULL` | - |
| `message` | `longtext` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `attachement` | `longtext` | YES | `NULL` | - |
| `new` | `tinyint(1)` | YES | `NULL` | - |


### 10. `company`
- **Primary Key(s):** `id`
- **Total Columns:** 27

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(150)` | YES | `NULL` | - |
| `address` | `varchar(500)` | YES | `NULL` | - |
| `number` | `varchar(15)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `type` | `varchar(60)` | YES | `NULL` | - |
| `partner` | `varchar(500)` | YES | `NULL` | - |
| `city` | `varchar(50)` | YES | `NULL` | - |
| `state` | `varchar(50)` | YES | `NULL` | - |
| `pincode` | `varchar(10)` | YES | `NULL` | - |
| `country` | `varchar(30)` | YES | `NULL` | - |
| `email` | `varchar(80)` | YES | `NULL` | - |
| `website` | `varchar(80)` | YES | `NULL` | - |
| `panno` | `varchar(30)` | YES | `NULL` | - |
| `tinno` | `varchar(30)` | YES | `NULL` | - |
| `iecno` | `varchar(30)` | YES | `NULL` | - |
| `vatno` | `varchar(30)` | YES | `NULL` | - |
| `vwef` | `date` | YES | `NULL` | - |
| `cstno` | `varchar(30)` | YES | `NULL` | - |
| `cwef` | `date` | YES | `NULL` | - |
| `period` | `varchar(30)` | YES | `NULL` | - |
| `startdate` | `date` | YES | `NULL` | - |
| `enddate` | `date` | YES | `NULL` | - |
| `rapnet_id` | `varchar(100)` | YES | `NULL` | - |
| `rapnet_password` | `varchar(100)` | YES | `NULL` | - |
| `shortcutName` | `varchar(255)` | YES | `NULL` | - |
| `logo` | `varchar(500)` | YES | `NULL` | - |


### 11. `company_demo`
- **Primary Key(s):** None
- **Total Columns:** 9

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(100)` | NO | NULL | - |
| `company` | `varchar(100)` | YES | `NULL` | - |
| `cddress` | `varchar(100)` | YES | `NULL` | - |
| `country` | `varchar(100)` | YES | `NULL` | - |
| `email` | `varchar(100)` | YES | `NULL` | - |
| `contact_no` | `varchar(100)` | YES | `NULL` | - |
| `contact_person` | `varchar(100)` | YES | `NULL` | - |
| `website` | `varchar(100)` | YES | `NULL` | - |
| `bank_name` | `varchar(100)` | YES | `NULL` | - |


### 12. `company_year`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `year` | `varchar(20)` | NO | NULL | - |
| `db_name` | `varchar(50)` | NO | NULL | - |
| `fromDate` | `date` | NO | NULL | - |
| `toDate` | `date` | NO | NULL | - |


### 13. `dai_activity_log`
- **Primary Key(s):** `id`
- **Total Columns:** 18

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint(20) unsigned` | NO | NULL | **PRIMARY KEY** |
| `company_id` | `int(11)` | NO | `1` | - |
| `user_id` | `int(11)` | YES | `NULL` | - |
| `user_name` | `varchar(255)` | NO | `''` | - |
| `user_role` | `varchar(100)` | NO | `''` | - |
| `user_role_id` | `int(11)` | YES | `NULL` | - |
| `action_type` | `varchar(50)` | NO | NULL | - |
| `module_name` | `varchar(100)` | NO | `''` | - |
| `record_id` | `varchar(64)` | YES | `NULL` | - |
| `record_reference` | `varchar(255)` | YES | `NULL` | - |
| `old_value` | `longtext` | YES | `NULL` | - |
| `new_value` | `longtext` | YES | `NULL` | - |
| `changed_fields` | `longtext` | YES | `NULL` | - |
| `description` | `text` | YES | `NULL` | - |
| `ip_address` | `varchar(64)` | YES | `NULL` | - |
| `user_agent` | `varchar(512)` | YES | `NULL` | - |
| `status` | `enum('success','attempted')` | NO | `'SUCCESS'` | - |
| `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | - |


### 14. `dai_ai_conversation`
- **Primary Key(s):** `id`
- **Total Columns:** 8

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `user_id` | `int(11)` | NO | NULL | - |
| `company_id` | `int(11)` | NO | NULL | - |
| `thread_id` | `varchar(100)` | NO | NULL | - |
| `title` | `varchar(255)` | YES | `'New Conversation'` | - |
| `messages` | `longtext` | NO | NULL | - |
| `created_at` | `datetime` | YES | `current_timestamp()` | - |
| `updated_at` | `datetime` | YES | `current_timestamp()` | on update current_timestamp() |


### 15. `dai_attribute`
- **Primary Key(s):** `id`
- **Total Columns:** 8

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(100)` | YES | `NULL` | - |
| `code` | `varchar(100)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `status` | `tinyint(1)` | YES | `NULL` | - |
| `required` | `tinyint(1)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `short_order` | `int(11)` | YES | `NULL` | - |


### 16. `dai_attribute_value`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `attribute_id` | `int(11)` | YES | `NULL` | - |
| `code` | `varchar(150)` | YES | `NULL` | - |
| `label` | `varchar(150)` | YES | `NULL` | - |


### 17. `dai_balance`
- **Primary Key(s):** `id`
- **Total Columns:** 6

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `currency` | `varchar(50)` | YES | `NULL` | - |
| `bank` | `varchar(255)` | YES | `NULL` | - |
| `cash` | `decimal(25,2)` | YES | `NULL` | - |
| `credit` | `decimal(25,2)` | YES | `NULL` | - |
| `company` | `int(11)` | NO | `1` | - |


### 18. `dai_bank`
- **Primary Key(s):** `id`
- **Total Columns:** 6

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `ac_name` | `varchar(150)` | YES | `NULL` | - |
| `account_number` | `varchar(100)` | YES | `NULL` | - |
| `bank` | `varchar(150)` | YES | `NULL` | - |
| `bank_code` | `varchar(50)` | YES | `NULL` | - |
| `swift_code` | `varchar(100)` | YES | `NULL` | - |


### 19. `dai_book`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `book` | `varchar(100)` | YES | `NULL` | - |
| `currency` | `varchar(100)` | YES | `NULL` | - |
| `balance` | `decimal(25,2)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |


### 20. `dai_boxhistory`
- **Primary Key(s):** None
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `product_id` | `int` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `party` | `varchar` | YES | NULL | - |


### 21. `dai_currencyrate`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `currency` | `varchar(100)` | YES | `NULL` | - |
| `USD` | `decimal(25,2)` | YES | `NULL` | - |
| `HKD` | `decimal(25,2)` | YES | `NULL` | - |
| `company` | `int(11)` | NO | `1` | - |


### 22. `dai_errors`
- **Primary Key(s):** `error_id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `error_id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `int(11)` | YES | `NULL` | - |
| `sku` | `varchar(255)` | YES | `NULL` | - |
| `error_message` | `text` | YES | `NULL` | - |
| `date` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


### 23. `dai_gia`
- **Primary Key(s):** `id`
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `sku` | `varchar(150)` | YES | `NULL` | - |
| `report` | `varchar(50)` | YES | `NULL` | - |
| `value` | `text` | YES | `NULL` | - |


### 24. `dai_history`
- **Primary Key(s):** `id`
- **Total Columns:** 19

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `int(11)` | YES | `NULL` | - |
| `sku` | `varchar(250)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `action` | `varchar(250)` | YES | `NULL` | - |
| `party` | `varchar(10)` | YES | `NULL` | - |
| `description` | `text` | YES | `NULL` | - |
| `narretion` | `text` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `invoice` | `varchar(50)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `entryno` | `int(11)` | YES | `NULL` | - |
| `entry_from` | `varchar(100)` | YES | `NULL` | - |
| `balance_pcs` | `decimal(25,0)` | YES | `NULL` | - |
| `balance_carat` | `decimal(25,3)` | YES | `NULL` | - |


### 25. `dai_hold`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `text` | NO | NULL | - |
| `date` | `date` | NO | NULL | - |
| `description` | `varchar(655)` | NO | NULL | - |
| `user` | `int(11)` | NO | NULL | - |


### 26. `dai_incrementid`
- **Primary Key(s):** `id`
- **Total Columns:** 8

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `company` | `int(11)` | YES | `NULL` | - |
| `inward` | `varchar(50)` | YES | `NULL` | - |
| `outward` | `varchar(50)` | YES | `NULL` | - |
| `reference` | `varchar(50)` | YES | `NULL` | - |
| `invoice` | `varchar(50)` | YES | `NULL` | - |
| `memo_invoice` | `varchar(10)` | YES | `NULL` | - |
| `lab_invoice` | `varchar(10)` | YES | `NULL` | - |


### 27. `dai_invoice`
- **Primary Key(s):** `id`
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `ac_name` | `varchar(150)` | NO | NULL | - |
| `account_number` | `varchar(100)` | NO | NULL | - |
| `bank` | `varchar(150)` | NO | NULL | - |
| `bank_code` | `varchar(50)` | NO | NULL | - |
| `swift_code` | `varchar(100)` | NO | NULL | - |
| `branch_code` | `varchar(50)` | NO | NULL | - |


### 28. `dai_inward`
- **Primary Key(s):** `id`
- **Total Columns:** 30

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `entryno` | `varchar(255)` | YES | `NULL` | - |
| `place` | `varchar(255)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `reference` | `varchar(255)` | YES | `NULL` | - |
| `invoiceno` | `varchar(255)` | YES | `NULL` | - |
| `invoicedate` | `date` | YES | `NULL` | - |
| `terms` | `varchar(255)` | YES | `NULL` | - |
| `duedate` | `date` | YES | `NULL` | - |
| `party` | `varchar(255)` | YES | `NULL` | - |
| `inward_type` | `varchar(255)` | YES | `NULL` | - |
| `company` | `varchar(255)` | YES | `NULL` | - |
| `narretion` | `varchar(500)` | YES | `NULL` | - |
| `products` | `text` | YES | `NULL` | - |
| `return_products` | `text` | YES | `NULL` | - |
| `final_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `paid_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `due_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `shipping_name` | `varchar(150)` | YES | `NULL` | - |
| `shipping_charge` | `decimal(25,2)` | YES | `NULL` | - |
| `charge` | `decimal(25,2)` | YES | `NULL` | - |
| `origin_of` | `varchar(50)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `deleted` | `tinyint(1)` | YES | `NULL` | - |


### 29. `dai_jewelry`
- **Primary Key(s):** `id`
- **Total Columns:** 16

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `sku` | `varchar(100)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `gross_cts` | `decimal(25,2)` | YES | `NULL` | - |
| `labour_fee` | `decimal(25,2)` | YES | `NULL` | - |
| `gold_type` | `varchar(150)` | YES | `NULL` | - |
| `gold_gram` | `decimal(25,2)` | YES | `NULL` | - |
| `gold_price` | `decimal(25,2)` | YES | `NULL` | - |
| `gold_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `total_pcs` | `int(11)` | YES | `NULL` | - |
| `total_carat` | `decimal(25,2)` | YES | `NULL` | - |
| `total_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `cost_price` | `decimal(25,2)` | YES | `NULL` | - |
| `percentage` | `decimal(25,2)` | YES | `NULL` | - |
| `final_cost` | `decimal(25,2)` | YES | `NULL` | - |
| `narretion` | `text` | YES | `NULL` | - |


### 30. `dai_jewelry_products`
- **Primary Key(s):** `id`
- **Total Columns:** 10

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `jewelry_id` | `int(11)` | YES | `NULL` | - |
| `product_id` | `int(11)` | YES | `NULL` | - |
| `sku` | `varchar(150)` | YES | `NULL` | - |
| `report` | `varchar(150)` | YES | `NULL` | - |
| `color` | `varchar(150)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,2)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `total_amount` | `decimal(25,2)` | YES | `NULL` | - |


### 31. `dai_lab`
- **Primary Key(s):** `id`
- **Total Columns:** 6

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `lab` | `varchar(150)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `products` | `varchar(1000)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `user` | `varchar(50)` | YES | `NULL` | - |


### 32. `dai_mail`
- **Primary Key(s):** `id`
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `email` | `varchar(150)` | YES | `NULL` | - |
| `subject` | `varchar(500)` | YES | `NULL` | - |
| `content` | `longtext` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `exportProducts` | `longtext` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |


### 33. `dai_note`
- **Primary Key(s):** `id`
- **Total Columns:** 6

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `content` | `text` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `status` | `tinyint(1)` | YES | `0` | - |


### 34. `dai_origin`
- **Primary Key(s):** `id`
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(250)` | NO | NULL | - |
| `deleted` | `tinyint(1)` | NO | NULL | - |
| `company` | `int(11)` | NO | `1` | - |


### 35. `dai_outward`
- **Primary Key(s):** `id`
- **Total Columns:** 41

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `entryno` | `varchar(255)` | YES | `NULL` | - |
| `place` | `varchar(255)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `reference` | `varchar(255)` | YES | `NULL` | - |
| `invoiceno` | `varchar(255)` | YES | `NULL` | - |
| `invoicedate` | `date` | YES | `NULL` | - |
| `terms` | `varchar(255)` | YES | `NULL` | - |
| `duedate` | `date` | YES | `NULL` | - |
| `party` | `varchar(255)` | YES | `NULL` | - |
| `type` | `varchar(255)` | YES | `NULL` | - |
| `company` | `varchar(255)` | YES | `NULL` | - |
| `narretion` | `varchar(500)` | YES | `NULL` | - |
| `products` | `text` | YES | `NULL` | - |
| `return_products` | `text` | YES | `NULL` | - |
| `status` | `varchar(150)` | YES | `NULL` | - |
| `paid_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `due_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `part` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `final_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `charge` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `other_less_percent` | `decimal(25,2)` | YES | `NULL` | - |
| `shipping_charge` | `decimal(25,2)` | YES | `NULL` | - |
| `shipping_name` | `varchar(150)` | YES | `NULL` | - |
| `origin_of` | `varchar(50)` | YES | `NULL` | - |
| `cif` | `varchar(255)` | YES | `NULL` | - |
| `lab` | `varchar(255)` | NO | NULL | - |
| `out_product` | `text` | YES | `NULL` | - |
| `bank` | `int(11)` | YES | `NULL` | - |
| `invoice_from` | `int(11)` | NO | NULL | - |
| `boc` | `int(11)` | NO | NULL | - |
| `citi` | `int(11)` | NO | NULL | - |
| `dbs` | `int(11)` | NO | NULL | - |
| `sc` | `int(11)` | NO | NULL | - |
| `boc_sksm` | `int(11)` | NO | NULL | - |
| `citi_sksm` | `int(11)` | NO | NULL | - |
| `other_party` | `varchar(100)` | NO | NULL | - |


### 36. `dai_party`
- **Primary Key(s):** `id`
- **Total Columns:** 20

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(150)` | YES | `NULL` | - |
| `address` | `text` | YES | `NULL` | - |
| `country` | `varchar(100)` | YES | `NULL` | - |
| `pincode` | `varchar(20)` | YES | `NULL` | - |
| `email` | `varchar(100)` | YES | `NULL` | - |
| `contact_number` | `varchar(30)` | YES | `NULL` | - |
| `fax` | `varchar(20)` | YES | `NULL` | - |
| `contact_person` | `varchar(150)` | YES | `NULL` | - |
| `website` | `varchar(50)` | YES | `NULL` | - |
| `bank_name` | `varchar(150)` | YES | `NULL` | - |
| `bank_address` | `varchar(500)` | YES | `NULL` | - |
| `account_number` | `varchar(30)` | YES | `NULL` | - |
| `branch` | `varchar(50)` | YES | `NULL` | - |
| `swift_code` | `varchar(50)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `under_group` | `int(11)` | YES | `NULL` | - |
| `under_subgroup` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |


### 37. `dai_product`
- **Primary Key(s):** `id`
- **Total Columns:** 56

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `mfg_code` | `varchar(255)` | YES | `NULL` | - |
| `diamond_no` | `varchar(255)` | YES | `NULL` | - |
| `sku` | `varchar(255)` | YES | `NULL` | - |
| `pair` | `varchar(255)` | YES | `NULL` | - |
| `rought_pcs` | `int(11)` | YES | `NULL` | - |
| `rought_carat` | `decimal(25,3)` | YES | `NULL` | - |
| `polish_pcs` | `int(11)` | YES | `NULL` | - |
| `polish_carat` | `decimal(25,3)` | YES | `NULL` | - |
| `cost` | `decimal(25,2)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `main_group` | `varchar(255)` | YES | `NULL` | - |
| `sub_group` | `varchar(255)` | YES | `NULL` | - |
| `remark` | `varchar(255)` | YES | `NULL` | - |
| `location` | `varchar(50)` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `company` | `varchar(255)` | YES | `NULL` | - |
| `inward_id` | `int(11)` | YES | `NULL` | - |
| `group_type` | `varchar(50)` | YES | `NULL` | - |
| `lab` | `varchar(100)` | YES | `NULL` | - |
| `send_to_lab` | `tinyint(1)` | YES | `NULL` | - |
| `outward` | `varchar(50)` | YES | `NULL` | - |
| `box_products` | `varchar(500)` | YES | `NULL` | - |
| `parcel_products` | `varchar(500)` | YES | `NULL` | - |
| `box_id` | `varchar(50)` | YES | `NULL` | - |
| `parcel_id` | `varchar(50)` | YES | `NULL` | - |
| `hold` | `tinyint(1)` | NO | `0` | - |
| `site_upload` | `tinyint(1)` | YES | `NULL` | - |
| `rapnet_upload` | `tinyint(1)` | YES | `NULL` | - |
| `is_uploadsite` | `tinyint(1)` | NO | `1` | - |
| `is_uploadrapnet` | `tinyint(1)` | NO | `1` | - |
| `visibility` | `tinyint(1)` | NO | `1` | - |
| `parent_id` | `int(11)` | YES | `NULL` | - |
| `transaction` | `varchar(15)` | YES | `NULL` | - |
| `main_color` | `varchar(200)` | YES | `NULL` | - |
| `outward_parent` | `int(11)` | YES | `NULL` | - |
| `child_count` | `int(11)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `sell_price` | `decimal(25,2)` | YES | `NULL` | - |
| `sell_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `hide` | `tinyint(1)` | YES | `0` | - |
| `purchase_carat` | `decimal(25,3)` | YES | `NULL` | - |
| `purchase_pcs` | `int(11)` | YES | `NULL` | - |
| `purchase_price` | `decimal(25,2)` | YES | `NULL` | - |
| `purchase_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `rap_price` | `decimal(25,2)` | YES | `NULL` | - |
| `rap_amount` | `decimal(25,2)` | YES | `NULL` | - |
| `inward` | `varchar(255)` | YES | `NULL` | - |
| `barcode` | `varchar(50)` | YES | `NULL` | - |
| `indexonline_id` | `varchar(100)` | NO | NULL | - |
| `category` | `varchar(500)` | NO | NULL | - |
| `argyle_color` | `varchar(100)` | NO | NULL | - |
| `in_house_clarity` | `varchar(100)` | NO | NULL | - |
| `mining` | `varchar(100)` | NO | NULL | - |
| `origin` | `varchar(100)` | NO | NULL | - |


### 38. `dai_product_delete`
- **Primary Key(s):** `id`
- **Total Columns:** 9

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `int(11)` | YES | `NULL` | - |
| `sku` | `varchar(255)` | YES | `NULL` | - |
| `pcs` | `decimal(25,2)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `inward_id` | `int(11)` | YES | `NULL` | - |
| `description` | `varchar(500)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |


### 39. `dai_product_lab`
- **Primary Key(s):** `id`
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(166)` | NO | NULL | - |
| `report_url` | `varchar(655)` | NO | NULL | - |
| `deleted` | `tinyint(4)` | NO | NULL | - |


### 40. `dai_product_return`
- **Primary Key(s):** `id`
- **Total Columns:** 12

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `int(11)` | YES | `NULL` | - |
| `outward_id` | `int(11)` | YES | `NULL` | - |
| `sku` | `varchar(255)` | YES | `NULL` | - |
| `pcs` | `int(11)` | YES | `NULL` | - |
| `carat` | `decimal(25,3)` | YES | `NULL` | - |
| `price` | `decimal(25,2)` | YES | `NULL` | - |
| `amount` | `decimal(25,2)` | YES | `NULL` | - |
| `type` | `varchar(50)` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |


### 41. `dai_product_value`
- **Primary Key(s):** `pid`
- **Total Columns:** 20

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `pid` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `varchar(11)` | YES | `NULL` | - |
| `report_no` | `varchar(250)` | YES | `NULL` | - |
| `shape` | `varchar(250)` | YES | `NULL` | - |
| `color` | `varchar(250)` | YES | `NULL` | - |
| `clarity` | `varchar(250)` | YES | `NULL` | - |
| `size` | `varchar(250)` | YES | `NULL` | - |
| `polish` | `varchar(250)` | YES | `NULL` | - |
| `f_intensity` | `varchar(250)` | YES | `NULL` | - |
| `symmentry` | `varchar(250)` | YES | `NULL` | - |
| `cut` | `varchar(250)` | YES | `NULL` | - |
| `mesurment` | `varchar(250)` | YES | `NULL` | - |
| `table_pc` | `varchar(250)` | YES | `NULL` | - |
| `depth_pc` | `varchar(250)` | YES | `NULL` | - |
| `gridle` | `varchar(250)` | YES | `NULL` | - |
| `intensity` | `varchar(250)` | YES | `NULL` | - |
| `overtone` | `varchar(250)` | YES | `NULL` | - |
| `package` | `varchar(250)` | YES | `NULL` | - |
| `bgm` | `varchar(255)` | YES | `NULL` | - |
| `eyeclean` | `varchar(255)` | YES | `NULL` | - |


### 42. `dai_quick_notes`
- **Primary Key(s):** `id`
- **Total Columns:** 14

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `user_id` | `int(11)` | NO | NULL | - |
| `company_id` | `int(11)` | NO | NULL | - |
| `assigned_to` | `int(11)` | YES | `NULL` | - |
| `assigned_at` | `timestamp` | YES | `current_timestamp()` | - |
| `created_by` | `int(11)` | YES | `NULL` | - |
| `text` | `text` | NO | NULL | - |
| `target_date` | `date` | NO | NULL | - |
| `priority` | `enum('low','medium','high')` | NO | `'Medium'` | - |
| `completed` | `tinyint(1)` | NO | `0` | - |
| `completed_at` | `timestamp` | YES | `NULL` | - |
| `completed_by` | `int(11)` | YES | `NULL` | - |
| `created_at` | `timestamp` | NO | `current_timestamp()` | - |
| `updated_at` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


### 43. `dai_rapnet_live_snapshot`
- **Primary Key(s):** `id`
- **Total Columns:** 10

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `recorded_at` | `datetime` | NO | NULL | - |
| `benchmark_price` | `decimal(14,4)` | NO | NULL | - |
| `change_pct` | `decimal(10,4)` | YES | `NULL` | - |
| `daily_high` | `decimal(14,4)` | YES | `NULL` | - |
| `daily_low` | `decimal(14,4)` | YES | `NULL` | - |
| `shape` | `varchar(32)` | YES | `NULL` | - |
| `color` | `varchar(16)` | YES | `NULL` | - |
| `clarity` | `varchar(16)` | YES | `NULL` | - |
| `source` | `varchar(16)` | NO | `'poll'` | - |


### 44. `dai_rapnetprice`
- **Primary Key(s):** `rapnetprice_id`
- **Total Columns:** 8

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `rapnetprice_id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `shape` | `varchar(255)` | YES | `NULL` | - |
| `low_size` | `varchar(255)` | YES | `NULL` | - |
| `high_size` | `varchar(255)` | YES | `NULL` | - |
| `color` | `varchar(255)` | YES | `NULL` | - |
| `clarity` | `varchar(255)` | YES | `NULL` | - |
| `caratprice` | `varchar(255)` | YES | `NULL` | - |
| `date` | `varchar(100)` | YES | `NULL` | - |


### 45. `dai_shipping`
- **Primary Key(s):** `id`
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(250)` | NO | NULL | - |
| `deleted` | `tinyint(1)` | NO | NULL | - |
| `company` | `int(11)` | NO | `1` | - |


### 46. `dai_stockmanage`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `stockdate` | `date` | YES | `NULL` | - |
| `data` | `longtext` | YES | `NULL` | - |


### 47. `dai_temp`
- **Primary Key(s):** None
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `varchar(500)` | YES | `NULL` | - |
| `no` | `int(11)` | YES | `NULL` | - |
| `code` | `varchar(250)` | YES | `NULL` | - |
| `value` | `longtext` | YES | `NULL` | - |


### 48. `error`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | - |
| `description` | `varchar(655)` | NO | NULL | - |
| `type` | `varchar(255)` | NO | NULL | - |


### 49. `notification`
- **Primary Key(s):** `id`
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `title` | `varchar(255)` | YES | `NULL` | - |
| `message` | `varchar(500)` | YES | `NULL` | - |
| `image` | `varchar(255)` | YES | `NULL` | - |
| `user` | `int(11)` | YES | `NULL` | - |
| `company` | `int(11)` | YES | `NULL` | - |
| `datetine` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


### 50. `notification_read_state`
- **Primary Key(s):** `user_id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `last_read_notification_id` | `int(11)` | NO | `0` | - |
| `updated_at` | `timestamp` | NO | `current_timestamp()` | on update current_timestamp() |


### 51. `resource`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `code` | `varchar(50)` | YES | `NULL` | - |
| `value` | `varchar(100)` | YES | `NULL` | - |


### 52. `roll`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(150)` | YES | `NULL` | - |
| `resource` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `company` | `text` | YES | `NULL` | - |


### 53. `sms_department`
- **Primary Key(s):** `id`
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(80)` | YES | `NULL` | - |


### 54. `sms_external`
- **Primary Key(s):** `id`
- **Total Columns:** 9

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `vendor` | `varchar(50)` | YES | `NULL` | - |
| `item` | `varchar(50)` | YES | `NULL` | - |
| `qty` | `int(11)` | YES | `NULL` | - |
| `price` | `decimal(10,0)` | YES | `NULL` | - |
| `chalan` | `varchar(50)` | YES | `NULL` | - |
| `remark` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `stock` | `int(11)` | YES | `NULL` | - |


### 55. `sms_internal`
- **Primary Key(s):** `id`
- **Total Columns:** 9

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `department` | `varchar(50)` | YES | `NULL` | - |
| `person` | `varchar(50)` | YES | `NULL` | - |
| `item` | `varchar(50)` | YES | `NULL` | - |
| `qty` | `int(11)` | YES | `NULL` | - |
| `price` | `decimal(10,0)` | YES | `NULL` | - |
| `inhouse` | `int(11)` | YES | `NULL` | - |
| `remark` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |


### 56. `sms_item`
- **Primary Key(s):** `id`
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(80)` | YES | `NULL` | - |


### 57. `sms_person`
- **Primary Key(s):** `id`
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(80)` | YES | `NULL` | - |


### 58. `sms_stock`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `external` | `int(11)` | YES | `NULL` | - |
| `qty` | `int(11)` | YES | `NULL` | - |
| `price` | `decimal(10,0)` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |


### 59. `sms_vendor`
- **Primary Key(s):** `id`
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(80)` | YES | `NULL` | - |


### 60. `user`
- **Primary Key(s):** `user_id`
- **Total Columns:** 28

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `user_name` | `varchar(255)` | YES | `NULL` | - |
| `user_email` | `varchar(255)` | YES | `NULL` | - |
| `pass` | `varchar(255)` | YES | `NULL` | - |
| `first_name` | `varchar(100)` | YES | `NULL` | - |
| `last_name` | `varchar(100)` | YES | `NULL` | - |
| `address` | `text` | YES | `NULL` | - |
| `company_name` | `varchar(255)` | YES | `NULL` | - |
| `tel_no` | `varchar(25)` | YES | `NULL` | - |
| `fax_no` | `varchar(25)` | YES | `NULL` | - |
| `rapnet_id` | `varchar(50)` | YES | `NULL` | - |
| `skype_id` | `varchar(50)` | YES | `NULL` | - |
| `wechat_id` | `varchar(50)` | YES | `NULL` | - |
| `qq_id` | `varchar(50)` | YES | `NULL` | - |
| `mobile` | `varchar(20)` | YES | `NULL` | - |
| `welcommess` | `text` | YES | `NULL` | - |
| `formality` | `varchar(255)` | YES | `NULL` | - |
| `type` | `varchar(12)` | YES | `NULL` | - |
| `roll` | `int(11)` | YES | `NULL` | - |
| `online` | `tinyint(1)` | YES | `NULL` | - |
| `profile_image` | `varchar(150)` | YES | `NULL` | - |
| `is_active` | `tinyint(1)` | NO | `1` | - |
| `designation` | `varchar(150)` | YES | `NULL` | - |
| `department` | `varchar(150)` | YES | `NULL` | - |
| `joining_date` | `date` | YES | `NULL` | - |
| `created_by` | `int(11)` | YES | `NULL` | - |
| `created_at` | `datetime` | YES | `current_timestamp()` | - |
| `updated_at` | `datetime` | YES | `current_timestamp()` | on update current_timestamp() |


### 61. `user_old`
- **Primary Key(s):** `id`
- **Total Columns:** 18

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `user_name` | `varchar(255)` | YES | `NULL` | - |
| `e_mail` | `varchar(255)` | YES | `NULL` | - |
| `password` | `varchar(255)` | YES | `NULL` | - |
| `verify_key` | `varchar(255)` | YES | `NULL` | - |
| `status` | `varchar(20)` | YES | `NULL` | - |
| `subscription` | `varchar(50)` | YES | `NULL` | - |
| `created_at` | `datetime` | YES | `NULL` | - |
| `expired_at` | `datetime` | YES | `NULL` | - |
| `type` | `varchar(12)` | YES | `NULL` | - |
| `firstname` | `varchar(100)` | YES | `NULL` | - |
| `lastname` | `varchar(100)` | YES | `NULL` | - |
| `address` | `text` | YES | `NULL` | - |
| `company_name` | `varchar(255)` | YES | `NULL` | - |
| `mobile` | `varchar(20)` | YES | `NULL` | - |
| `roll` | `int(11)` | YES | `NULL` | - |
| `online` | `tinyint(1)` | YES | `NULL` | - |
| `profile_image` | `varchar(300)` | YES | `NULL` | - |


### 62. `user_track`
- **Primary Key(s):** `id`
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary / Extra |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int(11)` | NO | NULL | **PRIMARY KEY** |
| `user` | `int(11)` | YES | `NULL` | - |
| `product_id` | `text` | YES | `NULL` | - |
| `description` | `text` | YES | `NULL` | - |
| `date` | `datetime` | YES | `NULL` | - |
| `action` | `varchar(250)` | YES | `NULL` | - |
| `company` | `varchar(250)` | YES | `NULL` | - |


---

## 5. 🏛️ COMPLETE SCHEMA: PURANA PROJECT (`venya` - `src.sql`)

Purane PHP project ke saare **53 tables** ka complete column-by-column schema:


### 1. `acc_advance`
- **Primary Key(s):** None
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `party` | `int` | YES | `NULL` | - |
| `date` | `date` | YES | `NULL` | - |
| `amount` | `decimal` | YES | NULL | - |


### 2. `acc_group`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 3. `acc_subgroup`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 4. `acc_transaction`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `book` | `varchar` | YES | NULL | - |


### 5. `applist`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 6. `category`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(100)` | NO | NULL | - |
| `parent` | `int` | NO | NULL | - |


### 7. `chat_history`
- **Primary Key(s):** None
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `sender` | `int` | YES | `NULL` | - |
| `receiver` | `int` | YES | `NULL` | - |
| `message` | `longtext` | YES | NULL | - |
| `date` | `datetime` | YES | `NULL` | - |
| `attachement` | `longtext` | YES | NULL | - |
| `new` | `tinyint` | YES | NULL | - |


### 8. `company`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 9. `company_year`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `year` | `varchar(20)` | NO | NULL | - |
| `db_name` | `varchar(50)` | NO | NULL | - |
| `fromDate` | `date` | NO | NULL | - |
| `toDate` | `date` | NO | NULL | - |


### 10. `dai_attribute`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 11. `dai_attribute_value`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `attribute_id` | `int` | YES | `NULL` | - |
| `code` | `varchar` | YES | NULL | - |


### 12. `dai_balance`
- **Primary Key(s):** None
- **Total Columns:** 1

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `currency` | `varchar` | YES | NULL | - |


### 13. `dai_bank`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `ac_name` | `varchar` | YES | NULL | - |


### 14. `dai_book`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `book` | `varchar` | YES | NULL | - |


### 15. `dai_currencyrate`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `currency` | `varchar` | YES | NULL | - |


### 16. `dai_errors`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `error_id` | `int` | NO | NULL | - |
| `product_id` | `int` | YES | `NULL` | - |
| `sku` | `varchar` | YES | NULL | - |


### 17. `dai_gia`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `sku` | `varchar` | YES | NULL | - |


### 18. `dai_history`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `product_id` | `int` | YES | `NULL` | - |
| `sku` | `varchar` | YES | NULL | - |


### 19. `dai_hold`
- **Primary Key(s):** `id`
- **Total Columns:** 5

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `product_id` | `text` | NO | NULL | - |
| `date` | `date` | NO | NULL | - |
| `description` | `varchar(655)` | NO | NULL | - |
| `user` | `int` | NO | NULL | - |


### 20. `dai_incrementid`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `company` | `int` | YES | `NULL` | - |
| `inward` | `varchar` | YES | NULL | - |


### 21. `dai_invoice`
- **Primary Key(s):** `id`
- **Total Columns:** 7

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `ac_name` | `varchar(150)` | NO | NULL | - |
| `account_number` | `varchar(100)` | NO | NULL | - |
| `bank` | `varchar(150)` | NO | NULL | - |
| `bank_code` | `varchar(50)` | NO | NULL | - |
| `swift_code` | `varchar(100)` | NO | NULL | - |
| `branch_code` | `varchar(50)` | NO | NULL | - |


### 22. `dai_inward`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `entryno` | `varchar` | YES | NULL | - |


### 23. `dai_jewelry`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `sku` | `varchar` | YES | NULL | - |


### 24. `dai_jewelry_products`
- **Primary Key(s):** None
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `jewelry_id` | `int` | YES | `NULL` | - |
| `product_id` | `int` | YES | `NULL` | - |
| `sku` | `varchar` | YES | NULL | - |


### 25. `dai_lab`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `lab` | `varchar` | YES | NULL | - |


### 26. `dai_mail`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `email` | `varchar` | YES | NULL | - |


### 27. `dai_note`
- **Primary Key(s):** None
- **Total Columns:** 6

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `content` | `text` | YES | NULL | - |
| `date` | `date` | YES | `NULL` | - |
| `user` | `int` | YES | `NULL` | - |
| `company` | `int` | YES | `NULL` | - |
| `status` | `tinyint` | YES | NULL | - |


### 28. `dai_origin`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(250)` | NO | NULL | - |
| `deleted` | `tinyint(1)` | NO | NULL | - |


### 29. `dai_outward`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `entryno` | `varchar` | YES | NULL | - |


### 30. `dai_party`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 31. `dai_product`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `mfg_code` | `varchar` | YES | NULL | - |


### 32. `dai_product_delete`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `product_id` | `int` | YES | `NULL` | - |
| `sku` | `varchar` | YES | NULL | - |


### 33. `dai_product_lab`
- **Primary Key(s):** `id`
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(166)` | NO | NULL | - |
| `report_url` | `varchar(655)` | NO | NULL | - |
| `deleted` | `tinyint` | NO | NULL | - |


### 34. `dai_product_return`
- **Primary Key(s):** None
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `product_id` | `int` | YES | `NULL` | - |
| `outward_id` | `int` | YES | `NULL` | - |
| `sku` | `varchar` | YES | NULL | - |


### 35. `dai_product_value`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `pid` | `int` | NO | NULL | - |
| `product_id` | `varchar` | YES | NULL | - |


### 36. `dai_rapnetprice`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `rapnetprice_id` | `int` | NO | NULL | - |
| `shape` | `varchar` | YES | NULL | - |


### 37. `dai_shipping`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `name` | `varchar(250)` | NO | NULL | - |
| `deleted` | `tinyint(1)` | NO | NULL | - |


### 38. `dai_stockmanage`
- **Primary Key(s):** `id`
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | **PRIMARY KEY** |
| `stockdate` | `date` | YES | `NULL` | - |
| `data` | `longtext` | YES | NULL | - |


### 39. `dai_temp`
- **Primary Key(s):** None
- **Total Columns:** 1

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `varchar` | YES | NULL | - |


### 40. `error`
- **Primary Key(s):** None
- **Total Columns:** 3

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `description` | `varchar(655)` | NO | NULL | - |
| `type` | `varchar(255)` | NO | NULL | - |


### 41. `notification`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `title` | `varchar` | YES | NULL | - |


### 42. `resource`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `code` | `varchar` | YES | NULL | - |


### 43. `roll`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 44. `sms_department`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 45. `sms_external`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `vendor` | `varchar` | YES | NULL | - |


### 46. `sms_internal`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `department` | `varchar` | YES | NULL | - |


### 47. `sms_item`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 48. `sms_person`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 49. `sms_stock`
- **Primary Key(s):** None
- **Total Columns:** 4

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `external` | `int` | YES | `NULL` | - |
| `qty` | `int` | YES | `NULL` | - |
| `price` | `decimal` | YES | NULL | - |


### 50. `sms_vendor`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `name` | `varchar` | YES | NULL | - |


### 51. `user`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `int` | NO | NULL | - |
| `user_name` | `varchar` | YES | NULL | - |


### 52. `user_old`
- **Primary Key(s):** None
- **Total Columns:** 2

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `user_name` | `varchar` | YES | NULL | - |


### 53. `user_track`
- **Primary Key(s):** None
- **Total Columns:** 6

| Column Name | Data Type | Nullable | Default Value | Primary Key |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | NULL | - |
| `user` | `int` | YES | `NULL` | - |
| `product_id` | `text` | YES | NULL | - |
| `description` | `text` | YES | NULL | - |
| `date` | `datetime` | YES | `NULL` | - |
| `action` | `varchar` | YES | NULL | - |


