<?php

declare(strict_types=1);

namespace RecordPilot\Http;

use RecordPilot\Config\PanelConfig;

final class SettingsController
{
    public function __construct(
        private readonly string $basePath,
        private readonly PanelConfig $panel,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        /** @var array<string, mixed> $appConfig */
        $appConfig = require $this->basePath . '/config/app.php';
        /** @var array<string, mixed> $verticalSlice */
        $verticalSlice = require $this->basePath . '/config/vertical_slice.php';

        $content = View::render($this->basePath, 'settings/index', [
            'superAdminUsername' => $this->panel->getSuperAdminUsername(),
            'connections' => $this->panel->getConnectionsForDisplay(),
            'connectionIds' => $this->panel->getConnectionIds(),
            'appConfig' => $appConfig,
            'verticalSlice' => $verticalSlice,
            'phpVersion' => PHP_VERSION,
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Настройки площадки',
            'content' => $content,
            'panelUser' => $user,
        ]);

        return Response::html($html);
    }
}
