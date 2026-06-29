---
AWN-SCHEMA: Type.schema
AWN-ID: "a817a592-da6b-4827-8435-3784bc87c3f9"
AWN-SLUG: MEMORY/VOLUME
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Volume
AWN-DESC: Приватная память агента по ноде, рабочий конспект.
AWN-REGISTRY: false
---

# Volume — приватная память ноды

Файл вида `<name>.node.volume.md` — приватная память агента по конкретной ноде. Создаётся рядом с нодой как файл-спутник.

Назначение: история взаимодействия агента с нодой — что обсуждалось, как агент рассуждал, какие были промежуточные выводы. Аналог Docker volumes для агента.

**Не является источником правды и договорённостей** — это рабочий конспект, который агент использует для контекста.

YAML-свойства не используются.

Volume применим только к нодам-папкам и нодам-частям (Part):

- `<name>.node.volume.md` — для Part-ноды.
- `Index.node.volume.md` — для папки-ноды (Workspace, Space, Cluster…).
