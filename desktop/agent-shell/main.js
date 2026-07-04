const electron = require("electron");

if (!electron.app) {
  console.error("Agent Shell must be started with Electron.");
  process.exit(1);
}

const { app, BrowserWindow, dialog, shell, ipcMain } = electron;
const path = require("path");
const {
  getCmsBaseUrl,
  getProjectRoot,
  saveConfig
} = require("./config");
const { getAppIcon } = require("./icon");

const REPO_ROOT = path.join(__dirname, "..", "..");
const PROTOCOL = "agentshell";

let mainWindow = null;
let ownedServer = null;
let cmsBaseUrl = getCmsBaseUrl();
let shuttingDown = false;

function getRepoRoot() {
  return getProjectRoot(REPO_ROOT);
}

async function probeCms(baseUrl) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/agents`, {
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return null;
    return baseUrl.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function startEmbeddedServer() {
  if (ownedServer) return ownedServer.url;
  const { startServer } = require(path.join(getRepoRoot(), "server.js"));
  ownedServer = await startServer({
    root: getRepoRoot(),
    appRoot: getRepoRoot(),
    host: "127.0.0.1",
    port: Number(process.env.PORT || 3000),
    tryNextPort: true
  });
  cmsBaseUrl = ownedServer.url;
  saveConfig({ cmsBaseUrl, projectRoot: getRepoRoot() });
  console.info(`Agent Shell started CMS backend at ${cmsBaseUrl}`);
  return cmsBaseUrl;
}

async function ensureCmsAvailable() {
  cmsBaseUrl = getCmsBaseUrl();
  const alive = await probeCms(cmsBaseUrl);
  if (alive) {
    cmsBaseUrl = alive;
    return cmsBaseUrl;
  }

  if (app.isPackaged) {
    throw new Error(
      "Agent CMS не запущен. Сначала откройте Agent CMS или выполните npm start в проекте."
    );
  }

  return startEmbeddedServer();
}

function buildShellUrl() {
  return new URL("/shell/index.html", `${cmsBaseUrl}/`).toString();
}

function applyNativeWindowSettings(settings = {}) {
  if (!mainWindow) return;
  const topmost = settings.windowTopmost !== false;
  mainWindow.setAlwaysOnTop(topmost, "floating");
  if (process.platform === "darwin" && typeof mainWindow.setVisibleOnAllWorkspaces === "function") {
    mainWindow.setVisibleOnAllWorkspaces(topmost, { visibleOnFullScreen: true });
  }
  const transparent = Boolean(settings.windowTransparent || settings.windowBackground === "transparent");
  if (typeof mainWindow.setBackgroundColor === "function") {
    mainWindow.setBackgroundColor(transparent ? "#00000000" : "#0f1020");
  }
}

async function createWindow() {
  await ensureCmsAvailable();

  if (mainWindow) {
    await mainWindow.loadURL(buildShellUrl());
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 460,
    height: 780,
    minWidth: 380,
    minHeight: 640,
    title: "Agent Shell",
    icon: getAppIcon(),
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
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

  await mainWindow.loadURL(buildShellUrl());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(cmsBaseUrl)) {
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
}

function showMainWindow() {
  if (!mainWindow) {
    return createWindow();
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  return Promise.resolve();
}

function registerProtocol() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1] || ".")]);
    return;
  }
  app.setAsDefaultProtocolClient(PROTOCOL);
}

async function bootstrap() {
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    dialog.showErrorBox(
      "Agent Shell",
      `${error.message || error}\n\nПодсказка: запустите Agent CMS (npm run cms:desktop) или npm start.`
    );
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showMainWindow().catch((error) => console.error(error));
  });

  app.whenReady().then(() => {
    registerProtocol();
    ipcMain.handle("shell:apply-window-settings", (_event, settings) => {
      applyNativeWindowSettings(settings);
      return { ok: true };
    });
    bootstrap();
  });

  app.on("activate", () => {
    showMainWindow().catch((error) => console.error(error));
  });

  app.on("before-quit", async () => {
    shuttingDown = true;
    if (ownedServer?.stop) {
      try {
        await ownedServer.stop();
      } catch (error) {
        console.error(error);
      }
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
