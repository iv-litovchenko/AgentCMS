<?php

declare(strict_types=1);

/**
 * Скопируйте этот файл как database.local.php и подставьте реальные host/user/password.
 * database.local.php в .gitignore — не попадёт в репозиторий.
 *
 * Примеры DSN:
 * - PHP на хосте, MySQL в Docker с пробросом 3306: mysql:host=127.0.0.1;port=3306;dbname=recordpilot;charset=utf8mb4
 * - PHP в Docker, MySQL — сервис docker-compose с именем «db»: mysql:host=db;port=3306;dbname=recordpilot;charset=utf8mb4
 * - PHP в Docker, MySQL на хосте (Mac/Win): mysql:host=host.docker.internal;port=3306;dbname=recordpilot;charset=utf8mb4
 */
return [
    'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=recordpilot;charset=utf8mb4',
    'user' => 'root',
    'password' => '',
];
