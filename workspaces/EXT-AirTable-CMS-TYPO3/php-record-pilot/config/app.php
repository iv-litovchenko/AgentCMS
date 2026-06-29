<?php

declare(strict_types=1);

return [
    'app_name' => 'php-record-pilot',
    /** Отображаемое имя площадки на экране «Настройки площадки» и в шапке (опционально). */
    'platform_display_name' => getenv('PLATFORM_DISPLAY_NAME') ?: 'RecordPilot',
    'env' => getenv('APP_ENV') ?: 'dev',
    'debug' => (getenv('APP_DEBUG') ?: '1') === '1',
    'timezone' => getenv('APP_TIMEZONE') ?: 'UTC',
];
