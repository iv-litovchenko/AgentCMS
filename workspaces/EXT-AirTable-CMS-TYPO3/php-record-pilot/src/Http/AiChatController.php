<?php

declare(strict_types=1);

namespace RecordPilot\Http;

final class AiChatController
{
    public function __construct(
        private readonly string $basePath,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'ai_chat/index', []);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Чат с ИИ',
            'content' => $content,
            'panelUser' => $user,
            'extraHead' => '<link rel="stylesheet" href="/css/ai-chat-mock.css" />',
        ]);

        return Response::html($html);
    }
}
