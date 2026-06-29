-- Минимальная таблица под metadata/services.schema.idea.json (physicalSchema.table = services).
-- Выполните в своей БД перед проверкой list/edit.

CREATE TABLE IF NOT EXISTS `services` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `slug` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT NULL,
  `user_work_description` TEXT NULL,
  `price_from` DECIMAL(10,2) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `published_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_services_slug` (`slug`),
  KEY `idx_services_is_active` (`is_active`),
  KEY `idx_services_published_at` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `services` (`title`, `slug`, `description`, `is_active`, `created_at`, `updated_at`)
VALUES ('Тестовая услуга', 'test-service', 'Описание', 1, NOW(), NOW());
