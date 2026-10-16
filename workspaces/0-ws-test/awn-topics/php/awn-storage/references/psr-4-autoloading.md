# PSR-4 Autoloading

- Spec: https://www.php-fig.org/psr/psr-4/
- Composer: `composer.json` → `autoload.psr-4`

Пример:

```json
{
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
}
```

Namespace `App\Model\User` → файл `src/Model/User.php`.
