const SPLASH_MS = 1200;
const SPLASH_FADE_MS = 550;

const logOutput = document.getElementById("log-output");
const actionsRoot = document.getElementById("actions-root");
const envRows = document.getElementById("env-rows");
let envExpandAll = false;
const serverStatus = document.getElementById("server-status");
let bootstrap = null;
const runningActions = new Set();

function isControlActionAvailable(actionId) {
  return Array.isArray(bootstrap?.actions) && bootstrap.actions.some((entry) => entry.id === actionId);
}

function needsAppLockLogin() {
  const gate = bootstrap?.appLock;
  return Boolean(gate?.enabled && !gate?.sessionActive);
}

function syncAppLockScreen() {
  const screen = document.getElementById("app-lock-screen");
  if (!screen) return;
  const canLogin = Boolean(window.agentControl?.appLockLogin);
  const show = canLogin && needsAppLockLogin();
  screen.hidden = !show;
  document.body.classList.toggle("app-lock-active", show);
  syncAppLockLogoutButton();
  if (show) {
    window.requestAnimationFrame(() => {
      const loginInput = screen.querySelector('input[name="login"]');
      if (loginInput) loginInput.focus();
    });
  }
}

function syncAppLockLogoutButton() {
  const button = document.getElementById("app-lock-logout");
  if (!button) return;
  if (!window.agentControl?.appLockLogout) {
    button.hidden = true;
    return;
  }
  const gate = bootstrap?.appLock;
  const enabled = Boolean(gate?.enabled);
  const loggedIn = enabled && !needsAppLockLogin();
  button.hidden = !loggedIn;
  button.disabled = !loggedIn;
}

function bindAppLockLogout() {
  const button = document.getElementById("app-lock-logout");
  if (!button || button.dataset.bound || !window.agentControl?.appLockLogout) return;
  button.dataset.bound = "1";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await window.agentControl.appLockLogout();
      bootstrap.appLock = {
        ...(bootstrap.appLock || {}),
        enabled: true,
        sessionActive: false,
        canToggleMaintenance: false
      };
      appendLog("Сессия завершена.\n");
      syncAppLockScreen();
      await renderLayout();
      syncServerUi(lastServer || bootstrap?.server);
    } catch (error) {
      appendLog(`Выход: ${error.message}\n`, "stderr");
    } finally {
      button.disabled = false;
    }
  });
}
let lastServer = null;
let clockTimer = null;
let serverPollTimer = null;
let mcpOk = null;
let suppressServerDownNotify = false;
let maintenanceModeEnabled = false;
let maintenanceModeBusy = false;

function maintenanceStubSummaryText(enabled = maintenanceModeEnabled) {
  const state = enabled ? "включён" : "выключен";
  return `Заглушка 503 для Editor, ${VOICE_UI_LABEL} и Commander · сейчас ${state}`;
}

const SERVER_POLL_MS = 8000;

const SERVICE_MONITOR_DEFS = [
  {
    id: "editor",
    title: "Agent CMS Editor",
    shortName: "Editor",
    accent: "cms",
    icon: "cms.svg",
    portKey: "editorHttps",
    portLabel: "HTTPS"
  },
  {
    id: "voice",
    title: "Agent CMS Voice-Chat",
    shortName: "Chat",
    accent: "voice",
    icon: "voice.svg",
    portKey: "voiceHttps",
    portLabel: "HTTPS"
  },
  {
    id: "commander",
    title: "Agent CMS Commander",
    shortName: "Commander",
    accent: "commander",
    icon: "commander.svg",
    portKey: "commanderHttp",
    portLabel: "HTTP"
  },
  {
    id: "control",
    title: "Agent CMS Control",
    shortName: "Control",
    accent: "control",
    icon: "control.svg",
    portKey: "controlHttp",
    portLabel: "HTTP"
  },
  {
    id: "mcp",
    title: "Agent CMS MCP",
    shortName: "MCP",
    accent: "mcp",
    icon: "mcp.svg",
    portKey: "mcpHttp",
    portLabel: "HTTP"
  }
];

/** Отображаемое имя Voice в Control (логика/порты без изменений). */
const VOICE_UI_LABEL = "Voice-Chat";

const SETUP_CHECK_LABELS = {
  deps: "Зависимости",
  certs: "Сертификаты",
  server: "Сервер",
  mcp: "MCP"
};

const DISK_STAT_LABELS = {
  diskTotal: "Всего объем диска",
  diskFree: "Еще свободное место в системе"
};

const ENV_TOOL_HINTS = {
  node: "Node.js 18+ — brew install node",
  python: "Python 3.12 для Whisper — brew install python@3.12",
  mkcert: "HTTPS без предупреждений — brew install mkcert && mkcert -install"
};

/** Зависимости, всегда видимые в блоке «Система» (без раскрытия). */
const ENV_TECH_VISIBLE_IDS = new Set(["node", "python", "mkcert", "npm", "git", "https"]);
/** Порядок дополнительных технологий при полном списке. */
const ENV_TECH_EXTRA_ORDER = ["openssl", "whisper", "claude", "codex", "electron"];
const flipClockState = { h0: "", h1: "", m0: "", m1: "", s0: "", s1: "" };
const FLIP_CLOCK_KEYS = ["h0", "h1", "m0", "m1", "s0", "s1"];
const flipRuntimeState = {};
let flipRuntimeSlotCount = 0;
let lastRuntimeTodayMinutes = null;

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

const ACTION_LABELS = {
  "cms-open": "Открыть",
  "cms-rebuild": "Собрать",
  "voice-open": "Открыть",
  "voice-rebuild": "Собрать",
  "commander-open": "Открыть",
  "commander-rebuild": "Собрать",
  "control-dist": "Собрать",
  "server-autostart-enable": "Автостарт",
  "server-autostart-disable": "Автостарт",
  "server-start-bg": "В фоне",
  "server-stop": "Остановить сервер",
  "server-restart": "Перезапустить сервер",
  "server-start-attached": "Пока Control открыт",
  "install-deps": "Установить",
  "setup-certs": "Сертификаты",
  "setup-desktop-shortcuts": "Ярлыки Desktop"
};

const BUILD_DURATION_HINTS = {
  "cms-rebuild": "~1–2 мин",
  "voice-rebuild": "~1 мин",
  "commander-rebuild": "~1 мин",
  "control-dist": "~1 мин"
};

function formatActionButtonContent(actionId) {
  const base = ACTION_LABELS[actionId] || "Запустить";
  const duration = BUILD_DURATION_HINTS[actionId];
  if (!duration) return base;
  return `<span class="run-btn-label">${base}</span><span class="run-btn-duration">${duration}</span>`;
}

function appendLog(text, stream = "stdout") {
  const span = document.createElement("span");
  if (stream === "stderr") span.className = "stderr";
  span.textContent = text;
  logOutput.appendChild(span);
  logOutput.scrollTop = logOutput.scrollHeight;
}

function getClockDigits() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return { h0: h[0], h1: h[1], m0: m[0], m1: m[1], s0: s[0], s1: s[1] };
}

function flipClockMarkup() {
  const groups = [["h0", "h1"], ["m0", "m1"], ["s0", "s1"]];
  return groups
    .map((keys, index) => {
      const digits = keys
        .map(
          (key) =>
            `<span class="flip-digit" data-flip="${key}"><span class="flip-digit-inner"><span class="flip-digit-val"></span></span></span>`
        )
        .join("");
      const sep = index < groups.length - 1 ? `<span class="flip-sep">:</span>` : "";
      return `<span class="flip-group">${digits}</span>${sep}`;
    })
    .join("");
}

function initFlipClock() {
  const root = document.getElementById("flip-clock");
  if (!root || root.dataset.ready) return;
  root.innerHTML = flipClockMarkup();
  root.addEventListener(
    "animationend",
    (event) => {
      if (event.target.classList.contains("flip-digit-inner")) {
        event.target.closest(".flip-digit")?.classList.remove("is-flipping");
      }
    },
    true
  );
  root.dataset.ready = "1";
}

function setFlipDigit(key, next, animate) {
  const slot = document.querySelector(`[data-flip="${key}"]`);
  if (!slot) return;

  const val = slot.querySelector(".flip-digit-val");
  if (!val) return;

  const prev = flipClockState[key];
  if (prev === next) return;

  flipClockState[key] = next;

  if (!animate || !prev) {
    val.textContent = next;
    return;
  }

  slot.classList.remove("is-flipping");
  void slot.offsetWidth;
  val.textContent = next;
  slot.classList.add("is-flipping");
}

function updateFlipClock(animate = true) {
  initFlipClock();
  const digits = getClockDigits();
  FLIP_CLOCK_KEYS.forEach((key) => setFlipDigit(key, digits[key], animate));

  const root = document.getElementById("flip-clock");
  if (root) {
    root.setAttribute("aria-label", `Текущее время ${new Date().toLocaleTimeString("ru-RU")}`);
  }
}

function startFlipClock() {
  if (clockTimer) window.clearInterval(clockTimer);
  updateFlipClock(false);
  clockTimer = window.setInterval(() => updateFlipClock(true), 1000);
}

function getRuntimeDigitChars(minutes) {
  const value = Math.max(0, Math.min(9999, Math.floor(Number(minutes) || 0)));
  return String(value).split("");
}

function flipRuntimeMarkup(chars) {
  return chars
    .map(
      (_, index) =>
        `<span class="flip-digit" data-flip="r${index}"><span class="flip-digit-inner"><span class="flip-digit-val"></span></span></span>`
    )
    .join("");
}

function bindFlipRuntimeAnimation(root) {
  if (!root || root.dataset.animBound) return;
  root.dataset.animBound = "1";
  root.addEventListener(
    "animationend",
    (event) => {
      if (event.target.classList.contains("flip-digit-inner")) {
        event.target.closest(".flip-digit")?.classList.remove("is-flipping");
      }
    },
    true
  );
}

function setFlipRuntimeDigit(key, next, animate) {
  const slot = document.querySelector(`#flip-runtime [data-flip="${key}"]`);
  if (!slot) return;

  const val = slot.querySelector(".flip-digit-val");
  if (!val) return;

  const prev = flipRuntimeState[key];
  if (prev === next) return;

  flipRuntimeState[key] = next;

  if (!animate || !prev) {
    val.textContent = next;
    return;
  }

  slot.classList.remove("is-flipping");
  void slot.offsetWidth;
  val.textContent = next;
  slot.classList.add("is-flipping");
}

function updateFlipRuntime(minutes, animate = true) {
  const root = document.getElementById("flip-runtime");
  if (!root) return;

  const chars = getRuntimeDigitChars(minutes);
  bindFlipRuntimeAnimation(root);

  if (chars.length !== flipRuntimeSlotCount) {
    root.innerHTML = flipRuntimeMarkup(chars);
    flipRuntimeSlotCount = chars.length;
    for (const key of Object.keys(flipRuntimeState)) delete flipRuntimeState[key];
    chars.forEach((ch, index) => {
      const key = `r${index}`;
      flipRuntimeState[key] = ch;
      const val = root.querySelector(`[data-flip="${key}"] .flip-digit-val`);
      if (val) val.textContent = ch;
    });
  } else {
    chars.forEach((ch, index) => setFlipRuntimeDigit(`r${index}`, ch, animate));
  }

  lastRuntimeTodayMinutes = Math.floor(Number(minutes) || 0);

  const total = lastRuntimeTodayMinutes;
  root.setAttribute(
    "aria-label",
    `Сервер сегодня работал ${total} ${total === 1 ? "минуту" : total < 5 ? "минуты" : "минут"}`
  );
}

function applyServerRuntimeFromStatus(server) {
  if (server?.runtimeTodayMinutes == null) return;
  const next = server.runtimeTodayMinutes;
  const animate = lastRuntimeTodayMinutes != null && next !== lastRuntimeTodayMinutes;
  updateFlipRuntime(next, animate);
}

function getServerStatusDisplay(server) {
  if (!server) {
    return { state: "unknown", label: "Нет данных" };
  }

  if (server.running) {
    const label = server.mode === "background" ? "Запущен (фон)" : "Запущен";
    return { state: "on", label };
  }

  return { state: "off", label: "Остановлен" };
}

function applyServerStatusChip(root, server) {
  if (!root) return;

  const display = getServerStatusDisplay(server);
  root.dataset.state = display.state;

  const value = root.querySelector(".status-value");
  if (value) value.textContent = display.label;
}

function renderServerStatusChip(server, extraClass = "") {
  const display = getServerStatusDisplay(server);

  return `
    <span class="status-chip status-chip--inline ${extraClass}" data-state="${display.state}">
      <span class="status-led" aria-hidden="true"></span>
      <span class="status-value">${display.label}</span>
    </span>
  `;
}

function renderServerStatus(server) {
  lastServer = server;
  applyServerStatusChip(serverStatus, server);
  applyServerRuntimeFromStatus(server);
}

function renderAppFooter() {
  const footer = document.getElementById("app-footer");
  if (!footer) return;

  const version = String(bootstrap?.environment?.app?.version || "").trim();
  footer.textContent = version ? `Agent CMS v${version}` : "Agent CMS";
}

function getSetupCheckState() {
  const flags = bootstrap?.setupFlags || {};
  const server = lastServer || bootstrap?.server;
  return {
    deps: Boolean(flags.depsOk),
    certs: Boolean(flags.certsOk),
    server: Boolean(server?.running),
    mcp: mcpOk === true
  };
}

function getDiskStatState() {
  const disk = bootstrap?.environment?.host?.disk;
  return {
    diskTotal: disk?.totalLabel || "—",
    diskFree: disk?.freeLabel || "—"
  };
}

/** Electron на Mac — localhost; Launcher в браузере (VPS/LAN) — хост из адресной строки. */
function isWebLauncher() {
  return document.documentElement.dataset.controlLauncher === "web";
}

function getClientLinkHost() {
  if (!isWebLauncher()) return "localhost";
  return window.location.hostname || "localhost";
}

function preferHttpServiceLinks() {
  return isWebLauncher() && window.location.protocol === "http:";
}

function rewriteUrlHostForClient(url) {
  const host = getClientLinkHost();
  if (!url || host === "localhost") return url || "";
  try {
    const parsed = new URL(url);
    parsed.hostname = host;
    return parsed.href;
  } catch {
    return url;
  }
}

function buildServiceUrl(scheme, port, path = "/") {
  const host = getClientLinkHost();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${scheme}://${host}:${port}${normalizedPath}`;
}

function getServiceMonitorOpenUrl(def, server, ports) {
  const urls = server?.urls || {};
  const host = getClientLinkHost();
  const httpFirst = preferHttpServiceLinks();

  if (def.id === "editor") {
    if (httpFirst && server?.cms && ports.editorHttp) {
      return buildServiceUrl("http", ports.editorHttp, "/");
    }
    if (urls.cms) return rewriteUrlHostForClient(urls.cms);
    if (ports.editorHttps) return buildServiceUrl("https", ports.editorHttps, "/");
    if (ports.editorHttp) return buildServiceUrl("http", ports.editorHttp, "/");
    return "";
  }
  if (def.id === "voice") {
    if (httpFirst && server?.voice && ports.voiceHttp) {
      return buildServiceUrl("http", ports.voiceHttp, "/");
    }
    if (urls.voice) return rewriteUrlHostForClient(urls.voice);
    if (ports.voiceHttps) return buildServiceUrl("https", ports.voiceHttps, "/");
    return "";
  }
  if (def.id === "commander") {
    if (httpFirst && server?.commander && ports.commanderHttp) {
      return buildServiceUrl("http", ports.commanderHttp, "/");
    }
    if (urls.commanderHttps) return rewriteUrlHostForClient(urls.commanderHttps);
    if (urls.commanderHttp) return rewriteUrlHostForClient(urls.commanderHttp);
    if (server?.cms && ports.editorHttps) {
      return buildServiceUrl("https", ports.editorHttps, "/commander/");
    }
    return ports.commanderHttp ? buildServiceUrl("http", ports.commanderHttp, "/") : "";
  }
  if (def.id === "control") {
    if (isWebLauncher() && ports.controlHttp) {
      const port =
        window.location.port ||
        (window.location.protocol === "https:" ? "443" : String(ports.controlHttp));
      return `${window.location.protocol}//${host}:${port}/`;
    }
    if (urls.controlHttp) return rewriteUrlHostForClient(urls.controlHttp);
    if (server?.controlHttp && ports.controlHttp) {
      return buildServiceUrl("http", ports.controlHttp, "/");
    }
    if (urls.controlEditor) return rewriteUrlHostForClient(urls.controlEditor);
    if (server?.cms && ports.editorHttps) {
      return buildServiceUrl("https", ports.editorHttps, "/control/");
    }
    return "";
  }
  if (def.id === "mcp") {
    if (server?.mcpHttp && ports.mcpHttp) {
      return buildServiceUrl("http", ports.mcpHttp, "/health");
    }
    if (server?.cms && ports.editorHttps) return getTestUrl("mcp");
    return ports.mcpHttp ? buildServiceUrl("http", ports.mcpHttp, "/health") : "";
  }
  return "";
}

function getServiceMonitorRowState(def, server, ports) {
  const port = ports[def.portKey];
  const portText = port != null ? String(port) : "—";

  if (def.id === "control") {
    const dedicated = Boolean(server?.controlHttp);
    if (dedicated) {
      return {
        state: "on",
        label: "В сети",
        detail: "HTTP localhost",
        port: portText,
        protocol: def.portLabel
      };
    }
    if (server?.cms) {
      return {
        state: "on",
        label: "Через Editor",
        detail: `/control/ · :${ports.editorHttps}`,
        port: portText,
        protocol: def.portLabel
      };
    }
    return {
      state: "off",
      label: "Не запущен",
      detail: "порт свободен",
      port: portText,
      protocol: def.portLabel
    };
  }

  if (def.id === "mcp") {
    const httpUp = Boolean(server?.mcpHttp);
    const pingOk = mcpOk === true;
    const pingFail = mcpOk === false;
    if (server?.cms && mcpOk === null) {
      return {
        state: "pending",
        label: "Проверка…",
        detail: formatMcpMonitorDetail({ pingOk: null, httpUp, portText }),
        port: portText,
        protocol: def.portLabel
      };
    }
    if (pingOk || httpUp) {
      return {
        state: "on",
        label: "В сети",
        detail: formatMcpMonitorDetail({ pingOk, httpUp, portText }),
        port: portText,
        protocol: def.portLabel
      };
    }
    if (server?.cms && pingFail) {
      return {
        state: "off",
        label: "Не отвечает",
        detail: formatMcpMonitorDetail({ pingOk: false, httpUp, portText }),
        port: portText,
        protocol: def.portLabel
      };
    }
    return {
      state: "off",
      label: "Не запущен",
      detail: "нужен запущенный сервер",
      port: portText,
      protocol: def.portLabel
    };
  }

  const flag = def.id === "editor" ? "cms" : def.id === "voice" ? "voice" : "commander";
  const listening = Boolean(server?.[flag]);
  if (listening) {
    return {
      state: "on",
      label: "В сети",
      detail: "localhost",
      port: portText,
      protocol: def.portLabel
    };
  }
  if (def.id === "commander" && server?.cms) {
    return {
      state: "on",
      label: "Через Editor",
      detail: `/commander/ · :${ports.editorHttps}`,
      port: portText,
      protocol: def.portLabel
    };
  }
  return {
    state: "off",
    label: "Не запущен",
    detail: "порт свободен",
    port: portText,
    protocol: def.portLabel
  };
}

function formatMcpMonitorDetail({ pingOk, httpUp, portText }) {
  const parts = [];
  if (pingOk === true) parts.push("API OK");
  else if (pingOk === false) parts.push("API нет");
  else if (pingOk === null) parts.push("API …");
  if (httpUp) parts.push(`HTTP :${portText}`);
  return parts.join(" · ") || `HTTP :${portText}`;
}

function getServicesMonitorSummary(server, ports) {
  let online = 0;
  for (const def of SERVICE_MONITOR_DEFS) {
    const { state } = getServiceMonitorRowState(def, server, ports);
    if (state === "on") online += 1;
  }
  return { online, total: SERVICE_MONITOR_DEFS.length };
}

function formatMonitorProbedAt(server) {
  const ts = Number(server?.probedAt);
  if (!Number.isFinite(ts) || ts <= 0) return "";
  try {
    return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

function renderServiceMonitorRackCard(def, server, ports) {
  const row = getServiceMonitorRowState(def, server, ports);
  const openUrl = getServiceMonitorOpenUrl(def, server, ports);
  const canOpen = row.state === "on" && Boolean(openUrl);
  const subline = row.detail ? `${row.protocol} · ${row.detail}` : row.protocol;
  const openAttr = canOpen ? ` data-svc-open="${escapeAttr(openUrl)}"` : "";
  const interactive = canOpen ? ` tabindex="0" role="link" aria-label="Открыть ${escapeAttr(def.shortName)}"` : "";

  return `
    <article
      class="svc-rack-card${canOpen ? " svc-rack-card--link" : ""}"
      data-service-id="${def.id}"
      data-accent="${def.accent}"
      data-state="${row.state}"
      title="${escapeAttr(def.title)}${canOpen ? " · клик — открыть" : ""}"
      ${openAttr}${interactive}
    >
      <div class="svc-rack-head">
        <img class="svc-rack-icon" src="assets/${def.icon}" alt="" width="28" height="28" />
        <div class="svc-rack-head-text">
          <strong class="svc-rack-name">${def.shortName}</strong>
          <code class="svc-rack-port">:${row.port}</code>
        </div>
        ${canOpen ? `<span class="svc-rack-go" aria-hidden="true">↗</span>` : ""}
      </div>
      <p class="svc-rack-sub">${subline}</p>
      <footer class="svc-rack-foot">
        <span class="svc-rack-led" aria-hidden="true"></span>
        <span class="svc-rack-status">${row.label}</span>
      </footer>
    </article>
  `;
}

function renderServiceMonitorRackBar(server, ports) {
  return SERVICE_MONITOR_DEFS.map((def) => {
    const { state } = getServiceMonitorRowState(def, server, ports);
    const on = state === "on" ? "1" : "0";
    const pending = state === "pending" ? "1" : "0";
    return `<span class="svc-rack-seg" data-accent="${def.accent}" data-on="${on}" data-pending="${pending}" title="${escapeAttr(def.shortName)}"></span>`;
  }).join("");
}

function renderServicesMonitor() {
  const root = document.getElementById("services-monitor");
  if (!root) return;

  const server = lastServer || bootstrap?.server;
  const ports = getPorts();
  const { online, total } = getServicesMonitorSummary(server, ports);
  const probed = formatMonitorProbedAt(server);
  const modeLabel = String(server?.modeLabel || "").trim();
  const metaParts = [`${online}/${total} online`];
  if (probed) metaParts.push(probed);
  if (modeLabel) metaParts.push(modeLabel);

  root.innerHTML = `
    <div class="svc-rack">
      <div class="svc-rack-bar" role="img" aria-label="${online} из ${total} сервисов в сети">${renderServiceMonitorRackBar(server, ports)}</div>
      <p class="svc-rack-meta">${metaParts.join(" · ")} · авто 8 с</p>
      <div class="svc-rack-grid">${SERVICE_MONITOR_DEFS.map((def) => renderServiceMonitorRackCard(def, server, ports)).join("")}</div>
      <details class="svc-rack-note">
        <summary>Launcher · Mac и Linux</summary>
        <p>Один UI: Electron на Mac (<code>welcome.command</code>) или браузер на Linux/VPS — <code>http://host:3288/</code> (поднимается с <code>npm start</code>). На Mac можно открыть тот же URL.</p>
      </details>
    </div>
  `;
}

async function refreshServicesMonitorManual() {
  const button = document.getElementById("refresh-services-monitor");
  const prev = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = "…";
  }
  try {
    const data = await window.agentControl.refreshStatus();
    await handleServerStatusUpdate(data.server, { skipNotify: true });
  } catch (error) {
    appendLog(`Ошибка мониторинга: ${error.message}\n`, "stderr");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = prev || "Обновить";
    }
  }
}

function bindServicesMonitorActions() {
  const button = document.getElementById("refresh-services-monitor");
  if (button && !button.dataset.bound) {
    button.dataset.bound = "1";
    button.addEventListener("click", () => void refreshServicesMonitorManual());
  }

  const root = document.getElementById("services-monitor");
  if (!root || root.dataset.actionsBound) return;
  root.dataset.actionsBound = "1";

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-svc-open]");
    if (target?.dataset.svcOpen) {
      window.agentControl.openExternal(target.dataset.svcOpen);
    }
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest("[data-svc-open]");
    if (!target?.dataset.svcOpen) return;
    event.preventDefault();
    window.agentControl.openExternal(target.dataset.svcOpen);
  });
}

function renderSetupChecklist() {
  const root = document.getElementById("setup-checklist");
  if (!root) return;

  const state = getSetupCheckState();
  const diskState = getDiskStatState();
  const hints = {
    deps: "Шаг 1 → Установить зависимости",
    certs: "Шаг 1 → Выпустить сертификаты HTTPS",
    server: "Шаг 2 → Старт",
    mcp: "Шаг 3 → MCP к агенту"
  };

  const checkItems = Object.keys(SETUP_CHECK_LABELS).map((id) => {
    const ok = state[id];
    const pending = id === "mcp" && state.server && mcpOk === null;
    const mark = ok ? "✓" : pending ? "…" : "○";
    const itemState = ok ? "ok" : pending ? "pending" : "todo";
    const hint = !ok && !pending ? `<span class="setup-check-hint">${hints[id]}</span>` : "";

    return `
      <div class="setup-check-item" data-state="${itemState}">
        <span class="setup-check-mark">${mark}</span>
        <span class="setup-check-copy">
          <span class="setup-check-label">${SETUP_CHECK_LABELS[id]}</span>
          ${hint}
        </span>
      </div>
    `;
  });

  const statItems = Object.keys(DISK_STAT_LABELS).map((id) => {
    const refreshBtn =
      id === "diskFree"
        ? `<button
        type="button"
        class="ghost-btn ghost-btn--icon setup-check-disk-refresh"
        data-disk-stats-refresh
        title="Обновить данные о диске"
        aria-label="Обновить данные о диске"
      >↻</button>`
        : "";

    return `
      <div class="setup-check-item setup-check-item--stat${id === "diskFree" ? " setup-check-item--stat-refresh" : ""}" data-state="stat">
        ${refreshBtn}
        <span class="setup-check-copy">
          <span class="setup-check-label">${DISK_STAT_LABELS[id]}</span>
          <span class="setup-check-value">${diskState[id]}</span>
        </span>
      </div>
    `;
  });

  root.innerHTML = `
    <div class="setup-checklist-grid setup-checklist-grid--checks">
      ${checkItems.join("")}
    </div>
    <div class="setup-checklist-grid setup-checklist-grid--disk">
      ${statItems.join("")}
    </div>
  `;
}

async function refreshDiskStats(button) {
  if (!button || button.disabled) return;
  const block = button.closest(".setup-check-item--stat-refresh");
  const valueEl = block?.querySelector(".setup-check-value");
  const prevValue = valueEl?.textContent ?? "";

  button.disabled = true;
  block?.classList.add("is-disk-loading");
  block?.setAttribute("aria-busy", "true");
  if (valueEl) valueEl.textContent = "…";

  try {
    const data = await window.agentControl.refreshBootstrap();
    if (data.environment) {
      bootstrap.environment = data.environment;
      renderSetupChecklist();
      return;
    }
    if (valueEl) valueEl.textContent = prevValue;
  } catch (error) {
    if (valueEl) valueEl.textContent = prevValue;
    appendLog(`Ошибка обновления диска: ${error.message}\n`, "stderr");
  } finally {
    block?.classList.remove("is-disk-loading");
    block?.removeAttribute("aria-busy");
    if (button.isConnected) button.disabled = false;
  }
}

function bindSetupChecklistActions() {
  const root = document.getElementById("setup-checklist");
  if (!root || root.dataset.actionsBound) return;
  root.dataset.actionsBound = "1";
  root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-disk-stats-refresh]");
    if (!btn) return;
    void refreshDiskStats(btn);
  });
}

function renderEnvRow({ mark, label, detail, value, status, hover }) {
  const hoverText = hover || [label, detail, value].filter(Boolean).join(" · ");
  const detailText = detail ? `(${detail})` : "";

  return `
    <div class="env-row" data-status="${status || "neutral"}" title="${escapeAttr(hoverText)}">
      <span class="env-row-mark">${mark}</span>
      <span class="env-row-label">${label}</span>
      <span class="env-row-detail">${detailText}</span>
      <span class="env-row-value">${value || "—"}</span>
    </div>
  `;
}

function dependencyEnvRow(dep) {
  const ok = dep.status === "ok";
  const warn = dep.status === "warn";
  const value = ok || warn ? dep.value || (ok ? "есть" : "—") : "нет";
  const detail = ok
    ? dep.path || dep.note || ""
    : warn
      ? dep.path || dep.note || ""
      : ENV_TOOL_HINTS[dep.id] || dep.note || "Установите";
  const hover = ok
    ? `${dep.label}: ${[dep.path, dep.value, dep.note].filter(Boolean).join(" · ")}`
    : `${dep.label} — ${ENV_TOOL_HINTS[dep.id] || dep.note || "Установите"}`;
  const mark = ok ? "✓" : warn ? "△" : "○";

  return renderEnvRow({
    mark,
    label: dep.label,
    detail,
    value,
    status: dep.status,
    hover
  });
}

function buildCoreEnvironmentRows(environment) {
  if (!environment) return [];

  const depsById = Object.fromEntries((environment.dependencies || []).map((dep) => [dep.id, dep]));
  const rows = ["node", "python", "mkcert"]
    .map((id) => depsById[id])
    .filter(Boolean)
    .map(dependencyEnvRow);

  rows.push(
    renderEnvRow({
      mark: "·",
      label: "Хост",
      value: environment.host?.computerName || environment.host?.hostname || "—",
      detail:
        environment.host?.hostname &&
        environment.host?.computerName &&
        environment.host.computerName !== environment.host.hostname
          ? environment.host.hostname
          : "",
      status: "neutral",
      hover: `Хост: ${environment.host?.computerName || environment.host?.hostname || "—"}`
    }),
    renderEnvRow({
      mark: "·",
      label: "Платформа",
      value: environment.host?.platformLabel || "—",
      detail: environment.host?.release ? `kernel ${environment.host.release}` : "",
      status: "neutral",
      hover: `Платформа: ${environment.host?.platformLabel || "—"}`
    }),
    renderEnvRow({
      mark: "·",
      label: "LAN",
      value: environment.host?.lanIp || "—",
      detail: environment.host?.lanIp ? "локальная сеть" : "не определён",
      status: environment.host?.lanIp ? "ok" : "neutral",
      hover: environment.host?.lanIp ? `LAN: ${environment.host.lanIp}` : "LAN не определён"
    }),
    renderEnvRow({
      mark: "·",
      label: "Проект",
      value: environment.app?.version ? `v${environment.app.version}` : "—",
      detail: environment.app?.name || "agent-cms",
      status: "neutral",
      hover: `Проект: ${environment.app?.name || "agent-cms"} v${environment.app?.version || "—"}`
    })
  );

  rows.push(
    ...["npm", "git", "https"]
      .map((id) => depsById[id])
      .filter(Boolean)
      .map(dependencyEnvRow)
  );

  return rows;
}

function getExtraEnvironmentDependencies(environment) {
  if (!environment) return [];

  const deps = environment.dependencies || [];
  const depsById = Object.fromEntries(deps.map((dep) => [dep.id, dep]));
  const knownExtraIds = new Set(ENV_TECH_EXTRA_ORDER);
  const ordered = ENV_TECH_EXTRA_ORDER.map((id) => depsById[id]).filter(Boolean);
  const rest = deps.filter((dep) => !ENV_TECH_VISIBLE_IDS.has(dep.id) && !knownExtraIds.has(dep.id));
  return [...ordered, ...rest];
}

function buildExtraEnvironmentRows(environment) {
  return getExtraEnvironmentDependencies(environment).map(dependencyEnvRow);
}

function buildFullEnvironmentRows(environment) {
  return [
    ...buildCoreEnvironmentRows(environment),
    ...buildExtraEnvironmentRows(environment)
  ];
}

function setEnvExpandAll(next) {
  envExpandAll = Boolean(next);
  const toggle = document.getElementById("env-expand-all");
  if (toggle && toggle.checked !== envExpandAll) {
    toggle.checked = envExpandAll;
  }
  renderEnvironmentRows(bootstrap?.environment);
}

function renderEnvironmentRows(environment) {
  if (!envRows) return;

  if (!environment) {
    envRows.innerHTML = "";
    return;
  }

  let html = "";
  if (envExpandAll) {
    html = buildFullEnvironmentRows(environment).join("");
    html += `<button type="button" class="env-expand-trigger" data-env-expand="0">Свернуть список технологий</button>`;
  } else {
    html = `<button type="button" class="env-expand-trigger" data-env-expand="1">Показать полный список технологий</button>`;
  }

  envRows.innerHTML = html;
}

function bindEnvExpandToggle() {
  const toggle = document.getElementById("env-expand-all");
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = "1";
    toggle.addEventListener("change", () => setEnvExpandAll(toggle.checked));
  }

  if (envRows && !envRows.dataset.expandBound) {
    envRows.dataset.expandBound = "1";
    envRows.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-env-expand]");
      if (!trigger) return;
      setEnvExpandAll(trigger.dataset.envExpand === "1");
    });
  }
}

const PLATFORM_CARDS = [
  { id: "mac", match: "darwin", name: "macOS", accent: "mac" },
  { id: "linux", match: "linux", name: "Linux", accent: "linux" },
  { id: "windows", match: "win32", name: "Windows", accent: "windows", disabled: true }
];

const PLATFORM_ICON_FILES = {
  mac: "platform-macos.svg",
  linux: "platform-linux.svg",
  windows: "platform-windows.svg"
};

function platformPickIcon(id) {
  const file = PLATFORM_ICON_FILES[id] || PLATFORM_ICON_FILES.windows;
  return `<img class="platform-pick-icon-img" src="assets/${file}" alt="" width="36" height="36" decoding="async" />`;
}

function buildPlatformHostChipLines(host) {
  const computer = String(host?.computerName || "").trim();
  const hostname = String(host?.hostname || "").trim();
  const platformLabel = String(host?.platformLabel || "").trim();
  const primary = computer || hostname || "—";
  let secondary = platformLabel || "—";
  if (hostname && computer && computer !== hostname) {
    secondary = `${hostname} · ${platformLabel || "—"}`;
  }
  return { primary, secondary };
}

function resolveActivePlatformId(environment) {
  const raw = String(environment?.host?.platform || "").toLowerCase();
  if (raw === "darwin") return "mac";
  if (raw === "linux") return "linux";
  if (raw === "win32") return "windows";
  return null;
}

function escapePlatformText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function launcherModeLabel() {
  const mode = document.documentElement.dataset.controlLauncher;
  if (mode === "web") return "Launcher в браузере";
  if (window.agentControl && mode !== "web") return "Launcher · Electron";
  return "Agent CMS Control";
}

function renderPlatformCover(environment) {
  const root = document.getElementById("platform-cover");
  if (!root) return;

  const activeId = resolveActivePlatformId(environment);
  const host = environment?.host || {};
  const hostLines = buildPlatformHostChipLines(host);
  const modeLine = launcherModeLabel();

  const cards = PLATFORM_CARDS.map((card) => {
    const isActive = !card.disabled && card.id === activeId;
    const isDisabled = Boolean(card.disabled);
    const state = isDisabled ? "disabled" : isActive ? "active" : "idle";

    return `
      <article
        class="platform-pick platform-pick--${card.accent}"
        data-state="${state}"
        aria-disabled="${isDisabled ? "true" : "false"}"
        aria-label="${escapePlatformText(card.name)}${isDisabled ? ", недоступно" : isActive ? ", текущий хост" : ""}"
        ${isActive ? 'aria-current="true"' : ""}
        role="listitem"
      >
        <div class="platform-pick-icon">${platformPickIcon(card.id)}</div>
        <span class="platform-pick-name">${escapePlatformText(card.name)}</span>
      </article>
    `;
  }).join("");

  root.innerHTML = `
    <div class="platform-cover-inner">
      <header class="platform-cover-head">
        <div class="platform-cover-head-main">
          <p class="platform-cover-kicker">${escapePlatformText(modeLine)}</p>
          <h2 class="platform-cover-title">Где работает Agent CMS</h2>
          <p class="platform-cover-sub">Один Launcher — разные способы запуска под ОС хоста</p>
        </div>
        <div class="platform-host-chip" title="Определено на сервере">
          <span class="platform-host-chip-label">Хост</span>
          <strong>${escapePlatformText(hostLines.primary)}</strong>
          <code>${escapePlatformText(hostLines.secondary)}</code>
        </div>
      </header>
      <div class="platform-stage">
        <div class="platform-pick-grid" role="list">${cards}</div>
      </div>
    </div>
  `;
}

function renderEnvironment(environment) {
  renderPlatformCover(environment);
  renderSetupChecklist();
  renderEnvironmentRows(environment);
}

function syncServerUi(server) {
  const isRunning = Boolean(server?.running);
  applyServerStatusChip(document.getElementById("server-status-inline"), server);

  document.querySelectorAll(".browser-link, .browser-link-copy").forEach((button) => {
    button.disabled = !isRunning;
  });

  const serverActionBusy =
    runningActions.has("server-autostart-enable") ||
    runningActions.has("server-autostart-disable") ||
    runningActions.has("server-start-bg") ||
    runningActions.has("server-start-attached") ||
    runningActions.has("server-stop") ||
    runningActions.has("server-restart");
  const opsLocked = needsAppLockLogin();

  document
    .querySelectorAll('[data-action="server-start-bg"], [data-action="server-start-attached"]')
    .forEach((button) => {
      button.disabled =
        opsLocked || isRunning || serverActionBusy || runningActions.has(button.dataset.action);
    });
  document.querySelectorAll('[data-action="server-stop"]').forEach((button) => {
    button.disabled = opsLocked || !isRunning || serverActionBusy;
  });
  document.querySelectorAll('[data-action="server-restart"]').forEach((button) => {
    button.disabled = opsLocked || !isRunning || serverActionBusy;
  });

  const autostartOn = Boolean(server?.autoStart?.enabled);
  document.querySelectorAll('[data-action="server-autostart-enable"]').forEach((button) => {
    button.disabled = autostartOn || serverActionBusy || runningActions.has("server-autostart-enable");
  });
  document.querySelectorAll('[data-action="server-autostart-disable"]').forEach((button) => {
    button.disabled = !autostartOn || serverActionBusy || runningActions.has("server-autostart-disable");
  });

  syncMcpConfigPreview();
}

async function handleServerStatusUpdate(server, options = {}) {
  const wasRunning = Boolean(lastServer?.running);
  lastServer = server;
  renderServerStatus(server);

  if (wasRunning && !server?.running && !options.skipNotify && !suppressServerDownNotify) {
    window.agentControl.notify("Сервер остановлен", `CMS и ${VOICE_UI_LABEL} больше не отвечают.`);
    appendLog("Сервер перестал отвечать.\n", "stderr");
  }
  suppressServerDownNotify = false;

  if (server?.running) {
    try {
      const result = await window.agentControl.testUrl(getTestUrl("mcp"));
      mcpOk = result.ok;
    } catch {
      mcpOk = false;
    }
  } else {
    mcpOk = null;
  }

  syncServerUi(server);
  patchControlOpenButton();
  renderSetupChecklist();
  renderServicesMonitor();
}

function patchControlOpenButton() {
  const openBtn = actionsRoot.querySelector("[data-control-open-btn]");
  if (!openBtn) return;
  const server = lastServer || bootstrap?.server;
  const ports = bootstrap?.serverPorts || {};
  const url = getServiceMonitorOpenUrl({ id: "control" }, server, ports);
  const canOpen =
    Boolean(url) &&
    (Boolean(server?.controlHttp) || Boolean(server?.cms));
  const title = canOpen ? url : "Сначала запустите сервер (npm start или «В фоне»)";
  openBtn.dataset.openUrl = url || "";
  openBtn.disabled = !canOpen;
  openBtn.title = title;
}

async function pollServerStatus() {
  try {
    const data = await window.agentControl.refreshStatus();
    await handleServerStatusUpdate(data.server);
  } catch {
    // ignore transient poll errors
  }
}

function startServerPoll() {
  if (serverPollTimer) window.clearInterval(serverPollTimer);
  serverPollTimer = window.setInterval(pollServerStatus, SERVER_POLL_MS);
}

function actionButton(actionId, tone = "default", extraClass = "", disabled = false, labelOverride = "") {
  const label = labelOverride || formatActionButtonContent(actionId);
  const disabledAttr = disabled ? " disabled" : "";
  const durationClass = BUILD_DURATION_HINTS[actionId] ? " has-duration" : "";
  const titleAttr = BUILD_DURATION_HINTS[actionId]
    ? ` title="Примерное время сборки: ${BUILD_DURATION_HINTS[actionId]}. Прогресс — в журнале внизу."`
    : "";
  return `<button type="button" class="run-btn ${extraClass}${durationClass}" data-tone="${tone}" data-action="${actionId}"${titleAttr}${disabledAttr}>${label}</button>`;
}

const SETUP_SHORT_TITLES = {
  "install-deps": "Установить зависимости",
  "setup-certs": "Выпустить сертификаты HTTPS",
  "setup-desktop-shortcuts": "Создать ярлыки на Desktop"
};

const SERVER_BTN_TITLES = {
  "server-autostart-enable": "Автостарт",
  "server-autostart-disable": "Автостарт",
  "server-start-bg": "Старт в фоне",
  "server-start-attached": "Старт",
  "server-stop": "Стоп",
  "server-restart": "Рестарт"
};

const AGENT_START_PROMPT = "Выбери хранилище <Название хранилища> и загрузи контекст";

const MCP_INSTRUCTIONS_CONTEXT_DRAFT = `Когда контекстное окно чата близко к пределу или ранее загруженный контекст Agent CMS мог выпасть из памяти — предложи пользователю освежить контекст хранилища.

Не продолжай работу «из памяти»: сначала убедись, что актуальный контекст снова загружен, затем кратко резюмируй, что уже сделано, и только после этого продолжай.`;

const SERVER_BTN_HINTS = {
  "server-autostart-enable": "После входа в macOS",
  "server-autostart-disable": "Сейчас включён",
  "server-start-bg": "Останется после закрытия",
  "server-start-attached": "Пока окно открыто",
  "server-stop": "Остановить сервер",
  "server-restart": "Тот же режим запуска"
};

const SERVER_PLAY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
    <path d="M10.2 8.4v7.2L15.8 12 10.2 8.4Z" fill="currentColor"></path>
  </svg>
`;

const BROWSER_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
    <path d="M3.5 8.5h17" stroke="currentColor" stroke-width="1.5"></path>
    <circle cx="6.5" cy="6.5" r="0.8" fill="currentColor"></circle>
    <circle cx="9" cy="6.5" r="0.8" fill="currentColor"></circle>
  </svg>
`;

const SERVER_STOP_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
    <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1" fill="currentColor"></rect>
  </svg>
`;

const SERVER_RESTART_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
    <path d="M15.5 8.5A4 4 0 0 0 9.2 9.8L8 8.5V12h3.5l-1.2-1.2A2.5 2.5 0 0 1 14.8 11.5c.7 0 1.3-.3 1.8-.7l1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M8.5 15.5A4 4 0 0 0 14.8 14.2L16 15.5V12h-3.5l1.2 1.2A2.5 2.5 0 0 1 9.2 12.5c-.7 0-1.3.3-1.8.7L6 11.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`;

function serverButton(actionId, tone, disabled = false, hintOverride) {
  const disabledAttr = disabled ? " disabled" : "";
  const title = SERVER_BTN_TITLES[actionId] || "Запуск";
  const hint = hintOverride ?? SERVER_BTN_HINTS[actionId] ?? "";
  const icon =
    tone === "stop" ? SERVER_STOP_ICON : tone === "restart" ? SERVER_RESTART_ICON : SERVER_PLAY_ICON;
  const iconClass =
    tone === "stop"
      ? "server-deck-icon--stop"
      : tone === "restart"
        ? "server-deck-icon--restart"
        : "server-deck-icon--play";
  const badge =
    tone === "start-bg"
      ? `<span class="server-deck-badge">фон</span>`
      : tone === "autostart-on"
        ? `<span class="server-deck-badge">вкл</span>`
        : tone === "autostart"
          ? `<span class="server-deck-badge">mac</span>`
          : "";

  return `
    <button type="button" class="server-deck-btn" data-tone="${tone}" data-action="${actionId}"${disabledAttr}>
      <span class="server-deck-icon ${iconClass}">
        ${icon}
        ${badge}
      </span>
      <span class="server-deck-text">
        <strong class="server-deck-title">${title}</strong>
        <span class="server-deck-hint">${hint}</span>
      </span>
      <span class="server-deck-spinner" aria-hidden="true"></span>
    </button>
  `;
}

function isDesktopShortcutsSupported() {
  const raw = String(bootstrap?.environment?.host?.platform || "").toLowerCase();
  return raw === "darwin" || raw === "win32";
}

function setupButton(actionId, title, hint, disabled = false) {
  const disabledAttr = disabled ? " disabled" : "";
  const titleAttr = disabled ? ' title="Только macOS и Windows"' : "";
  return `
    <button type="button" class="setup-btn" data-action="${actionId}"${disabledAttr}${titleAttr}>
      <span class="setup-btn-spinner" aria-hidden="true"></span>
      <strong class="setup-btn-title">${title}</strong>
      <span class="setup-btn-hint">${hint}</span>
    </button>
  `;
}

function actionCard(actionId, title, hint, tone = "default", disabled = false, wide = false) {
  const disabledAttr = disabled ? " disabled" : "";
  const wideClass = wide ? " action-card--wide" : "";
  return `
    <button type="button" class="action-card${wideClass}" data-tone="${tone}" data-action="${actionId}"${disabledAttr}>
      <strong>${title}</strong>
      <span>${hint}</span>
    </button>
  `;
}

function getPorts() {
  return (
    bootstrap?.serverPorts || {
      editorHttps: 3443,
      editorHttp: 3000,
      voiceHttps: 3488,
      voiceHttp: 3088,
      commanderHttp: 3188,
      controlHttp: 3288,
      mcpHttp: 3490
    }
  );
}

function getEffectiveCmsBaseUrl() {
  const server = lastServer || bootstrap?.server;
  const ports = getPorts();
  const fromProbe = String(server?.urls?.cms || "").trim();
  if (server?.cms && fromProbe) return rewriteUrlHostForClient(fromProbe.replace(/\/+$/, ""));

  const mcpUrl = String(bootstrap?.mcpConnect?.cmsBaseUrl || "").trim();
  if (mcpUrl) return rewriteUrlHostForClient(mcpUrl.replace(/\/+$/, ""));

  if (preferHttpServiceLinks() && ports.editorHttp) {
    return buildServiceUrl("http", ports.editorHttp, "/").replace(/\/+$/, "");
  }
  return buildServiceUrl("https", ports.editorHttps, "/").replace(/\/+$/, "");
}

function getMcpTlsInsecureEnv() {
  const mcp = bootstrap?.mcpConnect || {};
  const raw = mcp.configJsonCopy || mcp.configJson || "";
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const insecure = parsed?.mcpServers?.["agent-cms"]?.env?.AGENT_CMS_TLS_INSECURE;
    if (insecure) return { AGENT_CMS_TLS_INSECURE: String(insecure) };
  } catch {
    // ignore stale JSON
  }
  return {};
}

function buildMcpConfigObject({ useAbsPath = false } = {}) {
  const mcp = bootstrap?.mcpConnect || {};
  const root = String(bootstrap?.projectRoot || "").trim();
  const scriptPath = useAbsPath
    ? "<ABS_PATH>/mcp-server/index.js"
    : mcp.mcpServerPath || `${root}/mcp-server/index.js`;

  return {
    mcpServers: {
      "agent-cms": {
        command: "node",
        args: [scriptPath]
      }
    }
  };
}

function getTestUrl(kind) {
  const testPath =
    kind === "mcp"
      ? bootstrap?.mcpTest?.path || "/api/agent/mcp-ping"
      : bootstrap?.serverTest?.path || "/";
  const base = getEffectiveCmsBaseUrl();
  return `${base}${testPath.startsWith("/") ? testPath : `/${testPath}`}`;
}

function getCurlCommand(kind) {
  return `curl -sk ${getTestUrl(kind)}`;
}

function renderCmdRow(kind, tag) {
  const command = getCurlCommand(kind);
  const hint =
    kind === "mcp"
      ? bootstrap?.mcpTest?.hint || "utility_mcp_ping — JSON с ok и mcpVersion"
      : bootstrap?.serverTest?.hint || "CMS отвечает по HTTPS";

  return `
    <div class="cmd-check">
      <span class="cmd-check-tag" title="${escapeAttr(hint)}">${tag}</span>
      <code class="cmd-check-cmd" title="${escapeAttr(command)}">${command}</code>
      <div class="cmd-check-actions">
        <button type="button" class="ghost-btn cmd-mini" data-copy-cmd="${escapeAttr(command)}" title="Копировать" aria-label="Копировать ${tag}">⎘</button>
        <button type="button" class="ghost-btn cmd-mini cmd-mini--primary" data-run-test="${kind}" data-test-url="${escapeAttr(getTestUrl(kind))}" title="${escapeAttr(hint)}" aria-label="Проверить ${tag}">▶</button>
      </div>
      <pre class="cmd-result cmd-result--check" data-result="${kind}" hidden></pre>
    </div>
  `;
}

function renderGuideStepSetup() {
  const ids = bootstrap?.setupActionIds || [];
  const actions = (bootstrap?.actions || []).filter((entry) => ids.includes(entry.id));

  const cards = actions
    .map((action) => {
      const shortcutsOnly =
        action.id === "setup-desktop-shortcuts" && !isDesktopShortcutsSupported();
      const hint = shortcutsOnly
        ? "Только macOS и Windows — на Linux/VPS не нужно."
        : action.description || "";
      return setupButton(
        action.id,
        SETUP_SHORT_TITLES[action.id] || action.title,
        hint,
        shortcutsOnly
      );
    })
    .join("");

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">1</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>Установка</h3>
          <p>Один раз: зависимости проекта и HTTPS-сертификаты для localhost</p>
        </div>
        <div class="setup-btn-grid">
          ${cards}
        </div>
      </div>
    </article>
  `;
}

function renderMobileVoiceBlock() {
  const mobile = bootstrap?.mobileConnect || {};
  const ports = getPorts();
  const server = lastServer || bootstrap?.server;
  const isRunning = Boolean(server?.running);
  const lanIp = mobile.lanIp || bootstrap?.environment?.host?.lanIp || "";
  const voiceUrl = mobile.voiceUrl || (lanIp ? `https://${lanIp}:${ports.voiceHttps}/` : "");
  const mkcertUrl =
    mobile.mkcertCaUrl ||
    (lanIp ? `http://${lanIp}:${ports.voiceHttp}/dev/mkcert-root-ca.pem` : "");

  let note = `Откройте ${VOICE_UI_LABEL} на iPhone — Mac и телефон в одной сети или Mac на точке доступа iPhone.`;
  if (!lanIp) {
    note =
      "IP Mac не определён. Нажмите «Обновить» в блоке Система. После смены сети пересоздайте сертификаты (шаг 1).";
  } else if (mobile.hotspotHint) {
    note = `${mobile.hotspotHint} После смены сети — пересоздайте сертификаты.`;
  } else {
    note = `IP Mac: ${lanIp}. Не используйте localhost — на телефоне он не откроется.`;
  }

  const qrHidden = !isRunning || !voiceUrl;

  return `
    <div class="mobile-voice-block" id="mobile-voice-block">
      <p class="mobile-voice-note">${note}</p>
      <div class="mobile-voice-url-row">
        <code class="mobile-voice-url" id="mobile-voice-url">${voiceUrl || "—"}</code>
        <button type="button" class="ghost-btn cmd-btn" data-copy-target="mobile-voice-url"${voiceUrl ? "" : " disabled"}>Копировать</button>
      </div>
      <div class="mobile-voice-qr-wrap"${qrHidden ? " hidden" : ""} id="mobile-voice-qr-wrap">
        <img class="mobile-voice-qr" id="mobile-voice-qr" alt="QR для Voice-Chat на iPhone" width="220" height="220" />
        <p class="mobile-voice-qr-hint">Наведите камеру iPhone → ${VOICE_UI_LABEL} в Safari</p>
      </div>
      ${
        mkcertUrl && lanIp
          ? `
        <div class="mobile-voice-cert">
          <p class="mobile-voice-cert-note">На iPhone один раз установите mkcert CA — HTTPS без предупреждений:</p>
          <div class="mobile-voice-url-row">
            <code class="mobile-voice-url mobile-voice-url--small" id="mobile-mkcert-url">${mkcertUrl}</code>
            <button type="button" class="ghost-btn cmd-btn" data-copy-target="mobile-mkcert-url">Копировать</button>
          </div>
        </div>
      `
          : ""
      }
      ${!isRunning ? `<p class="mobile-voice-warn">Сначала запустите сервер.</p>` : ""}
    </div>
  `;
}

async function refreshMobileVoiceQr() {
  const wrap = document.getElementById("mobile-voice-qr-wrap");
  const img = document.getElementById("mobile-voice-qr");
  const urlNode = document.getElementById("mobile-voice-url");
  if (!wrap || !img || !urlNode) return;

  const mobile = bootstrap?.mobileConnect || {};
  const server = lastServer || bootstrap?.server;
  const isRunning = Boolean(server?.running);
  const url = String(mobile.voiceUrl || urlNode.textContent || "").trim();

  if (!isRunning || !url || url === "—") {
    wrap.hidden = true;
    return;
  }

  try {
    const result = await window.agentControl.renderQr(url);
    if (result?.ok && result.dataUrl) {
      img.src = result.dataUrl;
      wrap.hidden = false;
    } else {
      wrap.hidden = true;
    }
  } catch {
    wrap.hidden = true;
  }
}

function renderGuideStepServer() {
  const server = lastServer || bootstrap?.server;
  const isRunning = Boolean(server?.running);
  const opsLocked = needsAppLockLogin();
  const ports = getPorts();
  const cmsHttps = buildServiceUrl("https", ports.editorHttps, "/");
  const cmsHttp = buildServiceUrl("http", ports.editorHttp, "/");
  const voiceHttps = buildServiceUrl("https", ports.voiceHttps, "/");
  const voiceHttp = buildServiceUrl("http", ports.voiceHttp, "/");
  const commanderHttp = buildServiceUrl("http", ports.commanderHttp, "/");
  const commanderHttps = buildServiceUrl("https", ports.editorHttps, "/commander/");
  const commanderOpenUrl = isRunning ? commanderHttps : commanderHttp;
  const linkDisabled = isRunning ? "" : " disabled";
  const browserLinks = `
    <div class="server-browser-row" role="group" aria-label="Открыть или скопировать ссылки">
      <div class="browser-link-wrap">
        <button type="button" class="link-btn browser-link link-btn--cms" data-open-url="${escapeAttr(cmsHttps)}"${linkDisabled}>
          <span class="browser-link-icon">${BROWSER_ICON}</span>
          <span class="browser-link-text">
            <span>Editor</span>
            <code>:${ports.editorHttps}</code>
          </span>
        </button>
        <div class="browser-link-copy-pair">
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(cmsHttp)}" data-copy-label="Editor HTTP" title="Копировать HTTP"${linkDisabled}>HTTP</button>
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(cmsHttps)}" data-copy-label="Editor HTTPS" title="Копировать HTTPS"${linkDisabled}>HTTPS</button>
        </div>
      </div>
      <div class="browser-link-wrap">
        <button type="button" class="link-btn browser-link link-btn--voice" data-open-url="${escapeAttr(voiceHttps)}"${linkDisabled}>
          <span class="browser-link-icon">${BROWSER_ICON}</span>
          <span class="browser-link-text">
            <span>${VOICE_UI_LABEL}</span>
            <code>:${ports.voiceHttps}</code>
          </span>
        </button>
        <div class="browser-link-copy-pair">
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(voiceHttp)}" data-copy-label="${VOICE_UI_LABEL} HTTP" title="Копировать HTTP"${linkDisabled}>HTTP</button>
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(voiceHttps)}" data-copy-label="${VOICE_UI_LABEL} HTTPS" title="Копировать HTTPS"${linkDisabled}>HTTPS</button>
        </div>
      </div>
      <div class="browser-link-wrap">
        <button type="button" class="link-btn browser-link link-btn--commander" data-open-url="${escapeAttr(commanderOpenUrl)}"${linkDisabled}>
          <span class="browser-link-icon">${BROWSER_ICON}</span>
          <span class="browser-link-text">
            <span>Commander</span>
            <code>:${ports.commanderHttp}</code>
          </span>
        </button>
        <div class="browser-link-copy-pair">
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(commanderHttp)}" data-copy-label="Commander HTTP" title="Копировать HTTP (отдельный порт)"${linkDisabled}>HTTP</button>
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(commanderHttps)}" data-copy-label="Commander HTTPS" title="Копировать HTTPS (/commander/ на Editor)"${linkDisabled}>HTTPS</button>
        </div>
      </div>
    </div>
  `;

  const maintenanceDisabled = maintenanceModeBusy;
  const maintenanceChecked = maintenanceModeEnabled ? " checked" : "";
  const autoStart = server?.autoStart;
  const autostartSupported = autoStart?.supported !== false && !isWebLauncher();
  const autostartOn = Boolean(autoStart?.enabled);
  const autostartActionId = autostartOn ? "server-autostart-disable" : "server-autostart-enable";
  const autostartTone = autostartOn ? "autostart-on" : "autostart";
  const autostartButton = autostartSupported
    ? serverButton(autostartActionId, autostartTone, false)
    : "";
  const startBgHint = isWebLauncher()
    ? "Фоновый start-direct (npm start)"
    : SERVER_BTN_HINTS["server-start-bg"];
  const startAttachedHint = isWebLauncher()
    ? "Тот же запуск, пока вкладка открыта"
    : SERVER_BTN_HINTS["server-start-attached"];
  const deckButtons = [
    autostartButton,
    serverButton("server-start-bg", "start-bg", isRunning || opsLocked, startBgHint),
    serverButton("server-start-attached", "start", isRunning || opsLocked, startAttachedHint),
    serverButton("server-stop", "stop", !isRunning || opsLocked),
    isControlActionAvailable("server-restart")
      ? serverButton("server-restart", "restart", !isRunning || opsLocked)
      : ""
  ].filter(Boolean);
  const deckCount = deckButtons.length;
  const deckSizeClass = deckCount >= 5 ? " server-deck--5" : "";

  const controlBlock = `
    <div class="server-controls">
      <div class="server-deck${deckSizeClass}" role="group" aria-label="Управление сервером">
        ${deckButtons.join("")}
      </div>
      <div class="maintenance-toggle-card" id="maintenance-toggle-card" data-state="${maintenanceModeEnabled ? "on" : "off"}">
        <div class="maintenance-toggle-copy">
          <strong>Режим обслуживания</strong>
          <span>${maintenanceStubSummaryText()}</span>
        </div>
        <label class="toggle-switch" title="maintenance-mode в .agent-cms-global/settings/platform.yml">
          <input type="checkbox" id="maintenance-mode-toggle"${maintenanceChecked}${maintenanceDisabled ? " disabled" : ""} />
          <span class="toggle-switch-track" aria-hidden="true"></span>
        </label>
      </div>
      ${browserLinks}
    </div>
  `;

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">2</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3 class="server-step-title">
            Сервер
            <span id="server-status-inline"></span>
          </h3>
          <p>Запустите CMS и ${VOICE_UI_LABEL} — без сервера не работают Editor, ${VOICE_UI_LABEL}, Commander и расширение Chrome</p>
        </div>
        ${controlBlock}
        ${renderMobileVoiceBlock()}
        <div class="cmd-box">
          <div class="cmd-checks">
            ${renderCmdRow("server", "CMS")}
            ${renderCmdRow("mcp", "MCP")}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderGuideStepMcp() {
  const mcp = bootstrap?.mcpConnect || {};
  const cmsBaseUrl = getEffectiveCmsBaseUrl();
  const mcpServerPath = mcp.mcpServerPath || `${bootstrap?.projectRoot || ""}/mcp-server/index.js`;
  const docsUrl = mcp.docsUrl || `${cmsBaseUrl}/api/mcp-docs?version=0.0.2`;

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">3</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>MCP к агенту</h3>
          <p>Подключите Cursor или Claude Desktop к CMS по MCP</p>
        </div>
        <ol class="guide-list">
          <li>Запустите <strong>сервер</strong> (шаг 2)</li>
          <li><strong>Cursor:</strong> Settings → MCP или <code>.cursor/mcp.json</code></li>
          <li><strong>Claude Desktop:</strong> <code>claude_desktop_config.json</code></li>
          <li>Вставьте JSON ниже (без URL — local и remote из <code>instances.json</code>)</li>
          <li>Удалённые CMS: блок <strong>Инстансы MCP</strong> ниже или в Editor → MCP Server → Инстансы MCP</li>
          <li>Перезапустите MCP-клиент</li>
        </ol>
        <div class="mcp-instances-control panel-inset" id="mcp-instances-control-root">
          <p class="mcp-config-note">
            Единственное место для URL и token удалённых CMS. Editor показывает список без секретов; MCP stdio читает этот файл с диска.
          </p>
          <h4>Инстансы MCP</h4>
          <p class="mcp-config-note" id="mcp-instances-control-file"></p>
          <div id="mcp-instances-control-list"></div>
          <div class="guide-actions">
            <button type="button" class="ghost-btn" id="mcp-instances-control-add">+ Remote</button>
            <button type="button" class="ghost-btn" id="mcp-instances-control-reload">Обновить</button>
            <button type="button" class="ghost-btn" id="mcp-instances-control-save">Сохранить</button>
          </div>
          <p class="mcp-config-note" id="mcp-instances-control-status" role="status"></p>
        </div>
        <div class="mcp-config-box">
          <div class="cmd-row">
            <pre class="mcp-config-json" id="mcp-config-json" aria-label="Пример MCP-конфига"></pre>
            <button type="button" class="ghost-btn cmd-btn" data-copy-mcp-config title="Скопировать с путём этого проекта">Копировать</button>
          </div>
          <p class="mcp-config-note">Копировать подставит реальный путь <code>mcp-server</code> этого проекта.</p>
        </div>
        <div class="guide-actions">
          <button type="button" class="ghost-btn" data-open-url="${escapeAttr(docsUrl)}">Полная документация MCP</button>
          <button type="button" class="ghost-btn" data-reveal-path="${escapeAttr(mcpServerPath)}">Папка mcp-server</button>
        </div>
      </div>
    </article>
  `;
}

function syncMcpConfigPreview() {
  const node = document.getElementById("mcp-config-json");
  if (!node) return;

  node.textContent = JSON.stringify(buildMcpConfigObject({ useAbsPath: true }), null, 2);
}

let mcpInstancesControlState = { instances: [] };

function renderMcpInstancesControlRows() {
  const list = document.getElementById("mcp-instances-control-list");
  if (!list) return;
  list.innerHTML = (mcpInstancesControlState.instances || [])
    .map((inst, index) => {
      const kind = inst.kind || "local";
      const ro = kind === "local" && inst.id === "local";
      return `
        <fieldset class="mcp-instance-row" data-index="${index}">
          <legend>${escapeAttr(inst.label || inst.id)}</legend>
          <label>id <input name="id" value="${escapeAttr(inst.id || "")}" ${ro ? "readonly" : ""} /></label>
          <label>kind
            <select name="kind" ${ro ? "disabled" : ""}>
              <option value="local" ${kind === "local" ? "selected" : ""}>local</option>
              <option value="remote" ${kind === "remote" ? "selected" : ""}>remote</option>
              <option value="tunnel" ${kind === "tunnel" ? "selected" : ""}>tunnel</option>
            </select>
          </label>
          <label class="mcp-instance-wide">url <input name="url" value="${escapeAttr(inst.url || "")}" /></label>
          <label class="mcp-instance-wide">token <input name="token" value="${escapeAttr(inst.token || "")}" /></label>
          <label>deviceId <input name="deviceId" value="${escapeAttr(inst.deviceId || inst.id || "")}" /></label>
          <label class="mcp-instance-wide">hubUrl <input name="hubUrl" value="${escapeAttr(inst.hubUrl || "")}" /></label>
          ${ro ? "" : `<button type="button" class="ghost-btn mcp-instance-remove" data-index="${index}">Удалить</button>`}
        </fieldset>`;
    })
    .join("");
  list.querySelectorAll(".mcp-instance-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      mcpInstancesControlState.instances.splice(Number(btn.dataset.index), 1);
      renderMcpInstancesControlRows();
    });
  });
}

function collectMcpInstancesControlForm() {
  const list = document.getElementById("mcp-instances-control-list");
  if (!list) return { instances: [] };
  const instances = [];
  list.querySelectorAll(".mcp-instance-row").forEach((row) => {
    const get = (name) => row.querySelector(`[name="${name}"]`)?.value?.trim() || "";
    const kind = get("kind") || "local";
    const entry = { id: get("id"), kind, label: get("label") || get("id") };
    if (kind === "local") entry.auto = true;
    if (get("url")) entry.url = get("url");
    if (get("token")) entry.token = get("token");
    if (get("deviceId")) entry.deviceId = get("deviceId");
    if (get("hubUrl")) entry.hubUrl = get("hubUrl");
    instances.push(entry);
  });
  return { instances };
}

async function loadMcpInstancesControl() {
  const status = document.getElementById("mcp-instances-control-status");
  const fileNode = document.getElementById("mcp-instances-control-file");
  if (!window.agentControl?.getMcpInstances) return;
  if (status) status.textContent = "Загрузка…";
  const data = await window.agentControl.getMcpInstances();
  if (!data.ok) {
    if (status) status.textContent = data.error || "Ошибка загрузки";
    return;
  }
  mcpInstancesControlState = { instances: data.instances || [] };
  renderMcpInstancesControlRows();
  if (fileNode) fileNode.textContent = data.filePath || "";
  if (status) status.textContent = "Готово";
}

async function bindMcpInstancesControl() {
  const root = document.getElementById("mcp-instances-control-root");
  if (!root || root.dataset.bound === "1") {
    if (root) await loadMcpInstancesControl();
    return;
  }
  root.dataset.bound = "1";
  const add = document.getElementById("mcp-instances-control-add");
  const reload = document.getElementById("mcp-instances-control-reload");
  const save = document.getElementById("mcp-instances-control-save");
  const status = document.getElementById("mcp-instances-control-status");
  add?.addEventListener("click", () => {
    mcpInstancesControlState.instances.push({
      id: "server",
      kind: "remote",
      label: "VPS",
      url: "https://",
      token: ""
    });
    renderMcpInstancesControlRows();
  });
  reload?.addEventListener("click", () => loadMcpInstancesControl());
  save?.addEventListener("click", async () => {
    if (!window.agentControl?.saveMcpInstances) return;
    if (status) status.textContent = "Сохранение…";
    const payload = collectMcpInstancesControlForm();
    const data = await window.agentControl.saveMcpInstances(payload);
    if (!data.ok) {
      if (status) status.textContent = data.error || "Ошибка";
      return;
    }
    mcpInstancesControlState = { instances: data.instances || [] };
    renderMcpInstancesControlRows();
    if (status) status.textContent = "Сохранено. Перезапустите Claude Desktop.";
  });
  await loadMcpInstancesControl();
}

function escapePromptHtml(text) {
  return String(text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderGuideStepAgentPrompt() {
  const startPrompt = escapePromptHtml(AGENT_START_PROMPT);
  const mcpInstructionsDraft = escapePromptHtml(MCP_INSTRUCTIONS_CONTEXT_DRAFT);

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">4</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>Что написать агенту</h3>
          <p>Стартовое сообщение в чате и черновик MCP instructions</p>
        </div>
        <ol class="guide-list">
          <li>Начните <strong>новый чат</strong> в Cursor или Claude Desktop</li>
          <li>Отправьте <strong>стартовый</strong> текст — агент выберет workspace и загрузит контекст</li>
          <li>Замените <code>&lt;Название хранилища&gt;</code> на имя вашего workspace</li>
          <li>Черновик ниже — для поля <strong>instructions</strong> MCP-сервера, не для чата</li>
        </ol>
        <div class="agent-prompt-box">
          <p class="agent-prompt-label">Старт · в чат</p>
          <div class="cmd-row">
            <pre class="agent-prompt-text" id="agent-start-prompt">${startPrompt}</pre>
            <button type="button" class="ghost-btn cmd-btn" data-copy-target="agent-start-prompt">Копировать</button>
          </div>
          <p class="mcp-config-note">Не знаете название? Напишите «покажи список хранилищ».</p>
        </div>
        <div class="agent-prompt-box agent-prompt-box--draft">
          <p class="agent-prompt-label">MCP instructions <span class="agent-prompt-badge">черновик</span></p>
          <pre class="agent-prompt-text agent-prompt-text--readonly" id="mcp-instructions-draft">${mcpInstructionsDraft}</pre>
          <p class="mcp-config-note">Постоянная инструкция MCP-сервера Agent CMS. Позже перенесём в <code>mcp-server</code> — в чат не копируется.</p>
        </div>
      </div>
    </article>
  `;
}

function renderGuideStepChrome() {
  const ext = bootstrap?.chromeExtension || {};
  const folderPath = ext.folderPath || `${bootstrap?.projectRoot || ""}/browser-extension`;
  const folderName = ext.folderName || "browser-extension";
  const cmsUrl = ext.cmsUrl || getEffectiveCmsBaseUrl();

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">5</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>Chrome Companion</h3>
          <p>Расширение Google Chrome: Side Panel с Agent Shell на любой странице в интернете</p>
        </div>
        <ol class="guide-list">
          <li>Убедитесь, что <strong>сервер запущен</strong> (шаг 2), MCP подключён (шаг 3)</li>
          <li>Откройте <code>chrome://extensions</code> → включите <strong>Режим разработчика</strong></li>
          <li><strong>Загрузить распакованное</strong> → выберите папку <code>${folderName}/</code></li>
          <li>В параметрах расширения укажите CMS: <code>${cmsUrl}</code></li>
        </ol>
        <div class="guide-actions">
          <button type="button" class="ghost-btn" data-open-url="chrome://extensions">Открыть chrome://extensions</button>
          <button type="button" class="ghost-btn" data-reveal-path="${escapeAttr(folderPath)}">Показать папку расширения</button>
        </div>
        <p class="guide-path"><code>${folderPath}</code></p>
      </div>
    </article>
  `;
}

function renderSectionCap(title, subtitle, actionsHtml = "") {
  const actions = actionsHtml
    ? `<div class="section-cap-actions">${actionsHtml}</div>`
    : "";
  const sub = subtitle ? `<p>${subtitle}</p>` : "";

  return `
    <div class="section-cap">
      <div class="section-cap-text">
        <h2>${title}</h2>
        ${sub}
      </div>
      ${actions}
    </div>
  `;
}

function renderGuideSection() {
  const section = document.createElement("section");
  section.className = "guide-panel panel section-block";
  section.dataset.section = "guide";
  section.innerHTML = `
    ${renderSectionCap("Настройка", "Установка → сервер → MCP → агент → Chrome")}
    <div class="section-body">
      <div class="guide-steps">
        ${renderGuideStepSetup()}
        ${renderGuideStepServer()}
        ${renderGuideStepMcp()}
        ${renderGuideStepAgentPrompt()}
        ${renderGuideStepChrome()}
      </div>
    </div>
  `;
  return section;
}

function getCardPorts(accent) {
  const ports = bootstrap?.serverPorts || {
    editorHttps: 3443,
    editorHttp: 3000,
    voiceHttps: 3488,
    voiceHttp: 3088,
    commanderHttp: 3188,
    controlHttp: 3288
  };

  if (accent === "cms") {
    return { main: ports.editorHttps, sub: ports.editorHttp };
  }
  if (accent === "voice") {
    return { main: ports.voiceHttps, sub: ports.voiceHttp };
  }
  if (accent === "commander") {
    return { main: ports.commanderHttp, sub: "HTTP" };
  }
  if (accent === "control") {
    return { main: ports.controlHttp, sub: "HTTP" };
  }
  return null;
}

function renderCardPort(accent) {
  const portInfo = getCardPorts(accent);
  if (!portInfo) {
    return `<div class="launch-tile-port launch-tile-port--app" aria-label="Desktop-приложение">app</div>`;
  }

  return `
    <div class="launch-tile-port" aria-label="Порты ${portInfo.main} и ${portInfo.sub}">
      <code>:${portInfo.main}</code>
      <span class="launch-tile-port-sub">${portInfo.sub}</span>
    </div>
  `;
}

function launchTile(app, actionsHtml) {
  const icon = app.icon
    ? `<img class="launch-icon" src="assets/${app.icon}" alt="" width="44" height="44" />`
    : "";

  return `
    <article class="launch-tile" data-accent="${app.accent}">
      <div class="launch-tile-body">
        ${renderCardPort(app.accent)}
        <div class="launch-tile-top">
          ${icon}
          <div class="launch-tile-info">
            <span class="product-badge" data-accent="${app.accent}">${app.badge}</span>
            <h3>${app.title}</h3>
            <p class="launch-subtitle">${app.subtitle}</p>
          </div>
        </div>
        <div class="launch-tile-actions">${actionsHtml}</div>
      </div>
    </article>
  `;
}

function renderAppCard(app) {
  return launchTile(
    app,
    `${actionButton(app.openActionId, "primary", "compact-btn")}
     ${actionButton(app.rebuildActionId, "default", "compact-btn")}`
  );
}

function renderControlOpenUrl() {
  const server = lastServer || bootstrap?.server;
  const ports = bootstrap?.serverPorts || {};
  const url = getServiceMonitorOpenUrl({ id: "control" }, server, ports);
  const canOpen =
    Boolean(url) &&
    (Boolean(server?.controlHttp) || Boolean(server?.cms));
  const title = canOpen ? url : "Сначала запустите сервер (npm start или «В фоне»)";
  return `<button type="button" class="run-btn compact-btn" data-control-open-btn="1" data-tone="primary" data-open-url="${escapeAttr(url || "")}" ${canOpen ? "" : "disabled"} title="${escapeAttr(title)}">Открыть</button>`;
}

function renderControlCard(control) {
  if (!control) return "";

  return launchTile(
    control,
    `${renderControlOpenUrl()}
     ${actionButton(control.distActionId, "default", "compact-btn")}`
  );
}

function renderCommanderCard(commander) {
  if (!commander) return "";
  if (commander.placeholder) {
    const actionsHtml = `<button type="button" class="run-btn compact-btn" data-tone="default" disabled title="Заготовка на будущее">Заготовка</button>`;
    return launchTile(commander, actionsHtml);
  }
  return renderAppCard(commander);
}

function renderAppsSection() {
  const products = bootstrap?.appProducts || [];
  const commander = bootstrap?.commanderSelf;
  const control = bootstrap?.controlSelf;
  const section = document.createElement("section");
  section.className = "launchpad panel section-block";
  section.dataset.section = "apps";

  section.innerHTML = `
    ${renderSectionCap("Приложения", "Desktop-приложения проекта — открыть или пересобрать")}
    <div class="section-body">
      <div class="launchpad-grid">
        ${products.map(renderAppCard).join("")}
        ${renderCommanderCard(commander)}
        ${renderControlCard(control)}
      </div>
    </div>
  `;

  return section;
}

async function renderLayout() {
  actionsRoot.innerHTML = "";
  actionsRoot.appendChild(renderAppsSection());
  actionsRoot.appendChild(renderGuideSection());
  bindActionHandlers();
  await bindMaintenanceToggle();
  syncAppLockScreen();
  syncMcpConfigPreview();
  void bindMcpInstancesControl();
  applyServerStatusChip(document.getElementById("server-status-inline"), lastServer || bootstrap?.server);
  syncServerUi(lastServer || bootstrap?.server);
  void refreshMobileVoiceQr();
  updateRunningButtons();
}

let copyToastTimer = null;

function showCopyToast(label, url) {
  const name = String(label || "").trim();
  const address = String(url || "").trim();
  if (!address) return;
  let toast = document.getElementById("copy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "copy-toast";
    toast.className = "copy-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = name
    ? `Адрес скопирован ${name} — ${address}`
    : `Адрес скопирован — ${address}`;
  toast.hidden = false;
  toast.classList.add("copy-toast--visible");
  clearTimeout(copyToastTimer);
  copyToastTimer = window.setTimeout(() => {
    toast.classList.remove("copy-toast--visible");
    window.setTimeout(() => {
      if (!toast.classList.contains("copy-toast--visible")) toast.hidden = true;
    }, 280);
  }, 2400);
}

async function copyText(text, options = {}) {
  const value = String(text || "").trim();
  if (!value) return;
  const label = String(options.label || "").trim();
  try {
    await navigator.clipboard.writeText(value);
    if (label) {
      showCopyToast(label, value);
    } else {
      appendLog(`Скопировано: ${value}\n`);
    }
  } catch (error) {
    appendLog(`Не удалось скопировать: ${error.message}\n`, "stderr");
  }
}

async function runUrlTest(button) {
  const kind = button.dataset.runTest;
  const url = button.dataset.testUrl;
  const resultNode = actionsRoot.querySelector(`[data-result="${kind}"]`);
  if (!kind || !url || !resultNode) return;

  const prevLabel = button.textContent;
  button.disabled = true;
  button.textContent = "…";
  resultNode.hidden = false;
  resultNode.textContent = "Проверка…";
  resultNode.dataset.state = "pending";

  try {
    const result = await window.agentControl.testUrl(url);
    const output = result.output || "Нет ответа";
    resultNode.textContent =
      output.length > 800 && kind === "server" ? `${output.slice(0, 800)}…` : output;
    resultNode.dataset.state = result.ok ? "ok" : "error";
    if (!result.ok) {
      appendLog(`Проверка не прошла (${kind}). Команда: ${result.command}\n`, "stderr");
    }
  } catch (error) {
    resultNode.textContent = error.message;
    resultNode.dataset.state = "error";
    appendLog(`Ошибка проверки (${kind}): ${error.message}\n`, "stderr");
  } finally {
    button.disabled = false;
    button.textContent = prevLabel;
  }
}

async function refreshMaintenanceModeState() {
  if (!window.agentControl?.getMaintenanceMode) return;
  try {
    const result = await window.agentControl.getMaintenanceMode();
    maintenanceModeEnabled = Boolean(result?.enabled);
  } catch {
    maintenanceModeEnabled = false;
  }
}

function bindAppLockGate() {
  const form = document.getElementById("app-lock-form");
  if (!form || form.dataset.bound || !window.agentControl?.appLockLogin) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errEl = document.getElementById("app-lock-error");
    const submit = form.querySelector(".app-lock-submit");
    const login = String(form.login?.value || "").trim();
    const password = String(form.password?.value || "");
    if (submit) submit.disabled = true;
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    try {
      const loginResult = await window.agentControl.appLockLogin(login, password);
      if (loginResult && loginResult.ok === false) {
        throw new Error(loginResult.error || "Неверный логин или пароль");
      }
      if (window.agentControl.getBootstrap) {
        bootstrap = await window.agentControl.getBootstrap();
      } else {
        bootstrap.appLock = {
          ...(bootstrap.appLock || {}),
          enabled: true,
          sessionActive: true,
          canToggleMaintenance: true
        };
      }
      appendLog("Вход выполнен.\n");
      syncAppLockScreen();
      await renderLayout();
      syncServerUi(lastServer || bootstrap?.server);
    } catch (error) {
      if (errEl) {
        errEl.textContent = String(error.message || "Неверный логин или пароль");
        errEl.hidden = false;
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

async function bindMaintenanceToggle() {
  const toggle = document.getElementById("maintenance-mode-toggle");
  const card = document.getElementById("maintenance-toggle-card");
  if (!toggle || toggle.dataset.bound) return;
  toggle.dataset.bound = "1";

  toggle.addEventListener("change", async () => {
    if (!window.agentControl?.setMaintenanceMode) return;
    const next = toggle.checked;
    const prev = !next;
    maintenanceModeBusy = true;
    toggle.disabled = true;
    if (card) card.dataset.state = "pending";

    try {
      const result = await window.agentControl.setMaintenanceMode(next);
      if (!result?.ok) {
        throw new Error(result?.error || "Не удалось сохранить maintenance-mode");
      }
      maintenanceModeEnabled = Boolean(result.enabled);
      appendLog(
        maintenanceModeEnabled
          ? "Включён maintenance-mode.\n"
          : "Выключен maintenance-mode.\n"
      );
    } catch (error) {
      toggle.checked = prev;
      maintenanceModeEnabled = prev;
      appendLog(`Ошибка maintenance-mode: ${error.message}\n`, "stderr");
    } finally {
      maintenanceModeBusy = false;
      toggle.disabled = false;
      if (card) {
        card.dataset.state = maintenanceModeEnabled ? "on" : "off";
        const copy = card.querySelector(".maintenance-toggle-copy span");
        if (copy) {
          copy.textContent = maintenanceStubSummaryText();
        }
      }
    }
  });
}

function bindActionHandlers() {
  actionsRoot.querySelectorAll(".run-btn, .action-card, .setup-btn, .server-deck-btn").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.action));
  });

  actionsRoot.querySelectorAll("[data-open-url]").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.openUrl;
      if (url && !button.disabled) window.agentControl.openExternal(url);
    });
  });

  actionsRoot.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      copyText(button.dataset.copyUrl || "", { label: button.dataset.copyLabel || "" });
    });
  });

  actionsRoot.querySelectorAll("[data-copy-cmd]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyCmd));
  });

  actionsRoot.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = document.getElementById(button.dataset.copyTarget);
      if (node) copyText(node.textContent);
    });
  });

  actionsRoot.querySelectorAll("[data-copy-mcp-config]").forEach((button) => {
    button.addEventListener("click", () => {
      copyText(JSON.stringify(buildMcpConfigObject({ useAbsPath: false }), null, 2));
    });
  });

  actionsRoot.querySelectorAll("[data-open-url]").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.openUrl;
      if (url) window.agentControl.openExternal(url);
    });
  });

  actionsRoot.querySelectorAll("[data-reveal-path]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.revealPath;
      if (target) window.agentControl.revealPath(target);
    });
  });

  actionsRoot.querySelectorAll("[data-run-test]").forEach((button) => {
    button.addEventListener("click", () => runUrlTest(button));
  });
}

function waitForControlServerReload(maxWaitMs = 120000) {
  const started = Date.now();
  const poll = () => {
    fetch("/api/ops/bootstrap?lite=1", { credentials: "same-origin", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("not ready");
        window.location.reload();
      })
      .catch(() => {
        if (Date.now() - started < maxWaitMs) window.setTimeout(poll, 3000);
      });
  };
  window.setTimeout(poll, 4000);
}

async function runAction(actionId) {
  if (!actionId || runningActions.has(actionId)) return;
  if (actionId === "server-stop" || actionId === "server-restart") suppressServerDownNotify = true;
  runningActions.add(actionId);
  updateRunningButtons();
  try {
    const result = await window.agentControl.runAction(actionId);
    if (result?.error) appendLog(`${result.error}\n`, "stderr");

    if (result?.serverDisconnectExpected) {
      if (actionId === "server-restart" && isWebLauncher()) {
        waitForControlServerReload();
      } else if (actionId === "server-stop") {
        lastServer = { ...(lastServer || bootstrap?.server || {}), running: false };
        syncServerUi(lastServer);
      }
      return;
    }

    let status;
    try {
      status = await window.agentControl.refreshStatus();
    } catch (error) {
      if (
        isWebLauncher() &&
        (actionId === "server-stop" || actionId === "server-restart") &&
        /failed to fetch|networkerror|load failed/i.test(String(error.message || error))
      ) {
        if (actionId === "server-restart") waitForControlServerReload();
        return;
      }
      throw error;
    }
    await handleServerStatusUpdate(status.server, {
      skipNotify: actionId === "server-stop" || actionId === "server-restart"
    });
    if (actionId === "install-deps" || actionId === "setup-certs") {
      const data = await window.agentControl.refreshBootstrap();
      if (data.setupFlags) bootstrap.setupFlags = data.setupFlags;
      if (data.environment) {
        bootstrap.environment = data.environment;
        renderEnvironment(data.environment);
      }
      if (data.mobileConnect) bootstrap.mobileConnect = data.mobileConnect;
    }
    await refreshMaintenanceModeState();
    await renderLayout();
  } finally {
    runningActions.delete(actionId);
    updateRunningButtons();
  }
}

const ACTION_CARD_TITLES = {
  "install-deps": "Установить зависимости",
  "setup-certs": "Выпустить сертификаты HTTPS",
  "setup-desktop-shortcuts": "Создать ярлыки на Desktop"
};

const ACTION_CARD_BUSY = {
  "cms-rebuild": "Сборка…",
  "commander-rebuild": "Сборка…",
  "voice-rebuild": "Сборка…",
  "control-dist": "Сборка…",
  "server-autostart-enable": "Автостарт…",
  "server-autostart-disable": "Выключение…",
  "server-start-bg": "Запуск…",
  "server-start-attached": "Запуск…",
  "server-stop": "Остановка…",
  "server-restart": "Перезапуск…",
  "install-deps": "Установка…",
  "setup-certs": "Настройка…",
  "setup-desktop-shortcuts": "Создание…"
};

function isActionRunning(actionId) {
  return runningActions.has(actionId);
}

function updateRunningButtons() {
  actionsRoot.querySelectorAll(".run-btn").forEach((button) => {
    const actionId = button.dataset.action;
    if (!actionId) return;
    const isRunning = isActionRunning(actionId);
    const defaultLabel = formatActionButtonContent(actionId);
    button.disabled = isRunning;
    button.classList.toggle("is-running", isRunning);
    if (isRunning) {
      button.textContent = ACTION_CARD_BUSY[actionId] || "…";
    } else {
      button.innerHTML = defaultLabel;
    }
  });

  actionsRoot.querySelectorAll(".action-card").forEach((button) => {
    const actionId = button.dataset.action;
    const isRunning = isActionRunning(actionId);
    button.disabled = isRunning;
    const title = button.querySelector("strong");
    if (!title) return;
    const defaultTitle = ACTION_CARD_TITLES[actionId] || title.textContent;
    title.textContent = isRunning ? ACTION_CARD_BUSY[actionId] || "…" : defaultTitle;
  });

  actionsRoot.querySelectorAll(".setup-btn").forEach((button) => {
    const actionId = button.dataset.action;
    const isRunning = isActionRunning(actionId);
    const platformBlocked =
      actionId === "setup-desktop-shortcuts" && !isDesktopShortcutsSupported();
    button.disabled = isRunning || platformBlocked;
    button.classList.toggle("is-running", isRunning);
    const title = button.querySelector(".setup-btn-title");
    if (!title) return;
    const defaultTitle = SETUP_SHORT_TITLES[actionId] || ACTION_CARD_TITLES[actionId] || title.textContent;
    title.textContent = isRunning ? ACTION_CARD_BUSY[actionId] || "…" : defaultTitle;
  });

  actionsRoot.querySelectorAll(".server-deck-btn").forEach((button) => {
    const actionId = button.dataset.action;
    const isRunning = isActionRunning(actionId);
    button.classList.toggle("is-running", isRunning);
    const title = button.querySelector(".server-deck-title");
    if (isRunning) {
      button.disabled = true;
      if (title) title.textContent = ACTION_CARD_BUSY[actionId] || "…";
      return;
    }
    if (title) title.textContent = SERVER_BTN_TITLES[actionId] || title.textContent;
  });

  syncServerUi(lastServer || { running: false });
}

function restartSplashAnimations(splash) {
  splash.classList.remove("splash--active");
  void splash.offsetWidth;
  splash.classList.add("splash--active");
}

function playSplash() {
  const splash = document.getElementById("splash");
  const app = document.querySelector(".app");
  const body = document.body;

  splash.classList.remove("splash--out");
  restartSplashAnimations(splash);
  app.classList.remove("app--in");
  app.classList.add("app--hidden");
  body.classList.add("is-booting");

  return new Promise((resolve) => {
    window.setTimeout(() => {
      splash.classList.add("splash--out");
      app.classList.remove("app--hidden");
      app.classList.add("app--in");
      body.classList.remove("is-booting");
      window.setTimeout(resolve, SPLASH_FADE_MS);
    }, SPLASH_MS);
  });
}

async function init() {
  await playSplash();

  bootstrap = await window.agentControl.getBootstrap();
  bindAppLockGate();
  bindAppLockLogout();
  syncAppLockScreen();
  renderEnvironment(bootstrap.environment);
  await handleServerStatusUpdate(bootstrap.server, { skipNotify: true });
  await refreshMaintenanceModeState();
  await renderLayout();
  syncAppLockLogoutButton();
  renderAppFooter();
  startFlipClock();
  updateFlipRuntime(bootstrap?.server?.runtimeTodayMinutes ?? 0, false);
  startServerPoll();
  bindEnvExpandToggle();
  bindSetupChecklistActions();
  bindServicesMonitorActions();
  renderServicesMonitor();

  window.agentControl.onLog(({ text, stream }) => appendLog(text, stream));
  window.agentControl.onActionState(({ actionId, running }) => {
    if (!actionId) return;
    if (running) runningActions.add(actionId);
    else runningActions.delete(actionId);
    updateRunningButtons();
  });
}

document.getElementById("reload-ui").addEventListener("click", () => {
  const splash = document.getElementById("splash");
  const app = document.querySelector(".app");

  splash.classList.remove("splash--out");
  restartSplashAnimations(splash);
  app.classList.remove("app--in");
  app.classList.add("app--hidden");
  document.body.classList.add("is-booting");

  window.setTimeout(() => window.agentControl.reloadUi(), 350);
});

document.getElementById("refresh-status").addEventListener("click", async () => {
  const button = document.getElementById("refresh-status");
  const prev = button.textContent;
  button.disabled = true;
  button.textContent = "…";
  try {
    const data = await window.agentControl.refreshBootstrap();
    if (data.environment) {
      bootstrap.environment = data.environment;
      renderEnvironment(data.environment);
    }
    if (data.mobileConnect) bootstrap.mobileConnect = data.mobileConnect;
    if (data.setupFlags) bootstrap.setupFlags = data.setupFlags;
    if (data.appLock) bootstrap.appLock = data.appLock;
    if (data.mcpConnect) bootstrap.mcpConnect = data.mcpConnect;
    syncAppLockLogoutButton();
    await handleServerStatusUpdate(data.server, { skipNotify: true });
    await refreshMaintenanceModeState();
    await renderLayout();
    syncAppLockLogoutButton();
    renderServicesMonitor();
    renderAppFooter();
  } catch (error) {
    appendLog(`Ошибка обновления: ${error.message}\n`, "stderr");
  } finally {
    button.disabled = false;
    button.textContent = prev;
  }
});

document.getElementById("clear-log").addEventListener("click", () => {
  logOutput.textContent = "";
});

init().catch((error) => {
  appendLog(`Ошибка загрузки: ${error.message}\n`, "stderr");
});
