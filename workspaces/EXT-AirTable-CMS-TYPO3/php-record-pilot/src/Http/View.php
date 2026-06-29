<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class View
{
    /**
     * @param array<string, mixed> $data
     */
    public static function render(string $basePath, string $template, array $data): string
    {
        $file = $basePath . '/views/' . $template . '.php';
        if (! is_readable($file)) {
            throw new \RuntimeException('View not found: ' . $template);
        }
        extract($data, EXTR_SKIP);
        ob_start();
        include $file;

        return ob_get_clean() ?: '';
    }
}
