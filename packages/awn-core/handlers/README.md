# handlers/

**План (фаза 3)** — registry UI-обработчиков, сейчас размазано по `public/main.js`.

```
handlers/
├── fields/
│   ├── registry.js       widget id → createControl()
│   ├── resolve-widget.js   typeId + fieldDef → widget id
│   └── widgets/
│       ├── input.js        awn.string
│       ├── textarea.js     awn.text
│       ├── boolean.js      awn.boolean
│       └── ...
└── blocks/
    ├── registry.js
    └── templates.js        template из schema.yml
```

Связь со spec:

```yaml
# schema.yml
widget: input   # → handlers/fields/widgets/input.js
```

До переноса — см. `resolvePropsFieldWidget`, `createPropsFormValueControl` в `public/main.js`.
