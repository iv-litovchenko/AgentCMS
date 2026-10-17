---
awn-name: "1 Структура, типы и свойства (поля)"
awn-emoji: ""
awn-status: open
awn-description: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-08-01T22:08"
awn-update: 2026-08-01T20:25:05.937Z
awn-version: 10
awn-preview: ""
awn-web-url: ""
awn-attachments: []
---

1. Domains - базовая единица сущности (здесь их определяем)
 Domain (общий конфиг схема)

2. 3 уровень внутренностей Zip-*<название записи>/php-главай 1 (файлы и так далее) php
3. И я думаю нужно отказываться от идеи называть папки английскими буквами - это бред - как и отказываться от Slug в целом

Вот какая идея у меня появлилась

 суффикс .sidecar.md походу не нужен

Страницы
1a.* - это обычно типы область (может содержать дочерние элементы)
1t.*- это обычно типы типа тема (не может содержать дочерних элементво
без этих префиксов свододная память

Примеры
1a-conteiner (обычная область)
1a-agent-kit - (папка агента)
1a-shared - общяя папка
1a-space-1
1a-spece-2

2t-topic-1
2t-topic-2

3s-* это слоты

2t-topic-1/s-inbox/
2t-topic-1/s.assets/ , media main и так далее

manifest.md так и остается

1. Цифры может лишнее
2. У нас уйдет один уровень лишний из системы
3. И вот не знаю как лучше a-* или a.-*

Аналогично дял свойсвт -
core-*
ws-*
x-* свойства польхователя

убираем awn-storage - будут slot-* (и показ записей что в не слотов)

```
Дерево 

Форум (workspace) awn.node.ws-forum 
Область (area) awn.node.area (префикс названия папки a-*)
Тема (topic) awn.node.topic (префикс названия папки (t-*)
	Секция (слот) 
		Многофайловая память (main) slot-main
		Входящие (inbox)
		Заметки (notes)
		Источники (references) - префикс папки slot (или section-references)
		Медиа (slot-media или section-references)
		
	—> sub-topic <—	 Подтемы (еще идея есть)

	В любом слоте может находится - у каждого слота свой набор полей
	Раздел (awn.node.record.category) - префикс - cat-*
	Запись (awn.node.record) - без префиксов
	Sidecar (метаопиание файла - awn.node.record.sidecar) - *.sidecar.md

	К каждой записи можно комментарии (прокомментировать - что бы было обсуждение)

	Также у каждой записи может быть свой подтип 	Который определяет поля (хотя это пока и избыточно)
	

	Как лучше назвать записи я пока не знаю (запись - пост - элемент - подтема)
	Как лучше назвать одним словом каждый элемент - я вижу только одно универсальное слово «нода» - но это не точно
```

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

| awn-type | space | topic | record | sidecar/media |
| -------- | ----- | ----- | ------ | ------------- |
| Дерево | + | + | - | - |
|  | -> | -> | -> | -> |
|  | содержит | содержит | содержит |  |
| Добавляется в реестр | + | + | - | - |