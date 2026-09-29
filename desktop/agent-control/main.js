const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Control must be started with Electron.");
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, shell, Notification } = electron;
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { getAppIcon } = require("./icon");
const controlPackage = require("./package.json");
const { requireRepo } = require("./repo-resolve");
const docsRegistry = requireRepo("lib/docs/docs-registry");
const { enrichMcpDocsForClient } = requireRepo("lib/https-redirect");

function buildAnonymizedMcpConfig(cmsBaseUrl, envExtra = {}) {
  const env = {
    AGENT_CMS_BASE_URL: cmsBaseUrl,
    ...envExtra
  };
  if (!env.AGENT_CMS_TLS_INSECURE) delete env.AGENT_CMS_TLS_INSECURE;

  return {
    mcpServers: {
      "agent-cms": {
        command: "node",
        args: ["<ABS_PATH>/mcp-server/index.js"],
        env
      }
    }
  };
}

function buildProjectSetupFlags(root) {
  return {
    depsOk: fs.existsSync(path.join(root, "node_modules")),
    certsOk: fs.existsSync(path.join(root, ".dev-certs", "cert.pem"))
  };
}

function buildMcpConnectInfo(root) {
  const { getServerPortsPayload } = loadActionsModule();
  const SERVER_PORTS = getServerPortsPayload();
  const cmsBaseUrl = `https://localhost:${SERVER_PORTS.editorHttps}`;
  const mcpServerPath = path.join(root, "mcp-server", "index.js");

  let docs = null;
  try {
    docs = enrichMcpDocsForClient(docsRegistry.getMcpDocs("0.0.2"), `localhost:${SERVER_PORTS.editorHttps}`, {
      projectRoot: root
    });
  } catch {
    docs = null;
  }

  const envExtra = {};
  if (docs?.cursorConfig?.env?.AGENT_CMS_TLS_INSECURE) {
    envExtra.AGENT_CMS_TLS_INSECURE = "1";
  }

  const configJson = JSON.stringify(buildAnonymizedMcpConfig(cmsBaseUrl, envExtra), null, 2);

  const configJsonCopy = docs?.cursorConfigExample
    ? JSON.stringify(docs.cursorConfigExample, null, 2)
    : JSON.stringify(
        {
          mcpServers: {
            "agent-cms": {
              command: "node",
              args: [mcpServerPath],
              env: {
                AGENT_CMS_BASE_URL: cmsBaseUrl,
                ...envExtra
              }
            }
          }
        },
        null,
        2
      );

  return {
    cmsBaseUrl,
    mcpServerPath,
    configJson,
    configJsonCopy,
    docsUrl: `${cmsBaseUrl}/api/mcp-docs?version=0.0.2`
  };
}

function buildMobileConnectInfo(environment) {
  const { getServerPortsPayload } = loadActionsModule();
  const SERVER_PORTS = getServerPortsPayload();
  const lanIp = String(environment?.host?.lanIp || "").trim();
  const voiceHttpsPort = SERVER_PORTS.voiceHttps;
  const voiceHttpPort = SERVER_PORTS.voiceHttp;
  const voiceUrl = lanIp ? `https://${lanIp}:${voiceHttpsPort}/` : null;
  const mkcertCaUrl = lanIp ? `http://${lanIp}:${voiceHttpPort}/dev/mkcert-root-ca.pem` : null;

  return {
    lanIp: lanIp || null,
    voiceUrl,
    mkcertCaUrl,
    usesLoopback: !lanIp,
    hotspotHint:
      lanIp && /^172\.20\.10\./.test(lanIp)
        ? "Mac на точке доступа iPhone — откройте этот адрес на телефоне."
        : null
  };
}

function loadQrCode() {
  try {
    return require(path.join(getProjectRoot(), "node_modules", "qrcode"));
  } catch {
    return null;
  }
}
const { buildSystemEnvironment } = requireRepo("lib/system-environment");
const { getPlatformSettings, patchPlatformSettings } = requireRepo("settings-store");
const { isPlatformMaintenanceMode } = requireRepo("lib/workspace/workspace-agent-settings");

const REPO_ROOT = path.join(__dirname, "..", "..");
let mainWindow = null;
const activeTasks = new Map();
const BUILD_ACTION_IDS = new Set(["cms-rebuild", "voice-rebuild", "control-dist"]);
let attachedServerProcess = null;
let lastServerStartMode = null;

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

function loadActionsModule() {
  const root = getProjectRoot();
  const devPath = path.join(root, "desktop", "agent-control", "actions.js");
  const bundledPath = path.join(__dirname, "actions.js");
  const target = fs.existsSync(devPath) ? devPath : bundledPath;

  try {
    const resolved = require.resolve(target);
    if (require.cache[resolved]) delete require.cache[resolved];
  } catch {
    // first load
  }

  return require(target);
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

function parsePsElapsedSec(stdout) {
  const raw = String(stdout || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const sec = Number(raw);
    return Number.isFinite(sec) && sec >= 0 ? sec : null;
  }

  const dayMatch = raw.match(/^(\d+)-(\d+):(\d{2}):(\d{2})$/);
  if (dayMatch) {
    const [, days, hours, minutes, seconds] = dayMatch.map(Number);
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  const parts = raw.split(":").map(Number);
  if (parts.some((value) => !Number.isFinite(value))) return null;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return null;
}

async function probeServerStatus() {
  const root = getProjectRoot();
  const { getServerPortsPayload } = loadActionsModule();
  const ports = getServerPortsPayload();
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

  const { execFile } = require("child_process");

  const getPortPid = (port) =>
    new Promise((resolve) => {
      execFile("lsof", ["-ti", `:${port}`], { timeout: 2000 }, (error, stdout) => {
        const pid = Number(String(stdout || "").trim().split("\n")[0]);
        resolve(Number.isFinite(pid) && pid > 0 ? pid : null);
      });
    });

  const getProcessUptimeSec = (pid) =>
    new Promise((resolve) => {
      if (!pid) {
        resolve(null);
        return;
      }

      const readElapsed = (field, next) => {
        execFile("ps", ["-p", String(pid), "-o", `${field}=`], { timeout: 2000 }, (error, stdout) => {
          const sec = parsePsElapsedSec(stdout);
          if (sec != null) {
            resolve(sec);
            return;
          }
          if (next) next();
          else resolve(null);
        });
      };

      readElapsed("etimes", () => readElapsed("etime"));
    });

  const checkPort = async (port) => Boolean(await getPortPid(port));

  const [cmsPid, voicePid] = await Promise.all([
    getPortPid(ports.editorHttps),
    getPortPid(ports.voiceHttps)
  ]);
  const cms = Boolean(cmsPid);
  const voice = Boolean(voicePid);
  const running = cms || voice;
  let mode = "off";

  if (running) {
    if (attachedServerProcess) mode = "attached";
    else if (supervisorAlive) mode = "background";
    else mode = "running";
  }

  let uptimeSec = null;
  if (running) {
    const pidCandidates = [cmsPid, voicePid, supervisorAlive ? supervisorPid : null].filter(Boolean);
    for (const pid of pidCandidates) {
      const elapsed = await getProcessUptimeSec(pid);
      if (elapsed != null) {
        uptimeSec = uptimeSec == null ? elapsed : Math.max(uptimeSec, elapsed);
      }
    }
  }

  const probedAt = Date.now();
  const startedAt = uptimeSec != null ? probedAt - uptimeSec * 1000 : null;

  return {
    running,
    cms,
    voice,
    supervisorAlive,
    supervisorPid,
    mode,
    uptimeSec,
    startedAt,
    probedAt,
    modeLabel:
      mode === "attached"
        ? "пока Control открыт"
        : mode === "background"
          ? "в фоне"
          : running
            ? "работает"
            : "остановлен",
    urls: {
      cms: cms ? `https://localhost:${ports.editorHttps}` : null,
      voice: voice ? `https://localhost:${ports.voiceHttps}` : null
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(pid, signal = "SIGTERM") {
  if (!pid || pid <= 0) return;
  const { execFileSync } = require("child_process");
  try {
    const children = execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8", timeout: 2000 })
      .trim()
      .split("\n")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    for (const childPid of children) {
      killProcessTree(childPid, signal);
    }
  } catch {
    // no children
  }
  try {
    process.kill(pid, signal);
  } catch {
    // ignore
  }
}

async function forceStopServerPorts() {
  const { execFileSync } = require("child_process");
  const { getServerPortsPayload } = loadActionsModule();
  const ports = getServerPortsPayload();
  const portList = [ports.voiceHttps, ports.voiceHttp, ports.editorHttps, ports.editorHttp];
  const pids = new Set();

  for (const port of portList) {
    try {
      const stdout = execFileSync("lsof", ["-ti", `:${port}`], { encoding: "utf8", timeout: 2000 }).trim();
      for (const pid of stdout.split("\n")) {
        const numeric = Number(pid.trim());
        if (Number.isFinite(numeric) && numeric > 0) pids.add(numeric);
      }
    } catch {
      // port free
    }
  }

  if (!pids.size) return true;

  for (const pid of pids) killProcessTree(pid, "SIGTERM");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let alive = false;
    for (const pid of pids) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        // dead
      }
    }
    if (!alive) return true;
    if (attempt === 2) {
      for (const pid of pids) killProcessTree(pid, "SIGKILL");
    }
    await sleep(250);
  }

  return false;
}

function stopAttachedServer() {
  if (!attachedServerProcess) return;
  const child = attachedServerProcess;
  attachedServerProcess = null;
  killProcessTree(child.pid, "SIGTERM");
  setTimeout(() => {
    try {
      process.kill(child.pid, 0);
      killProcessTree(child.pid, "SIGKILL");
    } catch {
      // already stopped
    }
  }, 500);
}

function resolveRestartMode(status) {
  if (attachedServerProcess) return "attached";
  if (status?.supervisorAlive) return "background";
  if (lastServerStartMode) return lastServerStartMode;
  return "background";
}

function runShellCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: getProjectRoot(),
      env: enrichPath(),
      shell: false
    });

    child.stdout.on("data", (chunk) => sendLog(String(chunk)));
    child.stderr.on("data", (chunk) => sendLog(String(chunk), "stderr"));
    child.on("close", (code) => resolve({ ok: code === 0, code }));
    child.on("error", (error) => resolve({ ok: false, error: error.message }));
  });
}

async function stopServerCompletely() {
  stopAttachedServer();
  await runShellCommand("bash", ["scripts/agent-https-service.sh", "stop"]);

  let status = await probeServerStatus();
  if (status.running) {
    sendLog("\n⚠ Порты всё ещё заняты — принудительная остановка…\n", "stderr");
    await forceStopServerPorts();
    await sleep(400);
    status = await probeServerStatus();
  }

  return status;
}

async function startBackgroundServer() {
  const result = await runShellCommand("bash", ["scripts/agent-https-service.sh", "start-direct"]);
  if (!result.ok) {
    return { ok: false, error: "Не удалось запустить сервер в фоне." };
  }

  const ready = await waitForServerReady();
  if (!ready.running) {
    return { ok: false, error: "Сервер не запустился. Смотрите журнал ниже." };
  }

  lastServerStartMode = "background";
  return { ok: true };
}

async function restartServer() {
  const status = await probeServerStatus();
  if (!status.running) {
    return { ok: false, error: "Сервер не запущен." };
  }

  const mode = resolveRestartMode(status);
  const modeLabel = mode === "attached" ? "пока Control открыт" : "в фоне";
  sendLog(`\n↻ Перезапуск (${modeLabel})…\n`);

  const afterStop = await stopServerCompletely();
  if (afterStop.running) {
    return {
      ok: false,
      error:
        "Не удалось остановить сервер перед перезапуском. Закройте Terminal с npm run start:https или выполните: bash scripts/agent-https-service.sh stop"
    };
  }

  await sleep(400);

  if (mode === "attached") {
    const result = await startAttachedServer();
    if (result.ok) lastServerStartMode = "attached";
    return result;
  }

  return startBackgroundServer();
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
  lastServerStartMode = "attached";
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

function hasActiveBuild() {
  for (const actionId of BUILD_ACTION_IDS) {
    if (activeTasks.has(actionId)) return true;
  }
  return false;
}

function stopAllActiveTasks() {
  for (const child of activeTasks.values()) {
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  activeTasks.clear();
}

async function runAction(actionId) {
  const normalizedId = String(actionId || "").trim();
  const { ACTIONS } = loadActionsModule();
  const action = ACTIONS.find((entry) => entry.id === normalizedId);
  if (!action) {
    return {
      ok: false,
      error: normalizedId
        ? `Неизвестное действие: ${normalizedId}. Полностью закройте Agent CMS Control (Cmd+Q) и откройте снова.`
        : "Неизвестное действие. Полностью закройте Agent CMS Control (Cmd+Q) и откройте снова."
    };
  }
  if (activeTasks.has(actionId)) {
    return { ok: false, error: "Это действие уже выполняется." };
  }
  if (BUILD_ACTION_IDS.has(actionId) && hasActiveBuild()) {
    return { ok: false, error: "Уже идёт сборка. Дождитесь завершения — прогресс в логе внизу." };
  }

  sendActionState({ actionId, running: true });
  sendLog(`\n▶ ${action.title}\n`);
  if (BUILD_ACTION_IDS.has(actionId)) {
    sendLog("Сборка может занять 1–4 мин. Остальные кнопки остаются доступными.\n");
  }

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

  if (action.serverRole === "restart") {
    try {
      const result = await restartServer();
      sendActionState({ actionId, running: false });
      if (result.ok) {
        sendLog("\n■ Сервер перезапущен\n");
      }
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
    activeTasks.set(actionId, child);

    child.stdout.on("data", (chunk) => sendLog(String(chunk)));
    child.stderr.on("data", (chunk) => sendLog(String(chunk), "stderr"));

    child.on("close", async (code) => {
      activeTasks.delete(actionId);
      sendActionState({ actionId, running: false });

      let ok = code === 0;
      if (action.serverRole === "stop") {
        let status = await probeServerStatus();
        if (status.running) {
          sendLog("\n⚠ Порты всё ещё заняты — принудительная остановка…\n", "stderr");
          await forceStopServerPorts();
          await sleep(400);
          status = await probeServerStatus();
        }
        if (status.running) {
          ok = false;
          const message =
            "Сервер не остановился. Закройте окно Terminal с npm run start:https или выполните: bash scripts/agent-https-service.sh stop";
          sendLog(`\n✕ ${message}\n`, "stderr");
          resolve({ ok: false, code, error: message });
          return;
        }
      }

      if (ok && action.serverRole === "start") {
        const ready = await waitForServerReady();
        if (!ready.running) {
          ok = false;
          resolve({ ok: false, code, error: "Сервер не запустился. Смотрите журнал ниже." });
          return;
        }
        lastServerStartMode = "background";
      }

      sendLog(`\n■ Завершено (код ${ok ? 0 : code ?? "?"})\n`);
      resolve({ ok, code: ok ? 0 : code });
    });

    child.on("error", (error) => {
      activeTasks.delete(actionId);
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
    stopAllActiveTasks();
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
      const {
        ACTIONS,
        APP_PRODUCTS,
        CONTROL_SELF,
        SETUP_ACTIONS,
        getServerPortsPayload,
        getChromeExtensionConfig,
        SERVER_TEST,
        MCP_TEST
      } = loadActionsModule();
      const serverPorts = getServerPortsPayload();
      const chromeExtension = getChromeExtensionConfig();
      const environment = await buildSystemEnvironment(root).catch(() => null);
      const server = await probeServerStatus();
      return {
        projectRoot: root,
        actions: ACTIONS,
        appProducts: APP_PRODUCTS,
        controlSelf: CONTROL_SELF,
        setupActionIds: SETUP_ACTIONS,
        serverPorts,
        serverTest: SERVER_TEST,
        mcpTest: MCP_TEST,
        mcpConnect: buildMcpConnectInfo(root),
        chromeExtension: {
          ...chromeExtension,
          folderPath: path.join(root, chromeExtension.folderName)
        },
        environment,
        mobileConnect: buildMobileConnectInfo(environment),
        server,
        setupFlags: buildProjectSetupFlags(root),
        controlVersion: controlPackage.version
      };
    });

    ipcMain.handle("control:refresh-status", async () => ({
      server: await probeServerStatus()
    }));

    ipcMain.handle("control:get-maintenance-mode", async () => {
      try {
        const root = getProjectRoot();
        const settings = await getPlatformSettings(root);
        return { ok: true, enabled: isPlatformMaintenanceMode(settings) };
      } catch (error) {
        return { ok: false, enabled: false, error: String(error?.message || error) };
      }
    });

    ipcMain.handle("control:set-maintenance-mode", async (_event, enabled) => {
      try {
        const root = getProjectRoot();
        const next = Boolean(enabled);
        await patchPlatformSettings({ "maintenance-mode": next }, root);
        const settings = await getPlatformSettings(root);
        return { ok: true, enabled: isPlatformMaintenanceMode(settings) };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    });

    ipcMain.handle("control:refresh-bootstrap", async () => {
      const root = getProjectRoot();
      const environment = await buildSystemEnvironment(root).catch(() => null);
      const server = await probeServerStatus();
      return {
        environment,
        mobileConnect: buildMobileConnectInfo(environment),
        server,
        mcpConnect: buildMcpConnectInfo(root),
        setupFlags: buildProjectSetupFlags(root)
      };
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

    ipcMain.handle("control:render-qr", async (_event, text) => {
      const value = String(text || "").trim();
      if (!value) return { ok: false };
      const QRCode = loadQrCode();
      if (!QRCode) return { ok: false, error: "qrcode module missing" };
      try {
        const dataUrl = await QRCode.toDataURL(value, {
          width: 220,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" }
        });
        return { ok: true, dataUrl };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    });

    ipcMain.handle("control:notify", (_event, payload = {}) => {
      const title = String(payload.title || "Agent CMS Control").trim();
      const body = String(payload.body || "").trim();
      if (!body || !Notification.isSupported()) return { ok: false };
      const iconPath = path.join(__dirname, "assets", "icon.png");
      const notification = new Notification({
        title,
        body,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        silent: false
      });
      notification.show();
      return { ok: true };
    });

    ipcMain.handle("control:test-url", async (_event, targetUrl) => {
      const root = getProjectRoot();
      const url = String(targetUrl || "").trim();
      if (!url) return { ok: false, command: "", url: "", output: "URL не задан" };
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
    stopAllActiveTasks();
    stopAttachedServer();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
