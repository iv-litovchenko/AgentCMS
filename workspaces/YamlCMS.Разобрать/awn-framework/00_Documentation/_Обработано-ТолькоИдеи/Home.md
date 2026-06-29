# 🏠 Home

> Главная страница vault. Быстрый доступ ко всему.

---

## 📋 Открытые задачи

```dataview
TABLE AWN-TITLE AS "Задача", AWN-OWNER AS "Домен", priority AS "Приоритет", due AS "Дедлайн"
FROM "v2"
WHERE AWN-TYPE = "RECORD/TASK" AND AWN-STATUS = "open"
SORT due ASC
```

---

## 📝 Недавние заметки

```dataview
TABLE AWN-TITLE AS "Заметка", AWN-OWNER AS "Домен"
FROM "v2"
WHERE AWN-TYPE = "RECORD/NOTE"
SORT AWN-UPDATED DESC
LIMIT 10
```

---

## 🗂️ Домены

- [[Domains/EnglishLearning/Index.node.md|🇬🇧 English Learning]]

---

## 🕓 Последние изменения

```dataview
TABLE file.folder AS "Папка"
FROM "Domains"
WHERE file.name != "Index"
SORT file.mtime DESC
LIMIT 7
```
