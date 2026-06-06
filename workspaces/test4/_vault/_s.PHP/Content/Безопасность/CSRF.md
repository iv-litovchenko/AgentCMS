# CSRF

**Cross-Site Request Forgery** — подмена запроса от имени авторизованного пользователя.

## Token в форме

```php
// генерация
$_SESSION['csrf'] = bin2hex(random_bytes(32));

// в форме
<input type="hidden" name="_token" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">

// проверка POST
if (!hash_equals($_SESSION['csrf'], $_POST['_token'] ?? '')) {
    http_response_code(403);
    exit('CSRF');
}
```

## SameSite cookies

`SameSite=Lax` или `Strict` снижает риск для cookie-based auth.
