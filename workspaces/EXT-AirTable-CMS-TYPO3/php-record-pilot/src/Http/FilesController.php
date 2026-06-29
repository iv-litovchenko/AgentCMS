<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class FilesController
{
    public function __construct(
        private readonly string $basePath,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'files/index', []);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Файлы (FTP)',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }
}
