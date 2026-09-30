# Карта идей и элементов системы (workspace)

```mermaid
flowchart TD
    CMS["🌐 Agent CMS"]
    WS["🏠 Workspace (agentId)"]

    CMS --> WS
    WS --> TREE["📁 Дерево Page"]
    WS --> DATA["🗄️ Структурированные данные"]
    WS --> MEM["🧠 Память и коммуникация"]
    WS --> AUX["⚙️ Вспомогательное"]
    WS --> IDEAS["💡 Идеи"]

    IDEAS --> IDEA1["Git-модуль<br/>синхронизация, LFS"]
    IDEAS --> IDEA2["UI на базе движка<br/>Сборка интерфейса на базе движка — идеи для названия такого компонента в рамках системы: VOXELS, VERTECX, VEXEL, ELEXIR"]
    IDEAS --> IDEA3["Выгрузка в облако<br/>Google Диск и Яндекс Диск"]
    IDEAS --> IDEA4["Синхронизация с удалённым сервером<br/>доступность хранилища 24/7"]
    IDEAS --> IDEA5["Дашборды<br/>гибкие управляемые дашборды"]

    TREE --> AREA["Область (Area)"]
    AREA --> SHARED_AREA["Общие"]
    AREA --> AGENT_AREA["Агент"]
    SHARED_AREA --> TOPIC["Тема (Topic / manifest.md)"]
    AGENT_AREA --> TOPIC
    TOPIC --> SLOT["Слот (main, inbox, media, notes…)"]
    SLOT --> SECTION["Раздел"]
    SECTION --> PAGE_ENTRY["Запись"]
    PAGE_ENTRY --> SIDECAR["Sidecar"]

    DATA --> IBLOCK["Инфоблок"]
    IBLOCK --> TAX["Таксономии / справочники"]
    IBLOCK --> GROUP["Группа"]
    IBLOCK --> COLLECTION["Коллекция"]
    IBLOCK --> SINGLE["Одиночка"]
    GROUP --> DATA_SECTION["Раздел"]
    COLLECTION --> DATA_SECTION
    SINGLE --> DATA_SECTION
    DATA_SECTION --> RECORD["Запись"]

    MEM --> FACTS["Facts"]
    MEM --> JOURNAL["Journal"]
    MEM --> COMM["Коммуникация"]
    COMM --> DIALOGS["Dialogs"]
    COMM --> DISCUSS["Discussion / Comments"]
    MEM --> INBOX["Inbox (входящие)"]

    AUX --> SETTINGS["Settings (workspace / platform)"]
    AUX --> SEARCH["Search / Index"]
    AUX --> REPO["Repository"]
    AUX --> BOARD["NOTE.md / TODO.md"]

    click CMS href "https://agent-cms.ru/" "Открыть сайт Agent CMS"
```
