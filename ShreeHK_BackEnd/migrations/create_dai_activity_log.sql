-- Immutable audit trail for ShreeHK ERP (run on tenant/year DB and meta DB as needed)
-- No UPDATE/DELETE application routes should target this table.

CREATE TABLE IF NOT EXISTS `dai_activity_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL DEFAULT 1,
  `user_id` INT NULL DEFAULT NULL COMMENT 'NULL = SYSTEM',
  `user_name` VARCHAR(255) NOT NULL DEFAULT '',
  `user_role` VARCHAR(100) NOT NULL DEFAULT '',
  `user_role_id` INT NULL DEFAULT NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `module_name` VARCHAR(100) NOT NULL DEFAULT '',
  `record_id` VARCHAR(64) NULL DEFAULT NULL,
  `record_reference` VARCHAR(255) NULL DEFAULT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `changed_fields` JSON NULL,
  `description` TEXT NULL,
  `ip_address` VARCHAR(64) NULL DEFAULT NULL,
  `user_agent` VARCHAR(512) NULL DEFAULT NULL,
  `status` ENUM('SUCCESS','ATTEMPTED') NOT NULL DEFAULT 'SUCCESS',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_activity_created_at` (`created_at`),
  KEY `idx_activity_user_created` (`user_id`, `created_at`),
  KEY `idx_activity_module_action` (`module_name`, `action_type`),
  KEY `idx_activity_record_ref` (`record_reference`(191)),
  KEY `idx_activity_company_created` (`company_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Immutable admin audit trail';
