# Карта идей и элементов системы (workspace)

```mermaid
flowchart TD
    CMS["🌐 Agent CMS"]
    WS["🏠 Workspace<br/>workspaceID<br/>WorkspaceSlug (key)"]

    CMS --> WS
    WS --> TREE["📁 Дерево страниц<br/>Для изучения и анализа данных"]
    WS --> DATA["🗄️ Структурированные данные<br/>Для хранения структурированных данных"]
    WS --> REPOS["📦 Репозитории"]
    WS --> EXTRA_DATA["Дополнительные данные"]
    WS --> UI["Интерфейс"]
    WS --> AUX["⚙️ Вспомогательное"]
    WS --> IDEAS["💡 Идеи"]

    UI --> UI_CONTROL["Agent CMS Controll (luncher)"]
    UI_CONTROL --> UI_EDITOR["Agent CMS Editor"]
    UI_EDITOR --> UI_VOICE["Agent CMS Voice<br/>(Flow window)"]
    UI_VOICE --> UI_SIDEPANEL["Sidepanel в Google Chrome"]
    UI_SIDEPANEL --> UI_PANEL["Панелька в браузере"]
    UI_PANEL --> UI_MCP["MCP сервер"]

    IDEAS --> IDEA1["1. Git-модуль<br/>синхронизация, LFS"]
    IDEA1 --> IDEA2["2. UI на базе движка<br/>Сборка интерфейса на базе движка<br/>идеи для названия такого компонента<br/>в рамках системы:<br/>VOXELS<br/>VERTECX<br/>VEXEL<br/>ELEXIR"]
    IDEA2 --> IDEA3["3. Выгрузка в облако<br/>Google Диск и Яндекс Диск"]
    IDEA3 --> IDEA4["4. Синхронизация с удалённым сервером<br/>доступность хранилища 24/7"]
    IDEA4 --> IDEA5["5. Дашборды<br/>гибкие управляемые дашборды"]
    IDEA5 --> IDEA6["6. Пайплайн<br/>расширить статусы записей через пайплайны<br/>(последовательность шагов)<br/>либо дополнить статусы отдельным полем<br/>базовые статусы: открыто · закрыто · архив"]
    IDEA6 --> IDEA7["7. Права доступа и роли"]

    TREE --> SHARED_AREA["Область общие<br/>awn-shared"]
    TREE --> CONTENT_AREA["Область контента<br/>awn-container"]
    TREE --> AGENT_AREA["Область агента<br/>awn-system / kit"]

    CONTENT_AREA --> C_AREA["Область"]
    C_AREA --> C_TOPIC["Тема"]
    C_TOPIC --> C_SLOT["Слот<br/>Многофайловая · Однофайловая · Табличная<br/>Входящие · Заметки · Источники<br/>Артефакты · Активы · Медиа · Репозитории · Скрипты · Шаблоны · База · NotebookLM<br/>Очередь агента · TODO · Дорожная карта"]
    C_SLOT --> C_SECTION["Раздел"]
    C_SECTION --> C_PAGE["Запись"]

    SHARED_AREA --> SHARED_THEMES["Стандартные темы<br/>Входящие · Заметки · Источники · Артефакты · Скрипты · Медиа<br/>Загрузки из браузера · Автозагружаемый контекст"]

    AGENT_AREA --> AGENT_SVC["Агентские темы и ресурсы<br/>Агент · Пользователь · Пользователи · Правила агента<br/>Голос TTS · Голос STT · Устройства · Экзоскелет · Объекты мира<br/>Случайный анекдот — для экспериментов"]

    DATA --> IBLOCK["Инфоблок"]
    IBLOCK --> GROUP["Группа"]
    IBLOCK --> COLLECTION["Коллекция<br/>таксономии / справочники"]
    IBLOCK --> SINGLE["Одиночка"]
    COLLECTION --> DATA_SECTION["Раздел"]
    DATA_SECTION --> RECORD["Запись"]

    EXTRA_DATA --> BOARD["README.md · AGENTS.md · NOTE.md · TODO.md"]
    BOARD --> ANNOT["Аннотации"]
    ANNOT --> ANNOT_COMMENTS["Комментарии"]
    ANNOT_COMMENTS --> ANNOT_SIDECAR["Sidecar"]
    ANNOT_SIDECAR --> FACT_BANK["Банк фактов"]
    FACT_BANK --> GLOSSARY["Глоссарий"]
    GLOSSARY --> EXTRA_DIALOGS["Диалоги<br/>дискуссия"]

    AUX --> AUX_TYPES["Типы"]
    AUX_TYPES --> SETTINGS["Настройки, .env"]
    SETTINGS --> SEARCH["Поиск"]
    SEARCH --> AUX_JOURNAL["Журнал"]
    AUX_JOURNAL --> MODULES["Модули"]
    MODULES --> CLOUD_DISKS["Облачные диски<br/>Google · Яндекс"]

    click CMS href "https://agent-cms.ru/" "Открыть сайт Agent CMS"
```
