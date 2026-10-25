const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Commander must be started with Electron.");
  process.exit(1);
}

if (require("../shared/url-shell").tryBootstrapUrlOnly(__dirname, "commander")) {
  module.exports = {};
} else {
  bootstrapLegacyCommanderMain();
}

function bootstrapLegacyCommanderMain() {
const { app, BrowserWindow, dialog, screen } = electron;
const path = require("path");
const { getAppIcon } = require("./icon");
const { getProjectRoot, getCommanderBaseUrl, hasCommanderPublic, commanderIndexPath } = require("./config");
const { startCommanderServer, stopCommanderServer } = require("./server");

let mainWindow = null;
let serverInfo = null;
let shuttingDown = false;

async function ensureServer() {
  if (serverInfo) return serverInfo;
  const root = getProjectRoot();
  if (!hasCommanderPublic(root)) {
    const message =
      `Не найден UI Commander:\n${commanderIndexPath(root)}\n\n` +
      "Откройте Commander из клона YamlCMS на диске или задайте AGENT_CMS_ROOT на корень репозитория.";
    dialog.showErrorBox("Agent CMS Commander", message);
    throw new Error(message);
  }
  serverInfo = await startCommanderServer({ root });
  console.info(`Commander public root: ${serverInfo.publicRoot}`);
  return serverInfo;
}

function showFullWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (!win.isMaximized()) win.maximize();
  win.show();
  win.focus();
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showFullWindow(mainWindow);
    return mainWindow;
  }

  const { workArea } = screen.getPrimaryDisplay();

  mainWindow = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    show: false,
    minWidth: 420,
    minHeight: 360,
    title: "Agent CMS Commander",
    backgroundColor: "#0f1117",
    icon: getAppIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => showFullWindow(mainWindow));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function loadUi() {
  const info = await ensureServer();
  const win = createWindow();
  await win.loadURL(info.url || getCommanderBaseUrl());
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await stopCommanderServer();
  } catch {
    // ignore
  }
  serverInfo = null;
}

app.whenReady().then(() => {
  loadUi().catch((error) => {
    console.error(error);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void shutdown();
});

app.on("activate", () => {
  if (mainWindow) showFullWindow(mainWindow);
  else loadUi().catch((error) => console.error(error));
});
}
