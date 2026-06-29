<?php
declare(strict_types=1);
/** @var list<string> $connectionIds */
?>
<div class="rp-page">
  <h1 class="rp-page__title">Дашборд</h1>
  <p class="rp-page__lead">Обзор площадки и быстрые ссылки. На <a href="/">главную</a> — выбор подключения к БД (в разработке).</p>

  <?php require __DIR__ . '/home/widget_charts.php'; ?>

  <h2 class="rp-section-title">Быстрые ссылки</h2>
  <ul class="rp-list">
    <li><a href="/records/services">Список записей (services)</a></li>
    <li><a href="/settings">Настройки площадки</a> — подключения к БД и учётная запись супер-администратора</li>
  </ul>

  <p class="muted rp-mt">
    Подключений к БД в конфигурации: <strong><?= count($connectionIds) ?></strong>
    (<?= htmlspecialchars(implode(', ', $connectionIds), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>).
  </p>
</div>
