<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class Request
{
    public function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $query,
        private readonly array $post,
        private readonly array $server,
    ) {
    }

    public static function fromGlobals(): self
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $path = $path === '' ? '/' : $path;
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/') ?: '/';
        }

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $path,
            $_GET,
            $_POST,
            $_SERVER,
        );
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    /** @return array<string, mixed> */
    public function getQuery(): array
    {
        return $this->query;
    }

    /** @return array<string, mixed> */
    public function getPost(): array
    {
        return $this->post;
    }

    public function getQueryString(string $key, ?string $default = null): ?string
    {
        $v = $this->query[$key] ?? $default;
        return is_string($v) ? $v : $default;
    }

    /** @return array<string, mixed> */
    public function getServer(): array
    {
        return $this->server;
    }
}
