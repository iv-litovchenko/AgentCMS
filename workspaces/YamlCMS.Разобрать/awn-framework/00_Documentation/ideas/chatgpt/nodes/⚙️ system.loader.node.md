---
TYPE: system
REQUIRE: always
PRIORITY: 100
TRIGGERS: ["инициализация"]
AUTOMATIZATION: true
---
## **Как загружается система**

Отвечает за загрузку node.

**Суть:**

- читает AGENTS.md
- решает какие node грузить
- применяет REQUIRE / TRIGGERS

👉 Это твой “runtime”