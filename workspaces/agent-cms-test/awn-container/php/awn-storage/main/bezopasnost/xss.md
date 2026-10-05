---
awn-create: "2026-07-25T11:00:01.495Z"
awn-update: "2026-07-25T11:00:01.495Z"
awn-name: XSS
awn-description: Экранирование вывода и CSP
awn-version: 2
awn-sort: 10
awn-status: open
awn-mindmap-enabled: true
awn-mindmap-type: advanced
awn-mindmap-color: red
awn-mindmap-size: small
awn-id: 36
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
