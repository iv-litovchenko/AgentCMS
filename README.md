# Agent CMS

File-based CMS для LLM-агентов без базы данных. Контент на диске: области (`_registration.md`), темы (`*.md`), память, медиа, системные файлы (`AGENTS.md`).

## Быстрый старт

```bash
npm install
npm start
```

Откройте http://localhost:3000

## Desktop

**Agent CMS** (редактор):

```bash
npm run cms:desktop
```

**Agent Shell** (голосовой клиент):

```bash
npm run shell:desktop
```

Сборка и запуск `.app`: см. [desktop/README.md](desktop/README.md).

## MCP (Cursor)

```bash
npm start
cd mcp-server && npm install
```

См. [mcp-server/README.md](mcp-server/README.md) и кнопку **MCP** в шапке UI.

## Документация

- Пользовательская: `workspaces/agent-cms-core/dokumentatsii/awn-storage/main/user-docs*.md` (тема **Документации** в меню)
- Примеры UI: `documentation/examples/`
- Типы свойств темы: `documentation/examples/6/`

## Пакеты

| Имя | Описание |
|-----|----------|
| `agent-cms` | Корневое приложение (этот репозиторий) |
| `@agent-cms/mcp-server` | MCP-сервер (`mcp-server/`) |
