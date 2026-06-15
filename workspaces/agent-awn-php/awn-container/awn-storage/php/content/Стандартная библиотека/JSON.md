# JSON

```php
<?php
declare(strict_types=1);

$data = ['title' => 'PHP', 'tags' => ['web', 'backend']];
$json = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

$decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
```

## API response

```php
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'items' => $items], JSON_THROW_ON_ERROR);
```

## Ошибки

`JSON_THROW_ON_ERROR` (PHP 7.3+) — исключение вместо `null` при ошибке.
