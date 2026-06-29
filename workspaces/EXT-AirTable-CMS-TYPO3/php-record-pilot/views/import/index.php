<?php
declare(strict_types=1);
?>
<section class="rp-import-mock" aria-labelledby="import-mock-4-title">
    <header class="rp-import-mock__head">
      <h2 id="import-mock-4-title" class="rp-import-mock__title">Макет 4. Импорт записей (wizard)</h2>
      <p class="rp-import-mock__subtitle">Шаги: источник → mapping → предпросмотр → результат</p>
    </header>
    <div class="rp-import-mock__body">
      <div class="rp-import-tabs" role="tablist" aria-label="Шаги мастера импорта">
        <span class="rp-import-tab rp-import-tab--active" role="tab" aria-selected="true">Шаг 1. Источник</span>
        <span class="rp-import-tab" role="tab" aria-selected="false">Шаг 2. Mapping</span>
        <span class="rp-import-tab" role="tab" aria-selected="false">Шаг 3. Предпросмотр</span>
        <span class="rp-import-tab" role="tab" aria-selected="false">Шаг 4. Результат</span>
      </div>

      <div class="rp-import-section">
        <h3 class="rp-import-section__title">Источник</h3>
        <form class="rp-import-wizard" action="#" method="post" enctype="multipart/form-data" onsubmit="return false;">
          <div class="rp-import-grid-2">
            <div class="rp-import-field">
              <label for="import-format">Формат файла</label>
              <select id="import-format" class="rp-import-select" name="format">
                <option>CSV (.csv)</option>
                <option>XLSX (.xlsx)</option>
              </select>
            </div>
            <div class="rp-import-field">
              <label for="import-mode">Режим обработки</label>
              <select id="import-mode" class="rp-import-select" name="mode">
                <option>Insert + Update</option>
                <option>Только Insert</option>
                <option>Replace by UID</option>
              </select>
            </div>
          </div>
          <div class="rp-import-field">
            <label for="import-file">Загрузка файла</label>
            <input id="import-file" class="rp-import-file" type="file" name="file" />
          </div>
          <div class="rp-import-field">
            <label for="import-paste">Или вставьте CSV напрямую</label>
            <textarea id="import-paste" class="rp-import-textarea" name="paste" rows="5" cols="40">uid;title;is_active
1;CMS TYPO3;1
2;Extbase;1</textarea>
          </div>
          <div class="rp-import-actions">
            <button class="btn" type="button">Отмена</button>
            <button class="btn btn--accent" type="button">Далее</button>
          </div>
        </form>
      </div>

      <div class="rp-import-section">
        <h3 class="rp-import-section__title">Mapping</h3>
        <p class="muted rp-import-section__hint">Сопоставление «колонка файла → поле сущности»</p>
        <div class="rp-import-table-wrap">
          <table class="rp-import-table">
            <thead>
              <tr>
                <th>Колонка файла</th>
                <th>Пример значения</th>
                <th>Поле назначения</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>uid</td>
                <td>1</td>
                <td><select class="rp-import-select rp-import-select--inline" aria-label="Поле для uid"><option>uid</option></select></td>
                <td><span class="rp-import-status">Ок</span></td>
              </tr>
              <tr>
                <td>title</td>
                <td>CMS TYPO3</td>
                <td><select class="rp-import-select rp-import-select--inline" aria-label="Поле для title"><option>title</option></select></td>
                <td><span class="rp-import-status">Ок</span></td>
              </tr>
              <tr>
                <td>is_active</td>
                <td>1</td>
                <td>
                  <select class="rp-import-select rp-import-select--inline" aria-label="Поле для is_active">
                    <option>is_active</option>
                    <option>status</option>
                  </select>
                </td>
                <td class="rp-import-warn">Требует проверки</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="rp-import-actions">
          <button class="btn" type="button">Назад</button>
          <button class="btn btn--accent" type="button">Далее к предпросмотру</button>
        </div>
      </div>

      <div class="rp-import-section">
        <h3 class="rp-import-section__title">Предпросмотр</h3>
        <p class="muted rp-import-section__hint">Проверка строк перед записью (dry-run)</p>
        <div class="rp-import-table-wrap">
          <table class="rp-import-table">
            <thead>
              <tr>
                <th>#</th>
                <th>uid</th>
                <th>title</th>
                <th>is_active</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>1</td>
                <td>CMS TYPO3</td>
                <td>1</td>
                <td><span class="muted">update</span></td>
              </tr>
              <tr>
                <td>2</td>
                <td>—</td>
                <td>Новая строка</td>
                <td>1</td>
                <td><span class="muted">insert</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="rp-import-actions">
          <button class="btn" type="button">Назад</button>
          <button class="btn btn--accent" type="button">Запустить импорт</button>
        </div>
      </div>

      <div class="rp-import-section">
        <h3 class="rp-import-section__title">Результат</h3>
        <div class="rp-import-result" role="status">
          <p class="rp-import-result__lead"><strong>Импорт завершён</strong></p>
          <ul class="rp-import-result__list">
            <li>Обработано строк: <strong>120</strong></li>
            <li>Добавлено: <strong>45</strong> · обновлено: <strong>72</strong> · пропущено: <strong>3</strong></li>
            <li>Ошибок: <strong>0</strong></li>
          </ul>
          <div class="rp-import-actions rp-import-actions--start">
            <a class="btn btn--ghost" href="/records/services">К списку записей</a>
            <button class="btn" type="button">Скачать отчёт (CSV)</button>
          </div>
        </div>
      </div>
    </div>
</section>
