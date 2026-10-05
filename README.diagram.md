# Карта идей и элементов системы (workspace)

```mermaid
flowchart TD
    CMS["🌐 Agent CMS<br/>Платформа"]
    WS["🏠 Workspace<br/>Хранилище<br/>workspaceID<br/>WorkspaceSlug (key)"]

    CMS --> ACTORS["👤 Человек (чат UI)<br/>🤖 Агент (MCP)<br/>1+1"]
    ACTORS --> CMS_ENDPOINT["🌐 localhost:<port> · 🔌 MCP-server"]
    CMS_ENDPOINT --> WS
    WS --> TREE["📁 Дерево страниц<br/>Для изучения и анализа данных"]
    WS --> DATA["🗄️ Структурированные данные<br/>Для хранения структурированных данных"]
    WS --> REPOS["📦 Репозитории<br/>для размещения кода своих проектов"]
    REPOS --> MEDIATHEQUE["🎞️ Медиатека<br/>фото · видео · аудио · файлы · sidecar"]
    MEDIATHEQUE --> SCRIPTS["📜 Скрипты<br/>run_script · утилиты workspace"]
    WS --> CHANNELS["📡 Каналы и источники<br/>темы · инфоблоки · дискуссии · журнал"]
    CHANNELS --> CHANNEL_VIEWS["📺 Мультиканальная подача<br/>блог · форум · дайджест · лента<br/>дашборд · каталог · библиотека"]
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
    IDEA7 --> IDEA8["8. 🔒 Пароли и защита приватных данных<br/>названия фирм, имена и другие чувствительные строки"]
    IDEA8 --> IDEA9["9. ⏱️ Тракер времени"]
    IDEA9 --> IDEA10["10. 🖥️ Запуск проекта на сервер<br/>чтобы всё было под рукой 24/7<br/>открывать через интернет с любого устройства<br/>(даже с телефона любимой 😄)"]
    IDEA10 --> IDEA11["11. 📄 Работа с файлами read/write<br/>Расширенный набор функций и методов<br/>Запись в конец · в начало<br/>Чтение середины и т.д."]

    TREE --> SHARED_AREA["🤝 Область общие<br/>awn-shared"]
    TREE --> CONTENT_AREA["📂 Область контента<br/>awn-container"]
    TREE --> AGENT_AREA["🤖 Область агента<br/>awn-agent-kit"]

    CONTENT_AREA --> C_AREA["🗺️ Область"]
    C_AREA --> C_TOPIC["📌 Тема"]
    C_TOPIC --> C_SLOT["📑 Слот<br/>Многофайловая · Однофайловая · Табличная<br/>Входящие · Заметки · Источники<br/>Артефакты · Активы · Медиа · Репозитории · Скрипты · Шаблоны · База · NotebookLM<br/>Очередь агента · TODO · Дорожная карта"]
    C_SLOT --> C_SECTION["📁 Раздел"]
    C_SECTION --> C_PAGE["📄 Запись"]
    C_PAGE --> C_RECORD_EXTRAS["📎 Вложения и дополнительные материалы"]

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

    classDef accentTree fill:#22c55e,stroke:#166534,stroke-width:2px,color:#f0fdf4
    classDef accentData fill:#7c3aed,stroke:#5b21b6,stroke-width:2px,color:#f5f3ff
    classDef accentRepos fill:#2563eb,stroke:#1e3a8a,stroke-width:2px,color:#eff6ff
    classDef accentChannels fill:#dc2626,stroke:#7f1d1d,stroke-width:2px,color:#fef2f2
    classDef accentChannelViews fill:#fca5a5,stroke:#dc2626,stroke-width:2px,color:#7f1d1d
    classDef accentMedia fill:#06b6d4,stroke:#0e7490,stroke-width:2px,color:#ecfeff
    classDef accentScripts fill:#d97706,stroke:#92400e,stroke-width:2px,color:#fffbeb
    class TREE accentTree
    class DATA accentData
    class REPOS accentRepos
    class CHANNELS accentChannels
    class CHANNEL_VIEWS accentChannelViews
    class MEDIATHEQUE accentMedia
    class SCRIPTS accentScripts

    click CMS href "https://agent-cms.ru/" "Открыть сайт Agent CMS"
    click WS_NOTIFY href "zadachi-plany-i-idei/awn-storage/main/uvedomleniya.md" "Уведомления"
    click WS_CONTEXT_REG href "zadachi-plany-i-idei/awn-storage/main/reestr-tem-i-avtozagruzka.md" "Реестр контекста"
    click SEARCH href "zadachi-plany-i-idei/awn-storage/main/rag.md" "Поиск"
    click MODULES href "zadachi-plany-i-idei/awn-storage/main/ideas-pakety-zavisimosti-i-steki-topikov.md" "Модули"
    click CHANNELS href "obsuzhdeniya/awn-storage/obsuzhdenie-kanalov.md" "Каналы и источники"
    click IDEA1 href "zadachi-plany-i-idei/awn-storage/main/git-dlya-md-faylov-i-media-razdelno.md" "Git-модуль · LFS"
    click IDEA2 href "zadachi-plany-i-idei/awn-storage/main/drugie-idei/voxels-vertecx-elixirr-rasshi-mstpostroi-mstcms.md" "UI на базе движка · VOXELS"
    click IDEA6 href "zadachi-plany-i-idei/awn-storage/ideas.md" "Пайплайн"
    click IDEA7 href "zadachi-plany-i-idei/awn-storage/main/6-acsess-dostupy-prava.md" "Права доступа и роли"
    click IDEA8 href "zadachi-plany-i-idei/awn-storage/main/7-ideya-hranit-sekretnye-dannye-paroli-i-karty.md" "Пароли и приватные данные"
    click C_SLOT href "zadachi-plany-i-idei/awn-storage/main/mindmapkarta-roudmapy.md" "Дорожная карта"
    click FACT_BANK href "zadachi-plany-i-idei/awn-storage/main/drugie-idei/bank-faktov-i-glossariy.md" "Банк фактов"
    click EXTRA_DIALOGS href "obsuzhdeniya/awn-storage/obsuzhdenie-s-claude-idey.md" "Диалоги · дискуссия"
    click ANNOT_SIDECAR href "zadachi-plany-i-idei/awn-storage/main/drugie-idei/izobrazheniya-i-rabota-s-izobrazheniyami.md" "Sidecar"
    click CLOUD_DISKS href "zadachi-plany-i-idei/awn-storage/main/drugie-idei/webdav-setevoy-protokol-protokol-obscheniya-s-oblachnymi-hranilischami.md" "Облачные диски"
```
