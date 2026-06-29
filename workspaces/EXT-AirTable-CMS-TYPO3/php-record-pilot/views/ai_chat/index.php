<?php
declare(strict_types=1);
?>
<div class="rp-page rp-ai-page">
  <h1 class="rp-page__title">ИИ-помощник по структуре</h1>
  <p class="rp-page__lead">
    Макет из <code>Documentation/EXAMPLE.html</code> (секция «схема-чат»): общение только о полях, типах, связях и метаданных — не о строках БД.
    Спецификация: <code>Documentation/IDEA_AI_SCHEMA_COLLABORATION.md</code>.
  </p>

  <div class="ai-schema-layout">
    <aside class="ai-schema-topics">
      <h4>О чём спросить</h4>
      <button type="button" class="ai-topic ai-topic--active">Тип поля «Виджет»<span>Пресет UI + JSON настроек в одной колонке</span></button>
      <button type="button" class="ai-topic">Связи M2O / M2M<span>FK, индексы, каскады</span></button>
      <button type="button" class="ai-topic">Валидация и уникальность<span>Slug, даты, обязательность</span></button>
      <button type="button" class="ai-topic">Именование полей<span>RU-лейблы и machine name</span></button>
      <button type="button" class="ai-topic">Расширение без форка ядра<span>Реестр FieldType, плагин</span></button>
      <button type="button" class="ai-topic">Черновик adminSchema<span>JSON для services.schema.idea</span></button>
      <button type="button" class="ai-topic">Импорт / маппинг колонок<span>Согласование с CSV</span></button>
      <button type="button" class="ai-topic">Визуальный виджет (диаграмма)<span>Chart.js / ECharts, превью в форме</span></button>
      <button type="button" class="ai-topic">Обсуждение записей<span>Выборка · Вставка · Обновление · Удаление</span></button>
    </aside>
    <div class="ai-schema-chat">
      <div class="ai-schema-chat__head">
        <strong>Проект Medknizhky · таблица tx_services · режим «только метаданные»</strong>
        <span class="tag tag--muted">без SQL к прод-данным</span>
      </div>
      <div class="ai-chat-thread">
        <div class="ai-bubble ai-bubble--user">
          Хочу поле <strong>Виджет</strong>: редактор выбирает тип блока (отзывы, карта, CTA), дальше — настройки в JSON. Как лучше заложить в схему?
        </div>
        <div class="ai-bubble ai-bubble--ai">
          <div class="ai-bubble__label">Предложение структуры (черновик)</div>
          Один столбец <code>widget_config JSON NULL</code> + опционально <code>widget_preset ENUM</code> для быстрого фильтра. В <code>adminSchema</code> — <code>uiType: &quot;widget&quot;</code>, подполя: <code>preset</code>, <code>options</code> (объект). Валидация по JSON Schema на бэкенде после сохранения.
          <pre>{
  "widget": {
    "uiType": "widget",
    "presets": ["reviews", "map", "cta"],
    "storage": { "column": "widget_config", "format": "json" }
  }
}</pre>
          Зарегистрируйте тип в реестре полей → отдельный компонент формы; ядро CRUD остаётся общим.
        </div>
        <div class="ai-bubble ai-bubble--user">
          Ок. А если позже появятся новые пресеты без миграции?
        </div>
        <div class="ai-bubble ai-bubble--ai">
          <div class="ai-bubble__label">Ответ</div>
          Храните список пресетов в <strong>конфиге расширения</strong> или в таблице <code>widget_presets</code>; в JSON только <code>preset_key</code> + параметры. ИИ здесь может предложить список ключей — проверка и деплой за вами.
        </div>
        <div class="ai-bubble ai-bubble--user">
          Нужен ещё пресет: <strong>столбиковая диаграмма</strong>. Данные потом подтяну из отчётного API (<code>/api/reports/services-by-month</code>), сейчас хочу только схему и превью в админке на фейковых числах.
        </div>
        <div class="ai-bubble ai-bubble--ai">
          <div class="ai-bubble__label">Конфиг виджета-диаграммы (черновик)</div>
          Заведите <code>uiType: &quot;chart_bar&quot;</code> или вложенный объект в том же <code>widget_config</code>. Поля: <code>engine</code> (<code>chartjs</code> | <code>echarts</code>), <code>dataSource</code> (позже URL + query), <code>previewMock</code> — только для UI редактора (не писать в прод-ответ API). На фронте рендерите по сохранённому JSON.
          <pre>{
  "widget_preset": "chart_bar",
  "chart": {
    "engine": "echarts",
    "title": "Услуги по месяцам",
    "dataSource": { "type": "http_get", "url": "/api/reports/services-by-month" },
    "previewMock": { "labels": ["Січ","Лют","Бер"], "values": [12, 19, 14, 22, 8] }
  }
}</pre>
          <div class="ai-widget-preview">
            <div class="ai-widget-preview__cap">Превью в карточке поля (mock — без запроса к БД)</div>
            <div class="ai-chart-mock">
              <div class="ai-chart-bars">
                <span class="ai-chart-bar"></span><span class="ai-chart-bar"></span><span class="ai-chart-bar"></span><span class="ai-chart-bar"></span><span class="ai-chart-bar"></span>
              </div>
              <div class="ai-chart-labels"><span>Січ</span><span>Лют</span><span>Бер</span><span>Кві</span><span>Тра</span></div>
            </div>
          </div>
          ИИ может сгенерировать такой JSON и подсказать оси/легенду; подключение реальных данных — в коде адаптера отчёта, не в промпте с PII.
        </div>
        <div class="ai-bubble ai-bubble--user">
          Нужно обсудить <strong>операции с записями</strong>: что закрепить для <strong>выборки</strong>, <strong>вставки</strong>, <strong>обновления</strong> и <strong>удаления</strong> — без «живого SQL» в этом чате.
        </div>
        <div class="ai-bubble ai-bubble--ai">
          <div class="ai-bubble__label">CRUD как контракт (не сырые команды)</div>
          Оформите четыре операции в API/ядре: <code>list</code> (фильтры, сортировка, LIMIT), <code>create</code> (валидация по adminSchema), <code>update</code> (<code>PATCH</code> + версия для конфликтов), <code>delete</code> (по умолчанию <strong>soft</strong> через <code>deleted_at</code>, hard — отдельное право). ИИ помогает выбрать политику и сгенерировать описание OpenAPI / JSON — исполнение только через ваш код.
          <pre>{
  "records": {
    "select": "GET /api/tables/{table}/records",
    "insert": "POST …",
    "update": "PATCH …/{id}",
    "delete": "DELETE …/{id}?mode=soft|hard"
  }
}</pre>
        </div>
      </div>
      <div class="ai-schema-safe">
        <strong>Граница безопасности:</strong> в этот режим не передаются персональные строки из таблиц; в промпт попадают только имена таблиц/полей и черновик JSON. Кнопки «Применить к схеме» — через ревью и git, не напрямую в прод.
      </div>
      <div class="ai-chat-input-row">
        <input type="text" placeholder="Уточните вопрос по структуре…" value="" readonly />
        <button class="btn btn--accent" type="button">Отправить</button>
        <button class="btn" type="button">В черновик schema JSON</button>
        <button class="btn btn--ghost" type="button">Копировать ответ</button>
      </div>
    </div>
  </div>
</div>
