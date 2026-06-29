<?php

declare(strict_types=1);

namespace RecordPilot\Infrastructure;

use PDO;
use PDOException;

final class PdoMysqlAdapter implements DataSourceAdapter
{
    public function __construct(
        private readonly PDO $pdo,
    ) {
    }

    public static function fromConfig(array $dbConfig): self
    {
        $pdo = new PDO(
            $dbConfig['dsn'],
            $dbConfig['user'] ?? '',
            $dbConfig['password'] ?? '',
            $dbConfig['options'] ?? [],
        );

        return new self($pdo);
    }

    public function fetchList(
        string $table,
        array $selectColumns,
        ?string $softDeleteColumn,
        int $page,
        int $perPage,
        string $orderColumn,
        string $orderDir,
    ): array {
        $table = $this->quoteIdentifier($table);
        $cols = array_map(fn (string $c) => $this->quoteIdentifier($c), $selectColumns);
        $colSql = implode(', ', $cols);
        $orderColumn = $this->quoteIdentifier($orderColumn);
        $orderDir = strtoupper($orderDir) === 'ASC' ? 'ASC' : 'DESC';

        $where = '';
        $params = [];
        if ($softDeleteColumn !== null) {
            $where = ' WHERE ' . $this->quoteIdentifier($softDeleteColumn) . ' IS NULL';
        }

        $countSql = 'SELECT COUNT(*) FROM ' . $table . $where;
        $stmt = $this->pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int) $stmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = 'SELECT ' . $colSql . ' FROM ' . $table . $where
            . ' ORDER BY ' . $orderColumn . ' ' . $orderDir
            . ' LIMIT ' . (int) $perPage . ' OFFSET ' . $offset;
        $stmt = $this->pdo->query($sql);
        if ($stmt === false) {
            throw new PDOException('List query failed');
        }
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return ['rows' => $rows, 'total' => $total];
    }

    public function fetchOne(
        string $table,
        string $primaryKey,
        int|string $id,
        ?string $softDeleteColumn,
        ?array $selectColumns = null,
    ): ?array {
        $table = $this->quoteIdentifier($table);
        $pk = $this->quoteIdentifier($primaryKey);
        $where = $pk . ' = ?';
        $params = [$id];
        if ($softDeleteColumn !== null) {
            $where .= ' AND ' . $this->quoteIdentifier($softDeleteColumn) . ' IS NULL';
        }
        if ($selectColumns === null || $selectColumns === []) {
            $colSql = '*';
        } else {
            $colSql = implode(', ', array_map(fn (string $c) => $this->quoteIdentifier($c), $selectColumns));
        }
        $sql = 'SELECT ' . $colSql . ' FROM ' . $table . ' WHERE ' . $where . ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    public function updateRow(
        string $table,
        string $primaryKey,
        int|string $id,
        array $data,
        array $allowedColumns,
    ): void {
        $allowed = array_flip($allowedColumns);
        $sets = [];
        $params = [];
        foreach ($data as $key => $value) {
            if (! isset($allowed[$key])) {
                continue;
            }
            $sets[] = $this->quoteIdentifier((string) $key) . ' = ?';
            $params[] = $value;
        }
        if ($sets === []) {
            return;
        }
        $table = $this->quoteIdentifier($table);
        $pk = $this->quoteIdentifier($primaryKey);
        $params[] = $id;
        $sql = 'UPDATE ' . $table . ' SET ' . implode(', ', $sets) . ' WHERE ' . $pk . ' = ?';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
    }

    private function quoteIdentifier(string $name): string
    {
        if (! preg_match('/^[a-zA-Z0-9_]+$/', $name)) {
            throw new \InvalidArgumentException('Invalid SQL identifier: ' . $name);
        }

        return '`' . $name . '`';
    }
}
