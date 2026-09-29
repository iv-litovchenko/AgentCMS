const path = require("path");

function getProjectRootFromActions() {
  return path.join(__dirname, "..", "..");
}

function getServerPorts() {
  const root = getProjectRootFromActions();
  const portsMod = require(path.join(root, "lib", "config", "agent-cms-ports"));
  portsMod.hydrateProcessEnvFromRoot(root);
  return portsMod.getAgentCmsPorts();
}

function getChromeExtensionConfig() {
  const ports = getServerPorts();
  return {
    name: "Agent Shell Companion",
    folderName: "browser-extension",
    extensionsUrl: "chrome://extensions",
    cmsUrl: `https://localhost:${ports.editorHttps}`,
    voiceUrl: `https://localhost:${ports.voiceHttps}`
  };
}

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
    title: "Выпустить сертификаты HTTPS",
    description: "Dev-сертификаты в .dev-certs/ для https://localhost без предупреждений браузера.",
    command: "npm",
    args: ["run", "setup:certs"],
    tone: "default"
  },
  {
    id: "setup-desktop-shortcuts",
    category: "setup",
    title: "Создать ярлыки на Desktop",
    description: "Desktop: ACMS-Control, ACMS-Editor, ACMS-Voice, ACMS-Browser-Extension. Для .app — сначала «Собрать».",
    command: "node",
    args: ["scripts/create-desktop-shortcuts.js"],
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
    id: "server-restart",
    category: "server",
    title: "Перезапустить",
    command: "bash",
    args: ["scripts/agent-https-service.sh", "restart"],
    tone: "default",
    preflight: "certs",
    serverRole: "restart"
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
    args: ["run", "control:pack"],
    tone: "default",
    controlRole: "dist"
  }
];

const APP_PRODUCTS = [
  {
    id: "cms",
    title: "Agent CMS Editor",
    subtitle: "Редактор контента",
    badge: "Editor",
    accent: "cms",
    icon: "cms.svg",
    appBundle: "Agent CMS.app",
    npmRebuild: "npm run cms:pack",
    openActionId: "cms-open",
    rebuildActionId: "cms-rebuild"
  },
  {
    id: "voice",
    title: "Agent CMS Voice (Flow window)",
    subtitle: "Голосовой клиент",
    badge: "Voice",
    accent: "voice",
    icon: "voice.svg",
    appBundle: "Agent Shell.app",
    npmRebuild: "npm run shell:pack",
    openActionId: "voice-open",
    rebuildActionId: "voice-rebuild"
  }
];

const COMMANDER_SELF = {
  id: "commander",
  title: "Agent CMS Commander",
  subtitle: "Управление компьютером (заготовка)",
  badge: "Commander",
  accent: "commander",
  icon: "commander.svg",
  placeholder: true
};

const CONTROL_SELF = {
  title: "Agent CMS Control (Launcher)",
  subtitle: "Этот пульт",
  badge: "Control",
  accent: "control",
  icon: "favicon.svg",
  appBundle: "Agent CMS Control.app",
  distActionId: "control-dist",
  npmDist: "npm run control:pack"
};

const SETUP_ACTIONS = ["install-deps", "setup-certs", "setup-desktop-shortcuts"];

const SERVER_TEST = {
  path: "/",
  hint: "CMS отвечает по HTTPS"
};

const MCP_TEST = {
  path: "/api/agent/mcp-ping",
  hint: "test_mcp_connection — JSON с ok и mcpVersion"
};

function getServerPortsPayload() {
  const ports = getServerPorts();
  return {
    controlNote: "Agent CMS Control — desktop-приложение, порта нет",
    ...ports
  };
}

module.exports = {
  ACTIONS,
  APP_PRODUCTS,
  COMMANDER_SELF,
  CONTROL_SELF,
  SETUP_ACTIONS,
  getServerPorts,
  getServerPortsPayload,
  getChromeExtensionConfig,
  SERVER_TEST,
  MCP_TEST
};
