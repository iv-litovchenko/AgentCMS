<?php
declare(strict_types=1);
?>
<div class="rp-page">
  <h1 class="rp-page__title">Миграции</h1>
  <p class="rp-page__lead">
    Управление изменениями схемы БД: очередь миграций, применение и история — в следующих версиях ядра.
    Сейчас схема задаётся вручную через SQL-скрипты в каталоге <code>sql/</code>.
  </p>

  <h2 class="rp-section-title">Локально</h2>
  <ul class="rp-list">
    <li>Начальная схема: <code>sql/schema.sql</code> — примените к своей БД перед работой CRUD.</li>
    <li>Новые таблицы/поля — отдельные файлы <code>sql/migrations/*.sql</code> (соглашение можно ввести позже).</li>
  </ul>

  <p class="muted rp-mt">
    Раздел в меню стоит после «Схема БД»: сначала смотрите структуру, затем — накатываете изменения.
  </p>
</div>
