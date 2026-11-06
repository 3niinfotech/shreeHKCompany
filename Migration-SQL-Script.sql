-- =====================================================================
-- MIGRATION SCRIPT: venya (Old PHP) -> shreehkweb_snj2024 (New Node/React)
-- Generated: 2026-09-18
-- Updated: 2026-11-03 — added Lab Integration tables, Branch hierarchy, and Universal Soft Delete
-- Purpose: Bring an existing (old PHP) live database up to date with
--          the new project's schema — WITHOUT touching existing data.
--
-- IMPORTANT — READ BEFORE RUNNING:
-- 1. TAKE A FULL BACKUP of the target database before running this.
--      mysqldump -u USER -p DBNAME > backup_before_migration.sql
-- 2. Requires MySQL 8.0.29+ or MariaDB 10.0.2+ for "ADD COLUMN IF NOT EXISTS"
--    and "CREATE TABLE IF NOT EXISTS". If your MySQL is older, remove the
--    "IF NOT EXISTS" on ADD COLUMN lines (ask if you need an older-MySQL version).
-- 3. Script is idempotent-safe: running it twice will not error or duplicate.
-- 4. Run this INSIDE the target database (USE your_db_name; first) or
--    uncomment/edit the USE statement below.
-- 5. Also run on the META/portal DB if that is a separate database — especially
--    for `company_year` and `dai_activity_log`.
-- =====================================================================

-- USE your_database_name;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- =====================================================================
-- SECTION 1: NEW TABLES (14 tables)
-- =====================================================================

-- 1. acc_transaction_copy
CREATE TABLE IF NOT EXISTS `acc_transaction_copy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `book` varchar(20) DEFAULT NULL,
  `currency` varchar(20) DEFAULT NULL,
  `party` varchar(20) DEFAULT NULL,
  `cheque` varchar(25) DEFAULT NULL,
  `amount` decimal(25,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `type` varchar(20) DEFAULT NULL,
  `balance` decimal(25,2) DEFAULT 0.00,
  `date` date DEFAULT NULL,
  `under_group` int(11) DEFAULT NULL,
  `under_subgroup` int(11) DEFAULT NULL,
  `company` int(11) DEFAULT 0,
  `sale_id` varchar(20) DEFAULT NULL,
  `purchase_id` varchar(20) DEFAULT NULL,
  `user` int(11) DEFAULT 0,
  `deleted` tinyint(1) DEFAULT 0,
  `cross_id` varchar(50) DEFAULT NULL,
  `date_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `other_party` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. admin_users
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fname` varchar(100) DEFAULT NULL,
  `lname` varchar(100) DEFAULT NULL,
  `mobileno` varchar(20) DEFAULT NULL,
  `userroll` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. company_demo
CREATE TABLE IF NOT EXISTS `company_demo` (
  `id` int(100) NOT NULL,
  `company` varchar(100) DEFAULT NULL,
  `cddress` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_no` varchar(100) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. dai_activity_log (must match ShreeHK_BackEnd/migrations/create_dai_activity_log.sql)
CREATE TABLE IF NOT EXISTS `dai_activity_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL DEFAULT 1,
  `user_id` int(11) DEFAULT NULL COMMENT 'NULL = SYSTEM',
  `user_name` varchar(255) NOT NULL DEFAULT '',
  `user_role` varchar(100) NOT NULL DEFAULT '',
  `user_role_id` int(11) DEFAULT NULL,
  `action_type` varchar(50) NOT NULL,
  `module_name` varchar(100) NOT NULL DEFAULT '',
  `record_id` varchar(64) DEFAULT NULL,
  `record_reference` varchar(255) DEFAULT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `changed_fields` json DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `status` enum('SUCCESS','ATTEMPTED') NOT NULL DEFAULT 'SUCCESS',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_activity_created_at` (`created_at`),
  KEY `idx_activity_user_created` (`user_id`, `created_at`),
  KEY `idx_activity_module_action` (`module_name`, `action_type`),
  KEY `idx_activity_record_ref` (`record_reference`(191)),
  KEY `idx_activity_company_created` (`company_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Immutable admin audit trail';

-- 5. dai_ai_conversation
CREATE TABLE IF NOT EXISTS `dai_ai_conversation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `company_id` int(11) NOT NULL DEFAULT 0,
  `thread_id` varchar(100) NOT NULL DEFAULT '',
  `title` varchar(255) DEFAULT 'New Conversation',
  `messages` longtext NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. dai_quick_notes (priority must match Node: Low/Medium/High)
CREATE TABLE IF NOT EXISTS `dai_quick_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `company_id` int(11) NOT NULL DEFAULT 0,
  `assigned_to` int(11) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int(11) DEFAULT NULL,
  `text` text NOT NULL,
  `target_date` date NOT NULL DEFAULT '1970-01-01',
  `priority` enum('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_company_target` (`user_id`, `company_id`, `target_date`, `completed`),
  KEY `idx_assigned_to` (`assigned_to`, `company_id`, `completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. dai_rapnet_live_snapshot
CREATE TABLE IF NOT EXISTS `dai_rapnet_live_snapshot` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recorded_at` datetime NOT NULL,
  `benchmark_price` decimal(14,4) NOT NULL,
  `change_pct` decimal(10,4) DEFAULT NULL,
  `daily_high` decimal(14,4) DEFAULT NULL,
  `daily_low` decimal(14,4) DEFAULT NULL,
  `shape` varchar(32) DEFAULT NULL,
  `color` varchar(16) DEFAULT NULL,
  `clarity` varchar(16) DEFAULT NULL,
  `source` varchar(16) NOT NULL DEFAULT 'poll',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. notification_read_state
CREATE TABLE IF NOT EXISTS `notification_read_state` (
  `user_id` int(11) NOT NULL DEFAULT 0,
  `last_read_notification_id` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. dai_boxhistory
CREATE TABLE IF NOT EXISTS `dai_boxhistory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `party` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. company_year (portal / fiscal-year DB routing — also run on META DB)
CREATE TABLE IF NOT EXISTS `company_year` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` varchar(50) DEFAULT NULL,
  `fromDate` date DEFAULT NULL,
  `toDate` date DEFAULT NULL,
  `db_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- 11. branch (Multi-Company Branch Hierarchy)
CREATE TABLE IF NOT EXISTS `branch` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `color_code` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. lab_certificate_cache (Certificate cache with TTL per tenant)
CREATE TABLE IF NOT EXISTS `lab_certificate_cache` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `lab` varchar(20) NOT NULL,
  `report_number` varchar(64) NOT NULL,
  `status` enum('SUCCESS','NOT_FOUND') NOT NULL DEFAULT 'SUCCESS',
  `normalized_json` json NOT NULL,
  `raw_json` longtext DEFAULT NULL,
  `pdf_url` varchar(512) DEFAULT NULL,
  `plot_url` varchar(512) DEFAULT NULL,
  `fetched_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_company_lab_report` (`company_id`, `lab`, `report_number`),
  KEY `idx_lab_report` (`lab`, `report_number`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. lab_fetch_log (Audit log for certificate fetches)
CREATE TABLE IF NOT EXISTS `lab_fetch_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `lab` varchar(20) NOT NULL,
  `report_number` varchar(64) NOT NULL,
  `status` enum('SUCCESS','NOT_FOUND','ERROR','RATE_LIMITED') NOT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'live' COMMENT 'live | cache | mock',
  `response_time_ms` int(11) NOT NULL DEFAULT 0,
  `error_message` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_company_created` (`company_id`, `created_at`),
  KEY `idx_log_lab_report` (`lab`, `report_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. lab_provider_credential (Encrypted per-tenant credentials for grading lab providers)
CREATE TABLE IF NOT EXISTS `lab_provider_credential` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `lab` varchar(20) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `base_url` varchar(255) DEFAULT NULL,
  `api_key_encrypted` text DEFAULT NULL,
  `api_secret_encrypted` text DEFAULT NULL,
  `extra_config_encrypted` text DEFAULT NULL,
  `last_tested_at` datetime DEFAULT NULL,
  `last_test_status` varchar(20) DEFAULT NULL,
  `last_test_error` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_company_lab` (`company_id`, `lab`),
  KEY `idx_cred_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 2: NEW COLUMNS ON EXISTING TABLES
-- Using "ADD COLUMN IF NOT EXISTS" so this script is safe to re-run.
-- =====================================================================

-- acc_advance
ALTER TABLE `acc_advance`
  ADD COLUMN IF NOT EXISTS `use_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `balance_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `book` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `transaction_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoice` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cheque` varchar(250) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `description` varchar(500) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `invoice_id` varchar(10) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `assign_date` date NOT NULL DEFAULT '1970-01-01';

-- acc_group
ALTER TABLE `acc_group`
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- acc_subgroup
ALTER TABLE `acc_subgroup`
  ADD COLUMN IF NOT EXISTS `under` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- acc_transaction
ALTER TABLE `acc_transaction`
  ADD COLUMN IF NOT EXISTS `currency` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `party` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cheque` varchar(25) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `amount` decimal(25,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `balance` decimal(25,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `under_group` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `under_subgroup` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `sale_id` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `purchase_id` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `cross_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `other_party` varchar(100) NOT NULL DEFAULT '';

-- applist
ALTER TABLE `applist`
  ADD COLUMN IF NOT EXISTS `mobile` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `uuid` varchar(70) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `platform` varchar(70) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `version` varchar(70) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` varchar(70) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `serial` varchar(70) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `datetime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- category
ALTER TABLE `category`
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- company
ALTER TABLE `company`
  ADD COLUMN IF NOT EXISTS `branch_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `address` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `number` varchar(15) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(60) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `partner` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `city` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `state` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pincode` varchar(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `country` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `email` varchar(80) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `website` varchar(80) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `panno` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tinno` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `iecno` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `vatno` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `vwef` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cstno` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cwef` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `period` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `startdate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `enddate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rapnet_id` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rapnet_password` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `shortcutName` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `logo` varchar(500) DEFAULT NULL;

-- dai_attribute
ALTER TABLE `dai_attribute`
  ADD COLUMN IF NOT EXISTS `code` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `required` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `short_order` int(11) DEFAULT NULL;

-- dai_attribute_value
ALTER TABLE `dai_attribute_value`
  ADD COLUMN IF NOT EXISTS `label` varchar(150) DEFAULT NULL;

-- dai_balance
-- NOTE: `id` AUTO_INCREMENT PRIMARY KEY is added only when missing (see Section 3).
-- Do not blindly re-add PRIMARY KEY if the table already has another PK.
ALTER TABLE `dai_balance`
  ADD COLUMN IF NOT EXISTS `bank` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cash` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `credit` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- dai_bank
ALTER TABLE `dai_bank`
  ADD COLUMN IF NOT EXISTS `account_number` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_code` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `swift_code` varchar(100) DEFAULT NULL;

-- dai_book
ALTER TABLE `dai_book`
  ADD COLUMN IF NOT EXISTS `currency` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `balance` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL;

-- dai_currencyrate
ALTER TABLE `dai_currencyrate`
  ADD COLUMN IF NOT EXISTS `USD` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `HKD` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- dai_errors
ALTER TABLE `dai_errors`
  ADD COLUMN IF NOT EXISTS `error_message` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- dai_gia
ALTER TABLE `dai_gia`
  ADD COLUMN IF NOT EXISTS `report` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `value` text DEFAULT NULL;

-- dai_history
ALTER TABLE `dai_history`
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `action` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `party` varchar(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `narretion` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoice` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `entryno` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `entry_from` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `balance_pcs` decimal(25,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `balance_carat` decimal(25,3) DEFAULT NULL;

-- dai_incrementid (company + inward required by Node inward/outward sequences)
ALTER TABLE `dai_incrementid`
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `inward` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `outward` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `reference` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoice` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `memo_invoice` varchar(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `lab_invoice` varchar(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `purchase` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sale` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `payment` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `receipt` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `journal` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contra` varchar(50) DEFAULT NULL;

-- dai_inward
ALTER TABLE `dai_inward`
  ADD COLUMN IF NOT EXISTS `place` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `reference` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoiceno` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoicedate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `terms` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `duedate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `party` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `inward_type` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `narretion` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `products` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `return_products` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `final_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `paid_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `due_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `less_percent` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `less_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `other_less_percent` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `other_less_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `shipping_name` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `shipping_charge` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `charge` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `origin_of` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) DEFAULT NULL;

-- dai_jewelry
ALTER TABLE `dai_jewelry`
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gross_cts` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `labour_fee` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gold_type` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gold_gram` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gold_price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gold_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `total_pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `total_carat` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `total_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cost_price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `percentage` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `final_cost` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `narretion` text DEFAULT NULL;

-- dai_jewelry_products
ALTER TABLE `dai_jewelry_products`
  ADD COLUMN IF NOT EXISTS `report` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `color` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `carat` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `total_amount` decimal(25,2) DEFAULT NULL;

-- dai_lab
ALTER TABLE `dai_lab`
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `products` varchar(1000) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` varchar(50) DEFAULT NULL;

-- dai_mail
ALTER TABLE `dai_mail`
  ADD COLUMN IF NOT EXISTS `subject` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `content` longtext DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `exportProducts` longtext DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL;

-- dai_origin
ALTER TABLE `dai_origin`
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- dai_outward
ALTER TABLE `dai_outward`
  ADD COLUMN IF NOT EXISTS `place` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `reference` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoiceno` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoicedate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `terms` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `duedate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `party` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `narretion` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `products` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `return_products` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `paid_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `due_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `part` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `final_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `less_percent` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `less_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `charge` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `other_less_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `other_less_percent` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `shipping_charge` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `shipping_name` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `origin_of` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cif` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `lab` varchar(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `out_product` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `invoice_from` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `boc` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `citi` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `dbs` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `sc` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `boc_sksm` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `citi_sksm` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `other_party` varchar(100) NOT NULL DEFAULT '';

-- dai_party
ALTER TABLE `dai_party`
  ADD COLUMN IF NOT EXISTS `address` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `country` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pincode` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `email` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contact_number` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `fax` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contact_person` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `website` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_name` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_address` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `account_number` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `branch` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `swift_code` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `under_group` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `under_subgroup` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL;

-- dai_product
ALTER TABLE `dai_product`
  ADD COLUMN IF NOT EXISTS `mfg_code` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `loc` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `diamond_no` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sku` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pair` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rought_pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rought_carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `polish_pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `polish_carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cost` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `main_group` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sub_group` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `remark` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `location` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `inward_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `group_type` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `lab` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `send_to_lab` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `outward` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `box_products` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `parcel_products` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `box_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `parcel_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `hold` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `site_upload` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rapnet_upload` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `is_uploadsite` tinyint(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `is_uploadrapnet` tinyint(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `visibility` tinyint(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `parent_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `transaction` varchar(15) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `main_color` varchar(200) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `outward_parent` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `child_count` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sell_price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sell_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `hide` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `purchase_carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `purchase_pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `purchase_price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `purchase_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rap_price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rap_amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `inward` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `barcode` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `indexonline_id` varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `category` varchar(500) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `argyle_color` varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `in_house_clarity` varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `mining` varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `origin` varchar(100) NOT NULL DEFAULT '';

-- dai_product_delete
ALTER TABLE `dai_product_delete`
  ADD COLUMN IF NOT EXISTS `pcs` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `inward_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `description` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `amount` decimal(25,2) DEFAULT NULL;

-- dai_product_return
ALTER TABLE `dai_product_return`
  ADD COLUMN IF NOT EXISTS `pcs` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `carat` decimal(25,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `amount` decimal(25,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL;

-- dai_product_value
ALTER TABLE `dai_product_value`
  ADD COLUMN IF NOT EXISTS `report_no` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `shape` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `color` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `clarity` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `size` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `polish` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `f_intensity` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `symmentry` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cut` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mesurment` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `table_pc` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `depth_pc` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gridle` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `intensity` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `overtone` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `package` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bgm` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `eyeclean` varchar(255) DEFAULT NULL;

-- dai_rapnetprice
ALTER TABLE `dai_rapnetprice`
  ADD COLUMN IF NOT EXISTS `low_size` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `high_size` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `color` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `clarity` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `caratprice` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` varchar(100) DEFAULT NULL;

-- dai_shipping
ALTER TABLE `dai_shipping`
  ADD COLUMN IF NOT EXISTS `company` int(11) NOT NULL DEFAULT 1;

-- dai_temp
ALTER TABLE `dai_temp`
  ADD COLUMN IF NOT EXISTS `no` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `code` varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `value` longtext DEFAULT NULL;

-- notification
ALTER TABLE `notification`
  ADD COLUMN IF NOT EXISTS `message` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `image` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `user` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `datetine` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- resource
ALTER TABLE `resource`
  ADD COLUMN IF NOT EXISTS `value` varchar(100) DEFAULT NULL;

-- roll
ALTER TABLE `roll`
  ADD COLUMN IF NOT EXISTS `resource` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company` text DEFAULT NULL;

-- sms_external
ALTER TABLE `sms_external`
  ADD COLUMN IF NOT EXISTS `item` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `qty` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(10,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `chalan` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `remark` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `stock` int(11) DEFAULT NULL;

-- sms_internal
ALTER TABLE `sms_internal`
  ADD COLUMN IF NOT EXISTS `person` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `item` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `qty` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `price` decimal(10,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `inhouse` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `remark` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date` datetime DEFAULT NULL;

-- sms_stock
ALTER TABLE `sms_stock`
  ADD COLUMN IF NOT EXISTS `date` datetime DEFAULT NULL;

-- user
ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `user_email` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pass` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `first_name` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `last_name` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `address` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company_name` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tel_no` varchar(25) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `fax_no` varchar(25) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rapnet_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `skype_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `wechat_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `qq_id` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mobile` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `welcommess` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `formality` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(12) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `roll` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `online` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `profile_image` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `designation` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `department` varchar(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `joining_date` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- user_old
ALTER TABLE `user_old`
  ADD COLUMN IF NOT EXISTS `e_mail` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `password` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `verify_key` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `subscription` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `created_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `expired_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `type` varchar(12) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `firstname` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `lastname` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `address` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `company_name` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mobile` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `roll` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `online` tinyint(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `profile_image` varchar(300) DEFAULT NULL;

-- user_track
ALTER TABLE `user_track`
  ADD COLUMN IF NOT EXISTS `company` varchar(250) DEFAULT NULL;


-- =====================================================================
-- SECTION 2B: UNIVERSAL SOFT DELETE SCHEMA PARITY (35 tables)
-- Adds `deleted`, `deleted_at`, `deleted_by` to all ERP entities for soft-delete compatibility.
-- Matches ShreeHK_BackEnd/scripts/migrateUniversalSoftDelete.js.
-- =====================================================================

ALTER TABLE `branch`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `company`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `company_year`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `roll`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_party`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `category`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_attribute`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_attribute_value`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_lab`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_origin`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_shipping`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_book`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_currencyrate`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_product`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_product_value`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_history`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_gia`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_hold`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_inward`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_inward_item`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_outward`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_outward_item`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_invoice`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_company_transfer`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_company_transfer_item`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `acc_advance`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `acc_transaction`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `acc_group`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `acc_subgroup`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_quick_notes`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_ai_conversation`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `dai_activity_log`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `notification`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

ALTER TABLE `user_track`
  ADD COLUMN IF NOT EXISTS `deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `deleted_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `deleted_by` int(11) DEFAULT NULL;

-- =====================================================================
-- SECTION 3: REPAIR / ALIGN EXISTING TABLES (safe, idempotent)
-- Handles tables that may already exist from an older version of this script.
-- =====================================================================

-- 3a. dai_activity_log — align status enum + JSON columns with Node auditService
-- (CREATE IF NOT EXISTS will NOT fix a previously-created wrong definition)
-- Widen status first so UPPER() values are allowed, then tighten to Node enum.
ALTER TABLE `dai_activity_log`
  MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT 'SUCCESS';

UPDATE `dai_activity_log`
  SET `status` = UPPER(`status`)
  WHERE LOWER(`status`) IN ('success', 'attempted');

UPDATE `dai_activity_log`
  SET `status` = 'SUCCESS'
  WHERE `status` NOT IN ('SUCCESS', 'ATTEMPTED');

-- Clear non-JSON text so MODIFY to JSON does not fail
UPDATE `dai_activity_log`
  SET `old_value` = NULL
  WHERE `old_value` IS NOT NULL AND (`old_value` = '' OR JSON_VALID(`old_value`) = 0);
UPDATE `dai_activity_log`
  SET `new_value` = NULL
  WHERE `new_value` IS NOT NULL AND (`new_value` = '' OR JSON_VALID(`new_value`) = 0);
UPDATE `dai_activity_log`
  SET `changed_fields` = NULL
  WHERE `changed_fields` IS NOT NULL AND (`changed_fields` = '' OR JSON_VALID(`changed_fields`) = 0);

ALTER TABLE `dai_activity_log`
  MODIFY COLUMN `status` enum('SUCCESS','ATTEMPTED') NOT NULL DEFAULT 'SUCCESS',
  MODIFY COLUMN `old_value` json DEFAULT NULL,
  MODIFY COLUMN `new_value` json DEFAULT NULL,
  MODIFY COLUMN `changed_fields` json DEFAULT NULL;

-- indexes (ignore errors if they already exist by using procedure-free IF pattern via information_schema)
SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_activity_log' AND INDEX_NAME = 'idx_activity_created_at'
    ),
    'SELECT 1',
    'ALTER TABLE `dai_activity_log` ADD KEY `idx_activity_created_at` (`created_at`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_activity_log' AND INDEX_NAME = 'idx_activity_user_created'
    ),
    'SELECT 1',
    'ALTER TABLE `dai_activity_log` ADD KEY `idx_activity_user_created` (`user_id`, `created_at`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_activity_log' AND INDEX_NAME = 'idx_activity_module_action'
    ),
    'SELECT 1',
    'ALTER TABLE `dai_activity_log` ADD KEY `idx_activity_module_action` (`module_name`, `action_type`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_activity_log' AND INDEX_NAME = 'idx_activity_record_ref'
    ),
    'SELECT 1',
    'ALTER TABLE `dai_activity_log` ADD KEY `idx_activity_record_ref` (`record_reference`(191))'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_activity_log' AND INDEX_NAME = 'idx_activity_company_created'
    ),
    'SELECT 1',
    'ALTER TABLE `dai_activity_log` ADD KEY `idx_activity_company_created` (`company_id`, `created_at`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b. dai_quick_notes — align priority enum with Node (Low/Medium/High)
ALTER TABLE `dai_quick_notes`
  MODIFY COLUMN `priority` varchar(20) NOT NULL DEFAULT 'Medium';

UPDATE `dai_quick_notes`
  SET `priority` = CONCAT(UPPER(LEFT(`priority`, 1)), LOWER(SUBSTRING(`priority`, 2)))
  WHERE LOWER(`priority`) IN ('low', 'medium', 'high');

UPDATE `dai_quick_notes`
  SET `priority` = 'Medium'
  WHERE `priority` NOT IN ('Low', 'Medium', 'High');

ALTER TABLE `dai_quick_notes`
  MODIFY COLUMN `priority` enum('Low','Medium','High') NOT NULL DEFAULT 'Medium';

-- 3c. dai_balance — add `id` PRIMARY KEY only if the column is missing
SET @bal_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_balance' AND COLUMN_NAME = 'id'
    ),
    'SELECT 1',
    'ALTER TABLE `dai_balance` ADD COLUMN `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST'
  )
);
PREPARE stmt FROM @bal_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3d. company_year — ensure columns exist if table was created with a minimal shape
ALTER TABLE `company_year`
  ADD COLUMN IF NOT EXISTS `year` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `fromDate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `toDate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `db_name` varchar(255) DEFAULT NULL;


-- 3e. Universal soft delete indexes (idx_deleted) on core tables
-- Uses information_schema check so script remains procedure-free and idempotent

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`branch\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`company\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_year' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`company_year\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`user\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roll' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`roll\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_party' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_party\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`category\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_attribute' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_attribute\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_attribute_value' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_attribute_value\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_lab' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_lab\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_origin' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_origin\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_shipping' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_shipping\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_book' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_book\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_currencyrate' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_currencyrate\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_product' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_product\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_product_value' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_product_value\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_history' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_history\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_gia' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_gia\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_hold' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_hold\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_inward' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_inward\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_inward_item' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_inward_item\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_outward' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_outward\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_outward_item' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_outward_item\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_invoice' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_invoice\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_company_transfer' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_company_transfer\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_company_transfer_item' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_company_transfer_item\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_advance' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`acc_advance\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_transaction' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`acc_transaction\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_group' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`acc_group\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_subgroup' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`acc_subgroup\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_quick_notes' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_quick_notes\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_ai_conversation' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_ai_conversation\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dai_activity_log' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`dai_activity_log\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`notification\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_track' AND INDEX_NAME = 'idx_deleted'
    ),
    'SELECT 1',
    'ALTER TABLE \`user_track\` ADD KEY \`idx_deleted\` (\`deleted\`)'
  )
);
PREPARE stmt FROM @idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
-- DONE
-- =====================================================================
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration completed successfully (critical Node parity fixes included).' AS status;
