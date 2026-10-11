---
awn-note-todo-sticker: ""
awn-materials: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-emoji: ""
awn-summary: ""
awn-note: ""
awn-todo: ""
awn-main: false
awn-focus: false
awn-runtime-reminder: false
awn-index-exclude-record: false
awn-auto-toc: false
awn-tags: []
awn-taxonomy: {}
awn-viz-graph:
  enabled: true
  pin: false
  weight: 0
awn-viz-mindmap:
  type: optional
  color: slate
  size: auto
  layout-independent: false
  direction: auto
awn-viz-roadmap:
  order: 0
awn-id: 30
awn-type: awn.content.record
awn-create: "2026-10-11T21:51"
awn-viewed: ""
awn-event-at: ""
awn-deadline: ""
awn-owner: ""
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-attachments: []
awn-description: ""
awn-index-exclude-subtree: false
awn-name: Excalidraw «холст»
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-10-11T18:51:46.095Z
awn-version: 3
---

## Agent CMS — «холст»

**Свободного холста для рисования (Excalidraw / доска с кистью) сейчас нет** — это в идеях/тегах, в продукте не реализовано.

**Что есть вместо этого:**

* **Диаграммы в заметках** — блоки Mermaid в markdown (flowchart, mindmap и т.д.).
* **Карты топика** — `roadmap.md` / mindmap по структуре workspace.
* **Модуль «Визуализация workspace»** — обзор/граф структуры проекта, не произвольный рисунок.
* **Дашборды** — только конфиг (`layout.md` + виджеты), **без** drag-and-drop холста.

Слово **canvas** в типах модулей Agent CMS = **отдельный экран модуля** в UI, а не графический холст.

**Итог:** создать «свой холст» как артефакт в CMS **нельзя**; можно вести визуализацию через **markdown + Mermaid/roadmap** или ждать/делать модуль под Excalidraw. Рисование поверх скриншота — в **расширении браузера**, не в ядре CMS.