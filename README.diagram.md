# Карта идей и элементов системы (workspace)

```mermaid
flowchart TD
    CMS["🌐 Agent CMS"]
    WS["🏠 Workspace<br/>workspaceID<br/>WorkspaceSlug (key)"]

    CMS --> ACTORS["👤 Человек (чат UI)<br/>🤖 Агент (MCP)<br/>1+1"]
    ACTORS --> CMS_ENDPOINT["🌐 localhost:<port> · 🔌 MCP-server"]
    CMS_ENDPOINT --> WS
    WS --> TREE["📁 Дерево страниц<br/>Для изучения и анализа данных"]
    WS --> DATA["🗄️ Структурированные данные<br/>Для хранения структурированных данных"]
    WS --> REPOS["📦 Репозитории<br/>для размещения кода своих проектов"]
    WS --> EXTRA_DATA["📎 Дополнительные данные"]
    WS --> ANNOT_BRANCH["✍️ Аннотации<br/>(зависимые записи · satellites)"]
    WS --> CONSTRUCTOR["🏗️ Конструктор"]
    CONSTRUCTOR --> MD_MARKUP["📝 Маркдаун-разметка<br/>Структура · Текст · Списки<br/>Маркеры и пометки · Код и таблицы<br/>Визуализация (Mermaid) · Прочее"]
    MD_MARKUP --> RECORD_FIELDS["🏷️ Поля записей<br/>Текст (однострочный · многострочный) · Числа · Выбор<br/>Дата и время · Медиа · Структура<br/>Справочники · CMS / платформа"]
    WS --> UI["🖥️ Интерфейс"]
    WS --> AUX["⚙️ Вспомогательное"]
    WS --> TOOLS["🛠️ Инструменты"]
    WS --> WS_SERVICES["🛎️ Сервисы workspace"]
    WS --> IDEAS["💡 Идеи"]

    WS_SERVICES --> WS_DISCUSS["💬 Discuss · digest · summarization"]
    WS_DISCUSS --> WS_TRASH["🗑️ Корзина"]
    WS_TRASH --> WS_NOTIFY["🔔 Уведомления"]
    WS_NOTIFY --> WS_POMODORO["🍅 Помодоро"]
    WS_POMODORO --> WS_SCREENSAVER["💤 Заставка бездействия"]
    WS_SCREENSAVER --> WS_CONTEXT_REG["📋 Реестр контекста<br/>всегда в контексте · по расписанию · сердцебиение"]

    TOOLS --> SEARCH["🔍 Поиск"]
    SEARCH --> MODULES["📦 Модули"]
    MODULES --> AUX_JOURNAL["📓 Журнал"]

    UI --> UI_CONTROL["🚀 Agent CMS Controll (luncher)"]
    UI_CONTROL --> UI_EDITOR["✏️ Agent CMS Editor"]
    UI_EDITOR --> UI_VOICE["🎙️ Agent CMS Voice<br/>(Flow window)"]
    UI_VOICE --> UI_SIDEPANEL["🧩 Sidepanel в Google Chrome"]
    UI_SIDEPANEL --> UI_PANEL["🌐 Панелька в браузере"]
    UI_PANEL --> UI_MCP["🔌 MCP сервер"]

    IDEAS --> IDEA1["1. 🔀 Git-модуль<br/>синхронизация, LFS"]
    IDEA1 --> IDEA2["2. 🧊 UI на базе движка<br/>Сборка интерфейса на базе движка<br/>идеи для названия такого компонента<br/>в рамках системы:<br/>VOXELS<br/>VERTECX<br/>VEXEL<br/>ELEXIR"]
    IDEA2 --> IDEA3["3. ☁️ Выгрузка в облако<br/>Google Диск и Яндекс Диск"]
    IDEA3 --> IDEA4["4. 🌍 Синхронизация с удалённым сервером<br/>доступность хранилища 24/7"]
    IDEA4 --> IDEA5["5. 📊 Дашборды<br/>гибкие управляемые дашборды"]
    IDEA5 --> IDEA6["6. 🔁 Пайплайн<br/>расширить статусы записей через пайплайны<br/>(последовательность шагов)<br/>либо дополнить статусы отдельным полем<br/>базовые статусы: открыто · закрыто · архив"]
    IDEA6 --> IDEA7["7. 🔐 Права доступа и роли"]

    TREE --> SHARED_AREA["🤝 Область общие<br/>awn-shared"]
    TREE --> CONTENT_AREA["📂 Область контента<br/>awn-container"]
    TREE --> AGENT_AREA["🤖 Область агента<br/>awn-agent-kit"]

    CONTENT_AREA --> C_AREA["🗺️ Область"]
    C_AREA --> C_TOPIC["📌 Тема"]
    C_TOPIC --> C_SLOT["📑 Слот<br/>Многофайловая · Однофайловая · Табличная<br/>Входящие · Заметки · Источники<br/>Артефакты · Активы · Медиа · Репозитории · Скрипты · Шаблоны · База · NotebookLM<br/>Очередь агента · TODO · Дорожная карта"]
    C_SLOT --> C_SECTION["📁 Раздел"]
    C_SECTION --> C_PAGE["📄 Запись"]

    SHARED_AREA --> SHARED_THEMES["⭐ Стандартные темы<br/>Входящие · Заметки · Источники · Артефакты · Скрипты · Медиа<br/>Загрузки из браузера · Автозагружаемый контекст"]

    AGENT_AREA --> AGENT_SVC["🛸 Агентские темы и ресурсы<br/>Агент · Пользователь · Пользователи · Правила агента<br/>Голос TTS · Голос STT · Устройства · Экзоскелет · Объекты мира<br/>Случайный анекдот — для экспериментов"]

    DATA --> IBLOCK["🧱 Инфоблок"]
    IBLOCK --> GROUP["📁 Группа"]
    IBLOCK --> COLLECTION["📚 Коллекция<br/>таксономии / справочники"]
    IBLOCK --> SINGLE["📌 Одиночка"]
    COLLECTION --> DATA_SECTION["📁 Раздел"]
    DATA_SECTION --> RECORD["📄 Запись"]

    EXTRA_DATA --> BOARD["📋 README.md · AGENTS.md · NOTE.md · TODO.md"]
    BOARD --> FACT_BANK["🧠 Банк фактов"]
    FACT_BANK --> GLOSSARY["📖 Глоссарий"]
    GLOSSARY --> EXTRA_DIALOGS["🗣️ Диалоги<br/>дискуссия"]

    ANNOT_BRANCH --> ANNOT_COMMENTS["💬 Комментарии"]
    ANNOT_COMMENTS --> ANNOT_SIDECAR["📎 Sidecar"]

    AUX --> AUX_TYPES["🏷️ Типы"]
    AUX_TYPES --> AUX_DEPS["🔗 Зависимости<br/>MCP · skills · tools · ПО на компьютере<br/>файл dependencies.csv"]
    AUX_DEPS --> SETTINGS["🎛️ Настройки, .env"]
    SETTINGS --> AUX_INDEXES["🗂️ Индексы<br/>страницы · контент · инфоблоки · репозитории"]
    AUX_INDEXES --> CLOUD_DISKS["☁️ Облачные диски<br/>Google · Яндекс"]

    click CMS href "https://agent-cms.ru/" "Открыть сайт Agent CMS"
```
