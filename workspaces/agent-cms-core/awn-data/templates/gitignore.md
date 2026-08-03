---
awn-id: gitignore
awn-created: "2026-08-03T00:00:00.000Z"
awn-updated: "2026-08-03T00:00:00.000Z"
awn-title: Git — .gitignore
awn-target-file: .gitignore
awn-hint-title: Git — что не попадает в репозиторий
awn-hint-text: "Корневой <code>.gitignore</code> workspace агента: секреты, кэш превью <code>.agent-cms/cache</code>, OS-мусор, слоты <code>media</code> и <code>repository</code>. Контент тем (<code>awn-container/</code>, остальные слои <code>awn-storage/</code>) обычно коммитится — игнорируйте только то, что не должно уйти в git."
awn-status: open
---

# Секреты — не коммитить
.env
.env.*
!.env.example

# macOS / Windows
.DS_Store
Thumbs.db
Desktop.ini

# IDE
.idea/
.vscode/

# Кэш и временные файлы
.cache/
.agent-cms/cache
tmp/
temp/
*.tmp
*.log

# Зависимости (если есть npm-скрипты)
node_modules/

# Слоты awn-storage — media и repository (крупные файлы, внешние накопители)
**/awn-storage/**/media/
**/awn-storage/**/repository/
