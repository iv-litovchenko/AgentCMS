# Рефакторинг — часть 16 (Memory CMS: замечания после теста MCP)

😊😊😊😊 Пиши туда в самом начале

Memory CMS: замечания после теста MCP

Замечания из живого теста коннектора Memory CMS на maptex.ru, октябрь 2026.

## Срочно

1. ==✅== Файл .env попал в публичный репозиторий. Если там настоящие пароли и токены, их нужно сменить, а сам файл удалить из истории git (через git filter-repo или BFG), добавить в .gitignore и хранить вместо него .env.example. *Для нас: в git только схема; живые ключи пользователь задаёт сам — не критично, держим `.gitignore`.*
2. ==✅== Данные лежат в volume Докера, а не в обычной папке. Сначала сделать копию, потом переделать на bind mount вроде ./workspaces:/app/workspaces. Не запускать docker compose down -v. *В актуальном коде уже bind `./workspaces`; пункт про legacy VPS (maptex), не дефект репо.*
3. ==✅== Git не включён, резервных копий нет. *Git опционально (MCP `module_git_*`); снимок — **`agent-cms-cli backup_zzz`** / **`restore_zzz`** (WIP, доработать позже).*

## Система и MCP

1. ==✅== В корне хранилища нельзя создать или удалить файл через MCP: content_create и delete_content не работают для placement.kind=root. *Закрыто: **`content_create`** + `kind=root` + `path` (вариант B); **`content_delete`** + `path` — было в коде. Канон имён: `content_*`, не legacy `write_content`/`delete_content`.*
2. ==✅== SVG не записывается через content_write: система считает его бинарным, а не текстом. *`.svg` в WORKSPACE_*_TEXT_EXTENSIONS → **`content_write`**; после deploy — rebuild.*
3. ==✅== У topic_create в описании инструмента пустой список параметров, название пришлось угадывать. *`withAgentIdSchema` + `.refine()` → пустой JSON Schema; убрали refine, проверка в handler; то же для topic_update/rename, database_update, record_slug_generate.*
4. ==✅== При database_register описание не сохраняется, вместо него встаёт название инфоблока. *MCP: name ← displayName/title; manifest — description без подстановки name; awn-description. Старые store — database_update / вручную; deploy rebuild.*
5. ==✅== В каждом новом инфоблоке сама появляется лишняя «Первая запись». *По умолчанию sample off; `withSampleRecord: true` — demo «Первая запись».*
6. ==✅== record_url_get возвращает внутренний адрес Докера http://cms:3000/..., а не публичный maptex.ru. *`/api/agent/page-url` → `AGENT_CMS_PUBLIC_URL`; host `cms|mcp|control` не для ссылок. Mac: `http://127.0.0.1:3000`, VPS: `https://домен` в `.env`.*
7. ==✅== database_register возвращает всю схему, около 40 полей с переводами, и съедает много токенов. *MCP: slim-ответ (paths, preset, recordCount); полная схема — `database_get`. HTTP API для Control без изменений.*
8. ==✅== Загрузка файлов через base64: маленькие файлы проходят, большие фото ломаются. *MCP: лимит ~1 MiB на base64 (`assertMcpBinaryBase64UploadWithinLimit`); больше — `content_binary_upload_begin` → PUT → `complete`. Редактор HTTP без этого лимита.*

## Сервер и хранилища

1. ==✅== Три мёртвых хранилища (ws-focus, ws-medcenter, Downloads) ссылаются на папки с макбука, а ws-medcenter стоит хранилищем по умолчанию. *Операционка после миграции Mac→VPS; не баг продукта — пользователь чистит реестр / default в Control или MCP.*
2. ==✅== В корне шести новых хранилищ остались старые preview.svg, их нужно удалить вручную. *Не критично — косметика; можно оставить или удалить через `content_delete` / Finder при желании.*
3. ==✅== В описании 0-ws-test опечатка: «Описчание». *Данные: `manifest.md` + index/WS-MAP; history не трогали.*

## Скорость и токены

Запросы отрабатывали быстро, тормозили только тяжёлые ответы. Точное время каждого запроса стоит смотреть в логах сервера.

1. ==✅== Короткие ответы по умолчанию. При создании инфоблока возвращать только ID и «готово», полную схему отдавать отдельным запросом. *То же, что п.7 выше: MCP **`database_register`** — slim (`relPath`, preset, `hint`); схема — **`database_get`**.*
2. Пагинация. Списки отдавать порциями, например по 20 элементов, а не все сразу. *См. черновик **`contents_list`** ниже — не размазывать по `database_get` и пр.*
3. =={red}не актуально== Карта хранилища на старте. Один лёгкий запрос, после которого агент знает, что где лежит, и не делает лишних вызовов вслепую. *Уже есть: **`session_context_get`** → `wsMap`; отдельно **`nav_map_workspace_read`**. Остаётся дисциплина агента — вызывать в начале сессии.*

## Черновик: `contents_list` (пагинация + глубина)

Один канонический list-tool; сейчас разные бэкенды и «всё в кучу»:

- **`kind=root`** — уже есть **`depth`** (`1` / `2` / `all`); добавить **`limit` / `offset`** (или cursor) на FS-list.
- **`database` + `slot=data`** — `GET …/records`: flat **`records[]`** + **`tree`**, разделы (`isSection`) и записи вместе, без порций → **`limit`/`offset`**, опционально **`parent`** (только дети раздела).
- **topic/channel/repository + слоты** — `GET /api/storage/files`: **`files`** + **`folders`** + **`nonMarkdownFiles`** одним ответом → **`depth=1`** по умолчанию (только текущий уровень), пагинация; фильтр **`itemType=section|record|file`** или отдельные массивы в ответе.
- **media / channel files|assets** — те же **`limit`/`offset`**, без **`includeBody`** по умолчанию.

Идея: агент листает уровень за уровнем; **`nav_index_toc_*`** — обзор hub, **`contents_list`** — детальный обход с пагинатором.
