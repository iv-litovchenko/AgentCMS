const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS desktop must be started with Electron: npm run desktop");
  process.exit(1);
}

const { app, BrowserWindow, shell, dialog, ipcMain } = electron;
const fs = require("fs");
const path = require("path");
const { startServer, stopServer } = require("../server");
const { initLogger } = require("./logger");
const { saveConfig, getProjectRoot } = require("./config");
const { findDeepLinkInArgv, buildAppUrl, registerProtocol, parseDeepLink } = require("./deep-link");
const { createTray, destroyTray } = require("./tray");
const { buildApplicationMenu } = require("./menu");
const { initAutoUpdater } = require("./updater");
const { getAppIcon } = require("./icon");
const { ensureWritableProject, getBundledProjectRoot } = require("./project-root");

const defaultAppPath = path.resolve(process.argv[1] || getBundledProjectRoot());

let mainWindow = null;
let serverInfo = null;
let isStarting = false;
let shuttingDown = false;
let appReady = false;
let pendingShowWindow = false;
let pendingDeepLink = findDeepLinkInArgv(process.argv);
let activeProjectRoot = getBundledProjectRoot();

function resolveProjectRoot() {
  return getProjectRoot(ensureWritableProject(app));
}

function markPendingShowWindow() {
  pendingShowWindow = true;
}

function showMainWindow() {
  if (!appReady) {
    markPendingShowWindow();
    return undefined;
  }
  if (!mainWindow) {
    return createWindow();
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  return Promise.resolve();
}

async function startAppServer(root) {
  if (serverInfo) {
    await serverInfo.stop();
    serverInfo = null;
  }

  serverInfo = await startServer({
    root,
    appRoot: getBundledProjectRoot(),
    host: "127.0.0.1",
    port: Number(process.env.PORT) || 3000,
    tryNextPort: true
  });

  activeProjectRoot = root;
  console.info(`Server started at ${serverInfo.url} (workspace: ${root})`);
  return serverInfo;
}

function getWindowUrl(deepLink = pendingDeepLink) {
  if (!serverInfo) return null;
  return buildAppUrl(serverInfo.url, deepLink);
}

async function navigateWithDeepLink(deepLink) {
  pendingDeepLink = deepLink;
  if (!mainWindow || !serverInfo) return;
  const targetUrl = getWindowUrl(deepLink);
  if (targetUrl) {
    await mainWindow.loadURL(targetUrl);
  }
}

function handleDeepLink(rawUrl) {
  const parsed = parseDeepLink(rawUrl);
  if (!parsed) return;
  pendingDeepLink = parsed;
  if (!appReady) {
    markPendingShowWindow();
    return;
  }
  showMainWindow();
  navigateWithDeepLink(parsed);
}

function getMainWindow() {
  return mainWindow;
}

async function revealFolderFromDesktop({ relPath, agentId }) {
  if (!serverInfo?.url) throw new Error("Сервер ещё не запущен");
  if (!relPath) throw new Error("Не выбран элемент");

  const url = new URL("/api/reveal/folder", serverInfo.url);
  url.searchParams.set("agent", String(agentId || "").trim());
  url.searchParams.set("path", String(relPath));

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || `HTTP ${response.status}`);
  }
  if (!data.folderAbsolute) throw new Error("Не удалось определить путь к папке");

  const openError = await shell.openPath(data.folderAbsolute);
  if (openError) throw new Error(openError);
  return data;
}

async function revealFileFromDesktop({ relPath, file, agentId }) {
  if (!serverInfo?.url) throw new Error("Сервер ещё не запущен");
  if (!relPath) throw new Error("Не выбран элемент");
  if (!file) throw new Error("Не выбран файл");

  const url = new URL("/api/reveal/file", serverInfo.url);
  url.searchParams.set("agent", String(agentId || "").trim());
  url.searchParams.set("path", String(relPath));
  url.searchParams.set("file", String(file));

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || `HTTP ${response.status}`);
  }
  if (!data.fileAbsolute) throw new Error("Не удалось определить путь к файлу");

  shell.showItemInFolder(data.fileAbsolute);
  return data;
}

function registerDesktopIpcHandlers() {
  ipcMain.handle("desktop:reveal-folder", async (_event, payload) => revealFolderFromDesktop(payload || {}));
  ipcMain.handle("desktop:reveal-file", async (_event, payload) => revealFileFromDesktop(payload || {}));
}

async function openWorkspaceDialog() {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: "Open Workspace",
    properties: ["openDirectory"]
  });

  if (result.canceled || !result.filePaths[0]) return;

  const selectedRoot = path.resolve(result.filePaths[0]);
  const registryPath = path.join(selectedRoot, "awn-agents.json");
  if (!fs.existsSync(registryPath)) {
    const response = dialog.showMessageBoxSync(mainWindow || undefined, {
      type: "warning",
      title: "Workspace",
      message: "В выбранной папке нет awn-agents.json",
      detail: "Agent CMS может использовать эту папку как корень проекта, но список агентов нужно будет настроить вручную.",
      buttons: ["Использовать", "Отмена"],
      defaultId: 0,
      cancelId: 1
    });
    if (response !== 0) return;
  }

  saveConfig({ projectRoot: selectedRoot });
  await switchProjectRoot(selectedRoot);
}

async function switchProjectRoot(newRoot) {
  await startAppServer(newRoot);
  pendingDeepLink = null;

  if (mainWindow) {
    await mainWindow.loadURL(serverInfo.url);
    return;
  }

  await createWindow();
}

async function createWindow() {
  if (!app.isReady()) {
    markPendingShowWindow();
    return;
  }
  if (mainWindow || isStarting) return;
  isStarting = true;

  try {
    if (!serverInfo) {
      const configuredRoot = resolveProjectRoot();
      await startAppServer(configuredRoot);
    }

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      title: "Agent CMS",
      icon: getAppIcon(),
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow?.show();
    });

    const initialUrl = getWindowUrl() || serverInfo.url;
    await mainWindow.loadURL(initialUrl);
    pendingDeepLink = null;

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(serverInfo.url)) {
        return { action: "allow" };
      }
      shell.openExternal(url);
      return { action: "deny" };
    });

    mainWindow.on("close", (event) => {
      if (shuttingDown) return;
      event.preventDefault();
      mainWindow?.hide();
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  } catch (error) {
    console.error("Failed to start Agent CMS desktop app:", error);
    dialog.showErrorBox("Agent CMS", `Не удалось запустить приложение:\n${error.message}`);
    app.quit();
  } finally {
    isStarting = false;
  }
}

function requestQuit() {
  shuttingDown = true;
  app.quit();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((item) => typeof item === "string" && item.startsWith("agentcms://"));
    if (url) {
      handleDeepLink(url);
      return;
    }
    showMainWindow();
  });
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  const parsed = parseDeepLink(url);
  if (!parsed) return;
  if (app.isReady()) {
    handleDeepLink(url);
  } else {
    pendingDeepLink = parsed;
  }
});

app.whenReady().then(async () => {
  const logInfo = initLogger();
  console.info("Agent CMS desktop starting");
  console.info(`Logs: ${logInfo.logDir}`);

  registerProtocol(defaultAppPath);
  registerDesktopIpcHandlers();

  buildApplicationMenu({
    app,
    mainWindow,
    onOpenWorkspace: () => {
      openWorkspaceDialog().catch((error) => console.error(error));
    },
    onShowWindow: () => {
      showMainWindow();
    },
    onQuit: requestQuit
  });

  createTray({
    onShow: () => showMainWindow(),
    onQuit: requestQuit
  });

  initAutoUpdater({ app, getMainWindow });

  appReady = true;
  await createWindow();

  if (pendingShowWindow) {
    pendingShowWindow = false;
    showMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    requestQuit();
  }
});

app.on("activate", () => {
  if (!appReady) {
    markPendingShowWindow();
    return;
  }
  showMainWindow();
});

app.on("before-quit", async (event) => {
  if (shuttingDown) return;
  if (!serverInfo) return;

  event.preventDefault();
  shuttingDown = true;

  try {
    destroyTray();
    await serverInfo.stop();
    serverInfo = null;
  } catch (error) {
    console.error("Failed to stop server:", error);
  }

  app.quit();
});

process.on("SIGINT", () => {
  requestQuit();
});

module.exports = {
  getMainWindow,
  getActiveProjectRoot: () => activeProjectRoot
};
