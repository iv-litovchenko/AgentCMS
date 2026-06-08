# Laravel — обзор

## Структура (упрощённо)

```
app/
  Http/Controllers/
  Models/
routes/web.php
resources/views/
database/migrations/
```

## Eloquent

```php
$post = Post::query()
    ->where('status', 'published')
    ->orderByDesc('created_at')
    ->limit(10)
    ->get();
```

## Artisan

```bash
php artisan serve
php artisan make:model Post -m
php artisan route:list
```

## Когда выбирать

Полный stack, быстрый старт, богатая экосистема пакетов.
