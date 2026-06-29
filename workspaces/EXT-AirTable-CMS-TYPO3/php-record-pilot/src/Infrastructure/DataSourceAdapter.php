<?php

declare(strict_types=1);

namespace RecordPilot\Infrastructure;

/**
 * Порт доступа к строкам таблицы (list / get / update) для вертикального среза.
 */
interface DataSourceAdapter
{
    /**
     * @param list<string> $selectColumns
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function fetchList(
        string $table,
        array $selectColumns,
        ?string $softDeleteColumn,
        int $page,
        int $perPage,
        string $orderColumn,
        string $orderDir,
    ): array;

    /**
     * @param list<string>|null $selectColumns null = SELECT *
     * @return array<string, mixed>|null
     */
    public function fetchOne(
        string $table,
        string $primaryKey,
        int|string $id,
        ?string $softDeleteColumn,
        ?array $selectColumns = null,
    ): ?array;

    /**
     * @param array<string, mixed> $data
     * @param list<string> $allowedColumns
     */
    public function updateRow(
        string $table,
        string $primaryKey,
        int|string $id,
        array $data,
        array $allowedColumns,
    ): void;
}
