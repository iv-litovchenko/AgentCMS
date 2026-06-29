<?php
declare(strict_types=1);
/** @var string $entity */
/** @var list<array<string, mixed>> $rows */
/** @var int $total */
/** @var int $page */
/** @var int $perPage */
?>
<div class="rp-page">
  <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px;">
    <div>
      <h1 class="rp-page__title" style="margin:0;">Список: <?= htmlspecialchars($entity, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></h1>
      <p class="muted" style="margin:4px 0 0;">Всего записей: <?= (int) $total ?> · страница <?= (int) $page ?></p>
    </div>
    <div class="toolbar">
      <button type="button" class="btn btn--accent" disabled title="Скоро">+ Новая запись</button>
      <button type="button" class="btn" disabled>Импорт</button>
    </div>
  </div>

  <?php if ($rows === []) { ?>
    <div class="rp-empty rp-mt">
      Нет строк (или таблица пуста). Проверьте БД и <code>sql/schema.sql</code>.
    </div>
  <?php } else { ?>
    <div class="rp-table-wrap rp-mt">
      <table class="rp-table">
        <thead>
          <tr>
            <?php foreach (array_keys($rows[0]) as $col) { ?>
              <th><?= htmlspecialchars((string) $col, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></th>
            <?php } ?>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rows as $row) { ?>
            <tr>
              <?php foreach ($row as $v) { ?>
                <td><?= htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
              <?php } ?>
              <td>
                <?php
                $pk = $row['id'] ?? null;
                if ($pk !== null) {
                    $url = '/records/' . rawurlencode($entity) . '/' . rawurlencode((string) $pk) . '/edit';
                    echo '<a class="btn btn--ghost btn--sm" href="' . htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">Изменить</a>';
                }
                ?>
              </td>
            </tr>
          <?php } ?>
        </tbody>
      </table>
    </div>
  <?php } ?>

  <?php
  $pages = (int) ceil($total / max(1, $perPage));
  if ($pages > 1) {
      echo '<div class="rp-pagination">';
      for ($p = 1; $p <= $pages; $p++) {
          if ($p === $page) {
              echo '<strong>' . $p . '</strong>';
          } else {
              echo '<a href="?page=' . $p . '">' . $p . '</a>';
          }
      }
      echo '</div>';
  }
  ?>
</div>
