---
awn-name: Черновик 3
awn-emoji: ""
awn-status: open
awn-description: AWN registry · awn-agent-system · layout
awn-tags:
  - docs
  - draft
awn-type: awn.content.record
awn-create: "2026-06-29T15:00"
awn-update: 2026-08-01T18:11:50.795Z
awn-version: 2
awn-preview: ""
awn-web-url: ""
awn-attachments: []
---


awn.registry.json (навигатор по всем элементам системы категориям топикам)



awn-topics//volume.md (последнее о чем общалис с ИИ в топике на чем остановились - альтернативное названпе trhead.md)
awn-topics//.env

// Описание типов (набора полей - cхемы)
awn-types/core.mixin.base.yml (базовый набор свойств для всех типов)
awn-types/core.space.yml (category)
awn-types/core.topic.yml
awn-types/core.element.yml (элемент топика в папке content)
awn-types/core.sidecar.yml (описание media элемента (файла), метаданные рядом с файлом)
awn-types/core.sys.assistant.ai.yml (Это служебный раздел)
awn-types/core.sys.agent.yml
awn-types/core.sys.agent.voice.tts.yml
awn-types/core.sys.agent.voice.stt.yml
awn-types/core.sys.agent.rules.yml
awn-types/core.sys.user.yml
awn-types/core.sys.users.yml
awn-types/core.sys.tags.yml
awn-types/core.sys.categories.yml (пока отложим)

awn-types/core.catalog.*.yml # схемы справочников (не понятно зачем это надо)
awn-types/core.capabilities.yml # какие домены у space/topic/sys # схемы справочников (не понятно зачем это надо)

здесь описываем типы
(есть топик типа область (категория)
есть топик служебный (sys assistant.ai - user users agent tags)
есть обычный топик
 У нас получается плоская структура
При каждом старте новой сесиии и слове «привет» запускается скрипт, генерации реестра
Если слова привет нет «то идет чистая обычная сессия»
У нас получается что топик это как полноценный модуль У нас получается все в нижнем регистре (совместимо с веб)
У нас получается что дерево будет строиться по parent_id
Весь комп (агент или сервер) ведется единообразным стилем (Mac finder остается как бы не основным навигатором по важным файлам с которыми я работаю)

Базовый набор типов полей
awn-id: 20260606-003
awn-type: core.topic
awn-parent_id: 20260501-001-finance
awn-name: Инвестиции
awn-created: 2026-06-06T16:00:00
awn-content-type: mixed # или "single" (только main.md), или "elements" (только папка content/)

Пример набора полей для сидел-файлов
awn-id: 20260606-003-photo
awn-type: core.sidecar
awn-topic_id: 20260606-003
awn-filename: photo.jpg
awn-size: 2048576 # байты
awn-mime: image/jpeg
awn-created: 2026-06-06T16:00:00
awn-description: Фото ноутбука
awn-tags: [техника, покупка]

Системные файлы корня агента
awn-meta/ # Глобальные данные (пока не понятно зачем это нужно)

awn.main.json # id агента, имя, comment
awn.deps.json зависимости устанавливаеме в Linux, Windows, Mac
id.increment.txt # или здесь, не в awn-topics
awn.map-registry.json # плоский индекс + parent_id + drivers + links

В дереве почечается (макреры)
.git в папке ноды репозиторий в теме
.obsidian/ vault

Системные файлы корня агента
AGENTS.md,
README.md,
TODO.md,
docker-compose.yml
.env,
.gitignore

--
На уровне всей системы
awn.agents.json (реестр всех агентов)

/a/{agentId}/t/{topicId} ← топик (манифест x.md)
/a/{agentId}/t/{topicId}/e/{elementId} ← element
/a/\{agentId\}/t/\{topicId\}/d/\{driver\} ← driver: content | todo | volume | config
/a/{agentId}/t/{topicId}/s/{sidecarId} ← sidecar медиа
/a/{agentId}/sys/{file} ← AGENTS.md, TODO.md корня