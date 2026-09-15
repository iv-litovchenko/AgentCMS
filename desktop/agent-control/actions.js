const ACTIONS = [
  {
    id: "install-deps",
    category: "setup",
    title: "Установить зависимости",
    description:
      "npm install, Python 3.12, ffmpeg, faster-whisper для голоса и прочие инструменты разработки.",
    command: "bash",
    args: ["scripts/install-deps.sh"],
    tone: "primary"
  },
  {
    id: "setup-certs",
    category: "setup",
    title: "Сертификаты HTTPS",
    description: "Создаёт или обновляет dev-сертификаты в .dev-certs/ (mkcert или openssl).",
    command: "npm",
    args: ["run", "setup:certs"],
    tone: "default"
  },
  {
    id: "server-start-bg",
    category: "server",
    title: "Сервер в фоне",
    description:
      "Запускает CMS и Voice в фоне. После старта можно закрыть окно — сервер останется работать.",
    command: "bash",
    args: ["scripts/agent-https-service.sh", "start-direct"],
    tone: "primary",
    opensUrl: "https://localhost:3488/",
    preflight: "certs"
  },
  {
    id: "server-stop",
    category: "server",
    title: "Остановить сервер",
    description: "Останавливает фоновый HTTPS-сервер Agent CMS и Voice.",
    command: "bash",
    args: ["scripts/agent-https-service.sh", "stop"],
    tone: "danger"
  },
  {
    id: "server-start",
    category: "server",
    title: "Сервер в этом окне",
    description:
      "Запуск в терминале: логи видны здесь, остановка — Ctrl+C. Удобно для отладки.",
    command: "npm",
    args: ["run", "start:https"],
    tone: "default",
    preflight: "certs"
  },
  {
    id: "cms-open",
    category: "apps",
    title: "Agent CMS",
    description: "Открывает собранный редактор Agent CMS.app (пересборка не выполняется).",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "cms", "open"],
    tone: "primary"
  },
  {
    id: "cms-rebuild",
    category: "apps",
    title: "Пересобрать Agent CMS",
    description: "Полная сборка desktop-приложения редактора и открытие .app.",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "cms", "rebuild"],
    tone: "default"
  },
  {
    id: "shell-open",
    category: "apps",
    title: "Agent Shell",
    description: "Открывает голосовую оболочку Agent Shell.app без пересборки.",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "shell", "open"],
    tone: "primary"
  },
  {
    id: "shell-rebuild",
    category: "apps",
    title: "Пересобрать Agent Shell",
    description: "Сборка desktop-приложения Shell и запуск .app.",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "shell", "rebuild"],
    tone: "default"
  }
];

const CATEGORIES = [
  { id: "setup", label: "Установка", hint: "Первый запуск и окружение" },
  { id: "server", label: "Сервер", hint: "CMS + Voice в браузере" },
  { id: "apps", label: "Приложения", hint: "Desktop .app" }
];

module.exports = {
  ACTIONS,
  CATEGORIES
};
