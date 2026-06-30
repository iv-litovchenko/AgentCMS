# Vault Atlas — карта входов хранилища

Два параллельных вида одной идеи:

| Файл | Как открыть |
|------|--------------|
| [[Vault-atlas.canvas|Vault-atlas.canvas]] | Режим **Canvas**: карточки файлов, стрелки, превью заметок |
| [[Vault-atlas.excalidraw.md|Vault-atlas.excalidraw.md]] | **Excalidraw view**: кнопки с wiki-ссылками |

## Что нарисовано

- Корень **Domains** (`Index`, `Categories`), оба домена **EnglishLearning** и **Collections** + их **Dashboards**.
- Все **`*.node.md` внутри `Domains/`** (сейчас 4 файла — сетка справа на canvas).
- Ключевые зоны: **Assistant.Ai** (Assistant, User, Area, Nodes, DeviceControl), **Inbox**, **Dashboards/Area**, **Example/Visualization**, **Tests**, **AwnFramework** + текст про **ideas**.

Остальные ~70+ нод лежат в `AwnFramework/ideas/` — на карте одна ссылка на [[AwnFramework/Area.node.md|AwnFramework Area]]; полный список: поиск по `*.node.md` или реестр [[AGENTS.NODES.md]].

## Canvas: ссылка «провалилась»

1. Для перехода в заметку лучше **карточка из файла** (перетащи `.md` из файлового списка или меню добавления **Note**), а не фигура «кубик» без привязки к файлу.
2. У **текстовой** карточки клик по `[[путь]]` открывает заметку; у **file**-карточки — клик по превью / заголовку.
3. Путь от **корня vault**, с слэшами: `Domains/EnglishLearning/Index.node.md`.

## Excalidraw

Открой [[Vault-atlas.excalidraw.md]] → **Excalidraw view** → **Cmd/Ctrl + клик** по тексту ссылки в кнопке (если обычный клик не срабатывает).

Пересборка (если менял структуру `Domains/`):

- `node tmp-excalidraw-gen/build-vault-canvas.js`
- `node tmp-excalidraw-gen/vault-atlas-excalidraw.js`
