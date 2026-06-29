<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class ExportController
{
    public function __construct(
        private readonly string $basePath,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'export/index', []);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Экспорт',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }
}
