# HTTP и формы

```php
<?php
declare(strict_types=1);

// GET
$page = (int) ($_GET['page'] ?? 1);

// POST
$title = trim((string) ($_POST['title'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // validate + save
}
```

## Superglobals

| Переменная | Содержимое |
|------------|------------|
| `$_GET` | query string |
| `$_POST` | body form |
| `$_SERVER` | метод, URI, headers |
| `$_FILES` | загрузки |
| `$_COOKIE` | cookies |
| `$_SESSION` | сессия (после session_start) |

## Redirect после POST

```php
header('Location: /posts/' . $id, true, 303);
exit;
```
