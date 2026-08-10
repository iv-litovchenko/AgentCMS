```
project/
├── CLAUDE.md                  ← паспорт проекта (кто вы, правила)
├── refs/                      ← справочники по инструментам
│   ├── bitrix.md              ← CRM
│   ├── telegram.md            ← боты и Telethon
│   ├── notion.md              ← базы знаний
│   ├── google.md              ← календарь, YouTube API
│   ├── hh.md                  ← рекрутинг (HeadHunter)
│   ├── github.md
│   ├── figma-mcp.md
│   ├── cursor.md
│   ├── elementor.md
│   ├── camtasia.md
│   ├── cdek.md
│   ├── instagram.md
│   ├── kb-methodology.md
│   ├── mindmeister.md
│   ├── pencil.md
│   ├── perekrestok.md
│   ├── samokat.md
│   ├── snagit.md
│   ├── technical-patterns.md
│   ├── tochka.md
│   ├── tourvisor.md
│   ├── transcription.md
│   ├── tutor-lms.md
│   ├── vps.md
│   └── website.md
├── .claude/skills/            ← должностные инструкции (1 файл = 1 операция)
│   ├── analytics/
│   ├── content/
│   ├── crm/
│   │   └── create-invoice.md  ← пример: выставить счёт
│   ├── daemon/
│   ├── finance/
│   ├── hr/
│   ├── personal/
│   ├── playwright-cli/
│   ├── quality-control/
│   ├── sales/
│   ├── system/
│   ├── telegram/
│   ├── veonix/
│   └── website/
├── clients/                   ← досье на клиентов (за деньги)
│   └── bervel/
│       └── CONTEXT.md         ← локальный CLAUDE.md клиента
├── projects/                  ← свои инициативы (курс, книга, сайт)
├── scripts/                   ← точки входа (код, который пишет агент)
│   ├── run_bot.py
│   ├── transcribe.py
│   └── deploy_hr_bot.sh
└── data/                      ← хранилище данных (НЕ код)
    ├── auth/                  ← токены, сессии (в .gitignore!)
    ├── templates/             ← HTML-шаблоны (счета, КП, отчёты)
    ├── media/                 ← скриншоты, записи, видео
    ├── queue/                 ← очередь задач
    └── signals/               ← сигналы между процессами
```
