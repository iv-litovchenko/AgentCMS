<?php
declare(strict_types=1);
/** @var string $entity */
/** @var array<string, mixed> $record */
/** @var string $csrfToken */
/** @var list<string> $errors */
$h = static fn (?string $s): string => htmlspecialchars($s ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$id = $record['id'] ?? '';
$action = '/records/' . rawurlencode($entity) . '/' . rawurlencode((string) $id);
?>
<div class="rp-page">
  <h1 class="rp-page__title">Редактирование #<?= $h((string) $id) ?></h1>
  <?php foreach ($errors as $err) { ?>
    <p class="rp-error"><?= $h($err) ?></p>
  <?php } ?>

  <form class="rp-form" method="post" action="<?= $h($action) ?>">
    <input type="hidden" name="csrf_token" value="<?= $h($csrfToken) ?>" />
    <label>title
      <input type="text" name="title" value="<?= $h(isset($record['title']) ? (string) $record['title'] : '') ?>" required />
    </label>
    <label>slug
      <input type="text" name="slug" value="<?= $h(isset($record['slug']) ? (string) $record['slug'] : '') ?>" required />
    </label>
    <label>description
      <textarea name="description"><?= $h(isset($record['description']) ? (string) $record['description'] : '') ?></textarea>
    </label>
    <label>user_work_description
      <textarea name="user_work_description"><?= $h(isset($record['user_work_description']) ? (string) $record['user_work_description'] : '') ?></textarea>
    </label>
    <label>price_from
      <input type="text" name="price_from" value="<?= isset($record['price_from']) && $record['price_from'] !== null ? $h((string) $record['price_from']) : '' ?>" />
    </label>
    <label class="rp-checkbox">
      <input type="checkbox" name="is_active" value="1" <?= ! empty($record['is_active']) ? 'checked' : '' ?> />
      is_active
    </label>
    <div class="btn-group">
      <button class="btn btn--accent" type="submit">Сохранить</button>
      <a class="btn btn--ghost" href="/records/<?= $h($entity) ?>">К списку</a>
    </div>
  </form>
</div>
