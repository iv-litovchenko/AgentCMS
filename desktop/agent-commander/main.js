const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Commander must be started with Electron.");
  process.exit(1);
}

const { app, BrowserWindow } = electron;
const path = require("path");
const { getAppIcon } = require("./icon");
const { getProjectRoot, getCommanderBaseUrl } = require("./config");
const { startCommanderServer, stopCommanderServer } = require("./server");

let mainWindow = null;
let serverInfo = null;
let shuttingDown = false;

async function ensureServer() {
  if (serverInfo) return serverInfo;
  const root = getProjectRoot();
  serverInfo = await startCommanderServer({ root });
  return serverInfo;
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 720,
    height: 560,
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
  if (mainWindow) mainWindow.show();
  else loadUi().catch((error) => console.error(error));
});
