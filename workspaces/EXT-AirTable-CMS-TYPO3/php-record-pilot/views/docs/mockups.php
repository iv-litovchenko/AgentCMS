<?php
declare(strict_types=1);
$docsSection = $docsSection ?? 'mockups';
?>
<div class="rp-docs-layout">
<?php include __DIR__ . '/_sidebar.php'; ?>

    <div class="rp-docs-main">
      <h1 class="rp-page__title" id="doc-mock-intro">Макеты UI</h1>
      <p class="rp-page__lead">
        Здесь собрана <strong>карта макетов</strong> из статического файла
        <code>Documentation/EXAMPLE.html</code> (корень расширения TYPO3 / пакета).
        Откройте этот файл в браузере с диска или через локальный сервер и переходите по якорям — так удобнее смотреть визуальные блоки.
      </p>

      <div class="rp-callout" style="margin-bottom:1rem;">
        <strong>Как открыть:</strong> путь к файлу от каталога <code>php-record-pilot/</code>:
        <code>../Documentation/EXAMPLE.html</code>. Главная карта внутри файла: якорь
        <code>#recordpilot-doc-hub</code>.
      </div>

      <h2 class="rp-section-title" id="doc-mock-rp">Уже перенесено / есть в панели</h2>
      <p class="muted" style="margin-top:0;">Соответствие макетам в HTML и маршрутам RecordPilot (см. также зелёные пометки в EXAMPLE).</p>
      <div class="rp-table-wrap">
        <table class="rp-table">
          <thead>
            <tr>
              <th>Макет</th>
              <th>Якорь в EXAMPLE.html</th>
              <th>В панели</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Оболочка (−1), навигация</td>
              <td><code>mock-minus1</code></td>
              <td><a href="/dashboard">/dashboard</a>, общий <code>layout.php</code></td>
            </tr>
            <tr>
              <td>Импорт (wizard) 4–5</td>
              <td><code>mock-4-import</code>, <code>mock-5-import-mapping</code></td>
              <td><a href="/import">/import</a></td>
            </tr>
            <tr>
              <td>Экспорт (wizard) 6</td>
              <td><code>mock-6-export</code></td>
              <td><a href="/export">/export</a></td>
            </tr>
            <tr>
              <td>ИИ по структуре схемы</td>
              <td><code>idea-ai-schema-chat</code></td>
              <td><a href="/ai-chat">/ai-chat</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="rp-section-title" id="doc-mock-hub">Главная карта секций (EXAMPLE)</h2>
      <p>Блок <strong>«Главная карта документа EXAMPLE.html»</strong> — якорь <code>recordpilot-doc-hub</code>. Ниже — те же группы в сжатом виде; полные ссылки с превью — только в HTML-файле.</p>

      <div class="rp-mock-hub" id="doc-mock-vision">
        <div class="rp-mock-hub__card">
          <h3 class="rp-mock-hub__title">Видение · ИИ</h3>
          <ul class="rp-list rp-mock-hub__list">
            <li><code>vision-recordpilot</code> — оболочка и навигация</li>
            <li><code>mock-cms-vs-universal</code> — CMS vs RecordPilot</li>
            <li><code>idea-ai-schema-chat</code> — ИИ по структуре (частично в <a href="/ai-chat">панели</a>)</li>
          </ul>
        </div>
        <div class="rp-mock-hub__card" id="doc-mock-screens">
          <h3 class="rp-mock-hub__title">Рабочие экраны</h3>
          <ul class="rp-list rp-mock-hub__list">
            <li><code>mock-minus1</code>, <code>mock-03-tiles</code>, <code>mock-0-dashboard</code></li>
            <li><code>mock-1-list</code>, <code>mock-3-form</code>, <code>mock-31-fields</code>, <code>mock-32-comfort</code></li>
            <li><code>mock-4-import</code>, <code>mock-5-import-mapping</code> → <a href="/import">/import</a></li>
            <li><code>mock-6-export</code> → <a href="/export">/export</a></li>
            <li><code>mock-12-backup</code></li>
          </ul>
        </div>
        <div class="rp-mock-hub__card" id="doc-mock-dbvis">
          <h3 class="rp-mock-hub__title">Схема БД</h3>
          <ul class="rp-list rp-mock-hub__list">
            <li><code>mock-13-er</code>, <code>mock-131-matrix</code>, <code>mock-132-graph</code>, <code>mock-133-overview</code></li>
          </ul>
        </div>
        <div class="rp-mock-hub__card" id="doc-mock-text">
          <h3 class="rp-mock-hub__title">Текст · настройки</h3>
          <ul class="rp-list rp-mock-hub__list">
            <li><code>doc-strategy</code>, <code>doc-naming</code>, <code>doc-three-layers</code>, …</li>
            <li><code>mock-settings-s</code> — системные настройки, мульти-БД / роли (ориентир для UI)</li>
            <li><code>faq-platform-qa</code> — Q&amp;A</li>
          </ul>
        </div>
        <div class="rp-mock-hub__card" id="doc-mock-ideas">
          <h3 class="rp-mock-hub__title">Идеи 14–48</h3>
          <ul class="rp-list rp-mock-hub__list">
            <li><code>ideas-more-mockups</code> — оглавление 14–42</li>
            <li><code>mock-44-sandbox</code> … <code>mock-48-import-dryrun</code></li>
            <li><code>doc-next-layer-ideas</code> — «следующий слой»</li>
          </ul>
        </div>
      </div>

      <p class="muted rp-mt">
        Полный интерактивный hub с кликабельными переходами — в
        <code>Documentation/EXAMPLE.html</code> (секция <code>#recordpilot-doc-hub</code>).
        Текстовая документация по БД — <a href="/docs">/docs</a>.
      </p>
    </div>
</div>
