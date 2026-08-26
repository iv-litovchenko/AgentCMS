---
awn-name: Основы CSS
awn-description: ""
awn-preview: ""
awn-web-url: ""
awn-status: open
awn-quality: 4
awn-note-todo-sticker: ""
awn-emoji: ""
awn-tags: []
awn-type: awn.content.record
awn-create: 2026-08-25T21:29:57.509Z
awn-update: 2026-08-25T21:29:57.509Z
awn-version: 1
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments: []
awn-materials: ""
---

## CSS — стилизация страницы

CSS (Cascading Style Sheets) отвечает за внешний вид: цвета, отступы, шрифты, расположение элементов.

Три способа подключения:

```html
<link rel="stylesheet" href="style.css">
```

```html
<style>
  h1 { color: navy; }
</style>
```

```html
<p style="color: red;">инлайн-стиль</p>
```

Базовый селектор:

```css
.card {
  padding: 16px;
  border-radius: 8px;
  background: #f5f5f5;
}
```

Каскад: специфичность и порядок правил определяют, какое значение победит.