# Namespaces и autoload

```php
<?php
declare(strict_types=1);

namespace App\Service;

use App\Model\User;
use App\Repository\UserRepository;
use RuntimeException;

final class UserService {
    public function __construct(private UserRepository $users) {}

    public function register(string $email): User {
        if ($this->users->findByEmail($email)) {
            throw new RuntimeException('Email занят');
        }
        return $this->users->create($email);
    }
}
```

## PSR-4 в composer.json

```json
{
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
}
```

Файл `src/Service/UserService.php` → класс `App\Service\UserService`.
