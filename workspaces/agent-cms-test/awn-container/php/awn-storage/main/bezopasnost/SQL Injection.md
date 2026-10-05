# SQL Injection

Атака через конкатенацию SQL и пользовательского ввода.

```php
// ОПАСНО — никогда так
$sql = "SELECT * FROM users WHERE email = '{$_POST['email']}'";

// Безопасно — prepared statement
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
$stmt->execute(['email' => $_POST['email']]);
```

## Дополнительно

- Минимальные права DB-пользователя (только нужные таблицы).
- ORM (Eloquent, Doctrine) — тоже используют параметризацию, но сырые запросы проверять.
- Логировать failed auth, не раскрывать stack trace в prod.
