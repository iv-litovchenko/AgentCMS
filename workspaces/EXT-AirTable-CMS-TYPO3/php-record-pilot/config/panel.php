<?php

declare(strict_types=1);

/**
 * Панель: супер-администратор и список подключений к БД (все доступны супер-админу).
 *
 * Пароль супер-админа по умолчанию: changeme (см. README).
 * Задайте PANEL_SUPER_ADMIN_PASSWORD_HASH или PANEL_SUPER_ADMIN_USER в окружении.
 */
$db = require __DIR__ . '/database.php';

return [
    'super_admin' => [
        'username' => getenv('PANEL_SUPER_ADMIN_USER') ?: 'admin',
        'password_hash' => getenv('PANEL_SUPER_ADMIN_PASSWORD_HASH') ?: '$2y$12$7ZYGbeiiZSbgI.mZ1R7/zujmyM0DSLMo4c/eE9BV5iSNVOtpyO1K.',
    ],
    'connections' => [
        [
            'id' => 'default',
            'label' => 'Основная БД (recordpilot)',
            'dsn' => $db['dsn'],
            'user' => $db['user'],
            'password' => $db['password'],
        ],
        // Добавьте сюда другие БД — супер-администратор видит их в «Настройках».
        // [
        //     'id' => 'project_b',
        //     'label' => 'Проект B',
        //     'dsn' => 'mysql:host=127.0.0.1;dbname=other;charset=utf8mb4',
        //     'user' => 'root',
        //     'password' => '',
        // ],
    ],
];
