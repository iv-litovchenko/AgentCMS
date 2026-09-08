const electron = require("electron");

if (!electron.app) {
  console.error("Agent Shell must be started with Electron.");
  process.exit(1);
}

const { app, BrowserWindow, dialog, shell, ipcMain, screen, powerSaveBlocker } = electron;
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

const WINDOW_PROFILE_COMPACT_QA = {
  width: 340,
  height: 460,
  minWidth: 300,
  minHeight: 320
};

const REPO_ROOT = path.join(__dirname, "..", "..");
const PROTOCOL = "agentshell";

const PET_WINDOW_SIZE = { width: 240, height: 320 };
const PET_WINDOW_MARGIN = 18;

let mainWindow = null;
let petWindow = null;
let ownedServer = null;
let cmsBaseUrl = getCmsBaseUrl();
let voiceBaseUrl = getVoiceBaseUrl();
let shuttingDown = false;
let keepAwakeBlocker = null;

function applyKeepAwake(enabled) {
  const on = Boolean(enabled);
  if (on) {
    if (keepAwakeBlocker == null) {
      keepAwakeBlocker = powerSaveBlocker.start("prevent-display-sleep");
    }
    return;
  }
  if (keepAwakeBlocker != null) {
    powerSaveBlocker.stop(keepAwakeBlocker);
    keepAwakeBlocker = null;
  }
}

function broadcastPetPhase(payload = {}) {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.webContents.send("shell:pet-phase", payload);
}

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
  return `${base}/shell/pet.html?v=5&cb=534`;
}

async function syncPetCharacterFromMain() {
  if (!petWindow || petWindow.isDestroyed()) return;
  let modelId = "robot";
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const payload = await mainWindow.webContents.executeJavaScript(
        `(function(){try{var id=localStorage.getItem("shell-character-model")||"robot";return id==="cloud"||id==="minifig"?(id==="minifig"?"lego":"robot"):id;}catch(e){return"robot";}})()`,
        true
      );
      if (typeof payload === "string" && payload.trim()) modelId = payload.trim();
    } catch {
      // ignore
    }
  }
  broadcastPetPhase({ characterModel: modelId });
  await petWindow.webContents
    .executeJavaScript(
      `(function(){var s=document.getElementById("shell-pet-stage");if(!s||!s.shellCharacterApi)return;s.shellCharacterApi.setModel(${JSON.stringify(modelId)});s.shellCharacterApi.refresh();})()`,
      true
    )
    .catch(() => {});
}

function getPetWorkArea(win = petWindow) {
  if (!win || win.isDestroyed()) return screen.getPrimaryDisplay().workArea;
  const bounds = win.getBounds();
  const display = screen.getDisplayMatching(bounds);
  return display?.workArea || screen.getPrimaryDisplay().workArea;
}

function clampPetPosition(win, x, y) {
  const area = getPetWorkArea(win);
  const [winW, winH] = win.getSize();
  const minX = area.x + PET_WINDOW_MARGIN;
  const minY = area.y + PET_WINDOW_MARGIN;
  const maxX = area.x + area.width - winW - PET_WINDOW_MARGIN;
  const maxY = area.y + area.height - winH - PET_WINDOW_MARGIN;
  return {
    x: Math.min(Math.max(Math.round(x), minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(Math.round(y), minY), Math.max(minY, maxY))
  };
}

function positionPetWindow(win = petWindow) {
  if (!win || win.isDestroyed()) return;
  const saved = loadConfig().petBounds;
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    const { x, y } = clampPetPosition(win, saved.x, saved.y);
    win.setPosition(x, y);
    return;
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const [winW, winH] = win.getSize();
  const x = area.x + Math.max(0, area.width - winW - PET_WINDOW_MARGIN);
  const y = area.y + Math.max(0, area.height - winH - PET_WINDOW_MARGIN);
  win.setPosition(x, y);
}

let petMoveProgrammatic = false;
let petBoundsSaveTimer = null;

function persistPetBounds() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  saveConfig({
    petBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  });
}

function schedulePetBoundsSave() {
  if (petBoundsSaveTimer) clearTimeout(petBoundsSaveTimer);
  petBoundsSaveTimer = setTimeout(() => {
    petBoundsSaveTimer = null;
    persistPetBounds();
  }, 150);
}

function handlePetWillMove(event, newBounds) {
  if (petMoveProgrammatic || !petWindow || petWindow.isDestroyed()) return;
  const { x, y } = clampPetPosition(petWindow, newBounds.x, newBounds.y);
  if (x === newBounds.x && y === newBounds.y) return;
  event.preventDefault();
  const current = petWindow.getBounds();
  if (current.x === x && current.y === y) return;
  petMoveProgrammatic = true;
  petWindow.setPosition(x, y);
  petMoveProgrammatic = false;
}

function syncPetWindowBoundsAfterResize() {
  if (!petWindow || petWindow.isDestroyed() || petMoveProgrammatic) return;
  const bounds = petWindow.getBounds();
  const { x, y } = clampPetPosition(petWindow, bounds.x, bounds.y);
  if (x !== bounds.x || y !== bounds.y) {
    petMoveProgrammatic = true;
    petWindow.setPosition(x, y);
    petMoveProgrammatic = false;
  }
  persistPetBounds();
}

async function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    positionPetWindow(petWindow);
    await syncPetCharacterFromMain();
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
    paintWhenInitiallyHidden: true,
    type: process.platform === "darwin" ? "panel" : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: ["--shell-pet-overlay"],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  if (process.platform === "darwin" && typeof petWindow.setVisibleOnAllWorkspaces === "function") {
    petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  petWindow.setAlwaysOnTop(true, "screen-saver");
  positionPetWindow(petWindow);

  petWindow.on("will-move", handlePetWillMove);
  petWindow.on("moved", schedulePetBoundsSave);
  petWindow.on("resized", syncPetWindowBoundsAfterResize);
  petWindow.on("close", (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    hidePetWindow();
  });
  petWindow.on("closed", () => {
    petWindow = null;
  });

  await petWindow.loadURL(buildPetUrl());
  await syncPetCharacterFromMain();
  petWindow.showInactive();
  setTimeout(() => {
    if (petWindow && !petWindow.isDestroyed()) void syncPetCharacterFromMain();
  }, 250);
  return petWindow;
}

function hidePetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    syncPetWindowBoundsAfterResize();
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
  applyKeepAwake(settings.windowKeepAwake !== false);

  const compact = Boolean(settings.windowCompact);
  const compactQa = settings.compactDialogQa !== false;
  const profile = compact
    ? compactQa
      ? WINDOW_PROFILE_COMPACT_QA
      : WINDOW_PROFILE_COMPACT
    : WINDOW_PROFILE_NORMAL;
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
    ipcMain.handle("shell:set-pet-overlay", async (_event, enabled) => {
      const next = Boolean(enabled);
      applyPetOverlay(next);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("shell:pet-overlay-changed", { enabled: next });
        if (!next) {
          await mainWindow.webContents
            .executeJavaScript(
              `(function(){var cb=document.getElementById("shell-window-pet");if(cb)cb.checked=false;})()`,
              true
            )
            .catch(() => {});
        }
      }
      return { ok: true, enabled: next };
    });
    ipcMain.handle("shell:move-pet-window-by", (_event, dx, dy) => {
      if (!petWindow || petWindow.isDestroyed()) return { ok: false };
      const deltaX = Math.round(Number(dx) || 0);
      const deltaY = Math.round(Number(dy) || 0);
      if (!deltaX && !deltaY) return { ok: true };
      const bounds = petWindow.getBounds();
      const { x, y } = clampPetPosition(petWindow, bounds.x + deltaX, bounds.y + deltaY);
      petMoveProgrammatic = true;
      petWindow.setPosition(x, y);
      petMoveProgrammatic = false;
      schedulePetBoundsSave();
      return { ok: true };
    });
    ipcMain.handle("shell:set-keep-awake", (_event, enabled) => {
      applyKeepAwake(Boolean(enabled));
      return { ok: true, enabled: Boolean(enabled) };
    });
    ipcMain.handle("shell:broadcast-pet-phase", (_event, payload) => {
      broadcastPetPhase(payload && typeof payload === "object" ? payload : {});
      return { ok: true };
    });
    bootstrap();
  });

  app.on("activate", () => {
    showMainWindow().catch((error) => console.error(error));
  });

  app.on("before-quit", async () => {
    shuttingDown = true;
    applyKeepAwake(false);
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
