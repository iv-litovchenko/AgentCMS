---
awn-status: in-progress
---

# Вопрос — match vs switch

Нужно ли в новом коде всегда использовать `match` вместо `switch`?

```php
$result = match ($status) {
    'draft' => 'Черновик',
    'published' => 'Опубликовано',
    default => 'Неизвестно',
};
```

TODO: добавить сравнение в `Content.md` после проверки на проекте.
