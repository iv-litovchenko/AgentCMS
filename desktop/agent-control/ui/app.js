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
let lastServer = null;
let clockTimer = null;
let serverPollTimer = null;
let mcpOk = null;
let suppressServerDownNotify = false;
let maintenanceModeEnabled = false;
let maintenanceModeBusy = false;

const SERVER_POLL_MS = 8000;

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
const flipClockState = { h0: "", h1: "", m0: "", m1: "", s0: "", s1: "" };
const FLIP_CLOCK_KEYS = ["h0", "h1", "m0", "m1", "s0", "s1"];

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
  "control-dist": "Собрать",
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
}

function renderAppFooter() {
  const footer = document.getElementById("app-footer");
  if (!footer) return;

  const controlVersion = bootstrap?.controlVersion || "0.1.0";
  const projectVersion = bootstrap?.environment?.app?.version;
  const projectLabel =
    projectVersion && projectVersion !== controlVersion ? ` · agent-cms v${projectVersion}` : "";

  footer.textContent = `Agent CMS Control v${controlVersion}${projectLabel}`;
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

function renderSetupChecklist() {
  const root = document.getElementById("setup-checklist");
  if (!root) return;

  const state = getSetupCheckState();
  const diskState = getDiskStatState();
  const hints = {
    deps: "Шаг 1 → Зависимости",
    certs: "Шаг 1 → Сертификаты HTTPS",
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

  const statItems = Object.keys(DISK_STAT_LABELS).map((id) => `
    <div class="setup-check-item setup-check-item--stat" data-state="stat">
      <span class="setup-check-copy">
        <span class="setup-check-label">${DISK_STAT_LABELS[id]}</span>
        <span class="setup-check-value">${diskState[id]}</span>
      </span>
    </div>
  `);

  root.innerHTML = `
    <div class="setup-checklist-grid setup-checklist-grid--checks">
      ${checkItems.join("")}
    </div>
    <div class="setup-checklist-grid setup-checklist-grid--disk">
      ${statItems.join("")}
    </div>
  `;
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

function buildExtraEnvironmentRows(environment) {
  if (!environment) return [];

  const extraOrder = ["openssl", "whisper", "claude", "codex", "electron"];
  const depsById = Object.fromEntries((environment.dependencies || []).map((dep) => [dep.id, dep]));
  return extraOrder.map((id) => depsById[id]).filter(Boolean).map(dependencyEnvRow);
}

function renderEnvironmentRows(environment) {
  if (!envRows) return;

  if (!environment) {
    envRows.innerHTML = "";
    return;
  }

  const rows = buildCoreEnvironmentRows(environment);
  if (envExpandAll) {
    rows.push(...buildExtraEnvironmentRows(environment));
  }

  envRows.innerHTML = rows.join("");

  const expandToggle = document.getElementById("env-expand-all");
  if (expandToggle && expandToggle.checked !== envExpandAll) {
    expandToggle.checked = envExpandAll;
  }
}

function bindEnvExpandToggle() {
  const toggle = document.getElementById("env-expand-all");
  if (!toggle || toggle.dataset.bound) return;
  toggle.dataset.bound = "1";
  toggle.addEventListener("change", () => {
    envExpandAll = toggle.checked;
    renderEnvironmentRows(bootstrap?.environment);
  });
}

function renderEnvironment(environment) {
  renderSetupChecklist();
  renderEnvironmentRows(environment);
}

function syncServerUi(server) {
  const isRunning = Boolean(server?.running);
  applyServerStatusChip(document.getElementById("server-status-inline"), server);

  document.querySelectorAll(".browser-link").forEach((button) => {
    button.disabled = !isRunning;
  });

  const serverActionBusy =
    runningActions.has("server-start-bg") ||
    runningActions.has("server-start-attached") ||
    runningActions.has("server-stop") ||
    runningActions.has("server-restart");

  document
    .querySelectorAll('[data-action="server-start-bg"], [data-action="server-start-attached"]')
    .forEach((button) => {
      button.disabled = isRunning || serverActionBusy || runningActions.has(button.dataset.action);
    });
  document.querySelectorAll('[data-action="server-stop"]').forEach((button) => {
    button.disabled = !isRunning || serverActionBusy;
  });
  document.querySelectorAll('[data-action="server-restart"]').forEach((button) => {
    button.disabled = !isRunning || serverActionBusy;
  });

}

async function handleServerStatusUpdate(server, options = {}) {
  const wasRunning = Boolean(lastServer?.running);
  lastServer = server;
  renderServerStatus(server);

  if (wasRunning && !server?.running && !options.skipNotify && !suppressServerDownNotify) {
    window.agentControl.notify("Сервер остановлен", "CMS и Voice больше не отвечают.");
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
  renderSetupChecklist();
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
  "install-deps": "Зависимости",
  "setup-certs": "Сертификаты HTTPS",
  "setup-desktop-shortcuts": "Ярлыки Desktop"
};

const SERVER_BTN_TITLES = {
  "server-start-bg": "Старт в фоне",
  "server-start-attached": "Старт",
  "server-stop": "Стоп",
  "server-restart": "Рестарт"
};

const AGENT_START_PROMPT = "Выбери хранилище <Название хранилища> и загрузи контекст";

const MCP_INSTRUCTIONS_CONTEXT_DRAFT = `Когда контекстное окно чата близко к пределу или ранее загруженный контекст Agent CMS мог выпасть из памяти — предложи пользователю освежить контекст хранилища.

Не продолжай работу «из памяти»: сначала убедись, что актуальный контекст снова загружен, затем кратко резюмируй, что уже сделано, и только после этого продолжай.`;

const SERVER_BTN_HINTS = {
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

function serverButton(actionId, tone, disabled = false) {
  const disabledAttr = disabled ? " disabled" : "";
  const title = SERVER_BTN_TITLES[actionId] || "Запуск";
  const hint = SERVER_BTN_HINTS[actionId] || "";
  const icon =
    tone === "stop" ? SERVER_STOP_ICON : tone === "restart" ? SERVER_RESTART_ICON : SERVER_PLAY_ICON;
  const iconClass =
    tone === "stop"
      ? "server-deck-icon--stop"
      : tone === "restart"
        ? "server-deck-icon--restart"
        : "server-deck-icon--play";
  const badge = tone === "start-bg" ? `<span class="server-deck-badge">фон</span>` : "";

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

function setupButton(actionId, title, hint) {
  return `
    <button type="button" class="setup-btn" data-action="${actionId}">
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
      voiceHttp: 3088
    }
  );
}

function getTestUrl(kind) {
  const ports = getPorts();
  const testPath =
    kind === "mcp"
      ? bootstrap?.mcpTest?.path || "/api/agent/mcp-ping"
      : bootstrap?.serverTest?.path || "/";
  return `https://localhost:${ports.editorHttps}${testPath}`;
}

function getCurlCommand(kind) {
  return `curl -sk ${getTestUrl(kind)}`;
}

function renderCmdRow(kind, tag) {
  const command = getCurlCommand(kind);
  const hint =
    kind === "mcp"
      ? bootstrap?.mcpTest?.hint || "test_mcp_connection — JSON с ok и mcpVersion"
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
    .map((action) =>
      setupButton(
        action.id,
        SETUP_SHORT_TITLES[action.id] || action.title,
        action.description || ""
      )
    )
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

  let note = "Откройте Voice на iPhone — Mac и телефон в одной сети или Mac на точке доступа iPhone.";
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
        <img class="mobile-voice-qr" id="mobile-voice-qr" alt="QR для Voice на iPhone" width="220" height="220" />
        <p class="mobile-voice-qr-hint">Наведите камеру iPhone → Voice в Safari</p>
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
  const ports = getPorts();
  const cmsUrl = `https://localhost:${ports.editorHttps}`;
  const voiceUrl = `https://localhost:${ports.voiceHttps}`;
  const linkDisabled = isRunning ? "" : " disabled";
  const browserLinks = `
    <div class="server-browser-row" role="group" aria-label="Открыть в браузере">
      <button type="button" class="link-btn browser-link link-btn--cms" data-url="${cmsUrl}"${linkDisabled}>
        <span class="browser-link-icon">${BROWSER_ICON}</span>
        <span class="browser-link-text">
          <span>Editor</span>
          <code>:${ports.editorHttps}</code>
        </span>
      </button>
      <button type="button" class="link-btn browser-link link-btn--voice" data-url="${voiceUrl}"${linkDisabled}>
        <span class="browser-link-icon">${BROWSER_ICON}</span>
        <span class="browser-link-text">
          <span>Voice</span>
          <code>:${ports.voiceHttps}</code>
        </span>
      </button>
    </div>
  `;

  const maintenanceDisabled = maintenanceModeBusy;
  const maintenanceChecked = maintenanceModeEnabled ? " checked" : "";
  const maintenanceStateLabel = maintenanceModeEnabled ? "включён" : "выключен";

  const controlBlock = `
    <div class="server-controls">
      <div class="server-deck" role="group" aria-label="Управление сервером">
        ${serverButton("server-start-bg", "start-bg", isRunning)}
        ${serverButton("server-start-attached", "start", isRunning)}
        ${serverButton("server-stop", "stop", !isRunning)}
        ${isControlActionAvailable("server-restart") ? serverButton("server-restart", "restart", !isRunning) : ""}
      </div>
      <div class="maintenance-toggle-card" id="maintenance-toggle-card" data-state="${maintenanceModeEnabled ? "on" : "off"}">
        <div class="maintenance-toggle-copy">
          <strong>Режим обслуживания</strong>
          <span>Заглушка 503 для Editor и Voice · сейчас ${maintenanceStateLabel}</span>
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
          <p>Запустите CMS и Voice — без сервера не работают Editor, Voice и расширение Chrome</p>
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
  const cmsBaseUrl = mcp.cmsBaseUrl || `https://localhost:${getPorts().editorHttps}`;
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
          <li>Вставьте JSON ниже; <code>&lt;ABS_PATH&gt;</code> — корень проекта на вашей машине</li>
          <li>Перезапустите MCP-клиент</li>
        </ol>
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

  const mcp = bootstrap?.mcpConnect || {};
  const fallback = JSON.stringify(
    {
      mcpServers: {
        "agent-cms": {
          command: "node",
          args: ["<ABS_PATH>/mcp-server/index.js"],
          env: {
            AGENT_CMS_BASE_URL: mcp.cmsBaseUrl || `https://localhost:${getPorts().editorHttps}`
          }
        }
      }
    },
    null,
    2
  );

  node.textContent = mcp.configJson || fallback;
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
  const cmsUrl = ext.cmsUrl || `https://localhost:${getPorts().editorHttps}`;

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
    voiceHttp: 3088
  };

  if (accent === "cms") {
    return { main: ports.editorHttps, sub: ports.editorHttp };
  }
  if (accent === "voice") {
    return { main: ports.voiceHttps, sub: ports.voiceHttp };
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
    ? `<img class="launch-icon" src="../assets/${app.icon}" alt="" width="44" height="44" />`
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

function renderControlCard(control) {
  if (!control) return "";

  return launchTile(control, actionButton(control.distActionId, "default", "compact-btn"));
}

function renderAppsSection() {
  const products = bootstrap?.appProducts || [];
  const control = bootstrap?.controlSelf;
  const section = document.createElement("section");
  section.className = "launchpad panel section-block";
  section.dataset.section = "apps";

  section.innerHTML = `
    ${renderSectionCap("Приложения", "Desktop-приложения проекта — открыть или пересобрать")}
    <div class="section-body">
      <div class="launchpad-grid">
        ${products.map(renderAppCard).join("")}
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
  syncMcpConfigPreview();
  applyServerStatusChip(document.getElementById("server-status-inline"), lastServer || bootstrap?.server);
  syncServerUi(lastServer || bootstrap?.server);
  void refreshMobileVoiceQr();
  updateRunningButtons();
}

async function copyText(text) {
  const value = String(text || "").trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    appendLog(`Скопировано: ${value}\n`);
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
          copy.textContent = `Заглушка 503 для Editor и Voice · сейчас ${
            maintenanceModeEnabled ? "включён" : "выключен"
          }`;
        }
      }
    }
  });
}

function bindActionHandlers() {
  actionsRoot.querySelectorAll(".run-btn, .action-card, .setup-btn, .server-deck-btn").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.action));
  });

  actionsRoot.querySelectorAll(".link-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.url;
      if (url) window.agentControl.openExternal(url);
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
      const mcp = bootstrap?.mcpConnect || {};
      copyText(mcp.configJsonCopy || mcp.configJson || "");
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

async function runAction(actionId) {
  if (!actionId || runningActions.has(actionId)) return;
  if (actionId === "server-stop" || actionId === "server-restart") suppressServerDownNotify = true;
  runningActions.add(actionId);
  updateRunningButtons();
  try {
    const result = await window.agentControl.runAction(actionId);
    if (result?.error) appendLog(`${result.error}\n`, "stderr");
    const status = await window.agentControl.refreshStatus();
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
  "install-deps": "Зависимости",
  "setup-certs": "Сертификаты HTTPS",
  "setup-desktop-shortcuts": "Ярлыки Desktop"
};

const ACTION_CARD_BUSY = {
  "cms-rebuild": "Сборка…",
  "voice-rebuild": "Сборка…",
  "control-dist": "Сборка…",
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
    button.disabled = isRunning;
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
  renderEnvironment(bootstrap.environment);
  await handleServerStatusUpdate(bootstrap.server, { skipNotify: true });
  await refreshMaintenanceModeState();
  await renderLayout();
  renderAppFooter();
  startFlipClock();
  startServerPoll();
  bindEnvExpandToggle();

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
    if (data.mcpConnect) bootstrap.mcpConnect = data.mcpConnect;
    await handleServerStatusUpdate(data.server, { skipNotify: true });
    await refreshMaintenanceModeState();
    await renderLayout();
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
