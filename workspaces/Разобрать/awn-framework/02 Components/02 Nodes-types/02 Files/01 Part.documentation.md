---
AWN-SCHEMA: Type.schema
AWN-ID: "de53cb60-3245-4d67-a939-0b006084d051"
AWN-SLUG: COMPONENT/PART
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 2
AWN-NAME: Part
AWN-DESC: Атомарная нода-часть с одной задачей или правилом.
AWN-REGISTRY: true
---

# Part — атомарная нода-часть

Файл вида `*.node.md` — нода-часть. Содержит определённую логику или
правило и выполняет одну конкретную задачу.

Может располагаться:

- в папке области напрямую (внутри Workspace, Space, Cluster, Book, Collection);
- в подпапке `_Parts/` родительской ноды — когда сложная нода разбита
  на несколько `*.node.md` частей.
