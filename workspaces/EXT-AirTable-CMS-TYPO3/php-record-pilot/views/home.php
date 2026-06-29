<?php
declare(strict_types=1);
/** @var list<string> $connectionIds */
/** @var list<array{id: string, label: string, dsn: string, user: string, password_masked: string, db_emoji: string, db_label: string}> $connections */
?>
<div class="rp-page">
  <h1 class="rp-page__title">Главная</h1>
  <p class="rp-page__lead">
    Точка входа после логотипа: здесь будет выбор активного подключения к БД для работы с данными.
    Сейчас подключение для CRUD задаётся в <code>config/vertical_slice.php</code>, список — в <code>config/panel.php</code>.
  </p>

  <h2 class="rp-section-title">Подключения в конфигурации</h2>
  <?php if ($connections === []) { ?>
    <p class="muted">Нет записей в <code>panel.php</code>.</p>
  <?php } else { ?>
    <div class="rp-table-wrap">
      <table class="rp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Тип БД</th>
            <th>Название</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($connections as $c): ?>
            <tr>
              <td><code><?= htmlspecialchars($c['id'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></code></td>
              <td><?= htmlspecialchars((string) ($c['db_emoji'] ?? '🗄️'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?> <?= htmlspecialchars((string) ($c['db_label'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
              <td><?= htmlspecialchars($c['label'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php } ?>

  <p class="muted rp-mt">
    Всего ID подключений: <strong><?= count($connectionIds) ?></strong>
    (<?= htmlspecialchars(implode(', ', $connectionIds), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>).
  </p>

  <p class="rp-mt">
    <a class="btn btn--accent" href="/dashboard">Перейти к дашборду</a>
  </p>
</div>
