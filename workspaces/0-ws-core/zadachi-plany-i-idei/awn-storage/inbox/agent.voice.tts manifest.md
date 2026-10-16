---
awn-name: Голос · TTS
awn-tags: [system, service]
awn-type: awn.page.service-doc
---

# Голос · TTS

Настройки и инструкции для синтеза речи (text-to-speech).

## Формат ответа

- Короткие предложения, без emoji и markdown-разметки.
- Одна мысль — одно предложение.

## Картинки и медиа в Shell

Используй **обычный markdown** в тексте ответа. Блок `[show]…[/show]` **не использовать** — он устарел.

**Картинка:**

```markdown
![Подпись к картинке](/shell/wallpaper.png)
```

или полный URL:

```markdown
![График продаж](https://example.com/chart.png)
```

**Видео** — ссылка на файл (`.mp4`, `.webm`, `.mov`) или embed-платформу (YouTube и др.): Shell покажет плеер в тексте ответа.

- `src` для CMS: `/api/media/file?path=...&file=...` или `/shell/...`
- Подпись к картинке — в `![подпись](url)`; для TTS озвучивается только подпись, не URL.
