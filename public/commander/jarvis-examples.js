/* ═══════════════════════════════════════════════════════════
   Галерея примеров для JARVIS UI KIT.
   Каждый пример = { id, cat, title, desc, kw:[ключевые слова для голоса], spec }
   spec — ровно тот JSON, который может вернуть модель в блоке ```jv
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const EX = [];
  const add = (cat, id, title, desc, kw, spec) => EX.push({ cat, id, title, desc, kw, spec });

  // детерминированный «рандом», чтобы графики не прыгали
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const walk = (n, start, step, lo, hi) => { let v = start; return Array.from({ length: n }, () => (v = Math.max(lo, Math.min(hi, v + (rnd() - .5) * step)), Math.round(v))); };
  const hours = n => Array.from({ length: n }, (_, i) => String(i).padStart(2, '0') + ':00');

  /* ═══════════ ГРАФИКИ ═══════════ */
  add('Графики', 'bar-sales', 'Столбцы: продажи по месяцам', 'Сравнение двух периодов', ['столбч', 'продаж', 'bar'], {
    title: 'Продажи по месяцам', blocks: [{ type: 'chart', kind: 'bar', title: 'Выручка, тыс. ₽', subtitle: '2025 vs 2026', unit: 'тыс. ₽',
      labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг'], series: [{ name: '2025', data: [120, 135, 150, 142, 170, 188, 176, 195] }, { name: '2026', data: [140, 160, 171, 190, 205, 232, 228, 251] }] }] });

  add('Графики', 'bar-stacked', 'Стопки: трафик по источникам', 'Составные столбцы', ['стопк', 'трафик', 'stacked'], {
    title: 'Трафик сайта', blocks: [{ type: 'chart', kind: 'bar', stacked: true, title: 'Визиты по источникам', unit: 'визитов',
      labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], series: [{ name: 'Поиск', data: [820, 910, 880, 960, 1010, 640, 590] }, { name: 'Соцсети', data: [300, 340, 420, 380, 450, 520, 610] }, { name: 'Прямые', data: [210, 190, 230, 250, 240, 180, 160] }, { name: 'Реклама', data: [150, 180, 160, 200, 260, 300, 280] }] }] });

  add('Графики', 'hbar-top', 'Горизонтальные: топ запросов', 'Рейтинг категорий', ['топ', 'рейтинг', 'hbar', 'горизонт'], {
    title: 'Топ запросов к ассистенту', blocks: [{ type: 'chart', kind: 'hbar', title: 'Команды за неделю', unit: 'раз',
      data: [{ label: 'Погода', value: 128 }, { label: 'Музыка', value: 96 }, { label: 'Таймер', value: 74 }, { label: 'Календарь', value: 61 }, { label: 'Умный дом: свет', value: 55 }, { label: 'Почта', value: 38 }] }] });

  add('Графики', 'line-cpu', 'Линии: нагрузка за сутки', 'Два временных ряда, сглаживание', ['линия', 'линейн', 'нагрузк', 'cpu', 'line'], {
    title: 'Мониторинг', blocks: [{ type: 'chart', kind: 'line', smooth: true, title: 'CPU и память за сутки', unit: '%', zero: true,
      labels: hours(24), series: [{ name: 'CPU', data: walk(24, 30, 30, 8, 95) }, { name: 'Память', data: walk(24, 55, 10, 40, 80) }] }] });

  add('Графики', 'area-users', 'Область: рост пользователей', 'Накопительная динамика', ['област', 'рост', 'area', 'пользовател'], {
    title: 'Аудитория', blocks: [{ type: 'chart', kind: 'area', smooth: true, title: 'Активные пользователи', unit: 'чел.',
      labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q1 26'], series: [{ name: 'Пользователи', data: [1200, 1900, 2600, 3800, 5200, 6900, 8800, 11200, 14100] }] }] });

  add('Графики', 'donut-expenses', 'Кольцо: расходы по категориям', 'Доли с центром и легендой', ['кольц', 'донат', 'расход', 'donut'], {
    title: 'Бюджет', blocks: [{ type: 'chart', kind: 'donut', title: 'Расходы за месяц', unit: '₽', center: '84,5к', centerLabel: 'потрачено',
      labels: ['Жильё', 'Еда', 'Транспорт', 'Развлечения', 'Подписки', 'Прочее'], series: [{ name: '₽', data: [32000, 21500, 8400, 9800, 3200, 9600] }] }] });

  add('Графики', 'pie-browsers', 'Круговая: доли браузеров', 'Классическая диаграмма-пирог', ['круг', 'пирог', 'доли', 'pie', 'браузер'], {
    title: 'Браузеры', blocks: [{ type: 'chart', kind: 'pie', title: 'Доли посетителей', unit: '%',
      data: [{ label: 'Chrome', value: 61 }, { label: 'Safari', value: 22 }, { label: 'Firefox', value: 8 }, { label: 'Edge', value: 6 }, { label: 'Другие', value: 3 }] }] });

  add('Графики', 'scatter-price', 'Точки: цена и рейтинг', 'Два набора точек, подписи осей', ['точк', 'scatter', 'корреляц', 'разброс'], {
    title: 'Цена и рейтинг', blocks: [{ type: 'chart', kind: 'scatter', title: 'Наушники: цена против оценки', xLabel: 'Цена, тыс. ₽', yLabel: 'Рейтинг',
      series: [{ name: 'Накладные', data: [[3, 3.9], [5, 4.1], [8, 4.4], [12, 4.5], [18, 4.7], [25, 4.6], [31, 4.8]] }, { name: 'Вкладыши', data: [[1, 3.4], [2, 3.8], [4, 4.0], [7, 4.2], [10, 4.4], [15, 4.5], [20, 4.55]] }] }] });

  add('Графики', 'radar-models', 'Радар: сравнение вариантов', 'Несколько критериев сразу', ['радар', 'сравнен', 'radar', 'критери'], {
    title: 'Выбор ноутбука', blocks: [{ type: 'chart', kind: 'radar', title: 'Сравнение по критериям', max: 10,
      labels: ['Скорость', 'Экран', 'Батарея', 'Вес', 'Цена', 'Звук'], series: [{ name: 'Модель A', data: [9, 7, 6, 5, 4, 8] }, { name: 'Модель B', data: [6, 9, 9, 8, 6, 6] }, { name: 'Модель C', data: [7, 6, 8, 9, 9, 5] }] }] });

  add('Графики', 'heatmap-activity', 'Тепловая карта: активность', 'Матрица день × время', ['тепл', 'heatmap', 'активност', 'матриц'], {
    title: 'Когда вы обращаетесь к Джарвису', blocks: [{ type: 'chart', kind: 'heatmap', title: 'Команд по дням и времени суток', values: true, unit: 'команд',
      rows: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], cols: ['00', '03', '06', '09', '12', '15', '18', '21'],
      matrix: [[1, 0, 6, 14, 9, 8, 12, 7], [0, 0, 7, 16, 11, 9, 13, 6], [1, 1, 5, 15, 10, 12, 14, 9], [0, 0, 8, 13, 12, 10, 15, 8], [2, 0, 6, 12, 9, 7, 18, 14], [4, 1, 2, 5, 8, 11, 16, 17], [3, 0, 1, 4, 7, 9, 13, 10]] }] });

  add('Графики', 'gauge-set', 'Спидометры: показатели', 'Gauge в сетке', ['спидометр', 'gauge', 'датчик', 'показател'], {
    title: 'Датчики', blocks: [{ type: 'grid', cols: 3, blocks: [
      { type: 'card', title: 'CPU', blocks: [{ type: 'chart', kind: 'gauge', value: 42, max: 100, unit: '%', label: 'нагрузка' }] },
      { type: 'card', title: 'Диск', blocks: [{ type: 'chart', kind: 'gauge', value: 78, max: 100, unit: '%', label: 'занято' }] },
      { type: 'card', title: 'Температура', blocks: [{ type: 'chart', kind: 'gauge', value: 91, max: 110, unit: '°', label: 'процессор' }] }] }] });

  add('Графики', 'funnel', 'Воронка: этапы продаж', 'Конверсия по шагам', ['воронк', 'funnel', 'конверси'], {
    title: 'Воронка', blocks: [{ type: 'chart', kind: 'funnel', title: 'Путь клиента', unit: 'чел.',
      data: [{ label: 'Посетили сайт', value: 12400 }, { label: 'Открыли каталог', value: 7300 }, { label: 'Добавили в корзину', value: 2100 }, { label: 'Оформили заказ', value: 940 }, { label: 'Оплатили', value: 810 }] }] });

  add('Графики', 'kpi-spark', 'KPI с мини-графиками', 'Карточки показателей со sparkline', ['kpi', 'показател', 'метрик', 'спарк'], {
    title: 'Ключевые метрики', blocks: [{ type: 'stats', items: [
      { label: 'Выручка', value: 1284500, unit: '₽', delta: '+12.4%', spark: [4, 6, 5, 8, 7, 10, 12, 11, 14], sparkColor: 2 },
      { label: 'Заказы', value: 3420, delta: '+5.1%', spark: [9, 8, 9, 10, 9, 11, 12, 12, 13], sparkColor: 0 },
      { label: 'Конверсия', value: 3.8, unit: '%', delta: '-0.4%', spark: [5, 5, 6, 5, 4, 4, 5, 4, 4], sparkColor: 4 },
      { label: 'Ошибки', value: 17, delta: '-32%', goodWhen: 'down', spark: [9, 12, 10, 8, 7, 6, 5, 4, 3], sparkColor: 4 }] }] });

  /* ═══════════ ТАБЛИЦЫ ═══════════ */
  add('Таблицы', 'table-files', 'Агент нашёл файлы', 'Поиск, сортировка, итоги', ['файл', 'поиск', 'найден', 'таблиц'], {
    title: 'Найдено файлов: 12', blocks: [{ type: 'alert', level: 'info', title: 'Поиск завершён', text: 'Искал `*.log` и `*.csv` в `~/Projects` — нашёл **12** файлов.' }, { type: 'table', search: true, totals: true, pageSize: 6,
      columns: [{ key: 'name', label: 'Файл', type: 'code' }, { key: 'type', label: 'Тип', type: 'badge', colors: { csv: 'ok', log: 'warn' } }, { key: 'size', label: 'Размер', type: 'number', unit: 'КБ' }, { key: 'mod', label: 'Изменён' }],
      rows: [['sales_2026.csv', 'csv', 840, '12 окт'], ['users.csv', 'csv', 2210, '10 окт'], ['server.log', 'log', 15400, '13 окт'], ['error.log', 'log', 320, '13 окт'], ['orders_q3.csv', 'csv', 1780, '01 окт'], ['debug.log', 'log', 9100, '11 окт'], ['prices.csv', 'csv', 96, '08 окт'], ['auth.log', 'log', 4200, '12 окт'], ['stock.csv', 'csv', 540, '05 окт'], ['cron.log', 'log', 180, '13 окт'], ['clients.csv', 'csv', 3120, '29 сен'], ['audit.log', 'log', 7700, '09 окт']] }] });

  add('Таблицы', 'table-servers', 'Статусы серверов', 'Бейджи и мини-полосы нагрузки', ['сервер', 'статус', 'мониторинг'], {
    title: 'Серверы', blocks: [{ type: 'table', title: 'Состояние инфраструктуры', compact: true,
      columns: [{ key: 'host', label: 'Хост', type: 'code' }, { key: 'role', label: 'Роль' }, { key: 'status', label: 'Статус', type: 'badge' }, { key: 'cpu', label: 'CPU', type: 'bar', max: 100 }, { key: 'ram', label: 'RAM', type: 'bar', max: 100 }, { key: 'up', label: 'Аптайм', align: 'center' }],
      rows: [{ host: 'api-01', role: 'API', status: 'online', cpu: 34, ram: 52, up: '41 д' }, { host: 'api-02', role: 'API', status: 'online', cpu: 61, ram: 70, up: '41 д' }, { host: 'db-01', role: 'PostgreSQL', status: 'warn: диск 85%', cpu: 48, ram: 88, up: '112 д' }, { host: 'cache-01', role: 'Redis', status: 'online', cpu: 12, ram: 40, up: '9 д' }, { host: 'worker-03', role: 'Очереди', status: 'offline', cpu: 0, ram: 0, up: '—' }] }] });

  add('Таблицы', 'table-money', 'Финансовая таблица', 'Деньги, проценты, итоги, страницы', ['финанс', 'деньги', 'бюджет таблиц', 'money'], {
    title: 'Расходы по проектам', blocks: [{ type: 'table', totals: true, pageSize: 5, sortBy: 'plan', sortDir: 'desc',
      columns: [{ key: 'p', label: 'Проект' }, { key: 'plan', label: 'План', type: 'money' }, { key: 'fact', label: 'Факт', type: 'money' }, { key: 'pct', label: 'Исполнение', type: 'percent' }],
      rows: [{ p: 'Сайт', plan: 450000, fact: 412000, pct: 92 }, { p: 'Мобильное приложение', plan: 900000, fact: 960000, pct: 107 }, { p: 'Маркетинг', plan: 300000, fact: 210000, pct: 70 }, { p: 'Инфраструктура', plan: 180000, fact: 175000, pct: 97 }, { p: 'Обучение', plan: 90000, fact: 40000, pct: 44 }, { p: 'Поддержка', plan: 120000, fact: 131000, pct: 109 }, { p: 'Исследования', plan: 210000, fact: 150000, pct: 71 }] }] });

  /* ═══════════ ФОРМЫ ═══════════ */
  add('Формы', 'form-reminder', 'Форма: новое напоминание', 'Текст, дата, время, повтор, переключатель', ['напомин', 'форма'], {
    blocks: [{ type: 'card', title: 'Новое напоминание', blocks: [{ type: 'form', id: 'reminder', cols: 2, submit: 'Создать', reset: true, successText: 'Напоминание создано', fields: [
      { name: 'text', label: 'О чём напомнить', placeholder: 'Позвонить маме', required: true, span: 2 },
      { name: 'date', label: 'Дата', type: 'date', required: true }, { name: 'time', label: 'Время', type: 'time', value: '09:00' },
      { name: 'repeat', label: 'Повтор', type: 'select', options: ['Не повторять', 'Каждый день', 'По будням', 'Раз в неделю'], value: 'Не повторять' },
      { name: 'priority', label: 'Важность', type: 'radio', options: ['Обычная', 'Высокая'], value: 'Обычная' },
      { name: 'voice', label: 'Озвучить голосом', type: 'switch', value: true, span: 2 }] }] }] });

  add('Формы', 'form-settings', 'Форма: настройки ассистента', 'Ползунки, радио, флажки, цвет', ['настройк', 'параметр', 'конфиг'], {
    blocks: [{ type: 'form', id: 'settings', title: 'Настройки Джарвиса', description: 'Изменения применяются сразу после сохранения.', cols: 2, submit: 'Сохранить', fields: [
      { name: 'wake', label: 'Слово активации', value: 'Джарвис' },
      { name: 'lang', label: 'Язык', type: 'select', options: [{ value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }], value: 'ru' },
      { name: 'volume', label: 'Громкость голоса', type: 'range', min: 0, max: 100, value: 70, unit: '%' },
      { name: 'speed', label: 'Скорость речи', type: 'range', min: 0.5, max: 2, step: 0.1, value: 1, unit: '×' },
      { name: 'style', label: 'Стиль ответов', type: 'radio', options: ['Кратко', 'Подробно', 'С юмором'], value: 'Кратко', span: 2 },
      { name: 'skills', label: 'Включённые навыки', type: 'checkboxes', options: ['Погода', 'Музыка', 'Календарь', 'Почта', 'Умный дом'], value: ['Погода', 'Календарь'], span: 2 },
      { name: 'accent', label: 'Акцентный цвет', type: 'color', value: '#00d4ff' }, { name: 'beta', label: 'Бета-функции', type: 'switch' }] }] });

  add('Формы', 'form-survey', 'Форма: опрос с оценкой', 'Звёзды, радио, текст', ['опрос', 'оценк', 'отзыв', 'обратн'], {
    blocks: [{ type: 'card', title: 'Как вам ответ?', blocks: [{ type: 'form', id: 'feedback', submit: 'Отправить отзыв', successText: 'Спасибо за отзыв!', fields: [
      { name: 'rating', label: 'Оценка', type: 'rating', required: true },
      { name: 'useful', label: 'Было полезно?', type: 'radio', options: ['Да', 'Частично', 'Нет'], required: true },
      { name: 'topics', label: 'Чего не хватило', type: 'checkboxes', options: ['Точности', 'Скорости', 'Подробностей', 'Графиков'] },
      { name: 'comment', label: 'Комментарий', type: 'textarea', placeholder: 'Что улучшить?', rows: 3 }] }] }] });

  add('Формы', 'form-agent-task', 'Форма: поставить задачу агенту', 'Многопольный запрос к агенту', ['задач агент', 'агент задач', 'поручен'], {
    blocks: [{ type: 'form', id: 'agent-task', title: 'Поручить агенту', cols: 2, submit: 'Запустить', fields: [
      { name: 'goal', label: 'Что нужно сделать', type: 'textarea', rows: 3, required: true, span: 2, placeholder: 'Найди все отчёты за сентябрь и построй сводку' },
      { name: 'source', label: 'Где искать', type: 'select', options: ['Локальные файлы', 'Почта', 'Интернет', 'База данных'] },
      { name: 'depth', label: 'Глубина поиска', type: 'number', min: 1, max: 10, value: 3 },
      { name: 'tools', label: 'Инструменты', type: 'checkboxes', options: ['Поиск', 'Таблицы', 'Графики', 'Отправка почты'], value: ['Поиск', 'Графики'], span: 2 },
      { name: 'temp', label: 'Креативность', type: 'range', min: 0, max: 1, step: 0.1, value: 0.3, span: 2 },
      { name: 'confirm', label: 'Спрашивать подтверждение перед действиями', type: 'checkbox', value: true, span: 2 }] }] });

  /* ═══════════ MARKDOWN ═══════════ */
  add('Markdown', 'md-report', 'Markdown: отчёт', 'Заголовки, списки, цитата, таблица, код', ['markdown', 'маркдаун', 'отчёт', 'отчет', 'текст'], {
    blocks: [{ type: 'md', text: `# Отчёт: неделя 41

Краткий итог по задачам и показателям за **7 дней**.

## Что сделано
- ✅ Запущен голосовой ввод
  - поддержка *русского* и английского
  - ~~старый~~ новый движок распознавания
- ✅ Добавлены дашборды
- ⏳ Интеграция с календарём — в работе

> **Вывод:** точность распознавания выросла до **97%**, но задержка ответа всё ещё выше целевой.

## Метрики
| Показатель | Было | Стало | Δ |
|:--|--:|--:|:-:|
| Точность речи | 92% | 97% | ▲ |
| Задержка, мс | 940 | 610 | ▲ |
| Ошибки в день | 31 | 17 | ▲ |

## Следующие шаги
1. Подключить [документацию API](https://developer.mozilla.org/)
2. Протестировать на шумных записях
3. Выкатить бета-версию

\`\`\`js
// пример вызова
Jarvis.show({ title: "Привет", blocks: [{ type: "md", text: "Готов!" }] });
\`\`\`

- [x] Сделать макет
- [ ] Подключить реальный API` }] });

  add('Markdown', 'md-cheat', 'Markdown: шпаргалка синтаксиса', 'Что поддерживает рендерер', ['шпаргалк', 'синтаксис', 'markdown справк'], {
    blocks: [{ type: 'row', blocks: [
      { type: 'card', title: 'Пишешь', blocks: [{ type: 'code', lang: 'markdown', text: `# Заголовок 1\n## Заголовок 2\n**жирный**, *курсив*, ~~зачёркнутый~~\n\`код в строке\`\n[ссылка](https://example.com)\n- пункт\n  - вложенный\n1. нумерованный\n- [x] готово\n- [ ] не готово\n> цитата\n---\n| A | B |\n|---|--:|\n| 1 | 2 |` }] },
      { type: 'card', title: 'Получаешь', blocks: [{ type: 'md', text: `# Заголовок 1\n## Заголовок 2\n**жирный**, *курсив*, ~~зачёркнутый~~\n\`код в строке\`\n[ссылка](https://example.com)\n- пункт\n  - вложенный\n1. нумерованный\n- [x] готово\n- [ ] не готово\n> цитата\n\n---\n\n| A | B |\n|---|--:|\n| 1 | 2 |` }] }] }] });

  add('Markdown', 'md-news', 'Markdown: сводка новостей', 'Текст со ссылками и метками', ['новост', 'сводк', 'дайджест'], {
    title: 'Дайджест дня', blocks: [{ type: 'badges', items: [{ text: 'Технологии', variant: 'info' }, { text: 'Наука', variant: 'ok' }, { text: 'Экономика', variant: 'warn' }] },
      { type: 'md', text: `### 1. Вышла новая версия браузера\nУскорена работа с **WebGPU**, добавлены вертикальные вкладки. [Читать подробнее](https://example.com/1)\n\n### 2. Учёные нашли новый способ хранения энергии\nПрототип выдерживает *10 000* циклов без потери ёмкости.\n\n### 3. Курсы валют\nДоллар стабилен, евро колеблется в узком коридоре.` },
      { type: 'buttons', items: [{ label: 'Озвучить', say: 'Прочитай новости вслух' }, { label: 'Только технологии', say: 'Покажи новости про технологии', variant: 'ghost' }] }] });

  /* ═══════════ КОМПОЗИЦИИ ═══════════ */
  add('Композиции', 'dash-logs', 'Отчёт агента: анализ логов', 'Шаги + KPI + график + таблица + вывод', ['лог', 'анализ', 'дашборд', 'отчёт агент', 'агент нашёл'], {
    title: 'Анализ server.log', blocks: [
      { type: 'steps', items: [{ label: 'Найдены логи', text: '3 файла, 24 МБ', status: 'done' }, { label: 'Разобраны записи', text: '48 210 строк', status: 'done' }, { label: 'Сгруппированы ошибки', status: 'done' }, { label: 'Построен отчёт', status: 'done' }] },
      { type: 'stats', items: [{ label: 'Записей', value: 48210 }, { label: 'Ошибок', value: 317, delta: '+24%', goodWhen: 'down' }, { label: 'Пик нагрузки', value: '14:20' }, { label: 'Uptime', value: 99.2, unit: '%' }] },
      { type: 'row', blocks: [
        { type: 'chart', kind: 'area', smooth: true, title: 'Ошибок по часам', labels: hours(12).map((h, i) => String(8 + i).padStart(2, '0') + ':00'), series: [{ name: 'Ошибки', data: [6, 9, 14, 22, 31, 58, 44, 36, 29, 25, 19, 12], color: 4 }] },
        { type: 'chart', kind: 'donut', title: 'Типы ошибок', center: '317', centerLabel: 'всего', labels: ['Timeout', '500', 'DB', 'Auth', 'Прочее'], series: [{ name: 'шт', data: [112, 84, 61, 38, 22] }] }] },
      { type: 'table', compact: true, title: 'Топ источников ошибок', columns: [{ key: 'ep', label: 'Endpoint', type: 'code' }, { key: 'n', label: 'Ошибок', type: 'bar' }, { key: 'sev', label: 'Важность', type: 'badge' }],
        rows: [{ ep: 'POST /api/order', n: 96, sev: 'высокая' }, { ep: 'GET /api/search', n: 71, sev: 'средняя' }, { ep: 'POST /api/login', n: 38, sev: 'средняя' }, { ep: 'GET /api/profile', n: 12, sev: 'низкая' }] },
      { type: 'alert', level: 'warn', title: 'Вывод', text: 'Всплеск в **12:00–14:00** совпадает с пиком нагрузки. Рекомендую увеличить таймаут `/api/order` и проверить индекс в БД.' },
      { type: 'buttons', items: [{ label: 'Показать трассировки', say: 'Покажи трассировки ошибок /api/order' }, { label: 'Сохранить отчёт', say: 'Сохрани отчёт в заметки', variant: 'ghost' }] }] });

  add('Композиции', 'kanban', 'Канбан-доска', 'Колонки с карточками и метками', ['канбан', 'доска', 'kanban', 'проект'], {
    title: 'Проект «Джарвис»', blocks: [{ type: 'kanban', columns: [
      { title: 'Идеи', cards: [{ title: 'Wake-word офлайн', tag: 'идея', level: 'info' }, 'Мобильное приложение'] },
      { title: 'В работе', cards: [{ title: 'Интеграция календаря', text: 'OAuth + синхронизация', tag: 'api', level: 'warn' }, { title: 'Графики в чате', tag: 'ui', level: 'info' }] },
      { title: 'Проверка', cards: [{ title: 'Голосовой ввод', text: 'Тесты на шуме', tag: 'qa', level: 'warn' }] },
      { title: 'Готово', cards: [{ title: 'Оконный менеджер', tag: 'ok', level: 'ok' }, { title: 'Дашборды', tag: 'ok', level: 'ok' }, { title: 'UI-kit', tag: 'ok', level: 'ok' }] }] }] });

  add('Композиции', 'timeline-day', 'Хронология: расписание дня', 'Прошло / сейчас / впереди', ['расписан', 'хронолог', 'timeline', 'план дня', 'день'], {
    title: 'Ваш день', blocks: [{ type: 'timeline', items: [
      { time: '08:00', title: 'Утренняя сводка', text: 'Погода и почта', status: 'ok' }, { time: '11:00', title: 'Созвон с командой', text: 'Zoom, 30 минут', status: 'ok' },
      { time: '14:30', title: 'Работа над ассистентом', text: 'Фокус-блок без уведомлений', status: 'now' }, { time: '17:00', title: 'Спортзал', status: 'todo' }, { time: '21:00', title: 'Отчёт за день', text: 'Джарвис подготовит сам', status: 'todo' }] }] });

  add('Композиции', 'steps-agent', 'Прогресс работы агента', 'Шаги, полоски и лог', ['шаг', 'прогресс', 'выполнен', 'ход работ'], {
    title: 'Агент работает…', blocks: [
      { type: 'steps', items: [{ label: 'Читаю задачу', status: 'done' }, { label: 'Ищу источники', text: 'найдено 8 из 12', status: 'run' }, { label: 'Анализирую данные', status: 'wait' }, { label: 'Строю визуализацию', status: 'wait' }] },
      { type: 'progress', items: [{ label: 'Загрузка источников', value: 8, max: 12, text: '8 / 12' }, { label: 'Общий прогресс', value: 35 }] },
      { type: 'code', lang: 'log', text: '[14:02:11] открываю https://example.com/data.csv\n[14:02:13] скачано 2.4 МБ\n[14:02:14] разбор CSV: 18 420 строк\n[14:02:15] ищу следующий источник…' },
      { type: 'buttons', items: [{ label: 'Остановить', say: 'Остановить агента', variant: 'danger' }, { label: 'Свернуть', say: 'Продолжай в фоне', variant: 'ghost' }] }] });

  add('Композиции', 'alerts-status', 'Статусы, бейджи и кнопки', 'Все варианты плашек и меток', ['плашк', 'алерт', 'alert', 'бейдж', 'уведомлен'], {
    title: 'Системные сообщения', blocks: [
      { type: 'alert', level: 'ok', title: 'Готово', text: 'Резервная копия создана.' }, { type: 'alert', level: 'info', title: 'Информация', text: 'Доступна новая версия **1.4**.' },
      { type: 'alert', level: 'warn', title: 'Внимание', text: 'Заканчивается место на диске.' }, { type: 'alert', level: 'err', title: 'Ошибка', text: 'Не удалось подключиться к календарю.' },
      { type: 'badges', items: [{ text: 'online', variant: 'ok' }, { text: 'idle', variant: 'warn' }, { text: 'offline', variant: 'err' }, { text: 'beta', variant: 'info' }, { text: 'архив', variant: 'muted' }, 'без варианта'] },
      { type: 'buttons', items: [{ label: 'Основная', say: 'Основная кнопка' }, { label: 'Тихая', say: 'Тихая кнопка', variant: 'ghost' }, { label: 'Ок', say: 'Подтверждаю', variant: 'ok' }, { label: 'Опасная', say: 'Удалить', variant: 'danger' }, { label: 'Ссылка ↗', href: 'https://example.com' }] }] });

  add('Композиции', 'tabs-views', 'Вкладки: один набор данных', 'График / таблица / сырые данные', ['вкладк', 'tabs', 'представлен'], {
    title: 'Температура за неделю', blocks: [{ type: 'tabs', tabs: [
      { label: 'График', blocks: [{ type: 'chart', kind: 'line', smooth: true, unit: '°C', labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], series: [{ name: 'Днём', data: [12, 14, 11, 9, 13, 16, 15] }, { name: 'Ночью', data: [5, 6, 4, 2, 5, 8, 7] }] }] },
      { label: 'Таблица', blocks: [{ type: 'table', columns: ['День', { key: 'Днём', type: 'number', unit: '°C' }, { key: 'Ночью', type: 'number', unit: '°C' }], rows: [['Пн', 12, 5], ['Вт', 14, 6], ['Ср', 11, 4], ['Чт', 9, 2], ['Пт', 13, 5], ['Сб', 16, 8], ['Вс', 15, 7]] }] },
      { label: 'JSON', blocks: [{ type: 'code', lang: 'json', text: '{\n  "labels": ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],\n  "day":   [12,14,11,9,13,16,15],\n  "night": [5,6,4,2,5,8,7]\n}' }] }] }] });

  add('Композиции', 'kv-profile', 'Карточка устройства', 'Пары ключ-значение + прогресс + список', ['карточк', 'профиль', 'устройств', 'информац'], {
    blocks: [{ type: 'grid', cols: 2, blocks: [
      { type: 'card', title: 'MacBook Pro', subtitle: 'этот компьютер', blocks: [{ type: 'kv', items: [['Система', 'macOS 15'], ['Процессор', 'Apple M3 Pro'], ['Память', '18 ГБ'], ['Аптайм', '3 дня 4 часа'], ['Сеть', 'Wi-Fi · 480 Мбит/с']] }, { type: 'badges', items: [{ text: 'online', variant: 'ok' }, { text: 'зарядка', variant: 'info' }] }] },
      { type: 'card', title: 'Ресурсы', blocks: [{ type: 'progress', items: [{ label: 'Диск', value: 412, max: 512, text: '412 / 512 ГБ' }, { label: 'Память', value: 11.4, max: 18, text: '11.4 / 18 ГБ' }, { label: 'Батарея', value: 82 }] }] }] }] });

  add('Композиции', 'list-actions', 'Список с действиями', 'Клик по строке отправляет команду', ['список', 'меню', 'выбор', 'действи'], {
    title: 'Что сделать?', blocks: [{ type: 'list', items: [
      { icon: '☁', title: 'Погода на завтра', sub: 'Прогноз по вашему городу', say: 'Какая погода завтра?' }, { icon: '📅', title: 'События на сегодня', sub: '2 встречи', badge: 'скоро', badgeLevel: 'warn', say: 'Что у меня в календаре?' },
      { icon: '✉', title: 'Непрочитанная почта', sub: '3 новых письма', badge: '3', say: 'Открой почту' }, { icon: '💡', title: 'Выключить весь свет', sub: 'Умный дом', say: 'Выключи свет' }] }] });

  add('Композиции', 'faq-details', 'FAQ: раскрывающиеся блоки', 'details с markdown внутри', ['faq', 'вопрос', 'раскрыв', 'справка'], {
    title: 'Частые вопросы', blocks: [
      { type: 'details', summary: 'Как добавить своё окно?', open: true, blocks: [{ type: 'md', text: 'Нажмите **＋ Окно** в верхней панели и выберите тип. Окно можно:\n- перетаскивать за заголовок\n- растягивать за угол\n- сворачивать в нижнюю панель' }] },
      { type: 'details', summary: 'Как агенту показать график?', blocks: [{ type: 'md', text: 'Модель возвращает кодовый блок с языком `jv` и JSON внутри. Полный формат — в окне **Справочник UI**.' }] },
      { type: 'details', summary: 'Где хранятся данные?', blocks: [{ type: 'alert', level: 'info', text: 'Всё сохраняется локально в `localStorage` вашего браузера.' }] }] });

  add('Композиции', 'html-custom', 'Свободная вёрстка (HTML + jv-классы)', 'Блок html: своя разметка, data-say для клика', ['html', 'вёрстк', 'верстк', 'свой дизайн'], {
    title: 'Произвольный HTML', blocks: [{ type: 'html', html:
`<div class="jv-grid" data-cols="3" style="--cols:3">
  <div class="jv-card" style="text-align:center">
    <div style="font-size:30px">🌤</div><div class="jv-stat-v">+12°</div><div class="jv-hint">Облачно</div>
  </div>
  <div class="jv-card" style="text-align:center">
    <div style="font-size:30px">💧</div><div class="jv-stat-v">64%</div><div class="jv-hint">Влажность</div>
  </div>
  <div class="jv-card" style="text-align:center">
    <div style="font-size:30px">🌬</div><div class="jv-stat-v">4 м/с</div><div class="jv-hint">Ветер</div>
  </div>
</div>
<div class="jv-alert jv-ok"><b>Совет</b>Погода хорошая — самое время прогуляться.</div>
<div class="jv-progress"><i style="width:72%"></i></div>
<div class="jv-btns"><button class="jv-btn" data-say="Какая погода завтра?">Завтра</button><button class="jv-btn jv-ghost" data-say="Покажи прогноз на неделю">Неделя</button></div>
<script>alert('это будет вырезано санитайзером')</script>` }] });

  add('Композиции', 'compare-table-chart', 'Сравнение: таблица + график', 'Агент сравнил тарифы', ['сравн', 'тариф', 'выбор лучш'], {
    title: 'Сравнение тарифов', blocks: [
      { type: 'md', text: 'Нашёл **4** подходящих тарифа. Лучшее соотношение цена/объём — «Макс».' },
      { type: 'table', columns: ['Тариф', { key: 'Цена', type: 'money' }, { key: 'ГБ', type: 'number' }, { key: 'Минут', type: 'number' }, { key: 'Оценка', type: 'bar', max: 10 }], rows: [['Лайт', 350, 10, 300, 5.5], ['Стандарт', 550, 30, 600, 7.2], ['Макс', 790, 80, 1200, 9.1], ['Безлимит', 1190, 500, 3000, 8.0]] },
      { type: 'chart', kind: 'hbar', title: 'Цена за 1 ГБ, ₽', unit: '₽', data: [{ label: 'Лайт', value: 35 }, { label: 'Стандарт', value: 18.3 }, { label: 'Макс', value: 9.9 }, { label: 'Безлимит', value: 2.4 }] },
      { type: 'buttons', items: [{ label: 'Оформить «Макс»', say: 'Подключить тариф Макс', variant: 'ok' }, { label: 'Сравнить ещё', say: 'Покажи другие тарифы', variant: 'ghost' }] }] });

  /* ═══════════ МЕДИА ═══════════ */
  // картинки-заглушки в виде data:image/svg+xml — работают офлайн
  const pic = (t, a, b) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="420" fill="url(#g)"/><circle cx="520" cy="90" r="46" fill="rgba(255,255,255,.3)"/><path d="M0 420 L170 230 L290 340 L420 190 L640 420Z" fill="rgba(0,0,0,.28)"/><text x="32" y="372" font-family="sans-serif" font-size="36" font-weight="700" fill="#fff">${t}</text></svg>`);

  add('Медиа', 'media-images', 'Картинки: фото и галерея', 'Одиночная картинка, галерея, клик — на весь экран', ['картинк', 'изображен', 'фото', 'снимк', 'image'], {
    title: 'Картинки', blocks: [
      { type: 'md', text: 'Нашёл подходящие изображения. **Нажмите на любое**, чтобы открыть на весь экран (стрелки ← → листают галерею).' },
      { type: 'image', src: pic('Закат над горами', '#ff8a1f', '#7a2cff'), alt: 'Закат', width: 460, caption: 'Одиночная картинка с подписью' },
      { type: 'gallery', cols: 3, ratio: '4:3', items: [
        { src: pic('Горы', '#00d4ff', '#0a3d91'), caption: 'Горы' }, { src: pic('Лес', '#3dffa8', '#0b6b4a'), caption: 'Лес' }, { src: pic('Город', '#a78bfa', '#2a1b6e'), caption: 'Город' },
        { src: pic('Море', '#4d8dff', '#00a3b8'), caption: 'Море' }, { src: pic('Пустыня', '#ffd23f', '#c2570a'), caption: 'Пустыня' }, { src: pic('Ночь', '#1b2a52', '#05060f'), caption: 'Ночь' }] },
      { type: 'md', text: 'Картинки работают и прямо в markdown:\n\n![Мини-превью](' + pic('Markdown', '#ff6ba6', '#5b1aa8') + ')' }] });

  add('Медиа', 'media-photos', 'Фото из интернета', 'Внешние https-картинки (нужен интернет), заглушка при ошибке', ['picsum', 'фото из сети', 'фотографии'], {
    title: 'Подборка фото', blocks: [
      { type: 'alert', level: 'info', title: 'Внешние картинки', text: 'Загружаются с `picsum.photos`. Если ссылка не открылась — интерфейс покажет заглушку.' },
      { type: 'gallery', cols: 3, ratio: '3:2', items: [1, 2, 3, 4, 5, 6].map(n => ({ src: `https://picsum.photos/seed/jarvis${n}/600/400`, caption: 'Фото ' + n })) },
      { type: 'gallery', cols: 2, ratio: '16:9', items: [{ src: 'https://example.invalid/missing.jpg', caption: 'Битая ссылка' }, { src: 'javascript:alert(1)', caption: 'Опасная ссылка' }] }] });

  add('Медиа', 'media-research', 'Агент нашёл видео: подборка', 'Два ролика YouTube + источники + карточки ссылок', ['найди видео', 'подборк', 'видеообзор', 'обзор видео'], {
    title: 'Подборка по запросу «как устроен Big Buck Bunny»', blocks: [
      { type: 'steps', items: [{ label: 'Поиск по YouTube', text: 'найдено 2 ролика', status: 'done' }, { label: 'Проверка доступности встраивания', status: 'done' }, { label: 'Сбор источников', status: 'done' }] },
      { type: 'grid', cols: 2, blocks: [
        { type: 'youtube', id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny — полная версия', caption: '10 мин · Blender Foundation' },
        { type: 'youtube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', title: 'Me at the zoo — первое видео на YouTube', caption: '19 сек' }] },
      { type: 'table', compact: true, title: 'Источники', columns: ['Ролик', { key: 'Канал', type: 'text' }, { key: 'Длина', align: 'center' }, { key: 'Оценка', type: 'bar', max: 10 }], rows: [['Big Buck Bunny', 'Blender', '10:34', 9.2], ['Me at the zoo', 'jawed', '0:19', 7.8]] },
      { type: 'link', url: 'https://peach.blender.org/', title: 'Project Peach — страница фильма', text: 'История создания, исходники и материалы проекта.', site: 'blender.org', image: pic('Peach', '#3dffa8', '#0b6b4a') },
      { type: 'buttons', items: [{ label: 'Ещё подобных', say: 'Найди ещё видео', variant: 'ghost' }, { label: 'Сохранить в заметки', say: 'запиши: подборка видео про Big Buck Bunny' }] }] });

  add('Медиа', 'media-youtube', 'YouTube-плеер', 'Видео по id или ссылке, старт с секунды', ['youtube', 'ютуб', 'ролик'], {
    title: 'Видео', blocks: [
      { type: 'youtube', id: 'jNQXAC9IVRw', title: 'Me at the zoo', start: 0, caption: 'Нажмите на превью — плеер загрузится. Ссылка «Открыть на YouTube» — если встраивание отключено автором.' },
      { type: 'md', text: 'Принимаются любые варианты ссылок: `youtu.be/ID`, `youtube.com/watch?v=ID&t=30`, `/shorts/ID`, или просто 11-символьный **id**.' },
      { type: 'buttons', items: [{ label: 'Что ещё посмотреть?', say: 'Найди видео' }, { label: 'Другое видео', say: 'Покажи видео' }] }] });

  add('Медиа', 'media-video', 'Видеофайл и аудио', 'Нативные плееры mp4 и mp3', ['видео', 'mp4', 'аудио', 'плеер', 'звук'], {
    title: 'Плееры', blocks: [
      { type: 'video', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', title: 'Видео (mp4)', caption: 'Файл по прямой ссылке. Поддерживаются mp4 и webm.', loop: true, muted: true },
      { type: 'audio', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', title: 'Аудио (mp3)' },
      { type: 'alert', level: 'info', text: 'Локальные файлы можно класть рядом и указывать относительный путь: `"src": "media/clip.mp4"`.' }] });

  add('Медиа', 'media-links', 'Карточки ссылок', 'Превью статей с картинкой', ['ссылк', 'статьи', 'статья', 'источник'], {
    title: 'Нашёл по теме «голосовые ассистенты»', blocks: [
      { type: 'badges', items: [{ text: '3 источника', variant: 'info' }, { text: 'свежее', variant: 'ok' }] },
      { type: 'link', url: 'https://developer.mozilla.org/docs/Web/API/Web_Speech_API', title: 'Web Speech API — MDN', text: 'Распознавание и синтез речи прямо в браузере.', site: 'developer.mozilla.org', image: pic('Speech', '#00d4ff', '#0a3d91') },
      { type: 'link', url: 'https://developer.mozilla.org/docs/Web/HTML/Element/video', title: 'Элемент <video>', text: 'Встраивание видео: форматы, субтитры, атрибуты.', site: 'developer.mozilla.org', image: pic('Video', '#ff6ba6', '#5b1aa8') },
      { type: 'link', url: 'https://example.com/no-image', title: 'Ссылка без картинки', text: 'Если image не задан, карточка просто компактнее.' }] });

  add('Медиа', 'media-embed', 'Карта и встраивания', 'OpenStreetMap + проверка запрещённых адресов', ['на карте', 'покажи карту', 'openstreetmap', 'embed', 'spotify', 'vimeo', 'маршрут'], {
    title: 'Карта', blocks: [
      { type: 'embed', title: 'Москва, центр', url: 'https://www.openstreetmap.org/export/embed.html?bbox=37.55%2C55.73%2C37.68%2C55.78&layer=mapnik', ratio: '16:9', caption: 'OpenStreetMap' },
      { type: 'details', summary: 'Что будет с запрещённым адресом?', blocks: [{ type: 'embed', url: 'https://evil.example.com/page' }, { type: 'md', text: 'Встраиваются только проверенные https-сервисы: **YouTube, Vimeo, RuTube, VK Video, Spotify, SoundCloud, OpenStreetMap, Google Maps**. Для остального — блок `link`.' }] }] });

  window.JV.examples = EX;
})();
