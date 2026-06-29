<?php

declare(strict_types=1);

/**
 * Минимальный PSR-4 автозагрузчик для RecordPilot\ (без обязательного Composer).
 * После `composer install` можно подключать vendor/autoload.php вместо этого файла.
 */
spl_autoload_register(static function (string $class): void {
    $prefix = 'RecordPilot\\';
    $baseDir = dirname(__DIR__) . '/src/';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = $baseDir . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
