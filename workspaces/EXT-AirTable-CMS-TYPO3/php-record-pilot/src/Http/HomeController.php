<?php

declare(strict_types=1);

namespace RecordPilot\Http;

use RecordPilot\Config\PanelConfig;

final class HomeController
{
    public function __construct(
        private readonly string $basePath,
        private readonly PanelConfig $panel,
    ) {
    }

    /** GET / — «главная» по логотипу: выбор БД (заготовка). */
    public function index(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'home', [
            'connectionIds' => $this->panel->getConnectionIds(),
            'connections' => $this->panel->getConnectionsForDisplay(),
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Главная',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }

    /** GET /dashboard — пункт меню «Главная»: виджеты и быстрые ссылки. */
    public function dashboard(): Response
    {
        $user = Auth::user();
        $content = View::render($this->basePath, 'dashboard', [
            'connectionIds' => $this->panel->getConnectionIds(),
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Дашборд',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }
}
