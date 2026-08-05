CREATE TABLE IF NOT EXISTS `dai_ai_conversation` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `thread_id` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) DEFAULT 'New Conversation',
  `messages` JSON NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_company` (`user_id`, `company_id`),
  INDEX `idx_thread` (`thread_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
