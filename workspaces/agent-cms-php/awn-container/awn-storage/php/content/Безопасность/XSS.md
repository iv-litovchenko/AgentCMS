---
awn-create: ""
awn-update: ""
awn-description: ""
awn-version: ""
awn-sort: ""
---

# XSS

**Cross-Site Scripting** — внедрение JS через вывод пользовательских данных.

```php
// Плохо
echo $userComment;

// Хорошо
echo htmlspecialchars($userComment, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
```

## Контексты

| Контекст | Подход |
|----------|--------|
| HTML body | `htmlspecialchars` |
| HTML attribute | ENT_QUOTES |
| URL | `rawurlencode` |
| JS | JSON_HEX_TAG и т.д. |

## CSP

Content-Security-Policy в заголовках ограничивает inline-скрипты.
