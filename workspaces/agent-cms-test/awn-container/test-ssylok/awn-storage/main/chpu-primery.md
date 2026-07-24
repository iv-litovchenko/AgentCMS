---
awn-name: Примеры ЧПУ
awn-type: awn.content.record
awn-status: draft
awn-create: "2026-07-25T02:15:00.000Z"
awn-update: "2026-07-25T02:15:00.000Z"
awn-version: 1
awn-attachments: []
---

# Примеры ЧПУ (новая схема URL)

> **Статус:** черновик спецификации + эталонные ссылки для `agent-cms-test`.  
> **Формат:** `/{agent}/{workspace-path}` — без `.md`, без `/a/`, без `/v/`.  
> **Вид UI:** суффикс `@view` только когда нужен не редактор.

Базовый хост в примерах: `https://localhost:3000` (или ваш деплой).

---

## Грамматика (кратко)

```
/{agent}/{path...}           → редактирование ресурса (дефолт)
/{agent}/{path...}/          → папка / раздел (manifest или list)
/{agent}/{path...}@{view}    → другой UI (список, обзор, слот…)
```

**Резолвер** (на сервере) для `{path}` без `@`:

1. `{path}/manifest.md` — узел меню (workspace, area, topic, раздел)
2. `{path}.md` — markdown-запись
3. `{path}` с расширением — медиафайл / sidecar
4. `{path}/` — папка → list или manifest раздела

---

## 1. Агент и корень workspace

| Что открывается | Новый URL | Старый URL (legacy) |
|-----------------|-----------|---------------------|
| Home агента | `/agent-cms-test/` | `/a/agent-cms-test` |
| Manifest workspace (корень агента) | `/agent-cms-test/manifest` | `/a/agent-cms-test` + дерево |
| Область «Контейнер» | `/agent-cms-test/awn-container` | `/a/agent-cms-test/awn-container` |
| Служебный kit (область) | `/agent-cms-test/awn-agent-kit` | `/a/agent-cms-test/awn-agent-kit` |

---

## 2. Тема «Тест ссылок» — ресурсы (редактор по умолчанию)

| Ресурс | Workspace-path | Новый URL |
|--------|----------------|-----------|
| Тема (manifest) | `awn-container/test-ssylok` | `/agent-cms-test/awn-container/test-ssylok` |
| Main-тело темы | `awn-container/test-ssylok/main` | `/agent-cms-test/awn-container/test-ssylok/main` |
| **Эта страница** (запись main) | `awn-container/test-ssylok/awn-storage/main/chpu-primery` | `/agent-cms-test/awn-container/test-ssylok/awn-storage/main/chpu-primery` |
| Preview-картинка темы | `awn-container/test-ssylok/awn-storage/assets/preview/20260623203559` | `/agent-cms-test/awn-container/test-ssylok/awn-storage/assets/preview/20260623203559` |

---

## 3. Тема «Тест ссылок» — виды UI (`@view`)

Без `@` — редактор/manifest. С `@` — представление в интерфейсе.

| Вид | Новый URL | Примечание |
|-----|-----------|------------|
| Обзор темы | `/agent-cms-test/awn-container/test-ssylok@overview` | карточка / сводка |
| Навигация | `/agent-cms-test/awn-container/test-ssylok@navigation` | подтемы, слоты |
| Mindmap | `/agent-cms-test/awn-container/test-ssylok@mindmap` | карта тем |
| Inbox (список) | `/agent-cms-test/awn-container/test-ssylok@inbox` | слот inbox |
| Main (список) | `/agent-cms-test/awn-container/test-ssylok@main` | слот main |
| Note / быстрые | `/agent-cms-test/awn-container/test-ssylok@note` | quick-notes |
| References | `/agent-cms-test/awn-container/test-ssylok@references` | |
| Media (библиотека) | `/agent-cms-test/awn-container/test-ssylok@media` | дашборд медиа |
| External memory | `/agent-cms-test/awn-container/test-ssylok@external` | |
| Tabular | `/agent-cms-test/awn-container/test-ssylok@tabular` | таблица |
| Todo | `/agent-cms-test/awn-container/test-ssylok@todo` | |
| Thread (диалог) | `/agent-cms-test/awn-container/test-ssylok@thread` | |
| Configs | `/agent-cms-test/awn-container/test-ssylok@configs` | node-config |
| Env | `/agent-cms-test/awn-container/test-ssylok@env` | |
| Scripts | `/agent-cms-test/awn-container/test-ssylok@scripts` | |

---

## 4. Inbox в «Тест ссылок» (фикстуры этой темы)

| Ресурс | Новый URL | `@list` (таблица раздела) |
|--------|-----------|---------------------------|
| Inbox целиком | `@inbox` (см. выше) | — |
| Раздел «Демо-раздел» | `/agent-cms-test/awn-container/test-ssylok/awn-storage/inbox/demo-razdel` | `…/demo-razdel@list` |
| Запись «Первая запись» | `/agent-cms-test/awn-container/test-ssylok/awn-storage/inbox/demo-razdel/pervaya-zapis` | — |

Полные ссылки:

```
/agent-cms-test/awn-container/test-ssylok@inbox
/agent-cms-test/awn-container/test-ssylok/awn-storage/inbox/demo-razdel
/agent-cms-test/awn-container/test-ssylok/awn-storage/inbox/demo-razdel@list
/agent-cms-test/awn-container/test-ssylok/awn-storage/inbox/demo-razdel/pervaya-zapis
```

---

## 5. Соседние темы (тот же агент)

| Тема | Manifest (редактор) | Inbox-список |
|------|---------------------|--------------|
| Тест картинок | `/agent-cms-test/awn-container/test-kartinok` | `…/test-kartinok@inbox` |
| Тест файлов | `/agent-cms-test/awn-container/test-faylov` | `…/test-faylov@inbox` |
| PHP | `/agent-cms-test/awn-container/php` | `…/php@inbox` |

Пример записи в другой теме (main/test):

```
/agent-cms-test/awn-container/test-kartinok/awn-storage/main/test/test
```

Пример медиафайла:

```
/agent-cms-test/awn-container/test-kartinok/awn-storage/media/20260618173131
```

Sidecar к медиа (markdown-описание):

```
/agent-cms-test/awn-container/test-kartinok/awn-storage/media/20260618173131.sidecar
```

---

## 6. Cross-agent (другой workspace, тот же синтаксис)

Первый сегмент — **id агента** из registry (`awn-agents.json`).

| Агент | Пример URL | Комментарий |
|-------|------------|-------------|
| `agent-cms-test` | `/agent-cms-test/awn-container/test-ssylok` | этот workspace |
| `agent-cms-core` | `/agent-cms-core/manifest` | платформенные типы |
| `agent-english` | `/agent-english/manifest` | другой локальный агент |
| `agent-medcenter` | `/agent-medcenter/manifest` | если каталог подключён |

Ссылка **из** «Тест ссылок» **на** другой агент (markdown):

```markdown
[Agent CMS Core](/agent-cms-core/manifest)
[English agent home](/agent-english/)
```

Обратная ссылка на эту тему:

```markdown
[Тест ссылок](/agent-cms-test/awn-container/test-ssylok)
[Примеры ЧПУ](/agent-cms-test/awn-container/test-ssylok/awn-storage/main/chpu-primery)
```

---

## 7. Служебные файлы

| Ресурс | Новый URL | Legacy |
|--------|-----------|--------|
| `AGENTS.md` | `/agent-cms-test/AGENTS` | `/a/agent-cms-test/sys/AGENTS.md` |
| `TODO.md` | `/agent-cms-test/TODO` | sys-путь |
| Persona агента | `/agent-cms-test/awn-agent-kit/agent` | дерево kit |

---

## 8. Сравнение: legacy → новый (эта тема)

| Сценарий | Legacy | Новый |
|----------|--------|-------|
| Тема, описание | `/a/agent-cms-test/awn-container/test-ssylok` | `/agent-cms-test/awn-container/test-ssylok` |
| Inbox-список | `/a/.../test-ssylok/v/inbox` | `/agent-cms-test/awn-container/test-ssylok@inbox` |
| Запись inbox | `/a/.../v/inbox/f/demo-razdel/pervaya-zapis.md` | `/agent-cms-test/.../demo-razdel/pervaya-zapis` |
| Раздел inbox | `/a/.../v/inbox/s/demo-razdel` | `/agent-cms-test/.../demo-razdel` или `…@list` |
| Media dashboard | `/a/.../test-ssylok/v/media` | `/agent-cms-test/awn-container/test-ssylok@media` |
| Файл в media | `/a/.../v/media/f/20260618173131.png` | `/agent-cms-test/awn-container/test-kartinok/awn-storage/media/20260618173131` |

---

## 9. Правила для авторов ссылок

1. **Не пишите `.md`** в URL — резолвер добавит сам.
2. **`@` только для UI-режима**, не для «обычного» файла.
3. **Один `@` на URL** — после последнего логического сегмента пути темы/слота.
4. **Cross-agent:** всегда полный путь с `/agent-id/…`.
5. **Папка vs файл:** leaf без `/` → запись; каталог → manifest или `@list`.
6. **Пробелы и кириллица** — slug в пути (`test-ssylok`, не «Тест ссылок»).

---

## 10. Чеклист для реализации роутера

- [ ] SPA fallback: `/{agent}/…` → `index.html` (не только `/a/`)
- [ ] `GET /api/resolve?agent=&path=` → `{ kind, relPath, defaultView }`
- [ ] Парсинг `@view` в последнем сегменте
- [ ] Редиректы legacy `/a/…/v/…` → новый формат
- [ ] Markdown: автолинки `/agent/…` в preview

---

## Быстрые ссылки (копировать)

```text
/agent-cms-test/
/agent-cms-test/awn-container/test-ssylok
/agent-cms-test/awn-container/test-ssylok@inbox
/agent-cms-test/awn-container/test-ssylok/awn-storage/inbox/demo-razdel/pervaya-zapis
/agent-cms-test/awn-container/test-ssylok/awn-storage/main/chpu-primery
/agent-cms-test/awn-container/test-kartinok/awn-storage/media/20260618173131
/agent-cms-core/manifest
```
