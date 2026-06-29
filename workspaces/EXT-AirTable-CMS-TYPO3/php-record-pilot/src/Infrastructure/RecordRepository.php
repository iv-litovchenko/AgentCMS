<?php

declare(strict_types=1);

namespace RecordPilot\Infrastructure;

/**
 * Тонкая обёртка: метаданные + адаптер.
 */
final class RecordRepository
{
    /**
     * @param array<string, mixed> $schema
     * @param array<string, mixed> $verticalSlice
     */
    public function __construct(
        private readonly DataSourceAdapter $adapter,
        private readonly array $schema,
        private readonly array $verticalSlice,
    ) {
    }

    /**
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function listPage(int $page, int $perPage): array
    {
        $physical = $this->schema['physicalSchema'];
        if (! is_array($physical)) {
            throw new \RuntimeException('Invalid schema');
        }
        $table = (string) $physical['table'];
        $soft = isset($physical['softDeleteField']) ? (string) $physical['softDeleteField'] : null;
        $listCols = $this->verticalSlice['listColumns'] ?? [];
        if (! is_array($listCols) || $listCols === []) {
            throw new \RuntimeException('vertical_slice.listColumns empty');
        }
        /** @var list<string> $listCols */
        $listCols = array_values(array_map(static fn (mixed $c): string => (string) $c, $listCols));

        $defaultSort = $this->schema['adminSchema']['listView']['defaultSort'][0] ?? null;
        $orderField = 'id';
        $orderDir = 'DESC';
        if (is_array($defaultSort) && isset($defaultSort['field'], $defaultSort['direction'])) {
            $orderField = (string) $defaultSort['field'];
            $orderDir = (string) $defaultSort['direction'];
        }

        return $this->adapter->fetchList(
            $table,
            $listCols,
            $soft,
            $page,
            $perPage,
            $orderField,
            $orderDir,
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getById(int|string $id): ?array
    {
        $physical = $this->schema['physicalSchema'];
        if (! is_array($physical)) {
            throw new \RuntimeException('Invalid schema');
        }
        $table = (string) $physical['table'];
        $pk = (string) $physical['primaryKey'];
        $soft = isset($physical['softDeleteField']) ? (string) $physical['softDeleteField'] : null;
        $editable = $this->verticalSlice['editableFields'] ?? [];
        $system = ['id', 'created_at', 'updated_at'];
        $editableList = is_array($editable)
            ? array_values(array_map(static fn (mixed $x): string => (string) $x, $editable))
            : [];
        $cols = array_values(array_unique(array_merge($editableList, $system)));

        return $this->adapter->fetchOne($table, $pk, $id, $soft, $cols);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(int|string $id, array $data): void
    {
        $physical = $this->schema['physicalSchema'];
        if (! is_array($physical)) {
            throw new \RuntimeException('Invalid schema');
        }
        $table = (string) $physical['table'];
        $pk = (string) $physical['primaryKey'];
        $allowed = $this->verticalSlice['editableFields'] ?? [];
        if (! is_array($allowed)) {
            $allowed = [];
        }
        /** @var list<string> $allowed */
        $allowed = array_values(array_map(static fn (mixed $x): string => (string) $x, $allowed));

        $this->adapter->updateRow($table, $pk, $id, $data, $allowed);
    }
}
