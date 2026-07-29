6. Domain (общий конфиг схема)

* Реестр тем настроек компонентов

8. Загрузка autoload - что будем загрузать (реестр автозагрузки при страте) - как сделать - ? загрузка инструкции темы
    load on start or trigger

![20260725154948](awn-storage/assets/pasted/20260725154948.png)

* Тест схемы и конфигурации**
* Тест всех полей
* Тест ссылок
* Тест картинок
* Тест файлов
* Полный тест СОздание агента области темы раздела записей
* Тест визуального редаткора

5. scripts/ — «точки входа»
    Что это: Python-скрипты, которые запускают конкретные операции. Это код, который агент написал и может переиспользовать.

Топик — «что лежит в дереве агента»
Пакет — «что меняет дерево и поведение системы»

```
awn-system (ядро платформы)
│  configuration-schema.yml · awn-*
│  Базовые поля типов: awn-type, awn-name, awn-title…
│  Не редактируются в workspace
│
└── workspace (корень агента)
    │  manifest.md · awn.page.ws
    │  configuration-schema.yml · layer: workspace · ws-*
    │  Редактор: «Схема полей workspace»
    │
    └── область (area)
        │  manifest.md · awn.page.area
        │  configuration-schema.yml · layer: area · area-*
        │  Редактор: «Схема полей области»  ← разблокировано
        │  Эффективная схема = ядро + ws + area
        │
        └── тема (topic)
            │  manifest.md · awn.topic
            │  configuration-schema.yml · layer: topic · field_*
            │  + слоты: slot_memory, slot_media, sidecar, settings…
            │  Эффективная схема = ядро + ws + area + topic
            │
            └── раздел (section)
                │  config.yml раздела
                │  slot_* targets в схеме темы
                └─ Эффективная схема = всё выше + поля раздела/слота
```

```
npm run start:https

cd ~/Desktop/YamlCMS  Запустите CMS...

HOST=0.0.0.0 npm start

ipconfig getifaddr end
http://192.168.0.102:3000/shell/mobile/index.html
```

## 