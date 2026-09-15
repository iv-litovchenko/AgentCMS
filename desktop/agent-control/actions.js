const ACTIONS = [
  {
    id: "install-deps",
    category: "setup",
    title: "Установить зависимости",
    description:
      "npm install, Python 3.12, ffmpeg, faster-whisper. Нужно один раз при первом запуске.",
    command: "bash",
    args: ["scripts/install-deps.sh"],
    tone: "primary"
  },
  {
    id: "setup-certs",
    category: "setup",
    title: "Сертификаты HTTPS",
    description: "Dev-сертификаты в .dev-certs/ для https://localhost без предупреждений браузера.",
    command: "npm",
    args: ["run", "setup:certs"],
    tone: "default"
  },
  {
    id: "server-start-bg",
    category: "server",
    title: "Запустить",
    command: "bash",
    args: ["scripts/agent-https-service.sh", "start-direct"],
    tone: "primary",
    preflight: "certs",
    serverRole: "start"
  },
  {
    id: "server-stop",
    category: "server",
    title: "Остановить",
    command: "bash",
    args: ["scripts/agent-https-service.sh", "stop"],
    tone: "danger",
    serverRole: "stop"
  },
  {
    id: "server-start-attached",
    category: "server",
    title: "Пока Control открыт",
    tone: "default",
    preflight: "certs",
    serverRole: "attached"
  },
  {
    id: "cms-open",
    category: "apps",
    title: "Запустить",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "cms", "open"],
    tone: "primary",
    appId: "cms",
    appRole: "open"
  },
  {
    id: "cms-rebuild",
    category: "apps",
    title: "Пересобрать",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "cms", "rebuild"],
    tone: "default",
    appId: "cms",
    appRole: "rebuild"
  },
  {
    id: "voice-open",
    category: "apps",
    title: "Запустить",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "shell", "open"],
    tone: "primary",
    appId: "voice",
    appRole: "open"
  },
  {
    id: "voice-rebuild",
    category: "apps",
    title: "Пересобрать",
    command: "bash",
    args: ["scripts/launch-desktop-app.sh", "shell", "rebuild"],
    tone: "default",
    appId: "voice",
    appRole: "rebuild"
  },
  {
    id: "control-dist",
    category: "control",
    title: "Пересобрать Control",
    command: "npm",
    args: ["run", "control:dist"],
    tone: "default",
    controlRole: "dist"
  },
  {
    id: "control-launcher",
    category: "control",
    title: "Ярлык в корне",
    command: "npm",
    args: ["run", "control:launcher"],
    tone: "primary",
    controlRole: "launcher"
  }
];

const APP_PRODUCTS = [
  {
    id: "cms",
    title: "Agent CMS",
    subtitle: "Редактор контента",
    badge: "Editor",
    accent: "cms",
    icon: "cms.svg",
    appBundle: "Agent CMS.app",
    npmRebuild: "npm run cms:dist",
    openActionId: "cms-open",
    rebuildActionId: "cms-rebuild",
    needsServer: false
  },
  {
    id: "voice",
    title: "Agent CMS Voice",
    subtitle: "Голосовой клиент",
    badge: "Voice",
    accent: "voice",
    icon: "voice.svg",
    appBundle: "Agent Shell.app",
    npmRebuild: "npm run shell:dist",
    openActionId: "voice-open",
    rebuildActionId: "voice-rebuild",
    needsServer: true
  }
];

const CONTROL_SELF = {
  title: "Agent Control",
  subtitle: "Этот пульт",
  badge: "Control",
  accent: "control",
  icon: "favicon.svg",
  appBundle: "Agent Control.app",
  rootLauncher: "Agent Control.app (в корне проекта)",
  distActionId: "control-dist",
  launcherActionId: "control-launcher",
  npmDist: "npm run control:dist",
  npmLauncher: "npm run control:launcher"
};

const SETUP_ACTIONS = ["install-deps", "setup-certs"];

const SERVER_PORTS = {
  controlNote: "Agent Control — desktop-приложение, порта нет",
  editorHttps: 3443,
  editorHttp: 3000,
  voiceHttps: 3488,
  voiceHttp: 3088
};

module.exports = {
  ACTIONS,
  APP_PRODUCTS,
  CONTROL_SELF,
  SETUP_ACTIONS,
  SERVER_PORTS
};
