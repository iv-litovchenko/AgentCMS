# Функция работы с файлами

**Глобальные документы:** [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md) · [GLOBAL-SKILL-2-RESPONSE-STYLE.md](GLOBAL-SKILL-2-RESPONSE-STYLE.md) · [GLOBAL-SKILL-3-RULES.md](GLOBAL-SKILL-3-RULES.md) · [GLOBAL-SKILL-4-MARKDOWN.md](GLOBAL-SKILL-4-MARKDOWN.md) · [README.md](README.md) · [TODO.md](TODO.md)


1.1 ✅ Записать часть файла переписать заменить все же надо поменять потому что это ахтунг записывать весь файл целиком 
    - Сделано: `write_content` `mode` = `patch` | `replace_lines` | `insert` | `append` | `prepend` | `replace` (см. раздел ниже).

1.2 Сделать запись файла по md5 если изменилось содержимое файла кто то поменял модели нужно заново загрузить и запиьс будет отклонена
    - ✅ Сделано: `read_content` отдаёт `hash` (`md5:…` всего файла); `write_content` принимает `expectedHash` и при несовпадении отказывает с `conflict` + `currentHash`. Обязателен для `replace_lines` / `insert`. Ограничение: проверка в MCP перед записью, не атомарно на сервере.

1.3 ❌ Придумать понятный наобр инструментов

1.4 ✅ КОгда мы читаем файл с середены например будет разрыв из за блоков кода или цитат ``` ``` - инетересно можно ли что то сделать придумать что бы это обойти
    - Сделано для блоков ``` / ~~~: окно чтения расширяется до открытия/закрытия блока (до 100 строк), в ответе `codeFence` (`expandedBefore`, `expandedAfter`, `startsInside`, `endsInside`). Цитаты `>` не обрабатываются.

1.5 ✅ По умолчанию всегда читается содержимое файла не более какого-то кол-ва строк
    - Сделано: `read_content` part=body — по умолчанию 300 строк тела, `limitLines` до 500, `full: true` — всё тело (обязательно перед `write_content` replace).

## ✅ Реализовано: чтение content (`read_content`)

- Только `read_content` (part=body и body внутри part=all → `bodyWindow`); новых MCP-методов нет.
- Placement: page / channel / media / root. Internal-слоты и `main-single-csv` — по-прежнему целиком; `format: base64` и `offsetBytes` — как раньше.
- `startLine` / `limitLines` — номера строк **файла с frontmatter**, совпадают с `startLine` в `search_workspace_*` (fulltext и semantic). Если `startLine` внутри frontmatter — читается с начала тела.
- Ответ: `startLine`, `endLine`, `totalLines`, `bodyStartLine` (.md), `hasMore`, `truncated`, `nextStartLine`, `hash`, `codeFence`.
- Код: `mcp-server/lib/content-read-window.js`, `readContentBody` в `content-core.js`, схема в `content-tools.js`; описание в [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md).
- Не сделано из `read_universal`: чтение по доле файла (percent) и по якорю.
- Схема параметров публикуется в MCP; неизвестные параметры → ошибка; `kind: topic` = `page`; `ref` без `.md` → повтор с `.md` (`refResolved`).

## ✅ Реализовано: запись content (`write_content`, part=body)

- Только `write_content`, новых MCP-методов нет. Placement тот же, что у `read_content`.
- `mode`: `replace` (default) · `append` · `prepend` · `patch` (`oldString` → `newString`, уникально или `replaceAll`) · `replace_lines` (`startLine`..`endLine`, `content: ""` = удалить) · `insert` (`afterLine` | `beforeLine`).
- Номера строк — как в `read_content` и поиске; frontmatter через body не меняется (ошибка → `part=properties`).
- `expectedHash` → `conflict` при несовпадении; обязателен для `replace_lines` / `insert`. Ответ: изменённые `startLine`/`endLine`, `totalLines`, `previousHash`, `hash` (перечитан после записи).
- Сохраняются переводы строк файла (`\r\n`). Root: `replace`/`append`/`prepend` создают файл, если его нет.
- Код: `mcp-server/lib/content-write-edit.js`, `writeContentBody` в `content-core.js`, схема в `content-tools.js`.
- Не сделано: вставка по якорю/заголовку, режимы по байтам, `truncate`, stream; `expectedHash` для `part=properties`; атомарная проверка hash на сервере.

```
Запись в файл
│
├── Целиком
│   ├── ✅ replace      — перезаписать файл (или тело без метаданных)
│   └── ❌ create       — создать, если нет (иначе ошибка / upsert) — только root через replace/append/prepend
│
├── К краям
│   ├── ✅ append       — дописать в конец
│   └── ✅ prepend      — вставить в начало
│
├── Вставка в середину
│   ├── ❌ by offset    — байт/символ N
│   ├── ✅ by line      — после/до строки N (insert afterLine / beforeLine)
│   └── ❌ by anchor    — после маркера (заголовок, метка, regex)
│
├── Локальная замена
│   ├── ✅ patch        — найти фрагмент → заменить (1× или все)
│   ├── ✅ patch_lines  — заменить диапазон строк (replace_lines)
│   └── ❌ patch_range  — заменить диапазон байт
│
├── Структурная (не «сырой текст»)
│   ├── ✅ merge        — слить JSON/YAML/frontmatter по ключам (part=properties)
│   ├── ✅ delete_range — вырезать участок — только строки (replace_lines + content: "")
│   └── ❌ truncate     — обрезать до длины / до маркера
│
├── Поток / транзакция
│   ├── ❌ stream       — писать порциями (chunk)
│   └── ❌ atomic       — temp + rename (всё или ничего)
│
└── Ограничения доступа
    ├── ✅ exclusive lock / version check  — не писать при конфликте (expectedHash, проверка в MCP, не атомарно)
    └── ✅ read-modify-write               — прочитал → изменил → записал (дорого)

Cursor-агент
│
├── Write
│   └── целиком создать / перезаписать файл (full replace)
│
├── StrReplace (search_replace)
│   ├── old_string → new_string (точное совпадение)
│   └── replace_all — одно или все вхождения
│
└── Read
    └── offset + limit — читать кусок, не весь файл
```


```
read_universal (путь | path + slot + ref)
│
├── ✅ целиком                    — весь файл или только тело .md (без YAML) (full: true)
├── ✅ по строкам                 — startLine + limitLines
├── ✅ по байтам                  — offsetBytes + maxBytes
├── ❌ по доле файла              — fromPercent … toPercent (или «первая/вторая половина»)
├── ❌ по якорю                   — от заголовка / маркера
└── ❌ только мета (опционально)  — размер, hash, число строк — без текста

write_universal (путь | path + slot + ref)
│
├── слой
│   ├── ✅ произвольный путь      — как read_file / write_file (placement root)
│   ├── ✅ запись в слоте         — YAML frontmatter не трогаем, режимы для тела
│   └── ✅ manifest страницы      — то же для manifest.md
│
├── ❌ если файла нет               — ошибка | создать | upsert — явного режима нет, создаёт только root
│
├── ✅ replace                      — перезаписать целиком (файл или тело)
├── ✅ append / prepend             — дописать в конец / в начало
│
├── insert (в середину)
│   ├── ✅ по номеру строки       — после / до строки N
│   ├── ❌ по байтам              — с позиции N
│   └── ❌ по якорю               — после/до заголовка, строки, regex
│
├── ✅ patch                        — old_string → new_string (один раз или replace_all)
├── ✅ patch_lines                  — заменить диапазон строк (replace_lines)
├── ❌ patch_bytes                  — заменить диапазон байт
│
├── ✅ merge                        — только свойства (YAML/JSON), не текст тела (part=properties)
├── ❌ delete_range                 — вырезать участок (строки / байты / якорь) — есть только строки через replace_lines
├── ❌ truncate                     — обрезать до длины или маркера
│
├── безопасность
│   ├── ✅ expectedHash / awn-version — не писать при конфликте (только body; ❌ для properties; проверка в MCP)
│   └── ❌ atomic                     — temp + rename на сервере
│
└── ✅ ответ                        — ok, режим, новый hash, conflict (❌ «сколько записано»)

─── отдельно, не в «универсал» ───
│   create_content / create_page   — тип, слот, схема
│   write_content_properties       — правка frontmatter (уже есть)
│   старый patch_file              — по сути mode: patch + path
```