# Карта идей и элементов системы (workspace)

```mermaid
flowchart TD
    CMS["🌐 Agent CMS"]
    WS["🏠 Workspace<br/>workspaceID<br/>WorkspaceSlug (key)"]

    CMS --> WS
    WS --> TREE["📁 Дерево страниц<br/>Для изучения и анализа данных"]
    WS --> DATA["🗄️ Структурированные данные<br/>Для хранения структурированных данных"]
    WS --> EXTRA_DATA["Дополнительные данные"]
    WS --> MEM["🧠 Память и коммуникация"]
    WS --> AUX["⚙️ Вспомогательное"]
    WS --> IDEAS["💡 Идеи"]

    IDEAS --> IDEAS_BLOCK["1. Git-модуль<br/>синхронизация, LFS<br/>2. UI на базе движка<br/>Сборка интерфейса на базе движка<br/>идеи для названия такого компонента<br/>в рамках системы:<br/>VOXELS<br/>VERTECX<br/>VEXEL<br/>ELEXIR<br/>3. Выгрузка в облако<br/>Google Диск и Яндекс Диск<br/>4. Синхронизация с удалённым сервером<br/>доступность хранилища 24/7<br/>5. Дашборды<br/>гибкие управляемые дашборды<br/>6. Пайплайн<br/>расширить статусы записей через пайплайны<br/>(последовательность шагов)<br/>либо дополнить статусы отдельным полем<br/>базовые статусы: открыто · закрыто · архив"]

    TREE --> SHARED_AREA["Область общие<br/>awn-shared"]
    TREE --> CONTENT_AREA["Область контента<br/>awn-container"]
    TREE --> AGENT_AREA["Область агента<br/>awn-system / kit"]

    CONTENT_AREA --> AREA["Область"]
    AREA --> TOPIC["Тема"]
    TOPIC --> SLOT["Слот"]
    SLOT --> SECTION["Раздел"]
    SECTION --> PAGE_ENTRY["Запись"]

    SHARED_AREA --> SHARED_THEMES["Стандартные темы<br/>Входящие · Заметки · Источники · Артефакты · Скрипты · Медиа<br/>Загрузки из браузера · Автозагружаемый контекст"]

    AGENT_AREA --> AGENT_SVC["Агентские темы и ресурсы<br/>Агент · Пользователь · Пользователи · Правила агента<br/>Голос TTS · Голос STT · Устройства · Экзоскелет · Объекты мира<br/>Случайный анекдот — для экспериментов"]

    DATA --> IBLOCK["Инфоблок"]
    IBLOCK --> GROUP["Группа"]
    IBLOCK --> COLLECTION["Коллекция<br/>таксономии / справочники"]
    IBLOCK --> SINGLE["Одиночка"]
    COLLECTION --> DATA_SECTION["Раздел"]
    DATA_SECTION --> RECORD["Запись"]

    EXTRA_DATA --> REPOS["Репозитории"]
    EXTRA_DATA --> BOARD["README.md · AGENTS.md · NOTE.md · TODO.md"]
    EXTRA_DATA --> ANNOT["Аннотации"]
    ANNOT --> ANNOT_COMMENTS["Комментарии"]
    ANNOT --> ANNOT_SIDECAR["Sidecar"]

    MEM --> FACTS["Facts"]
    MEM --> COMM["Коммуникация"]
    COMM --> DIALOGS["Dialogs"]
    COMM --> DISCUSS["Discussion / Comments"]

    AUX --> SETTINGS["Настройки, .env"]
    AUX --> SEARCH["Поиск"]
    AUX --> AUX_JOURNAL["Журнал"]
    AUX --> MODULES["Модули"]

    click CMS href "https://agent-cms.ru/" "Открыть сайт Agent CMS"
```
