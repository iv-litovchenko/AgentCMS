---
awn-create: "2026-07-29T17:48:45.731Z"
awn-update: 2026-07-29T17:48:54.300Z
awn-version: 2
awn-main: false
---

# PHP — конспект (однофайловая память)

> Связный текст для агента: читать целиком перед ответами по теме.

## 1. Базовый синтаксис

```php
<?php
declare(strict_types=1);

$name = 'World';
echo "Hello, {$name}!\n";
```

- Файл начинается с `<?php`, закрывающий `?>` в pure-PHP файлах не нужен.
- `declare(strict_types=1)` — строгая проверка типов в этом файле.

## 2. Типы

| Тип | Пример |
|-----|--------|
| scalar | `string`, `int`, `float`, `bool` |
| compound | `array`, `object`, `callable` |
| special | `null`, `resource` |
| PHP 8+ | `mixed`, union `string\|int`, intersection |

## 3. Функции и замыкания

```php
$mul = fn(int $a, int $b): int => $a * $b;
```

## 4. ООП — минимум

- `class`, `interface`, `trait`, `enum` (8.1+)
- `public` / `protected` / `private`
- Constructor property promotion, `readonly` (8.1+)

## 5. Исключения

```php
try {
    throw new RuntimeException('ошибка');
} catch (RuntimeException $e) {
    error_log($e->getMessage());
}
```

## 6. PDO — безопасные запросы

```php
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute(['id' => $id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
```

**Никогда** не склеивать SQL из пользовательского ввода.

## 7. Composer и автозагрузка

```bash
composer init
composer require monolog/monolog
```

PSR-4: namespace → папка в `src/`.

## Шпаргалка

| Конструкция | С PHP | Назначение |
|-------------|-------|------------|
| `??` | 7.0 | null coalescing |
| `<=>` | 7.0 | spaceship compare |
| `match` | 8.0 | switch-expression |
| `str_contains` | 8.0 | поиск подстроки |
| `readonly` | 8.1 | неизменяемое свойство |

## Частые ошибки

1. Сравнение `==` вместо `===` для строк и ID.
2. Отсутствие `strict_types` в новом коде.
3. SQL без prepared statements.
4. Вывод пользовательских данных без `htmlspecialchars`.
