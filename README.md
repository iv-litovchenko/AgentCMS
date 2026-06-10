# Agent CMS

File-based CMS для LLM-агентов без базы данных. Контент на диске: области (`_reg-info.md`), темы (`*.md`), память, медиа, системные файлы (`AGENTS.md`).

## Быстрый старт

```bash
npm install
npm start
```

Откройте http://localhost:3000

## Desktop

```bash
npm run desktop
```

## MCP (Cursor)

```bash
npm start
cd mcp-server && npm install
```

См. [mcp-server/README.md](mcp-server/README.md) и кнопку **MCP** в шапке UI.

## Документация

- Пользовательская: `workspaces/Documentation/user-docs*.md` (кнопка **DOC** в UI)
- Примеры UI: `documentation/examples/`
- Типы свойств темы: `documentation/examples/6/`

## Пакеты

| Имя | Описание |
|-----|----------|
| `agent-cms` | Корневое приложение (этот репозиторий) |
| `@agent-cms/mcp-server` | MCP-сервер (`mcp-server/`) |
