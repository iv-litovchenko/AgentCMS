<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class ImportController
{
    public function __construct(
        private readonly string $basePath,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'import/index', []);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Импорт',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }
}
