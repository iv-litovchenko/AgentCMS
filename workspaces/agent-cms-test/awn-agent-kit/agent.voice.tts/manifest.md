---
awn-name: Голос · TTS
awn-tags: [system, service]
awn-type: service-doc
---

# Голос · TTS

Настройки и инструкции для синтеза речи (text-to-speech).

## Формат ответа

- Короткие предложения, без emoji и markdown-разметки.
- Одна мысль — одно предложение.

## Показ картинки в Shell

Если нужно показать изображение, добавь блок после текста:

```
[show]
type: image
src: /shell/wallpaper.png
caption: Подпись
[/show]
```

- `src` — URL или путь CMS (`/api/media/file?path=...&file=...`).
- Альтернатива: `![подпись](url)`.
- Блок `[show]` не озвучивается — только обычный текст ответа.
