<?php

declare(strict_types=1);

namespace RecordPilot\Http;

/**
 * Сессия панели: один тип пользователя — супер-администратор (доступ ко всем подключениям из config/panel.php).
 */
final class Auth
{
    private const SESSION_KEY = 'panel_user';

    public static function user(): ?array
    {
        CsrfToken::ensureSessionStarted();
        $u = $_SESSION[self::SESSION_KEY] ?? null;

        return is_array($u) ? $u : null;
    }

    public static function check(): bool
    {
        $u = self::user();

        return $u !== null && ($u['role'] ?? '') === 'super_admin';
    }

    public static function loginAsSuperAdmin(string $username): void
    {
        CsrfToken::ensureSessionStarted();
        $_SESSION[self::SESSION_KEY] = [
            'role' => 'super_admin',
            'username' => $username,
        ];
    }

    public static function logout(): void
    {
        CsrfToken::ensureSessionStarted();
        unset($_SESSION[self::SESSION_KEY]);
    }
}
