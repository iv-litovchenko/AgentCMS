<?php

declare(strict_types=1);

namespace RecordPilot\Config;

/**
 * Конфигурация панели: супер-администратор и подключения к БД.
 */
final class PanelConfig
{
    /**
     * @param array{username: string, password_hash: string} $superAdmin
     * @param list<array{id: string, label: string, dsn: string, user: string, password: string}> $connections
     */
    public function __construct(
        private readonly array $superAdmin,
        private readonly array $connections,
        private readonly array $pdoOptions,
    ) {
    }

    public static function load(string $basePath): self
    {
        $path = $basePath . '/config/panel.php';
        if (! is_file($path)) {
            throw new \RuntimeException('config/panel.php not found.');
        }
        /** @var array<string, mixed> $data */
        $data = require $path;
        $db = require $basePath . '/config/database.php';
        $pdoOptions = $db['options'] ?? [];

        $super = $data['super_admin'] ?? null;
        if (! is_array($super) || ! isset($super['username'], $super['password_hash'])) {
            throw new \RuntimeException('Invalid panel.php: super_admin.');
        }

        $connections = $data['connections'] ?? [];
        if (! is_array($connections) || $connections === []) {
            throw new \RuntimeException('Invalid panel.php: connections must be non-empty.');
        }

        foreach ($connections as $c) {
            if (! is_array($c) || ! isset($c['id'], $c['label'], $c['dsn'], $c['user'])) {
                throw new \RuntimeException('Invalid panel.php: each connection needs id, label, dsn, user.');
            }
        }

        return new self(
            [
                'username' => (string) $super['username'],
                'password_hash' => (string) $super['password_hash'],
            ],
            array_values($connections),
            is_array($pdoOptions) ? $pdoOptions : [],
        );
    }

    public function getSuperAdminUsername(): string
    {
        return $this->superAdmin['username'];
    }

    public function verifySuperAdmin(string $username, string $password): bool
    {
        if ($username !== $this->superAdmin['username']) {
            return false;
        }

        return password_verify($password, $this->superAdmin['password_hash']);
    }

    /**
     * Эмодзи и подпись типа БД по префиксу PDO DSN (для меню проекта и настроек).
     *
     * @return array{emoji: string, label: string}
     */
    public static function driverInfoFromDsn(string $dsn): array
    {
        $dsn = strtolower(trim($dsn));
        if (str_starts_with($dsn, 'mysql:')) {
            return ['emoji' => '🐬', 'label' => 'MySQL'];
        }
        if (str_starts_with($dsn, 'pgsql:')) {
            return ['emoji' => '🐘', 'label' => 'PostgreSQL'];
        }
        if (str_starts_with($dsn, 'sqlite:')) {
            return ['emoji' => '📁', 'label' => 'SQLite'];
        }
        if (str_starts_with($dsn, 'sqlsrv:')) {
            return ['emoji' => '🪟', 'label' => 'SQL Server'];
        }

        return ['emoji' => '🗄️', 'label' => 'БД'];
    }

    /**
     * @return list<array{id: string, label: string, dsn: string, user: string, password_masked: string, db_emoji: string, db_label: string}>
     */
    public function getConnectionsForDisplay(): array
    {
        $out = [];
        foreach ($this->connections as $c) {
            $pwd = (string) ($c['password'] ?? '');
            $dsn = (string) $c['dsn'];
            $drv = self::driverInfoFromDsn($dsn);
            $out[] = [
                'id' => (string) $c['id'],
                'label' => (string) $c['label'],
                'dsn' => $dsn,
                'user' => (string) $c['user'],
                'password_masked' => $pwd !== '' ? '••••••••' : '(пусто)',
                'db_emoji' => $drv['emoji'],
                'db_label' => $drv['label'],
            ];
        }

        return $out;
    }

    /**
     * Конфиг для PDO (как database.php) по id подключения.
     *
     * @return array{dsn: string, user: string, password: string, options: array<string, mixed>}
     */
    public function getPdoConfigForConnection(string $id): array
    {
        foreach ($this->connections as $c) {
            if (($c['id'] ?? '') === $id) {
                return [
                    'dsn' => (string) $c['dsn'],
                    'user' => (string) $c['user'],
                    'password' => (string) ($c['password'] ?? ''),
                    'options' => $this->pdoOptions,
                ];
            }
        }

        throw new \RuntimeException('Неизвестное подключение: ' . $id);
    }

    /** @return list<string> */
    public function getConnectionIds(): array
    {
        return array_map(static fn (array $c): string => (string) $c['id'], $this->connections);
    }
}
