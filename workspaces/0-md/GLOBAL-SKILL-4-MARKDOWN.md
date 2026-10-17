---
name: agent-cms-markdown
description: Какую markdown-разметку использовать при записи md-файлов в Agent CMS — маркер ==текст==, GitHub Alerts, Mermaid, чеклисты, wikilinks, блоки awn-marker-*, картинки из awn-storage. Применяй, когда пишешь или правишь тело md-файла (заметка, тема, запись, комментарий) и хочешь оформить текст.
---

# Markdown в Agent CMS

Preview — markdown-it, `breaks: true`: одиночный перенос строки в исходнике даёт `<br>`. Пустая строка между абзацами по-прежнему нужна; лишние пустые строки для «воздуха» не ставь. Пиши обычный markdown; ниже — расширения платформы. Кнопка **MD** у человека открывает этот файл.

| Что | Синтаксис |
|-----|-----------|
| Маркер | `==текст==` (жёлтый), `=={red}текст==`; цвета: `red` `green` `blue` `gray` `orange` `purple`; HTML-эквивалент `<mark class="md-highlight md-highlight--blue">` (обычный `<mark>` — жёлтый) |
| Alert | `> [!NOTE]` · `TIP` · `IMPORTANT` · `WARNING` · `CAUTION`; свой заголовок: `> [!WARNING] Внимание` |
| Краткое описание | `> [!AWN-DESC] Текст для превью.` → пустая строка → `---` → полный текст ниже |
| Диаграмма | блок ` ```mermaid `: `flowchart`, `sequenceDiagram`, `gantt`, `classDiagram`, `erDiagram`, `stateDiagram`, `pie`, `mindmap`; в WYSIWYG остаётся текстом |
| Таблица по DQL | блок ` ```awn-query ` (или ` ```dataview `) с DQL внутри — см. скилл `agent-cms-search` |
| Чеклист | `- [ ]` / `- [x]` |
| Wikilink | `[[Нода]]`, `[[Путь/К ноде\|Подпись]]`, `[[Страница#Заголовок]]` |
| Картинка | `![alt](awn-storage/assets/pasted/файл.png)`; варианты оформления — раздел ниже |
| Таблица, цитата, код | стандартный GFM |
| HTML | включён (`html: true`), используй редко |

## Картинки и их оформление

Простая картинка: `![alt](awn-storage/assets/pasted/файл.png)`; вставка из редактора кладёт файл в `awn-storage/assets/pasted/`. Внешняя — `![alt](https://…)`.

Вариант оформления — HTML-обёртка `<div class="img-style-…">` вокруг одного или нескольких `<img>`:

| Класс | Поведение | Когда |
|-------|-----------|-------|
| `img-style-card` | `max-width: min(50%, 520px)`, `max-height: 360px`, `object-fit: contain` | один скрин, не раздувать блок |
| `img-style-clamp` | `max-width: clamp(180px, 45vw, 520px)` | адаптивная ширина; **используется в обзоре темы** |
| `img-style-figure` | `<figure>` + `<figcaption>` | вложения с подписями «Вложение 1, 2, 3…» |
| `img-style-grid` | сетка, `object-fit: cover` | несколько скринов подряд |
| `img-style-lightbox` | миниатюра (`max-height: 280px`), клик — оверлей | большие картинки |
| `img-style-overview` / `img-style-editor` | компактный обзор / полная ширина в редакторе | разные режимы показа |
| `img-style-auto` | по пропорциям: > 1.4 — `is-wide` (70%), иначе `is-compact` (240px) | смесь широких и узких |

```html
<div class="img-style-clamp">
<img src="awn-storage/assets/pasted/a.png" alt="Скрин 1">
<img src="awn-storage/assets/pasted/b.png" alt="Скрин 2">
</div>

<div class="img-style-figure">
<figure><img src="awn-storage/assets/pasted/a.png" alt="Вложение 1"><figcaption>Вложение 1 · подпись</figcaption></figure>
</div>
```

Нет указаний от человека — обычная `![]()` без обёртки.

**Не используй** `~~зачёркивание~~` — в preview не рендерится.

## Пометки `awn-marker-<type>`

Блок кода с языком `awn-marker-<type>`; в preview — цветная карточка, в других редакторах — обычный fenced block.

````markdown
```awn-marker-idea
awn-status: отложено
awn-create: 2026-09-27
приоритет: низкий
---
Текст пометки — обычный markdown.
```
````

````markdown
```awn-marker-question
awn-status: открыто
awn-repeat: 2026-10-15
---
Как отличить `awn-marker-term` от обычной цитаты?
```
````

- До `---` — мета `ключ: значение`, после — тело.
- `<type>`: `idea` · `important` · `note` · `todo` · `question` · `mistake` · `term` · `repeat` · `stiker` (короткая заметка-стикер).
- Мета: `awn-create`, `awn-update` (даты), `awn-status` (`открыто` / `закрыто` / `отложено`…), `awn-repeat` (дата пересмотра). Синонимы: `добавлено`, `обновлено`, `статус`, `повторить`. Свои поля — любые, не валидируются.
- Пометки — личные записи человека: сам не добавляй и не меняй, пока не попросили.
