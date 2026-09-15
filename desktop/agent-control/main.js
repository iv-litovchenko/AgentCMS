const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Control must be started with Electron.");
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, shell } = electron;
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { getAppIcon } = require("./icon");
const {
  ACTIONS,
  APP_PRODUCTS,
  CONTROL_SELF,
  SETUP_ACTIONS,
  SERVER_PORTS,
  SERVER_TEST,
  CHROME_EXTENSION
} = require("./actions");
const controlPackage = require("./package.json");
const { buildSystemEnvironment } = require("../../lib/system-environment");

const REPO_ROOT = path.join(__dirname, "..", "..");
let mainWindow = null;
let activeChild = null;
let attachedServerProcess = null;

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < 8; depth += 1) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "agent-cms") return current;
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function getProjectRoot() {
  const envRoot = String(process.env.AGENT_CMS_ROOT || "").trim();
  if (envRoot && fs.existsSync(envRoot)) return envRoot;

  if (app.isPackaged) {
    const fromExec = findRepoRoot(path.dirname(process.execPath));
    if (fromExec) return fromExec;
  }

  return REPO_ROOT;
}

function sendLog(text, stream = "stdout") {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("control:log", { text, stream, at: Date.now() });
}

function sendActionState(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("control:action-state", payload);
}

function enrichPath(env = process.env) {
  return {
    ...env,
    PATH: `/opt/homebrew/bin:/usr/local/bin:${env.PATH || ""}`
  };
}

async function probeServerStatus() {
  const root = getProjectRoot();
  const pidFile = path.join(root, ".run", "agent-cms-https.pid");
  let supervisorPid = null;
  let supervisorAlive = false;

  if (fs.existsSync(pidFile)) {
    supervisorPid = Number(fs.readFileSync(pidFile, "utf8").trim()) || null;
    if (supervisorPid) {
      try {
        process.kill(supervisorPid, 0);
        supervisorAlive = true;
      } catch {
        supervisorAlive = false;
      }
    }
  }

  const checkPort = (port) =>
    new Promise((resolve) => {
      const { execFile } = require("child_process");
      execFile("lsof", ["-ti", `:${port}`], { timeout: 2000 }, (error, stdout) => {
        resolve(Boolean(String(stdout || "").trim()));
      });
    });

  const [cms, voice] = await Promise.all([checkPort(3443), checkPort(3488)]);
  const running = cms || voice;
  let mode = "off";

  if (running) {
    if (attachedServerProcess) mode = "attached";
    else if (supervisorAlive) mode = "background";
    else mode = "running";
  }

  return {
    running,
    cms,
    voice,
    supervisorAlive,
    supervisorPid,
    mode,
    modeLabel:
      mode === "attached"
        ? "пока Control открыт"
        : mode === "background"
          ? "в фоне"
          : running
            ? "работает"
            : "остановлен",
    urls: {
      cms: cms ? "https://localhost:3443" : null,
      voice: voice ? "https://localhost:3488" : null
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopAttachedServer() {
  if (!attachedServerProcess) return;
  try {
    attachedServerProcess.kill("SIGTERM");
  } catch {
    // ignore
  }
  attachedServerProcess = null;
}

async function waitForServerReady(maxAttempts = 48) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await probeServerStatus();
    if (status.running) return status;
    await sleep(250);
  }
  return probeServerStatus();
}

async function startAttachedServer() {
  if (attachedServerProcess) {
    return { ok: true, already: true };
  }

  const status = await probeServerStatus();
  if (status.running && status.mode === "background") {
    return {
      ok: false,
      error: "Сервер уже запущен в фоне. Сначала нажмите «Остановить сервер»."
    };
  }
  if (status.running) {
    return { ok: true, already: true };
  }

  const child = spawn("npm", ["run", "start:https"], {
    cwd: getProjectRoot(),
    env: enrichPath(),
    shell: false
  });
  attachedServerProcess = child;

  child.stdout.on("data", (chunk) => sendLog(String(chunk)));
  child.stderr.on("data", (chunk) => sendLog(String(chunk), "stderr"));

  child.on("close", () => {
    if (attachedServerProcess === child) attachedServerProcess = null;
  });

  child.on("error", (error) => {
    if (attachedServerProcess === child) attachedServerProcess = null;
    sendLog(`\n✕ Ошибка сервера: ${error.message}\n`, "stderr");
  });

  const ready = await waitForServerReady();
  if (!ready.running) {
    stopAttachedServer();
    return { ok: false, error: "Сервер не запустился. Смотрите журнал ниже." };
  }

  sendLog("\n■ Сервер работает, пока открыт Agent CMS Control\n");
  return { ok: true };
}

async function runPreflight(name) {
  if (name !== "certs") return { ok: true };

  return new Promise((resolve) => {
    const child = spawn("npm", ["run", "setup:certs"], {
      cwd: getProjectRoot(),
      env: enrichPath(),
      shell: false
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      output += text;
      sendLog(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      output += text;
      sendLog(text, "stderr");
    });
    child.on("close", (code) => {
      const certPath = path.join(getProjectRoot(), ".dev-certs", "cert.pem");
      const ok = code === 0 && fs.existsSync(certPath);
      resolve({ ok, output, code });
    });
  });
}

function stopActiveChild() {
  if (!activeChild) return;
  try {
    activeChild.kill("SIGTERM");
  } catch {
    // ignore
  }
  activeChild = null;
}

async function runAction(actionId) {
  const action = ACTIONS.find((entry) => entry.id === actionId);
  if (!action) {
    return { ok: false, error: "Неизвестное действие" };
  }
  if (activeChild) {
    return { ok: false, error: "Уже выполняется команда. Дождитесь завершения или остановите сервер." };
  }

  sendActionState({ actionId, running: true });
  sendLog(`\n▶ ${action.title}\n`);

  if (action.preflight) {
    const pre = await runPreflight(action.preflight);
    if (!pre.ok) {
      sendActionState({ actionId, running: false });
      return { ok: false, error: "Не удалось подготовить окружение (сертификаты)." };
    }
  }

  if (action.serverRole === "attached") {
    try {
      const result = await startAttachedServer();
      sendActionState({ actionId, running: false });
      return result;
    } catch (error) {
      sendActionState({ actionId, running: false });
      return { ok: false, error: error.message || String(error) };
    }
  }

  if (action.serverRole === "stop") {
    stopAttachedServer();
  }

  return new Promise((resolve) => {
    const child = spawn(action.command, action.args, {
      cwd: getProjectRoot(),
      env: enrichPath(),
      shell: false
    });
    activeChild = child;

    child.stdout.on("data", (chunk) => sendLog(String(chunk)));
    child.stderr.on("data", (chunk) => sendLog(String(chunk), "stderr"));

    child.on("close", async (code) => {
      activeChild = null;
      sendActionState({ actionId, running: false });
      sendLog(`\n■ Завершено (код ${code ?? "?"})\n`);

      resolve({ ok: code === 0, code });
    });

    child.on("error", (error) => {
      activeChild = null;
      sendActionState({ actionId, running: false });
      sendLog(`\n✕ Ошибка: ${error.message}\n`, "stderr");
      resolve({ ok: false, error: error.message });
    });
  });
}

async function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 920,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    title: "Agent CMS Control",
    icon: getAppIcon(),
    backgroundColor: "#0b1020",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  await mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));

  mainWindow.on("closed", () => {
    stopActiveChild();
    stopAttachedServer();
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    createWindow().catch((error) => console.error(error));
  });

  app.whenReady().then(() => {
    ipcMain.handle("control:get-bootstrap", async () => {
      const root = getProjectRoot();
      const environment = await buildSystemEnvironment(root).catch(() => null);
      const server = await probeServerStatus();
      return {
        projectRoot: root,
        actions: ACTIONS,
        appProducts: APP_PRODUCTS,
        controlSelf: CONTROL_SELF,
        setupActionIds: SETUP_ACTIONS,
        serverPorts: SERVER_PORTS,
        serverTest: SERVER_TEST,
        chromeExtension: {
          ...CHROME_EXTENSION,
          folderPath: path.join(root, CHROME_EXTENSION.folderName)
        },
        environment,
        server,
        controlVersion: controlPackage.version
      };
    });

    ipcMain.handle("control:refresh-status", async () => ({
      server: await probeServerStatus()
    }));

    ipcMain.handle("control:refresh-bootstrap", async () => {
      const root = getProjectRoot();
      const environment = await buildSystemEnvironment(root).catch(() => null);
      const server = await probeServerStatus();
      return { environment, server };
    });

    ipcMain.handle("control:reload-ui", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reload();
      }
      return { ok: true };
    });

    ipcMain.handle("control:run-action", (_event, actionId) => runAction(String(actionId || "")));

    ipcMain.handle("control:open-external", async (_event, url) => {
      const target = String(url || "").trim();
      if (!target) return { ok: false };
      await shell.openExternal(target);
      return { ok: true };
    });

    ipcMain.handle("control:reveal-path", async (_event, targetPath) => {
      const target = String(targetPath || "").trim();
      if (!target) return { ok: false };
      try {
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
          await shell.openPath(target);
        } else {
          shell.showItemInFolder(target);
        }
        return { ok: true };
      } catch {
        return { ok: false };
      }
    });

    ipcMain.handle("control:test-server", async () => {
      const root = getProjectRoot();
      const port = SERVER_PORTS.editorHttps;
      const pathSuffix = SERVER_TEST.path;
      const url = `https://localhost:${port}${pathSuffix}`;
      const command = `curl -sk ${url}`;
      const { execFile } = require("child_process");

      return new Promise((resolve) => {
        execFile("curl", ["-sk", url], { timeout: 8000, cwd: root }, (error, stdout, stderr) => {
          const output = String(stdout || stderr || error?.message || "").trim();
          resolve({
            ok: !error && Boolean(stdout),
            command,
            url,
            output: output || "Нет ответа"
          });
        });
      });
    });

    createWindow().catch((error) => console.error(error));
  });

  app.on("activate", () => {
    createWindow().catch((error) => console.error(error));
  });

  app.on("before-quit", () => {
    stopActiveChild();
    stopAttachedServer();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
