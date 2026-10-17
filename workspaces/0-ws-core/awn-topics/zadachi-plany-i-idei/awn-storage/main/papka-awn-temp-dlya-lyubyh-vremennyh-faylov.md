---
awn-name: Папка awn-temp для любых временных файлов
awn-emoji: ""
awn-status: open
awn-description: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-08-09T15:33:30.416Z"
awn-update: 2026-08-09T15:35:18.184Z
awn-version: 3
awn-preview: ""
awn-web-url: ""
awn-attachments: []
---

| Путь | Назначение |
| ---- | ---------- |
| `_agent/staging/incoming/` | Скачал с интернета → положил сюда → потом перенёс в тему |
| `_agent/staging/scratch/` | Промежуточные черновики, парсинг, временные md/json |
| `_agent/staging/exports/` | То, что агент готов отдать пользователю или в git |
| `_agent/README.md` | Подсказка для агента и человека |

```
Как это ложится на MCP-пути
upload_file_from_url({
  path: "_agent/staging/incoming/logo.png",
  url: "https://…"
})
read_file({ path: "_agent/staging/scratch/draft-post.md" })
list_folder({ path: "_agent/staging", depth: 2 })
Потом перенос в тему:

upload_file({
  path: "awn-container/php/awn-storage/media/logo.png",
  data: "…"
})
```

