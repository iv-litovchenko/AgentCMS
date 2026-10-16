---
awn-name: PDO
awn-description: Подключение, prepared statements, fetch modes
awn-status: open
awn-sort: 10
awn-mindmap-enabled: true
awn-mindmap-type: recommended
awn-mindmap-color: green
awn-mindmap-size: medium
---

# PDO

```php
<?php
declare(strict_types=1);

$pdo = new PDO(
    'mysql:host=127.0.0.1;dbname=app;charset=utf8mb4',
    'user',
    'pass',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$stmt = $pdo->prepare('INSERT INTO posts (title, body) VALUES (:title, :body)');
$stmt->execute(['title' => $title, 'body' => $body]);
$id = (int) $pdo->lastInsertId();
```

## SELECT

```php
$stmt = $pdo->prepare('SELECT id, title FROM posts WHERE user_id = :uid ORDER BY id DESC');
$stmt->execute(['uid' => $userId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

## Транзакции

```php
$pdo->beginTransaction();
try {
    // несколько запросов
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
```

## Безопасность

- Только prepared statements для пользовательских данных.
- Минимальные права у DB-пользователя.
- Не логировать пароли и токены.
