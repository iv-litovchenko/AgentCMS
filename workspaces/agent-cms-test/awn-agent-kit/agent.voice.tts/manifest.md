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

## Показ видео в Shell

```
[show]
type: video
src: /shell/demo.mp4
caption: Подпись к ролику
[/show]
```

Также сработает `type: video` по расширению (`.mp4`, `.webm`, `.mov`) даже без явного `type`.

- `src` — URL или путь CMS (`/api/media/file?path=...&file=...`).
- Альтернатива для картинок: `![подпись](url)`.
- Блок `[show]` не озвучивается — только обычный текст ответа.
