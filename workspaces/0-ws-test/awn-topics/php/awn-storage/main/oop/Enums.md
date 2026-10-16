# Enums (PHP 8.1+)

```php
<?php
declare(strict_types=1);

enum PostStatus: string {
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string {
        return match ($this) {
            self::Draft => 'Черновик',
            self::Published => 'Опубликовано',
            self::Archived => 'Архив',
        };
    }
}

$post = PostStatus::Draft;
echo $post->value;   // draft
echo $post->label(); // Черновик
```

## Backed vs pure

- **Backed** — есть scalar value (`string` / `int`).
- **Pure** — только case без значения, удобно для domain-модели.
