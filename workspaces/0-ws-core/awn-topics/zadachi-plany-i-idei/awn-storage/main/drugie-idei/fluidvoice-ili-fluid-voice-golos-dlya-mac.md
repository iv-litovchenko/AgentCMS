---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-type: awn.content.record
awn-create: "2026-09-08T21:01"
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments: []
awn-description: ""
awn-main: false
awn-name: FluidVoice (или Fluid voice) - голос для Mac
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-08T18:08:12.580Z
awn-version: 3
---

FluidVoice (или Fluid voice) — это бесплатное приложение с открытым исходным кодом для macOS, предназначенное для голосовой диктовки и преобразования речи в текст прямо на устройстве с использованием локального искусственного интеллекта

**Напрямую «из коробки» нажать паузу на YouTube с помощью одной встроенной фразы FluidVoice не сможет**, но это можно легко настроить.
Приложение [FluidVoice на GitHub](https://github.com/altic-dev/FluidVoice) управляет системой через **Command Mode**, который привязывает голосовые фразы к стандартным скриптам автоматизации macOS (например, к горячим клавишам или скриптам AppleScript). [[1](https://www.university-365.com/post/fluidvoice-free-open-source-voice-to-text-for-macos)]
Поставить YouTube на паузу голосом можно двумя способами через настройки приложения:
Способ 1. Системная клавиша «Пауза» (Самый простой)
Если YouTube открыт в активной вкладке браузера (Safari, Chrome и др.), система часто реагирует на стандартную мультимедийную клавишу *Play/Pause* (F8) на клавиатуре Mac.

1. Откройте **Settings → Command Mode** в FluidVoice.
2. Создайте новую команду, например, с триггером: `«пауза»` или `«стоп видео»`.
3. В качестве действия выберите **Эмуляцию нажатия клавиш (Keystroke)** и укажите системную клавишу `Play/Pause`. [[1](https://www.university-365.com/post/fluidvoice-free-open-source-voice-to-text-for-macos)]

Способ 2. Через AppleScript (Самый надежный)
Если вы хотите, чтобы видео ставилось на паузу, даже когда браузер с YouTube находится на заднем плане (например, вы работаете в текстовом документе), можно привязать команду к короткому скрипту. [[1](https://www.university-365.com/post/fluidvoice-free-open-source-voice-to-text-for-macos)]

1. В настройках **Command Mode** добавьте команду `«пауза на ютубе»`.
2. Выберите тип действия **Run Script (Запустить скрипт)**.
3. Вставьте простой скрипт автоматизации для вашего браузера. Например, для Google Chrome он выглядит так:

applescript

```
tell application "Google Chrome"
    execute front window's active tab javascript "document.querySelector('video').click();"
end tell
```

Используйте код с осторожностью.
*(Этот скрипт находит плеер YouTube на активной вкладке и виртуально кликает по нему, чтобы остановить или продолжить воспроизведение).*
Если вы хотите это настроить, подскажите:

* Какой **браузер** вы используете на Mac (Safari, Chrome, Arc)?
* Нужно ли вам, чтобы пауза срабатывала, когда **окно браузера свернуто**, или достаточно останавливать видео, только когда вы смотрите на него?

Я пришлю готовый точный скрипт для копирования.