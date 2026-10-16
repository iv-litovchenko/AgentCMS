---
awn-name: Идеи · компоненты
awn-emoji: ""
awn-status: open
awn-description: "Черновик онтологии My Graph ORM"
awn-tags:
  - docs
  - ideas
awn-type: awn.content.record
awn-create: "2026-06-29T12:00:00.000Z"
awn-update: "2026-08-01T17:53:00.000Z"
awn-version: 1
awn-preview: ""
awn-web-url: ""
awn-attachments: []
---

# Идеи · компоненты системы

Черновик онтологии **My Graph ORM** — сюда складываем идеи, пока документация строится как **компоненты**, а не как «ноды».

> Исходник: `public/_storage/components-ideas.md` · кнопка **💡** в шапке Agent CMS.

---

## Дерево уровней

```
My Graph ORM                    ← продукт / мета-модель
└── Workspace (Агент)           ← мир на диске
    └── Space (Пространство)    ← /Focus, /Knowledge …
        └── Topic (Тема)        ← хаб с паспортом (*.md)
            ├── Element (Пункт) ← запись в content/ (Гарри_Поттер.md)
            ├── Resources       ← media/, inbox/, artifacts/ …
            ├── Relations       ← связи между Topic и Element
            └── Thread          ← лог последнего общения
```

**Component** — абстракция «любая часть графа» (в коде и архитектуре, не в UI).

---

## Таблица ролей

| Уровень | RU | EN | Пример |
|---------|-----|-----|--------|
| 0 | Агент / мир | `workspace` | Agent 1 |
| 1 | Пространство | `space` | Коллекции, Финансы |
| 2 | Тема | `topic` | Фильмы, Гитара |
| 3 | Пункт | `element` | Гарри Поттер, Расход_1 |
| — | Ресурсы | `resources` | обложка, inbox |
| — | Связи | `relations` | → другой Topic |
| — | Тред | `thread` | последний диалог |

---

## Эталон

```
Workspace → Space «Коллекции» → Topic «Фильмы» → Element «Гарри Поттер»
  → Resource: cover.jpg
  → Relation: → Topic «Книги»
  → Thread: обсуждение 28.05
```

---

## Смысл

- Это **сырьё и структура** для агента, не «мозг».
- **Мозг** — LLM, которая ориентируется в атласе (не «просто RAG»).
- Старое имя **нода** в UI уходит; на диске пока `_.node.md` — маппинг при миграции.

---

## Маппинг на Agent CMS (сейчас)

| Компонент | Сейчас в продукте |
|-----------|-------------------|
| Workspace | папка агента |
| Space + Topic | папка + `_.node.md` (слито) |
| Element | `_Storage/Content/*.md`, CSV, inbox-файлы |
| Resources | `_Storage/Assets`, `Inbox`, `Preview` … |
| Relations | граф, `[[wiki]]` |
| Thread | *планируется* |

---

## Идеи (добавляйте ниже)

### 2026-06-03

- Документация = компоненты; этот файл — живой журнал идей.
- UI: кнопка 💡 в шапке после **MD**.
- Целевой путь: `public/examples/ui-variant-14/VISION.md` (и соседние `public/examples/ui-variant-*/VISION.md`) для стабильной версии; `public/_storage/components-ideas.md` — быстрый черновик в приложении.
- Картинки для окна **💡**: кладите в `public/_storage/images/` — внизу модалки выводятся на всю ширину (`width: 100%`).

<!-- Добавляйте новые идеи секциями ### дата или ### тема -->

---

## Todo

- [ ] **Варианты визуальных Markdown-редакторов** (оценить для режима WYSIWYG / Edit):
  - [Vditor](https://github.com/Vanessa219/vditor) — WYSIWYG, instant rendering (Typora-like), split view; MIT
  - [Cherry Markdown](https://tencent.github.io/cherry-markdown/examples/index.html) — [демо](https://tencent.github.io/cherry-markdown/examples/index.html), [репозиторий](https://github.com/Tencent/cherry-markdown)
  - Сейчас в проекте: **Toast UI Editor** (`@toast-ui/editor`) — WYSIWYG временно отключён в UI
- [ ] **Где ещё остались упоминания термина «нода»** — UI, API/docs, MCP, user-docs, код (`node`, `NODE_*`), комментарии; сверить с целевой онтологией (Topic / Element / Component).
- [ ] **Какие миграции ещё остались** — `_.node.md` → `_.x.md`, слоты `_Storage`, legacy preview/paths, named-slots-v2, данные в `_Storage/_/` после старых миграций; зафиксировать чеклист и порядок.
- [ ] **ЧПУ (URL) и имена на диске** — сейчас сегменты ссылки = кириллические папки (`encodeURIComponent` → `%D0%...`). Имеет ли смысл slug латиницей в путях + `title`/`slug` в frontmatter `_.node.md`; роутинг и меню по slug, миграция старых путей и deep link’ов.

