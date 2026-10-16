# Пример 3 — REST JSON API (минимальный)

```php
<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'GET' && $path === '/api/health') {
    echo json_encode(['status' => 'ok'], JSON_THROW_ON_ERROR);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found'], JSON_THROW_ON_ERROR);
```

Запуск: `php -S localhost:8080 api-mini.php`
