---
AWN-SCHEMA: Type.schema
AWN-ID: "1f213379-7b1c-4fcb-8e1c-890685a5865f"
AWN-SLUG: COMPONENT/WORKSPACE
AWN-TYPE: Folder
AWN-ALLOW-CHILDREN: true
AWN-LAYER: 0
AWN-NAME: Workspace
AWN-DESC: Корень workspace — описание проекта и точка входа в vault.
AWN-REGISTRY: true
---

# Workspace — корень рабочего пространства

Файл вида `README.node.md` в корне workspace — нода-описание самого
пространства. Отвечает на вопросы: что это за проект, зачем он существует,
что здесь лежит, как с этим работать.

Workspace — корневой контейнер для всех остальных нод. В одном workspace
может быть только **один** такой файл, и лежит он в самом корне.

Если в корне workspace нет `README.node.md` — это ошибка состояния
«не понятно, что за проект». Агент при старте предлагает создать корневую
ноду.
