<?php

declare(strict_types=1);

namespace RecordPilot\Application;

use RecordPilot\Application\Dto\ListRecordsQuery;
use RecordPilot\Infrastructure\RecordRepository;

/**
 * Сценарии list / get / update для вертикального среза.
 */
final class RecordApplicationService
{
    /**
     * @param array<string, mixed> $schema
     * @param array<string, mixed> $verticalSlice
     */
    public function __construct(
        private readonly RecordRepository $repository,
        private readonly array $schema,
        private readonly array $verticalSlice,
    ) {
    }

    /**
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function listRecords(ListRecordsQuery $query): array
    {
        $page = max(1, $query->page);
        $perPage = max(1, min(100, $query->perPage));

        return $this->repository->listPage($page, $perPage);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getRecordForEdit(int|string $id): ?array
    {
        return $this->repository->getById($id);
    }

    /**
     * @param array<string, mixed> $post $_POST-подобный массив
     */
    public function updateFromPost(int|string $id, array $post): void
    {
        $editable = $this->verticalSlice['editableFields'] ?? [];
        if (! is_array($editable)) {
            $editable = [];
        }
        /** @var list<string> $editable */
        $editable = array_values(array_map(static fn (mixed $x): string => (string) $x, $editable));

        $data = [];
        foreach ($editable as $field) {
            if ($field === 'is_active') {
                $data[$field] = isset($post['is_active']) && (string) $post['is_active'] === '1' ? 1 : 0;

                continue;
            }
            if (! array_key_exists($field, $post)) {
                $data[$field] = $field === 'price_from' ? null : '';

                continue;
            }
            $raw = $post[$field];
            if (is_string($raw)) {
                $raw = trim($raw);
            }
            if ($field === 'price_from') {
                if ($raw === '' || $raw === null) {
                    $data[$field] = null;
                } elseif (is_numeric($raw)) {
                    $data[$field] = $raw;
                } else {
                    $data[$field] = $raw;
                }

                continue;
            }
            $data[$field] = $raw === '' ? null : $raw;
        }

        $errors = $this->validate($data);
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $this->repository->update($id, $data);
    }

    /**
     * @param array<string, mixed> $data
     * @return list<string>
     */
    private function validate(array $data): array
    {
        $errors = [];
        $fieldConfig = $this->schema['adminSchema']['formView']['fieldConfig'] ?? [];
        if (! is_array($fieldConfig)) {
            $fieldConfig = [];
        }

        $editable = $this->verticalSlice['editableFields'] ?? [];
        if (! is_array($editable)) {
            return ['vertical_slice.editableFields invalid'];
        }

        foreach ($editable as $field) {
            $f = (string) $field;
            $cfg = $fieldConfig[$f] ?? [];
            if (! is_array($cfg)) {
                $cfg = [];
            }
            if (! empty($cfg['required']) && ($data[$f] ?? null) === '') {
                $errors[] = 'Поле «' . $f . '» обязательно.';
            }
            if ($f === 'price_from' && array_key_exists($f, $data) && $data[$f] !== null && $data[$f] !== '' && ! is_numeric((string) $data[$f])) {
                $errors[] = 'Поле «price_from» должно быть числом.';
            }
        }

        return $errors;
    }
}
