/**
 * Electron URL-only shell: load AGENT_CMS_PUBLIC_URL + path; no embedded server.
 * Legacy embedded server: AGENT_CMS_ELECTRON_LEGACY=1
 */
const path = require("path");
const fs = require("fs");

function loadPublicUrlModule() {
  const ids = [
    path.join(__dirname, "../lib/desktop/public-url"),
    path.join(__dirname, "../../lib/desktop/public-url")
  ];
  let lastErr;
  for (const id of ids) {
    try {
      return require(id);
    } catch (err) {
      lastErr = err;
      if (err.code !== "MODULE_NOT_FOUND") throw err;
    }
  }
  throw lastErr;
}

const {
  findRepoRoot,
  getPublicBaseUrl,
  joinPublicPath,
  probeCmsHttp
} = loadPublicUrlModule();

const APP_PATHS = {
  editor: { path: "/", title: "Agent CMS", short: "Editor" },
  voice: { path: "/app-chat/", title: "Agent Shell", short: "Chat" },
  control: { path: "/app-control/", title: "Agent CMS Control", short: "Control" },
  commander: { path: "/app-commander/", title: "Agent CMS Commander", short: "Commander" }
};

function isUrlOnlyMode() {
  if (process.env.AGENT_CMS_ELECTRON_LEGACY === "1") return false;
  return true;
}

function appendDesktopQuery(urlString) {
  try {
    const url = new URL(urlString);
    if (url.searchParams.get("desktop") !== "1") url.searchParams.set("desktop", "1");
    return url.toString();
  } catch {
    return urlString;
  }
}

function resolveIcon(desktopDir) {
  const candidates = [
    path.join(desktopDir, "assets", "icon.png"),
    path.join(desktopDir, "icon.png"),
    path.join(desktopDir, "assets", "icon.icns")
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function loadOfflinePage(win, meta, baseUrl, desktopDir) {
  const offlinePath = path.join(__dirname, "offline.html");
  const iconPath = resolveIcon(desktopDir);
  const query = {
    app: meta.title,
    appId: meta.appId || "",
    base: baseUrl || "—"
  };
  if (iconPath) query.icon = iconPath;
  return win.loadFile(offlinePath, { query });
}

/**
 * @param {string} desktopDir - __dirname of desktop/agent-*
 * @param {'editor'|'voice'|'control'|'commander'} appId
 * @returns {boolean} true if URL shell took over (caller should not run legacy main)
 */
function tryBootstrapUrlOnly(desktopDir, appId) {
  if (!isUrlOnlyMode()) return false;

  const electron = require("electron");
  if (!electron.app) return false;

  if (!APP_PATHS[appId]) return false;
  const meta = { ...APP_PATHS[appId], appId };

  const { app, BrowserWindow, shell, screen, ipcMain } = electron;
  const repoRoot = findRepoRoot(desktopDir);
  let mainWindow = null;
  let targetUrl = null;
  let publicBase = getPublicBaseUrl(repoRoot);

  async function resolveTargetUrl() {
    publicBase = getPublicBaseUrl(repoRoot);
    const override = String(process.env.AGENT_CMS_ELECTRON_URL || "").trim();
    if (override) return appendDesktopQuery(override);
    return appendDesktopQuery(joinPublicPath(publicBase, meta.path));
  }

  async function loadMainContent() {
    targetUrl = await resolveTargetUrl();
    publicBase = getPublicBaseUrl(repoRoot);
    const probe = await probeCmsHttp(publicBase);
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (probe.ok) {
      await mainWindow.loadURL(targetUrl);
      return;
    }
    await loadOfflinePage(mainWindow, meta, publicBase, desktopDir);
  }

  function bindWindowTitle(win) {
    win.webContents.on("page-title-updated", (event) => {
      event.preventDefault();
    });
    win.webContents.on("did-finish-load", () => {
      if (!win.isDestroyed()) win.setTitle(meta.title);
    });
  }

  function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      return mainWindow;
    }

    const { workArea } = screen.getPrimaryDisplay();
    mainWindow = new BrowserWindow({
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
      minWidth: 900,
      minHeight: 600,
      show: false,
      title: meta.title,
      backgroundColor: "#e8f4fc",
      icon: resolveIcon(desktopDir),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, "url-shell-preload.js")
      }
    });

    bindWindowTitle(mainWindow);

    mainWindow.once("ready-to-show", () => {
      mainWindow.setTitle(meta.title);
      mainWindow.show();
      mainWindow.focus();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    loadMainContent().catch((err) => console.error(err));
    return mainWindow;
  }

  ipcMain.handle("url-shell:retry", () => loadMainContent());

  app.whenReady().then(() => {
    if (typeof app.setName === "function") app.setName(meta.title);
    createWindow();
  });

  app.on("activate", () => {
    createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  return true;
}

module.exports = { tryBootstrapUrlOnly, isUrlOnlyMode, APP_PATHS };
