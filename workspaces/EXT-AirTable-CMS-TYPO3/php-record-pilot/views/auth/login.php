<?php
declare(strict_types=1);
/** @var string $csrfToken */
/** @var bool $error */
?>
<div class="rp-login-stage">
  <div class="rp-login-stage__content">
    <header class="rp-login-pitch" lang="ru">
      <p class="rp-login-pitch__name">RecordPilot</p>
      <p class="rp-login-pitch__slogan">Управляй просто.</p>
      <p class="rp-login-pitch__tagline">Панель для работы с записями и данными в ваших проектах.</p>
      <p class="rp-login-pitch__about">
        Списки и карточки, миграции, импорт и экспорт — одно место, чтобы вести данные и схему без лишней суеты.
      </p>
    </header>

    <div class="rp-login-stage__form-wrap">
      <div class="rp-page rp-page--login-card">
        <h1 class="rp-page__title">Вход</h1>
        <p class="rp-page__lead">Супер-администратор — доступ ко всем подключениям из настроек.</p>

        <?php if ($error ?? false): ?>
          <p class="rp-error">Неверный логин или пароль.</p>
        <?php endif; ?>

        <form class="rp-form rp-login-form" method="post" action="/login" autocomplete="on">
          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" />
          <label for="username">Логин</label>
          <input type="text" id="username" name="username" autocomplete="username" required />

          <label for="password">Пароль</label>
          <input type="password" id="password" name="password" autocomplete="current-password" required />

          <button type="submit" class="btn btn--accent">Войти</button>
        </form>
      </div>
    </div>
  </div>
</div>
