<?php
declare(strict_types=1);
?>
<section class="rp-export-mock" aria-labelledby="export-mock-6-title">
  <header class="rp-export-mock__head">
    <h2 id="export-mock-6-title" class="rp-export-mock__title">Макет 6. Экспорт записей (wizard)</h2>
    <p class="rp-export-mock__subtitle">Выбор колонок, формат, preview CSV и скачивание</p>
  </header>
  <div class="rp-export-mock__body">
    <div class="rp-export-tabs" role="tablist" aria-label="Шаги мастера экспорта">
      <span class="rp-export-tab rp-export-tab--active" role="tab" aria-selected="true">Шаг 1. Параметры</span>
      <span class="rp-export-tab" role="tab" aria-selected="false">Шаг 2. Предпросмотр</span>
      <span class="rp-export-tab" role="tab" aria-selected="false">Шаг 3. Скачать</span>
    </div>
    <div class="rp-export-grid">
      <form class="rp-export-wizard" action="#" method="get" onsubmit="return false;">
        <div class="rp-export-field">
          <label for="export-format">Формат выгрузки</label>
          <select id="export-format" class="rp-export-select" name="format">
            <option>CSV (.csv)</option>
            <option>XLSX (.xlsx)</option>
          </select>
        </div>
        <div class="rp-export-field">
          <label for="export-limit">Лимит строк</label>
          <input id="export-limit" class="rp-export-input" type="number" name="limit" value="200" min="1" />
        </div>
        <div class="rp-export-field">
          <label for="export-cols">Колонки</label>
          <select id="export-cols" class="rp-export-select" name="columns">
            <option>uid,title,is_active,description</option>
          </select>
        </div>
        <div class="rp-export-actions">
          <button class="btn btn--accent" type="button">Сформировать preview</button>
        </div>
      </form>
      <div class="rp-export-wizard">
        <div class="rp-export-field">
          <label for="export-csv-preview">CSV preview</label>
          <textarea id="export-csv-preview" class="rp-export-textarea" readonly rows="6" cols="40">uid;title;is_active
1;CMS TYPO3;1
2;Extbase;1
3;Fluid;1</textarea>
        </div>
        <div class="rp-export-actions">
          <button class="btn" type="button">Копировать CSV</button>
          <button class="btn btn--accent" type="button">Скачать файл</button>
        </div>
      </div>
    </div>
  </div>
</section>
