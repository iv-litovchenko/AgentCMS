---
awn-preview: ""
awn-category: ""
awn-status: 🟢 Открыта
awn-type: awn.content.record
awn-name: Миграции
awn-create: 2026-06-08T23:19:47.342Z
awn-update: 2026-06-08T23:19:47.342Z
awn-description: ""
awn-tags: []
awn-version: 0.0.1
awn-sort: 0
---

# Миграции (концепция)

В Laravel / Symfony миграции — версионирование схемы БД.

## Пример SQL-миграции вручную

```sql
-- 001_create_posts.sql
CREATE TABLE posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  status ENUM('draft','published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Laravel (справочно)

```bash
php artisan make:migration create_posts_table
php artisan migrate
```

## Принципы

1. Одна миграция — одно атомарное изменение.
2. Именование по времени или порядковому номеру.
3. Rollback там, где это возможно.
