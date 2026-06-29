<?php
declare(strict_types=1);
/** @var string $docsSection */
$docSec = $docsSection ?? 'index';
$na = static function (string $cur) use ($docSec): string {
    return $docSec === $cur ? ' rp-docs-nav__link--active' : '';
};
?>
    <nav class="rp-docs-nav" aria-label="Навигация по документации">
      <p class="rp-docs-nav__title">Разделы</p>
      <a href="/docs" class="rp-docs-nav__link<?= $na('index') ?>">Структура БД</a>
      <a href="/docs/mockups" class="rp-docs-nav__link<?= $na('mockups') ?>">Макеты UI</a>

<?php if ($docSec === 'index'): ?>
      <div class="rp-docs-nav__group">Содержание</div>
      <div class="rp-docs-nav__group">Площадка</div>
      <a href="#doc-intro" class="rp-docs-nav__link">Введение</a>
      <a href="#doc-recordpilot" class="rp-docs-nav__link">RecordPilot (ядро)</a>

      <div class="rp-docs-nav__group">Оболочка</div>
      <a href="#doc-typo3" class="rp-docs-nav__link">TYPO3 / макеты</a>

      <div class="rp-docs-nav__group">Схема БД</div>
      <a href="#doc-schema" class="rp-docs-nav__link">О разделе</a>
      <a href="#doc-layers" class="rp-docs-nav__link">Слои и уровни</a>
      <a href="#doc-physical" class="rp-docs-nav__link">Физический уровень</a>
      <a href="#doc-logical" class="rp-docs-nav__link">Логика и связи</a>
      <a href="#doc-metadata" class="rp-docs-nav__link">Метаданные JSON</a>
      <a href="#doc-field-types" class="rp-docs-nav__link">Типы полей (3 уровня)</a>
      <a href="#doc-schema-blocks" class="rp-docs-nav__link">Блоки и ключи JSON</a>
      <a href="#doc-db-ui" class="rp-docs-nav__link">БД ↔ UI</a>
      <a href="#doc-relations" class="rp-docs-nav__link">Связи и виртуальные поля</a>
      <a href="#doc-filters" class="rp-docs-nav__link">Фильтры и операторы</a>

      <div class="rp-docs-nav__group">Практика</div>
      <a href="#doc-workflow" class="rp-docs-nav__link">Порядок работ</a>
      <a href="#doc-future" class="rp-docs-nav__link">Что добавит ядро</a>

      <div class="rp-docs-nav__group">Материалы</div>
      <a href="#doc-links" class="rp-docs-nav__link">Ссылки в репозитории</a>
<?php else: ?>
      <div class="rp-docs-nav__group">На странице</div>
      <a href="#doc-mock-intro" class="rp-docs-nav__link">О файле EXAMPLE</a>
      <a href="#doc-mock-rp" class="rp-docs-nav__link">Уже в панели</a>
      <a href="#doc-mock-hub" class="rp-docs-nav__link">Карта секций</a>
      <a href="#doc-mock-vision" class="rp-docs-nav__link">Видение · ИИ</a>
      <a href="#doc-mock-screens" class="rp-docs-nav__link">Рабочие экраны</a>
      <a href="#doc-mock-dbvis" class="rp-docs-nav__link">Схема БД</a>
      <a href="#doc-mock-text" class="rp-docs-nav__link">Текст и настройки</a>
      <a href="#doc-mock-ideas" class="rp-docs-nav__link">Идеи 14–48</a>
<?php endif; ?>
    </nav>
