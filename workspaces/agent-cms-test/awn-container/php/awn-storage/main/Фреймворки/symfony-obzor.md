---
awn-preview: ""
awn-emoji: ""
awn-name: Symfony обзор
awn-status: 🟡 Черновик
awn-type: awn.content.record
awn-create: "2026-06-11T11:14"
awn-update: 2026-06-11T08:14:04.262Z
awn-description: ""
awn-main: false
awn-category: ""
awn-tags: []
awn-color: "#000000"
awn-version: 3
awn-sort: 0
---

# Symfony — обзор

## Компоненты vs full stack

Symfony можно использовать как набор компонентов (HttpFoundation, Console, Validator) или как полное приложение.

## Контроллер (упрощённо)

```php
#[Route('/posts', methods: ['GET'])]
public function index(PostRepository $posts): Response {
    return $this->json($posts->findPublished());
}
```

## DI Container

Зависимости внедряются через constructor — конфигурация в `services.yaml`.

## Когда выбирать

Гибкая архитектура, enterprise, долгоживущие проекты.
