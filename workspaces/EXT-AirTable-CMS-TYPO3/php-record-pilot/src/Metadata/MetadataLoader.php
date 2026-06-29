<?php

declare(strict_types=1);

namespace RecordPilot\Metadata;

/**
 * Загрузка и минимальная валидация schema.idea.json.
 *
 * @phpstan-type SchemaArray array<string, mixed>
 */
final class MetadataLoader
{
    /**
     * @return SchemaArray
     */
    public function loadFile(string $absolutePath): array
    {
        if (! is_readable($absolutePath)) {
            throw new SchemaValidationException('Schema file not readable: ' . $absolutePath);
        }
        $raw = file_get_contents($absolutePath);
        if ($raw === false) {
            throw new SchemaValidationException('Cannot read schema: ' . $absolutePath);
        }
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($data)) {
            throw new SchemaValidationException('Schema root must be an object');
        }
        $this->validate($data);

        return $data;
    }

    /**
     * @param SchemaArray $data
     */
    public function validate(array $data): void
    {
        $meta = $data['meta'] ?? null;
        if (! is_array($meta)) {
            throw new SchemaValidationException('Missing meta object');
        }
        if (($meta['documentType'] ?? '') !== 'schema-idea') {
            throw new SchemaValidationException('meta.documentType must be "schema-idea"');
        }
        if (! isset($meta['version'])) {
            throw new SchemaValidationException('meta.version is required');
        }

        $physical = $data['physicalSchema'] ?? null;
        if (! is_array($physical)) {
            throw new SchemaValidationException('Missing physicalSchema');
        }
        foreach (['table', 'primaryKey'] as $key) {
            if (! isset($physical[$key]) || ! is_string($physical[$key]) || $physical[$key] === '') {
                throw new SchemaValidationException('physicalSchema.' . $key . ' must be non-empty string');
            }
        }
        $columns = $physical['columns'] ?? null;
        if (! is_array($columns) || $columns === []) {
            throw new SchemaValidationException('physicalSchema.columns must be a non-empty array');
        }
        foreach ($columns as $i => $col) {
            if (! is_array($col) || ! isset($col['name']) || ! is_string($col['name'])) {
                throw new SchemaValidationException('physicalSchema.columns[' . $i . '].name invalid');
            }
        }

        $admin = $data['adminSchema'] ?? null;
        if (! is_array($admin)) {
            throw new SchemaValidationException('Missing adminSchema');
        }
        $formView = $admin['formView'] ?? null;
        if (! is_array($formView)) {
            throw new SchemaValidationException('adminSchema.formView required');
        }
        $fieldConfig = $formView['fieldConfig'] ?? null;
        if (! is_array($fieldConfig)) {
            throw new SchemaValidationException('adminSchema.formView.fieldConfig required');
        }
    }
}
