# PHPUnit — первый тест

```php
<?php
declare(strict_types=1);

namespace App;

final class Calculator {
    public function add(int $a, int $b): int {
        return $a + $b;
    }
}
```

```php
<?php
declare(strict_types=1);

use App\Calculator;
use PHPUnit\Framework\TestCase;

final class CalculatorTest extends TestCase {
    public function testAdd(): void {
        $calc = new Calculator();
        $this->assertSame(5, $calc->add(2, 3));
    }
}
```

```bash
./vendor/bin/phpunit
```

## AAA

**Arrange** — подготовка, **Act** — действие, **Assert** — проверка.
