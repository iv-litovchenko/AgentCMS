Согласен: **sidecar и comment — не «контент темы»**, а **слой привязок** к любой цели (manifest, `.md` в слоте, png, скрипт, элемент инфоблока). Сейчас они формально сидят в `domain: content` — это удобно для слотов, но **концептуально смешивает** «мы написали статью» и «мы приклеили метку к файлу».

```
🗂 YamlCMS — как я это вижу

🏛 Носители (где живёт смысл и данные)
├── 📄 Страницы (awn.page.*)
│   └── manifest + awn-storage/ (слоты main, media, inbox…)
├── 🧱 Инфоблоки (awn.database.*)  ← «страница без меню»
│   └── manifest + элементы коллекции
└── ⚙️ Система / workspace (awn-system, scripts…)

✍️ Контент (авторская запись «сама по себе»)
├── awn.content.record
├── awn.content.category
├── элементы инфоблока (record/category в frame)
└── 💬 awn.content.discussion  ← поток в слоте, это скорее контент общения

🔗 Аннотации / overlays (всегда «про что-то другое»)
├── 📎 awn.content.sidecar  → 1:1 к файлу (*.sidecar.md рядом)
└── 💭 awn.content.comment  → N:1 к target (comments/{target}/)

📍 Файл без .md (бинарник, csv, sh)
└── сам не контент → sidecar (и OCR) даёт ему «лицо» в CMS
```

**Куда «переместить» типы логически (не обязательно физически):**

```
🎯 Идея: отдельный domain, не content
├── awn.annotation.sidecar   (или awn.overlay.*)
├── awn.annotation.comment
└── общий mixin: awn-target / source-path — одна модель привязки

📦 Физика может остаться как сейчас
├── sidecar — рядом с файлом
└── comments — comments/…
```

**Вывод кратко:** страницы и инфоблоки — **контейнеры и записи**; sidecar/comment — **сквозные типы хранилища**, их лучше вынести из «контента» в **annotation/overlay**, а в слотах оставить только **allowed-types** и правила пути. Так не придётся таскать sidecar в `main/` — он и должен цепляться **к любому файлу в workspace**, не к «типу слота».
