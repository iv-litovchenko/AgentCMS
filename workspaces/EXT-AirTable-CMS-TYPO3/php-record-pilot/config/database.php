<?php

declare(strict_types=1);

/**
 * DSN для PDO MySQL. Пример: mysql:host=127.0.0.1;port=3306;dbname=myapp;charset=utf8mb4
 *
 * Без правки кода: переменные окружения DB_DSN, DB_USER, DB_PASSWORD.
 * Локально: скопируйте database.local.example.php → database.local.php (см. README).
 */
$defaults = [
    'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=recordpilot;charset=utf8mb4',
    'user' => 'root',
    'password' => '',
    'options' => [
        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
    ],
];

$localPath = __DIR__ . '/database.local.php';
if (is_file($localPath)) {
    $local = require $localPath;
    if (is_array($local)) {
        $defaults = array_merge($defaults, $local);
    }
}

// Переменные окружения DB_* имеют приоритет над database.local.php
$base = [
    'dsn' => getenv('DB_DSN') ?: $defaults['dsn'],
    'user' => getenv('DB_USER') ?: $defaults['user'],
    'password' => getenv('DB_PASSWORD') !== false
        ? (string) getenv('DB_PASSWORD')
        : $defaults['password'],
    'options' => $defaults['options'],
];

return $base;
