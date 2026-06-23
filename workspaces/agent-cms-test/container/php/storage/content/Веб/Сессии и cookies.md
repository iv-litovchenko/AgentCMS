# Сессии и cookies

```php
<?php
declare(strict_types=1);

session_start();

$_SESSION['user_id'] = 42;

setcookie('theme', 'dark', [
    'expires' => time() + 86400 * 30,
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
```

## Безопасность сессий

- `session_regenerate_id(true)` после логина.
- `httponly` + `secure` для cookies.
- Не хранить секреты в сессии без шифрования.

## Flash-сообщения

```php
$_SESSION['flash'] = 'Сохранено';
// на следующем запросе прочитать и unset
```
