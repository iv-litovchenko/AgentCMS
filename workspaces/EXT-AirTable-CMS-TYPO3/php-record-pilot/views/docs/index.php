<?php
declare(strict_types=1);
$docsSection = $docsSection ?? 'index';
?>
<div class="rp-docs-layout">
<?php include __DIR__ . '/_sidebar.php'; ?>

    <div class="rp-docs-main">
      <h1 class="rp-page__title" id="doc-intro">Документация</h1>
      <p class="rp-page__lead">
        Ниже — ориентиры по каталогам и <strong>полное описание структуры БД</strong> (схема, типы полей, порядок работ).
        Та же версия в репозитории: <code>Documentation/DB_SCHEMA_DESCRIPTION.md</code>.
        <strong><a href="/docs/mockups">Макеты UI</a></strong> (карта <code>EXAMPLE.html</code>) — на отдельной странице.
      </p>

      <h2 class="rp-section-title" id="doc-recordpilot">RecordPilot (ядро панели)</h2>
      <ul class="rp-list">
        <li><code>php-record-pilot/README.md</code> — запуск, конфигурация, БД, маршруты.</li>
        <li><code>php-record-pilot/sql/schema.sql</code> — пример DDL для локальной БД.</li>
        <li><code>php-record-pilot/metadata/</code> — схемы сущностей (<code>*.schema.idea.json</code>).</li>
      </ul>

      <h2 class="rp-section-title" id="doc-typo3">Проект TYPO3 / оболочка</h2>
      <ul class="rp-list">
        <li><code>Documentation/EXAMPLE.html</code> — макеты UI, сценарии, терминология. Фрагмент «ИИ по структуре / схема-чат» встроен в панель: <strong><a href="/ai-chat">/ai-chat</a></strong>.</li>
        <li><code>Documentation/IDEA_AI_SCHEMA_COLLABORATION.md</code> — идея ИИ по метаданным схемы.</li>
        <li><code>Documentation/services.schema.idea.json</code> — пример контракта схемы.</li>
      </ul>

      <h2 class="rp-section-title" id="doc-schema">Структура базы данных (схема)</h2>
      <p class="rp-page__lead" style="margin-top:0;">
        Черновик для RecordPilot: несколько слоёв, которые <strong>не подменяют друг друга</strong>, а дополняют.
      </p>

      <article class="rp-doc">
        <h3 id="doc-layers">1. Зачем не одним файлом</h3>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr>
                <th>Слой</th>
                <th>Назначение</th>
                <th>Где живёт</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Физическая схема</strong></td>
                <td>Реальные таблицы, типы, индексы, FK, миграции</td>
                <td><code>sql/</code>, миграции, <code>SHOW CREATE TABLE</code></td>
              </tr>
              <tr>
                <td><strong>Логическая / связи</strong></td>
                <td>Как сущности связаны, ER, кардинальность</td>
                <td>диаграммы, отдельный JSON/YAML, комментарии в DDL</td>
              </tr>
              <tr>
                <td><strong>Админ/UI (метаданные)</strong></td>
                <td>Список, форма, фильтры, подписи полей</td>
                <td><code>*.schema.idea.json</code> в <code>metadata/</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Истина для <strong>данных</strong> — БД и миграции. Истина для <strong>интерфейса</strong> — метаданные; они должны <strong>соответствовать</strong> физике (имена колонок, типы для виджетов).</p>

        <h3 id="doc-physical">2. Физический уровень</h3>
        <ul>
          <li><strong>DDL</strong> в репозитории: например <code>sql/schema.sql</code>, далее <code>sql/migrations/NNN_description.sql</code>.</li>
          <li>Версионирование: номер/имя файла миграции + при необходимости таблица <code>schema_migrations</code> (позже в ядре).</li>
          <li>Минимум в комментариях SQL: назначение таблицы, важные ограничения.</li>
        </ul>
        <p>Этого достаточно, чтобы <strong>воспроизвести</strong> БД на стенде.</p>

        <h3 id="doc-logical">3. Логическая схема (связи и целостность)</h3>
        <p>Опционально, но полезно для обсуждений и ИИ:</p>
        <ul>
          <li><strong>Связи</strong>: <code>services.category_id → categories.id</code>, <code>ON DELETE</code>, уникальные пары.</li>
          <li><strong>Форматы описания</strong> (на выбор проекта):
            блок <code>relations</code> в JSON; Mermaid <code>erDiagram</code> в Markdown;
            экспорт из IDE / dbdiagram.io / экран «Схема БД» в панели (макет в <code>EXAMPLE.html</code>).</li>
        </ul>
        <p>Здесь фиксируем <strong>смысл</strong> связей, не дублируем полный DDL.</p>

        <h3 id="doc-metadata">4. Метаданные для панели (<code>*.schema.idea.json</code>)</h3>
        <p>Формат (см. <code>Documentation/services.schema.idea.json</code>):</p>
        <ul>
          <li><strong><code>meta</code></strong> — версия, сущность, назначение.</li>
          <li><strong><code>physicalSchema</code></strong> — таблица, <code>primaryKey</code>, <code>columns[]</code> с <code>dbType</code>, <code>nullable</code> и т.д. Снимок контракта для UI, не замена миграций.</li>
          <li><strong><code>adminSchema</code></strong> — подписи, виджеты, обязательность, правила для формы и списка.</li>
        </ul>
        <p>При изменении DDL обновлять <strong>physicalSchema</strong> (и при необходимости <strong>adminSchema</strong>), иначе панель и валидация разъедутся с БД.</p>

        <h4 id="doc-field-types">4.1. Типы полей: три уровня</h4>
        <p>Одна колонка в БД описывается <strong>тремя связанными вещами</strong>:</p>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr>
                <th>Уровень</th>
                <th>Что фиксируем</th>
                <th>Пример</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Физика</strong></td>
                <td>Реальный SQL-тип, <code>NULL</code>, <code>DEFAULT</code>, длина</td>
                <td><code>decimal(10,2)</code>, <code>tinyint(1) NOT NULL DEFAULT 1</code></td>
              </tr>
              <tr>
                <td><strong>Смысл (опционально)</strong></td>
                <td>Логический тип для домена и ИИ</td>
                <td>в <code>comment</code> колонки или <code>meta.notes</code></td>
              </tr>
              <tr>
                <td><strong>UI</strong></td>
                <td>Виджет и правила формы/списка</td>
                <td><code>uiType: "number"</code>, <code>step</code>, <code>maxLength</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>В <code>physicalSchema.columns[]</code> — <code>name</code>, <code>dbType</code>, <code>nullable</code>, при необходимости <code>default</code>, <code>autoIncrement</code>, <code>comment</code>.</p>
        <p>В <code>adminSchema.formView.fieldConfig</code> — <code>uiType</code> и параметры виджета. Связи — в <code>relations</code> и в <code>fieldConfig</code> как <code>relation-multi</code>, <code>file-relation-multi</code> и т.п.</p>

        <h4 id="doc-schema-blocks">4.2. Возможные поля и блоки (<code>schema.idea.json</code>)</h4>
        <p>Ниже — ориентир по структуре файла (как в <code>Documentation/services.schema.idea.json</code>). Ядро сейчас <strong>жёстко проверяет</strong> только часть ключей (см. <code>MetadataLoader</code>); остальное — для генераторов, спецификации и будущего UI.</p>

        <h5>Корень документа</h5>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr>
                <th>Блок</th>
                <th>Валидатор ядра</th>
                <th>Назначение</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>meta</code></td>
                <td>обязателен</td>
                <td>Тип документа, версия, сущность, назначение, заметки</td>
              </tr>
              <tr>
                <td><code>physicalSchema</code></td>
                <td>обязателен</td>
                <td>Таблица, ключ, колонки, индексы, опции таблицы</td>
              </tr>
              <tr>
                <td><code>relations</code></td>
                <td>опционально</td>
                <td>Связи M:N и др. (pivot, ключи)</td>
              </tr>
              <tr>
                <td><code>adminSchema</code></td>
                <td>обязателен</td>
                <td>Список, форма, фильтры, импорт/экспорт</td>
              </tr>
              <tr>
                <td><code>virtualFields</code></td>
                <td>опционально</td>
                <td>Вычисляемые поля без колонки в БД</td>
              </tr>
              <tr>
                <td><code>apiDraft</code></td>
                <td>опционально</td>
                <td>Чертёж REST-эндпоинтов (документация)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h5><code>meta</code></h5>
        <ul>
          <li><code>documentType</code> — для RecordPilot: <code>"schema-idea"</code>.</li>
          <li><code>version</code> — версия формата (строка).</li>
          <li><code>project</code>, <code>entity</code>, <code>purpose</code> — человекочитаемые строки.</li>
          <li><code>notes</code> — массив строк (пояснения для людей и ИИ).</li>
        </ul>

        <h5><code>physicalSchema</code></h5>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr>
                <th>Поле</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>table</code></td><td>Имя таблицы (обязательно для загрузчика)</td></tr>
              <tr><td><code>primaryKey</code></td><td>Имя PK-колонки</td></tr>
              <tr><td><code>titleField</code></td><td>Колонка для подписи записи в списках (опционально)</td></tr>
              <tr><td><code>softDeleteField</code></td><td>Колонка мягкого удаления, напр. <code>deleted_at</code></td></tr>
              <tr><td><code>timestamps</code></td><td>Объект <code>createdAt</code> / <code>updatedAt</code> — имена колонок</td></tr>
              <tr><td><code>columns[]</code></td><td>Массив описаний колонок (см. ниже)</td></tr>
              <tr><td><code>indexes[]</code></td><td><code>name</code>, <code>type</code> (<code>unique</code> / <code>index</code>), <code>columns[]</code></td></tr>
            </tbody>
          </table>
        </div>
        <p><strong>Элемент <code>columns[]</code>:</strong> <code>name</code>, <code>dbType</code>, <code>nullable</code>; опционально <code>default</code>, <code>autoIncrement</code>, <code>comment</code>.</p>

        <h5><code>relations[]</code></h5>
        <p>Типичный объект (пример — <code>belongsToMany</code>): <code>name</code>, <code>type</code>, <code>targetTable</code>, <code>pivotTable</code>, <code>sourceKey</code>, <code>targetKey</code>, <code>pivotColumns[]</code>.</p>

        <h5><code>adminSchema</code></h5>
        <ul>
          <li><strong><code>navigation</code></strong> — <code>module</code>, <code>group</code>, <code>icon</code> (группировка в меню админки).</li>
          <li><strong><code>listView</code></strong> — <code>defaultColumns[]</code>, <code>compactColumns[]</code>, <code>defaultSort[]</code> (<code>field</code>, <code>direction</code>), <code>searchableFields[]</code>, <code>facets[]</code> (<code>field</code>, <code>type</code>, <code>label</code>), <code>bulkActions[]</code>.</li>
          <li><strong><code>formView</code></strong> — <code>sections[]</code> (<code>id</code>, <code>title</code>, <code>fields[]</code>) и обязательный <code>fieldConfig</code> (см. ниже).</li>
          <li><strong><code>filters</code></strong> — <code>allowedOperators</code>: объект «имя поля → массив операторов».</li>
          <li><strong><code>importExport</code></strong> — <code>import</code> / <code>export</code>: форматы, колонки, <code>upsertBy</code>, <code>includeRelationsAs</code> и т.д.</li>
        </ul>

        <h5><code>formView.fieldConfig</code> (на каждое поле формы)</h5>
        <p>Ключ объекта — имя поля (колонка или виртуальное имя связи). Общие свойства:</p>
        <ul>
          <li><code>uiType</code> — виджет (см. таблицу ниже).</li>
          <li><code>required</code>, <code>unique</code> — логические.</li>
          <li><code>label</code>, <code>hint</code>, <code>modelHint</code> — подписи и подсказки.</li>
          <li>Для строк: <code>maxLength</code>; для многострочного: <code>rows</code>.</li>
          <li>Для чисел: <code>step</code>, <code>min</code>, <code>max</code>.</li>
          <li>Для связей: <code>relationName</code>, <code>displayField</code>.</li>
          <li>Для файлов: <code>allowedMime[]</code> (маски MIME).</li>
        </ul>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr>
                <th><code>uiType</code></th>
                <th>Назначение</th>
                <th>Типичные доп. ключи</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>text</code></td><td>Однострочный текст</td><td><code>maxLength</code>, <code>required</code></td></tr>
              <tr><td><code>slug</code></td><td>Slug / сегмент URL</td><td><code>unique</code>, <code>required</code></td></tr>
              <tr><td><code>textarea</code></td><td>Многострочный текст</td><td><code>rows</code></td></tr>
              <tr><td><code>number</code></td><td>Число (целое или дробное)</td><td><code>step</code>, <code>min</code>, <code>max</code></td></tr>
              <tr><td><code>switch</code></td><td>Булев флаг</td><td>—</td></tr>
              <tr><td><code>date</code></td><td>Дата</td><td>—</td></tr>
              <tr><td><code>datetime</code></td><td>Дата и время</td><td>—</td></tr>
              <tr><td><code>select</code></td><td>Выбор одного значения</td><td>список значений в метаданных (расширение формата)</td></tr>
              <tr><td><code>multi-select</code></td><td>Несколько значений из перечня</td><td>то же</td></tr>
              <tr><td><code>relation</code></td><td>Связь M:1 / FK одной записи</td><td><code>relationName</code>, <code>displayField</code></td></tr>
              <tr><td><code>relation-multi</code></td><td>Связь M:N без файлов</td><td><code>relationName</code>, <code>displayField</code></td></tr>
              <tr><td><code>file-relation-multi</code></td><td>Вложения / медиа через pivot</td><td><code>relationName</code>, <code>allowedMime</code></td></tr>
              <tr><td><code>file</code></td><td>Один файл (бинарь / storage)</td><td><code>allowedMime</code></td></tr>
            </tbody>
          </table>
        </div>
        <p class="muted" style="margin-top:0.5rem;">Новые <code>uiType</code> вводите согласованно с таблицей «БД ↔ UI» и с реализацией в ядре панели.</p>

        <h5><code>virtualFields[]</code></h5>
        <p>Пример: <code>name</code>, <code>type</code> (напр. <code>computed-int</code>), <code>source</code> (напр. <code>relation_count:categories</code>), <code>description</code>. Используются в списке/фильтрах только если запросы ядра их поддерживают.</p>

        <h5>Операторы в <code>filters.allowedOperators</code></h5>
        <p>Строки: <code>contains</code>, <code>starts_with</code>, <code>equals</code>, <code>empty</code>; числа: <code>equals</code>, <code>gt</code>, <code>gte</code>, <code>lt</code>, <code>lte</code>, <code>between</code>, <code>empty</code>; даты: <code>date_between</code>, <code>date_before</code>, <code>date_after</code>, <code>empty</code>; связи: <code>has_any</code>, <code>has_all</code>, <code>not_has</code> — набор может расширяться.</p>

        <h4 id="doc-db-ui">Соответствие «тип БД → подсказка для UI»</h4>
        <p>Соглашение для RecordPilot: при смене <code>dbType</code> проверяйте совместимый <code>uiType</code> и фильтры.</p>
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead>
              <tr>
                <th>Группа физики (<code>dbType</code>)</th>
                <th>Замечания</th>
                <th>Типичный <code>uiType</code></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Целые: <code>tinyint</code>, <code>int</code>, <code>bigint</code></td>
                <td><code>tinyint(1)</code> часто = булев флаг</td>
                <td><code>number</code> или <strong><code>switch</code></strong></td>
              </tr>
              <tr>
                <td><code>decimal</code>, <code>float</code>, <code>double</code></td>
                <td>для денег — <code>DECIMAL</code></td>
                <td><code>number</code> + <code>step</code> (напр. 0.01)</td>
              </tr>
              <tr>
                <td><code>char</code>, <code>varchar</code></td>
                <td>длина в DDL и <code>maxLength</code> в UI</td>
                <td><strong><code>text</code></strong>, <strong><code>slug</code></strong></td>
              </tr>
              <tr>
                <td><code>text</code>, <code>mediumtext</code></td>
                <td></td>
                <td><strong><code>textarea</code></strong> (<code>rows</code>)</td>
              </tr>
              <tr>
                <td><code>tinyint(1)</code>, <code>boolean</code></td>
                <td>единый стиль 0/1 в проекте</td>
                <td><strong><code>switch</code></strong></td>
              </tr>
              <tr>
                <td><code>date</code>, <code>datetime</code>, <code>timestamp</code></td>
                <td>часовой пояс — политика приложения</td>
                <td><code>date</code> / <strong><code>datetime</code></strong></td>
              </tr>
              <tr>
                <td><code>json</code></td>
                <td>валидация схемы — позже в коде</td>
                <td><code>textarea</code> или редактор JSON в ядре</td>
              </tr>
              <tr>
                <td><code>blob</code>, <code>binary</code></td>
                <td></td>
                <td><strong><code>file</code></strong> / таблица файлов</td>
              </tr>
              <tr>
                <td><code>enum</code>, <code>set</code></td>
                <td>альтернатива — справочник + FK</td>
                <td><strong><code>select</code></strong> / <code>multi-select</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 id="doc-relations">Связи и виртуальные поля</h4>
        <ul>
          <li><strong>FK</strong> (<code>category_id</code>): в физике — <code>int</code>/<code>bigint</code> + индекс; в UI — <code>relation</code> / <code>select</code> с <code>displayField</code>.</li>
          <li><strong>M:N</strong> (pivot): в <code>relations</code> — <code>belongsToMany</code>; в форме — <code>relation-multi</code>, <code>file-relation-multi</code>.</li>
          <li><strong>Вычисляемые поля</strong> (нет колонки в БД): <code>virtualFields</code> — не путать с реальными колонками.</li>
        </ul>

        <h4 id="doc-filters">Фильтры и операторы</h4>
        <p>В <code>adminSchema.filters.allowedOperators</code> (пример — <code>services.schema.idea.json</code>):</p>
        <ul>
          <li>строки — <code>contains</code>, <code>equals</code>, <code>empty</code>, …;</li>
          <li>числа — <code>gt</code>, <code>gte</code>, <code>lt</code>, <code>lte</code>, <code>between</code>;</li>
          <li>даты — <code>date_between</code>, <code>date_before</code>, <code>date_after</code>;</li>
          <li>связи — <code>has_any</code>, <code>has_all</code>, <code>not_has</code>.</li>
        </ul>
        <p>При новом <code>dbType</code> или <code>uiType</code> расширяйте этот блок согласованно.</p>

        <h3 id="doc-workflow">5. Рекомендуемый порядок работ</h3>
        <ol>
          <li>Меняем БД через миграцию (или <code>schema.sql</code> на старте).</li>
          <li>Обновляем <code>physicalSchema.columns</code> в JSON сущности (или черновик из <code>INFORMATION_SCHEMA</code>).</li>
          <li>Для каждой колонки — <code>uiType</code> и параметры; для связей — <code>relations</code> + <code>fieldConfig</code>.</li>
          <li>Настраиваем <code>filters.allowedOperators</code> под классы типов.</li>
          <li>(Опционально) диаграмма связей, <code>virtualFields</code>.</li>
        </ol>

        <h3 id="doc-future">6. Что может добавить ядро позже</h3>
        <ul>
          <li>Импорт структуры из БД → черновик <code>physicalSchema</code>.</li>
          <li>Валидация JSON метаданных против реальных колонок.</li>
          <li>Единый <code>database.schema.json</code> на весь проект (таблицы + relations), если понадобится ER и отчёты.</li>
        </ul>

        <h3 id="doc-links">Ссылки на материалы в репозитории</h3>
        <ul>
          <li><code>Documentation/services.schema.idea.json</code> — пример метаданных сущности.</li>
          <li><code>Documentation/IDEA_AI_SCHEMA_COLLABORATION.md</code> — ИИ и метаданные схемы.</li>
          <li><code>Documentation/EXAMPLE.html</code> — макеты схемы БД в панели.</li>
        </ul>
      </article>

      <p class="muted rp-mt" id="doc-dup-note">
        Дублирование с <code>Documentation/DB_SCHEMA_DESCRIPTION.md</code>: при правках желательно обновлять оба места (или вынести общий источник позже).
      </p>
    </div>
</div>
