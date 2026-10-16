---
awn-name: Комментарий 2: сложности
awn-emoji: 💬
awn-status: open
awn-description: "Ответ на вопрос о сложностях и инструментах"
awn-tags:
  - test
  - comment
awn-type: awn.content.comment
awn-target: aja-test-oblasti-2049/aja-test-temy-2049-2/manifest.md
---
Сложности были только одна: create_content не принимал слот comments напрямую (валидация типов и 500), поэтому комментарий создан через path-based write_file в awn-storage/comments/. Использованы только MCP-инструменты agent-cms.