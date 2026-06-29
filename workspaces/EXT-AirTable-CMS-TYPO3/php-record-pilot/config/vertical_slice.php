<?php

declare(strict_types=1);

/**
 * Первый вертикальный срез: одна сущность, list + get + update.
 *
 * Таблица и поля должны соответствовать physicalSchema в metadata/services.schema.idea.json.
 */
return [
    /** Подключение из config/panel.php → connections[] (супер-админ видит все, CRUD пока идёт в это). */
    'connection_id' => getenv('VERTICAL_SLICE_CONNECTION_ID') ?: 'default',
    'entity' => 'services',
    'schemaFile' => 'services.schema.idea.json',
    /** Колонки для списка (подмножество physicalSchema + виртуальные позже) */
    'listColumns' => ['id', 'title', 'slug', 'is_active', 'updated_at'],
    /** Поля, разрешённые к сохранению в форме первого среза */
    'editableFields' => [
        'title',
        'slug',
        'description',
        'user_work_description',
        'price_from',
        'is_active',
    ],
];
