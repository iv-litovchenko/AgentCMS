---
awn-name: Гит для md-файлов и медиа (раздельно)
awn-emoji: ""
awn-status: open
awn-description: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-08-07T16:06"
awn-update: 2026-08-07T13:06:29.465Z
awn-version: 2
awn-preview: ""
awn-web-url: ""
awn-attachments: []
---

10. ГИТ

* git add ":/*.md" (yml, json, csv, txt)
* git add ":" ":(exclude)*.md"

Добавить все .md файлы в кастомную папку базы данных .gitfiles
git --git-dir=.gitfiles add ":/*.md"

Сделать коммит туда же
git --git-dir=.gitfiles commit -m "My commit"