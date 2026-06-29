<?php
declare(strict_types=1);
/** @var string $title */
/** @var string $content */
/** @var string $extraHead */
/** @var array<string, mixed>|null $panelUser */
$panelUser = $panelUser ?? null;
$extraHead = $extraHead ?? '';
$csrfNav = null;
if ($panelUser !== null) {
    \RecordPilot\Http\CsrfToken::ensureSessionStarted();
    $csrfNav = \RecordPilot\Http\CsrfToken::getToken();
}

$basePath = dirname(__DIR__);
$projectLabel = 'Подключение';
$conns = [];
$activeConnectionId = 'default';
$dbEmoji = '🗄️';
$dbLabel = 'БД';
try {
    $panelLayout = \RecordPilot\Config\PanelConfig::load($basePath);
    $conns = $panelLayout->getConnectionsForDisplay();
    $slicePath = $basePath . '/config/vertical_slice.php';
    if (is_file($slicePath)) {
        /** @var array<string, mixed> $vs */
        $vs = require $slicePath;
        if (isset($vs['connection_id'])) {
            $activeConnectionId = (string) $vs['connection_id'];
        }
    }
    $activeConn = null;
    foreach ($conns as $c) {
        if (($c['id'] ?? '') === $activeConnectionId) {
            $activeConn = $c;
            break;
        }
    }
    if ($activeConn === null && $conns !== []) {
        $activeConn = $conns[0];
    }
    if ($activeConn !== null) {
        $projectLabel = (string) $activeConn['label'];
        $dbEmoji = (string) $activeConn['db_emoji'];
        $dbLabel = (string) $activeConn['db_label'];
    }
} catch (\Throwable) {
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$navActive = '';
if (str_starts_with($path, '/login')) {
    $navActive = 'login';
} elseif (str_starts_with($path, '/dashboard')) {
    $navActive = 'dashboard';
} elseif ($path === '/') {
    $navActive = 'home';
} elseif (str_starts_with($path, '/settings')) {
    $navActive = 'settings';
} elseif (str_starts_with($path, '/export')) {
    $navActive = 'export';
} elseif (str_starts_with($path, '/import')) {
    $navActive = 'import';
} elseif (str_starts_with($path, '/migrations')) {
    $navActive = 'migrations';
} elseif (str_starts_with($path, '/docs')) {
    $navActive = 'docs';
} elseif (str_starts_with($path, '/files')) {
    $navActive = 'files';
} elseif (str_starts_with($path, '/check')) {
    $navActive = 'check';
} elseif (str_starts_with($path, '/ai-chat')) {
    $navActive = 'ai-chat';
} elseif (str_starts_with($path, '/records')) {
    $navActive = 'data';
}

$username = (string) ($panelUser['username'] ?? '');
$initials = 'RP';
if ($username !== '') {
    $initials = function_exists('mb_substr')
        ? mb_strtoupper(mb_substr($username, 0, 2))
        : strtoupper(substr($username, 0, 2));
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= htmlspecialchars($title ?? 'RecordPilot', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></title>
  <link rel="stylesheet" href="/css/panel.css" />
  <?= $extraHead ?>
</head>
<body class="rp-body">
  <div class="page">
    <div class="vision-app">
      <div class="vision-app__bar1">
        <a class="vision-app__brand" href="<?= $panelUser !== null ? '/' : '/login' ?>">
          <span class="vision-app__logo">RP</span>
          <span>RecordPilot</span>
        </a>
        <?php if ($panelUser !== null): ?>
          <?php
            $h = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $projectTitle = 'Активное подключение для CRUD: ' . $activeConnectionId . ' (см. config/vertical_slice.php). Тип БД по DSN.';
            $manyProjects = count($conns) > 1;
          ?>
          <?php if ($manyProjects): ?>
            <details class="vision-app__project vision-app__project--menu" title="<?= $h($projectTitle) ?>">
              <summary class="vision-app__project-summary">
                <span class="vision-app__project-db" aria-hidden="true"><?= $h($dbEmoji) ?></span>
                <span class="vision-app__project-meta">
                  <span class="vision-app__project-db-label"><?= $h($dbLabel) ?></span>
                  <span class="vision-app__project-sep">·</span>
                  <span>Проект: <strong><?= $h($projectLabel) ?></strong></span>
                </span>
                <span class="vision-app__project-caret" aria-hidden="true">▾</span>
              </summary>
              <div class="vision-app__project-panel" role="list" aria-label="Подключения к БД">
                <?php foreach ($conns as $c): ?>
                  <?php
                    $isActive = ($c['id'] ?? '') === $activeConnectionId;
                    $rowEmoji = (string) ($c['db_emoji'] ?? '🗄️');
                    $rowDb = (string) ($c['db_label'] ?? 'БД');
                  ?>
                  <div class="vision-app__project-row<?= $isActive ? ' vision-app__project-row--active' : '' ?>" role="listitem">
                    <span class="vision-app__project-row-db" title="<?= $h($rowDb) ?>"><?= $h($rowEmoji) ?> <?= $h($rowDb) ?></span>
                    <span class="vision-app__project-row-label"><?= $h((string) ($c['label'] ?? '')) ?></span>
                    <?php if ($isActive): ?><span class="vision-app__project-row-check" title="Активно для CRUD">✓</span><?php endif; ?>
                  </div>
                <?php endforeach; ?>
                <p class="vision-app__project-hint">Смена активного подключения — в <code>vertical_slice.php</code> или настройках.</p>
              </div>
            </details>
          <?php else: ?>
            <div class="vision-app__project" title="<?= $h($projectTitle) ?>">
              <span class="vision-app__project-db" aria-hidden="true"><?= $h($dbEmoji) ?></span>
              <span class="vision-app__project-meta">
                <span class="vision-app__project-db-label"><?= $h($dbLabel) ?></span>
                <span class="vision-app__project-sep">·</span>
                <span>Проект: <strong><?= $h($projectLabel) ?></strong></span>
              </span>
            </div>
          <?php endif; ?>
          <div class="vision-app__search">
            <input type="search" name="q" placeholder="Глобальный поиск: записи, таблицы, команды…" autocomplete="off" disabled aria-disabled="true" />
          </div>
          <div class="vision-app__actions">
            <span class="vision-app__icon-btn" title="Уведомления" aria-hidden="true">🔔</span>
            <span class="vision-app__icon-btn" title="Командная палитра" aria-hidden="true">⌘K</span>
            <div class="vision-app__user-menu">
              <div class="vision-app__user-trigger" tabindex="0">
                <span class="vision-app__avatar" title="<?= htmlspecialchars($username, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>"><?= htmlspecialchars($initials, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></span>
                <span class="vision-app__user-name"><?= htmlspecialchars($username, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?> · <span style="opacity:.85;">Супер-админ</span></span>
                <span class="vision-app__user-caret" aria-hidden="true">▾</span>
              </div>
              <div class="vision-app__user-dropdown" role="menu" aria-label="Меню пользователя">
                <a href="/settings" class="vision-app__user-dropdown-link<?= $navActive === 'settings' ? ' vision-app__user-dropdown-link--active' : '' ?>" role="menuitem">⚙️ Настройки площадки</a>
                <?php if ($csrfNav !== null): ?>
                  <form method="post" action="/logout" class="vision-app__user-dropdown-form">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfNav, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" />
                    <button type="submit" class="vision-app__user-dropdown-logout" role="menuitem">🚪 Выйти</button>
                  </form>
                <?php endif; ?>
              </div>
            </div>
          </div>
        <?php else: ?>
          <?php if ($navActive !== 'login'): ?>
            <div class="vision-app__actions">
              <a class="btn btn--ghost" href="/login" style="height:34px;border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff !important;">Вход в панель</a>
            </div>
          <?php endif; ?>
        <?php endif; ?>
      </div>

      <?php if ($panelUser !== null): ?>
        <nav class="vision-app__bar2" aria-label="Основная навигация">
          <a href="/dashboard" class="vision-app__navlink<?= $navActive === 'dashboard' ? ' vision-app__navlink--active' : '' ?>">🏠 Главная</a>
          <a href="/records/services" class="vision-app__navlink<?= $navActive === 'data' ? ' vision-app__navlink--active' : '' ?>">📊 Данные</a>
          <span class="vision-app__navlink vision-app__navlink--muted">🗂️ Схема БД</span>
          <a href="/migrations" class="vision-app__navlink<?= $navActive === 'migrations' ? ' vision-app__navlink--active' : '' ?>">🔄 Миграции</a>
          <a href="/export" class="vision-app__navlink<?= $navActive === 'export' ? ' vision-app__navlink--active' : '' ?>">📤 Экспорт</a>
          <a href="/import" class="vision-app__navlink<?= $navActive === 'import' ? ' vision-app__navlink--active' : '' ?>">📥 Импорт</a>
          <span class="vision-app__navlink vision-app__navlink--muted">💾 Бэкапы</span>
          <a href="/files" class="vision-app__navlink<?= $navActive === 'files' ? ' vision-app__navlink--active' : '' ?>" title="Просмотр файлов на площадке по FTP">📁 Файлы</a>
          <a href="/check" class="vision-app__navlink<?= $navActive === 'check' ? ' vision-app__navlink--active' : '' ?>" title="Проверки состояния площадки (БД, конфиг, целостность)">✅ Проверки</a>
          <span class="vision-app__navlink vision-app__navlink--muted">📜 Журналы</span>
          <a href="/ai-chat" class="vision-app__navlink<?= $navActive === 'ai-chat' ? ' vision-app__navlink--active' : '' ?>" title="Макет: ИИ по структуре схемы (без данных БД)">🤖 Чат с ИИ</a>
          <a href="/docs" class="vision-app__navlink vision-app__navlink--right<?= $navActive === 'docs' ? ' vision-app__navlink--active' : '' ?>">📖 Документация</a>
        </nav>
      <?php endif; ?>

      <div class="vision-app__main<?= $navActive === 'login' ? ' vision-app__main--login' : '' ?>">
        <?= $content ?? '' ?>
      </div>
    </div>
  </div>
</body>
</html>
