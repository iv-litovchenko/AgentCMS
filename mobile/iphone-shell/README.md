# Agent Shell · iPhone

Минимальный голосовой клиент Agent CMS для iOS.

## Возможности

- Фазы: Ожидаю / Слушаю / Думаю / Говорю
- Hold-to-talk (удерживать кнопку микрофона)
- Текст последнего ответа агента
- Озвучка через системный TTS (`AVSpeechSynthesizer`)
- SSE `/api/shell/stream` + REST `/api/shell/message`

## Структура

```
AgentShell/
  App/           — точка входа
  Config/        — URL CMS, agentId (UserDefaults)
  Models/        — фазы, статус, сообщения
  Services/      — API, SSE, STT, TTS
  ViewModels/    — связка UI и сервисов
  Views/         — экраны SwiftUI
  Resources/     — Info.plist, Assets
```

## Сборка

1. Установите [Xcode](https://developer.apple.com/xcode/) 15+
2. Сгенерируйте проект (опционально):

   ```bash
   brew install xcodegen   # один раз
   cd mobile/iphone-shell
   xcodegen generate
   ```

3. Откройте `AgentShell.xcodeproj`, выберите свой iPhone или симулятор, Run (⌘R)

4. На устройстве: **Настройки** (⚙️) → URL CMS → `http://<IP-Mac>:3000`, agent → `agent-cms-test`

   IP Mac: `ipconfig getifaddr en0` (часто `192.168.0.x`, не `192.168.1.x`).

## CMS на Mac

```bash
HOST=0.0.0.0 npm start
```

Узнать IP Mac: **Системные настройки → Сеть** или `ipconfig getifaddr en0`.

## Разрешения

При первом запуске iOS запросит доступ к **микрофону** и **распознаванию речи** (ru-RU).
