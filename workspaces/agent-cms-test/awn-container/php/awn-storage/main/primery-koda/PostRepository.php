<?php
declare(strict_types=1);

final class PostRepository {
    public function __construct(private PDO $pdo) {}

    public function all(): array {
        return $this->pdo
            ->query('SELECT id, title FROM posts ORDER BY id DESC')
            ->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find(int $id): ?array {
        $stmt = $this->pdo->prepare('SELECT * FROM posts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
