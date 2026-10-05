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
