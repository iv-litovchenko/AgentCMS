<?php
declare(strict_types=1);
/** @var string $superAdminUsername */
/** @var list<array{id: string, label: string, dsn: string, user: string, password_masked: string, db_emoji: string, db_label: string}> $connections */
/** @var list<string> $connectionIds */
/** @var array<string, mixed> $appConfig */
/** @var array<string, mixed> $verticalSlice */
/** @var string $phpVersion */
$h = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$platformName = (string) ($appConfig['platform_display_name'] ?? 'RecordPilot');
$env = (string) ($appConfig['env'] ?? 'dev');
$debug = ! empty($appConfig['debug']);
$tz = (string) ($appConfig['timezone'] ?? 'UTC');
$sliceConn = (string) ($verticalSlice['connection_id'] ?? 'default');
$entity = (string) ($verticalSlice['entity'] ?? '');
$schemaFile = (string) ($verticalSlice['schemaFile'] ?? '');
?>
<div class="rp-page">
  <h1 class="rp-page__title">Настройки площадки</h1>
  <p class="rp-page__lead">
    Параметры установки RecordPilot: окружение, учётная запись супер-администратора и подключения к базам данных.
    Изменение пароля и списка БД — через файлы конфигурации или переменные окружения (см. блок внизу).
  </p>

  <section class="rp-settings-section" aria-labelledby="settings-general">
    <h2 id="settings-general" class="rp-section-title">Общие сведения</h2>
    <dl class="rp-settings-dl">
      <div>
        <dt>Название площадки</dt>
        <dd><strong><?= $h($platformName) ?></strong> <span class="muted">(<code>PLATFORM_DISPLAY_NAME</code> / <code>config/app.php</code>)</span></dd>
      </div>
      <div>
        <dt>Окружение</dt>
        <dd><code><?= $h($env) ?></code><?= $debug ? ' · <span class="muted">debug включён</span>' : '' ?></dd>
      </div>
      <div>
        <dt>Часовой пояс</dt>
        <dd><code><?= $h($tz) ?></code></dd>
      </div>
      <div>
        <dt>PHP</dt>
        <dd><code><?= $h($phpVersion) ?></code></dd>
      </div>
      <div>
        <dt>Проверка сервиса</dt>
        <dd><a href="/health">GET /health</a> <span class="muted">(без авторизации)</span></dd>
      </div>
    </dl>
  </section>

  <section class="rp-settings-section" aria-labelledby="settings-slice">
    <h2 id="settings-slice" class="rp-section-title">Данные и вертикальный срез</h2>
    <p class="muted" style="margin:0 0 0.75rem;">Сейчас список и форма записей используют одно подключение и одну сущность (первый срез).</p>
    <dl class="rp-settings-dl">
      <div>
        <dt>Активное подключение</dt>
        <dd><code><?= $h($sliceConn) ?></code> <span class="muted">· переменная <code>VERTICAL_SLICE_CONNECTION_ID</code></span></dd>
      </div>
      <div>
        <dt>Сущность (CRUD)</dt>
        <dd><code><?= $h($entity) ?></code></dd>
      </div>
      <div>
        <dt>Файл метаданных</dt>
        <dd><code>metadata/<?= $h($schemaFile) ?></code></dd>
      </div>
      <div>
        <dt>Доступные ID подключений</dt>
        <dd><?= $h(implode(', ', $connectionIds)) ?></dd>
      </div>
    </dl>
  </section>

  <section class="rp-settings-section" aria-labelledby="settings-admin">
    <h2 id="settings-admin" class="rp-section-title">Супер-администратор</h2>
    <p class="muted" style="margin:0 0 0.75rem;">Один пользователь с полным доступом к панели и ко всем перечисленным ниже подключениям к БД.</p>
    <dl class="rp-settings-dl">
      <div>
        <dt>Логин</dt>
        <dd><strong><?= $h($superAdminUsername) ?></strong></dd>
      </div>
      <div>
        <dt>Пароль</dt>
        <dd>Хэш в <code>config/panel.php</code> или <code>PANEL_SUPER_ADMIN_PASSWORD_HASH</code>; логин — <code>PANEL_SUPER_ADMIN_USER</code>. Подробнее в README.</dd>
      </div>
    </dl>
  </section>

  <section class="rp-settings-section" aria-labelledby="settings-db">
    <h2 id="settings-db" class="rp-section-title">Подключения к базам данных</h2>
    <p class="muted rp-mb">Пароли к БД не показываются. Добавление новых подключений — в <code>config/panel.php</code> (массив <code>connections</code>).</p>

    <div class="rp-table-wrap">
      <table class="rp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Тип БД</th>
            <th>Название</th>
            <th>DSN</th>
            <th>Пользователь БД</th>
            <th>Пароль БД</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($connections as $c): ?>
            <tr>
              <td><code><?= $h($c['id']) ?></code></td>
              <td title="<?= $h((string) ($c['db_label'] ?? '')) ?>"><span aria-hidden="true"><?= $h((string) ($c['db_emoji'] ?? '🗄️')) ?></span> <?= $h((string) ($c['db_label'] ?? '')) ?></td>
              <td><?= $h($c['label']) ?></td>
              <td style="font-size: 12px;"><?= $h($c['dsn']) ?></td>
              <td><?= $h($c['user']) ?></td>
              <td><?= $h($c['password_masked']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </section>

  <section class="rp-settings-section" aria-labelledby="settings-files">
    <h2 id="settings-files" class="rp-section-title">Файлы конфигурации</h2>
    <div class="rp-callout">
      <strong>Основные файлы</strong> в каталоге <code>php-record-pilot/</code>:
      <ul class="rp-list" style="margin-top:0.5rem;">
        <li><code>config/panel.php</code> — супер-админ и список подключений к БД</li>
        <li><code>config/database.php</code> — DSN по умолчанию (часто наследуется в <code>panel.php</code>)</li>
        <li><code>config/vertical_slice.php</code> — какое подключение и сущность для CRUD</li>
        <li><code>config/app.php</code> — имя площадки, env, timezone</li>
      </ul>
    </div>
  </section>
</div>
