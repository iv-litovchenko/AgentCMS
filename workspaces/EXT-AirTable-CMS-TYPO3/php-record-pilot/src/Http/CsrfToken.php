<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class CsrfToken
{
    private const SESSION_KEY = '_csrf_token';

    public static function ensureSessionStarted(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }

    public static function getToken(): string
    {
        self::ensureSessionStarted();
        if (empty($_SESSION[self::SESSION_KEY])) {
            $_SESSION[self::SESSION_KEY] = bin2hex(random_bytes(32));
        }

        return $_SESSION[self::SESSION_KEY];
    }

    public static function validate(?string $token): bool
    {
        self::ensureSessionStarted();
        $expected = $_SESSION[self::SESSION_KEY] ?? '';
        return is_string($token) && $expected !== '' && hash_equals($expected, $token);
    }
}
