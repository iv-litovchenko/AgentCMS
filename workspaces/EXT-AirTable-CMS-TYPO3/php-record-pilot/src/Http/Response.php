<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class Response
{
    public function __construct(
        private int $statusCode = 200,
        private array $headers = [],
        private string $body = '',
    ) {
    }

    public static function html(string $html, int $statusCode = 200): self
    {
        return new self($statusCode, ['Content-Type' => 'text/html; charset=utf-8'], $html);
    }

    public static function json(array $data, int $status = 200): self
    {
        return new self(
            $status,
            ['Content-Type' => 'application/json; charset=utf-8'],
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
        );
    }

    public static function redirect(string $to, int $status = 302): self
    {
        return new self($status, ['Location' => $to], '');
    }

    public static function notFound(string $html = 'Not found'): self
    {
        return new self(404, ['Content-Type' => 'text/html; charset=utf-8'], $html);
    }

    public static function serverError(string $html): self
    {
        return new self(500, ['Content-Type' => 'text/html; charset=utf-8'], $html);
    }

    public function send(): void
    {
        http_response_code($this->statusCode);
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo $this->body;
    }
}
