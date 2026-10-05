---
awn-status: done
awn-triaged-at: "2026-06-28T16:59:16.237Z"
---

# Заметка с доклада — Generators

Сырой черновик с митапа. **Разобрать** → перенести в `Content/Синтаксис/`.

Generators экономят память при больших наборах:

```php
function readLines(string $path): Generator {
    $handle = fopen($path, 'r');
    while (($line = fgets($handle)) !== false) {
        yield trim($line);
    }
    fclose($handle);
}
```

Вопросы:
- когда generator хуже массива?
- как типизировать `Generator<int, string, void, void>`?
