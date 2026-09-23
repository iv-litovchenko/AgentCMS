const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS desktop must be started with Electron: npm run cms:desktop");
  process.exit(1);
}

const { app, BrowserWindow, shell, dialog, ipcMain } = electron;
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { startServer, stopServer } = require("../../server");
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

function isLoopbackHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isPrivateNetworkHost(hostname) {
  const host = String(hostname || "").trim();
  if (isLoopbackHost(host)) return true;
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

function normalizeLoopbackUrl(urlString) {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    url.hostname = "127.0.0.1";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return urlString;
  }
}

function getDesktopWindowBaseUrl() {
  if (!serverInfo) return null;
  if (serverInfo.httpUrl) return normalizeLoopbackUrl(serverInfo.httpUrl);
  if (serverInfo.port) return `http://127.0.0.1:${serverInfo.port}`;
  if (serverInfo.url && String(serverInfo.url).startsWith("http://")) {
    return normalizeLoopbackUrl(serverInfo.url);
  }
  if (serverInfo.tlsPort) return `https://127.0.0.1:${serverInfo.tlsPort}`;
  if (serverInfo.httpsUrl) return normalizeLoopbackUrl(serverInfo.httpsUrl);
  return normalizeLoopbackUrl(serverInfo.url);
}

function getPreferredServerUrl() {
  return getDesktopWindowBaseUrl();
}

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

  const tlsEnvBackup = {
    TLS_KEY: process.env.TLS_KEY,
    TLS_CERT: process.env.TLS_CERT,
    HTTPS_REDIRECT: process.env.HTTPS_REDIRECT
  };
  delete process.env.TLS_KEY;
  delete process.env.TLS_CERT;
  process.env.HTTPS_REDIRECT = "0";

  try {
    serverInfo = await startServer({
      root,
      appRoot: getBundledProjectRoot(),
      host: "127.0.0.1",
      port: Number(process.env.PORT) || 3000,
      tryNextPort: true
    });
  } finally {
    if (tlsEnvBackup.TLS_KEY !== undefined) process.env.TLS_KEY = tlsEnvBackup.TLS_KEY;
    else delete process.env.TLS_KEY;
    if (tlsEnvBackup.TLS_CERT !== undefined) process.env.TLS_CERT = tlsEnvBackup.TLS_CERT;
    else delete process.env.TLS_CERT;
    if (tlsEnvBackup.HTTPS_REDIRECT !== undefined) {
      process.env.HTTPS_REDIRECT = tlsEnvBackup.HTTPS_REDIRECT;
    } else {
      delete process.env.HTTPS_REDIRECT;
    }
  }

  activeProjectRoot = root;
  const cmsBaseUrl = getDesktopWindowBaseUrl() || serverInfo.httpUrl || serverInfo.url;
  const voiceBaseUrl =
    serverInfo.voiceHttpUrl || serverInfo.voiceUrl || serverInfo.voiceHttpsUrl || null;
  saveConfig({
    projectRoot: root,
    cmsBaseUrl,
    cmsHttpUrl: serverInfo.httpUrl ? normalizeLoopbackUrl(serverInfo.httpUrl) : null,
    voiceBaseUrl: voiceBaseUrl ? normalizeLoopbackUrl(voiceBaseUrl) : null,
    voiceHttpUrl: serverInfo.voiceHttpUrl ? normalizeLoopbackUrl(serverInfo.voiceHttpUrl) : null
  });
  console.info(`Server started at ${cmsBaseUrl} (workspace: ${root})`);
  if (voiceBaseUrl) console.info(`Voice at ${voiceBaseUrl}`);
  return serverInfo;
}

function getWindowUrl(deepLink = pendingDeepLink) {
  const baseUrl = getPreferredServerUrl();
  if (!baseUrl) return null;
  return buildAppUrl(baseUrl, deepLink);
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
  const wsListAgentsPath = path.join(selectedRoot, ".agent-cms", "ws-list-agents.json");
  const legacyRegistryPath = path.join(selectedRoot, "awn-agents.json");
  if (!fs.existsSync(wsListAgentsPath) && !fs.existsSync(legacyRegistryPath)) {
    const response = dialog.showMessageBoxSync(mainWindow || undefined, {
      type: "warning",
      title: "Workspace",
      message: "В выбранной папке нет реестра агентов",
      detail: "Ожидается .agent-cms/ws-list-agents.json (или legacy awn-agents.json). Список агентов нужно будет настроить вручную.",
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
    await mainWindow.loadURL(getWindowUrl() || getPreferredServerUrl());
    return;
  }

  await createWindow();
}

function launchAgentShellApp() {
  const packagedApp = path.join(getBundledProjectRoot(), "dist/agent-shell/Agent Shell.app");
  if (fs.existsSync(packagedApp)) {
    shell.openPath(packagedApp).catch((error) => console.error(error));
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "shell:desktop"], {
    cwd: getBundledProjectRoot(),
    detached: true,
    stdio: "ignore",
    env: process.env
  });
  child.unref();
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

    const initialUrl = getWindowUrl() || getPreferredServerUrl();
    await mainWindow.loadURL(initialUrl);
    pendingDeepLink = null;

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      const baseUrl = getPreferredServerUrl() || serverInfo.url;
      if (url.startsWith(baseUrl)) {
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

app.on("certificate-error", (event, _webContents, url, _error, _certificate, callback) => {
  try {
    const hostname = new URL(url).hostname;
    if (isPrivateNetworkHost(hostname)) {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch {
    // ignore malformed URL
  }
  callback(false);
});

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
    onShowShell: () => {
      launchAgentShellApp();
    },
    onQuit: requestQuit
  });

  createTray({
    onShow: () => showMainWindow(),
    onShell: () => {
      launchAgentShellApp();
    },
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
