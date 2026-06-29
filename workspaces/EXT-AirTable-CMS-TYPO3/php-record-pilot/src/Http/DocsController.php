<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class DocsController
{
    public function __construct(
        private readonly string $basePath,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'docs/index', [
            'docsSection' => 'index',
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Документация',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }

    public function mockups(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'docs/mockups', [
            'docsSection' => 'mockups',
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Макеты UI',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }
}
