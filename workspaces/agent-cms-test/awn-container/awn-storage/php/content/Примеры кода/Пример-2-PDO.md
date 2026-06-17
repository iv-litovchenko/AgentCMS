# Пример 2 — PDO CRUD

Файл: `pdo-crud.php`

```php
<?php
declare(strict_types=1);

$pdo = new PDO(getenv('DB_DSN'), getenv('DB_USER'), getenv('DB_PASS'), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

function createPost(PDO $pdo, string $title, string $body): int {
    $stmt = $pdo->prepare('INSERT INTO posts (title, body) VALUES (:title, :body)');
    $stmt->execute(['title' => $title, 'body' => $body]);
    return (int) $pdo->lastInsertId();
}

function listPosts(PDO $pdo): array {
    return $pdo->query('SELECT id, title FROM posts ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC);
}
```

## Запуск

Требует таблицу `posts` и `.env` в слоте `_s.PHP/`.
