# Example 6 — типы свойств ноды (YAML-схема)

Каталог прототипов полей frontmatter для `_.node.md`. Каждый пример показывает три слоя:

1. **Фрагмент схемы** — как поле описано в `node-props.schema.yaml`
2. **YAML** — как значение хранится в `---` frontmatter
3. **Форма** — как контрол может выглядеть в CMS

## Связь с production

| `type` в схеме | `kind` в `parsePropsYaml` (main.js) | Статус |
|----------------|-------------------------------------|--------|
| `string`, `text`, `enum`, `date`, `datetime`, `url`, `color` | `string` | string / enum / format — валидация по схеме |
| `integer`, `number` | `number` | ✅ |
| `boolean` | `bool` | ✅ |
| `null` | `null` | ✅ |
| `array` | `array` | ✅ (блок `- item` или `[a, b]`) |
| `object` | — | 🔜 вложенные объекты |

## Запуск

```bash
cd examples/ui-variant-6
node generate.mjs
python3 -m http.server 8768
```

Открыть: [http://localhost:8768](http://localhost:8768)

## Файлы

- `node-props.schema.yaml` — эталонная схема (JSON Schema + примеры)
- `shared-schema.js` — те же определения для генератора демо
- `generate.mjs` — создаёт папки `01-…` … `14-…`

## Рекомендации по именованию ключей

- `snake_case`, латиница: `due_date`, `accent_color`
- Системные поля ноды (будущее): `title`, `slug`, `status` — из схемы агента/воркспейса
- Массивы тегов: предпочитать блочный YAML (`tags:\n  - a`) для diff-friendly правок
