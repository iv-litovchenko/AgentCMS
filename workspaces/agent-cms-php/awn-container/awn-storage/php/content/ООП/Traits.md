# Traits

Горизонтальное переиспользование кода без наследования::

```php
<?php
declare(strict_types=1);

trait Timestampable {
    public function touch(): void {
        $this->updatedAt = new DateTimeImmutable();
    }
}

final class Article {
    use Timestampable;

    public function __construct(
        public string $title,
        public DateTimeImmutable $updatedAt = new DateTimeImmutable(),
    ) {}
}
```

## Конфликты имён

```php
trait A { public function save(): void {} }
trait B { public function save(): void {} }

class C {
    use A, B {
        A::save insteadof B;
        B::save as backupSave;
    }
}
```
