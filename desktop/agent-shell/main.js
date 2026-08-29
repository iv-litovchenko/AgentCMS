const electron = require("electron");

if (!electron.app) {
  console.error("Agent Shell must be started with Electron.");
  process.exit(1);
}

const { app, BrowserWindow, dialog, shell, ipcMain, screen } = electron;
const path = require("path");
const {
  getCmsBaseUrl,
  getVoiceBaseUrl,
  getProjectRoot,
  loadConfig,
  saveConfig,
  loadSharedCmsConfig
} = require("./config");
const { getAppIcon } = require("./icon");

const WINDOW_PROFILE_NORMAL = {
  width: 460,
  height: 780,
  minWidth: 320,
  minHeight: 500
};

const WINDOW_PROFILE_COMPACT = {
  width: 300,
  height: 148,
  minWidth: 260,
  minHeight: 120
};

const REPO_ROOT = path.join(__dirname, "..", "..");
const PROTOCOL = "agentshell";

const PET_WINDOW_SIZE = { width: 220, height: 260 };
const PET_WINDOW_MARGIN = 18;

let mainWindow = null;
let petWindow = null;
let ownedServer = null;
let cmsBaseUrl = getCmsBaseUrl();
let voiceBaseUrl = getVoiceBaseUrl();
let shuttingDown = false;

function getRepoRoot() {
  return getProjectRoot(REPO_ROOT);
}

async function probeService(baseUrl, healthPath = "/api/agents") {
  if (!baseUrl) return null;
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}${healthPath}`, {
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return null;
    return baseUrl.replace(/\/+$/, "");
  } catch {
    return null;
  } finally {
    if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
  }
}

async function probeCms(baseUrl) {
  return probeService(baseUrl, "/api/agents");
}

async function probeVoice(baseUrl) {
  return probeService(baseUrl, "/");
}

async function discoverCmsBaseUrl() {
  const shared = loadSharedCmsConfig();
  const candidates = [
    getCmsBaseUrl(),
    shared.cmsBaseUrl,
    shared.cmsHttpUrl,
    "https://127.0.0.1:3443",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002"
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    const base = String(candidate || "").trim();
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const alive = await probeCms(base);
    if (alive) return alive;
  }
  return null;
}

async function discoverVoiceBaseUrl(cmsUrl) {
  const shared = loadSharedCmsConfig();
  const candidates = [
    getVoiceBaseUrl(),
    shared.voiceBaseUrl,
    shared.voiceHttpUrl
  ];
  if (cmsUrl) {
    try {
      const cms = new URL(cmsUrl);
      candidates.push(`https://${cms.hostname}:3488`, `http://${cms.hostname}:3088`);
    } catch {
      // ignore
    }
  }
  const seen = new Set();
  for (const candidate of candidates) {
    const base = String(candidate || "").trim();
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const alive = await probeVoice(base);
    if (alive) return alive;
  }
  return null;
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
  cmsBaseUrl = ownedServer.httpUrl || ownedServer.url;
  voiceBaseUrl = ownedServer.voiceHttpUrl || ownedServer.voiceUrl || voiceBaseUrl;
  saveConfig({ cmsBaseUrl, voiceBaseUrl, projectRoot: getRepoRoot() });
  console.info(`Agent Shell started CMS backend at ${cmsBaseUrl}`);
  if (voiceBaseUrl) console.info(`Agent CMS Voice at ${voiceBaseUrl}`);
  return cmsBaseUrl;
}

async function ensureCmsAvailable() {
  cmsBaseUrl = getCmsBaseUrl();
  voiceBaseUrl = getVoiceBaseUrl();
  const alive = await discoverCmsBaseUrl();
  if (alive) {
    cmsBaseUrl = alive;
    voiceBaseUrl = (await discoverVoiceBaseUrl(cmsBaseUrl)) || voiceBaseUrl;
    saveConfig({ cmsBaseUrl, voiceBaseUrl, projectRoot: getRepoRoot() });
    return cmsBaseUrl;
  }

  if (app.isPackaged) {
    throw new Error(
      "Agent CMS не найден. Сначала откройте Agent CMS.app, дождитесь загрузки редактора, затем запустите Agent Shell."
    );
  }

  return startEmbeddedServer();
}

function buildShellUrl() {
  const agentId = String(process.env.AGENT_CMS_AGENT || "").trim();
  if (voiceBaseUrl) {
    const base = voiceBaseUrl.replace(/\/+$/, "");
    if (agentId) return `${base}/${encodeURIComponent(agentId)}/`;
    return `${base}/`;
  }
  return new URL("/shell/index.html", `${cmsBaseUrl}/`).toString();
}

function buildPetUrl() {
  const base = (voiceBaseUrl || cmsBaseUrl || "").replace(/\/+$/, "");
  if (!base) return "about:blank";
  return `${base}/shell/pet.html`;
}

function positionPetWindow(win = petWindow) {
  if (!win || win.isDestroyed()) return;
  const saved = loadConfig().petBounds;
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    win.setPosition(Math.round(saved.x), Math.round(saved.y));
    return;
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const [winW, winH] = win.getSize();
  const x = area.x + Math.max(0, area.width - winW - PET_WINDOW_MARGIN);
  const y = area.y + Math.max(0, area.height - winH - PET_WINDOW_MARGIN);
  win.setPosition(x, y);
}

function persistPetBounds() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  saveConfig({ petBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
}

async function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    positionPetWindow(petWindow);
    petWindow.showInactive();
    petWindow.setAlwaysOnTop(true, "screen-saver");
    return petWindow;
  }

  petWindow = new BrowserWindow({
    width: PET_WINDOW_SIZE.width,
    height: PET_WINDOW_SIZE.height,
    minWidth: 160,
    minHeight: 180,
    maxWidth: 360,
    maxHeight: 420,
    title: "Agent CMS Voice",
    icon: getAppIcon(),
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    hasShadow: false,
    resizable: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    type: process.platform === "darwin" ? "panel" : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: ["--shell-pet-overlay"],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.platform === "darwin" && typeof petWindow.setVisibleOnAllWorkspaces === "function") {
    petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  petWindow.setAlwaysOnTop(true, "screen-saver");
  positionPetWindow(petWindow);

  petWindow.on("moved", persistPetBounds);
  petWindow.on("resized", persistPetBounds);
  petWindow.on("close", (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    hidePetWindow();
  });
  petWindow.on("closed", () => {
    petWindow = null;
  });

  await petWindow.loadURL(buildPetUrl());
  petWindow.showInactive();
  return petWindow;
}

function hidePetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    persistPetBounds();
    petWindow.hide();
  }
}

function applyPetOverlay(enabled) {
  if (enabled) {
    void createPetWindow().catch((error) => console.error(error));
    return;
  }
  hidePetWindow();
}

const WINDOW_BOTTOM_MARGIN = 16;

function positionWindowBottomCenter(win = mainWindow) {
  if (!win) return;
  const display = screen.getDisplayMatching(win.getBounds());
  const area = display.workArea;
  const [winW, winH] = win.getSize();
  const x = area.x + Math.max(0, Math.round((area.width - winW) / 2));
  const y = area.y + Math.max(0, area.height - winH - WINDOW_BOTTOM_MARGIN);
  win.setPosition(x, y);
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

  applyPetOverlay(Boolean(settings.windowPetOverlay));

  const compact = Boolean(settings.windowCompact);
  const profile = compact ? WINDOW_PROFILE_COMPACT : WINDOW_PROFILE_NORMAL;
  mainWindow.setMinimumSize(profile.minWidth, profile.minHeight);
  if (compact) {
    mainWindow.setSize(profile.width, profile.height);
    positionWindowBottomCenter(mainWindow);
    return;
  }
  const [curW, curH] = mainWindow.getSize();
  const nextW = Math.max(profile.minWidth, curW < profile.minWidth ? profile.width : curW);
  const nextH = Math.max(profile.minHeight, curH < profile.minHeight ? profile.height : curH);
  mainWindow.setSize(nextW, nextH);
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
    width: WINDOW_PROFILE_NORMAL.width,
    height: WINDOW_PROFILE_NORMAL.height,
    minWidth: WINDOW_PROFILE_NORMAL.minWidth,
    minHeight: WINDOW_PROFILE_NORMAL.minHeight,
    title: "Agent Shell",
    icon: getAppIcon(),
    backgroundColor: "#0f1020",
    alwaysOnTop: true,
    show: false,
    titleBarStyle: "default",
    autoHideMenuBar: true,
    fullscreenable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.platform === "darwin" && typeof mainWindow.setWindowButtonVisibility === "function") {
    mainWindow.setWindowButtonVisibility(true);
  }

  const sendWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("shell:window-state", {
      maximized: Boolean(mainWindow.isMaximized())
    });
  };
  mainWindow.on("maximize", sendWindowState);
  mainWindow.on("unmaximize", sendWindowState);
  mainWindow.on("enter-full-screen", sendWindowState);
  mainWindow.on("leave-full-screen", sendWindowState);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  await mainWindow.loadURL(buildShellUrl());

  mainWindow.webContents.on("before-input-event", (_event, input) => {
    const code = String(input.code || "");
    if (code !== "ShiftLeft" && code !== "ShiftRight" && code !== "F18" && code !== "Fn") return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("shell:ptt-key", {
      pressed: input.type === "keyDown" && !input.isAutoRepeat,
      released: input.type === "keyUp"
    });
  });

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
    ipcMain.handle("shell:position-window-bottom-center", () => {
      positionWindowBottomCenter();
      return { ok: true };
    });
    ipcMain.handle("shell:window-control", (_event, action) => {
      if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, maximized: false };
      const name = String(action || "").trim();
      if (name === "minimize") mainWindow.minimize();
      else if (name === "maximize") {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
      } else if (name === "close") mainWindow.close();
      else return { ok: false, maximized: Boolean(mainWindow.isMaximized()) };
      return { ok: true, maximized: Boolean(mainWindow.isMaximized()) };
    });
    ipcMain.handle("shell:window-state", () => ({
      maximized: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized())
    }));
    ipcMain.handle("shell:show-main-window", () => {
      showMainWindow().catch((error) => console.error(error));
      return { ok: true };
    });
    ipcMain.handle("shell:set-pet-overlay", (_event, enabled) => {
      applyPetOverlay(Boolean(enabled));
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("shell:pet-overlay-changed", { enabled: Boolean(enabled) });
      }
      return { ok: true, enabled: Boolean(enabled) };
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
