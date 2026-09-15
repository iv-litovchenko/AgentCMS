const SPLASH_MS = 1200;
const SPLASH_FADE_MS = 550;

const logOutput = document.getElementById("log-output");
const actionsRoot = document.getElementById("actions-root");
const envGrid = document.getElementById("env-grid");
const serverStatus = document.getElementById("server-status");
let bootstrap = null;
let runningActionId = null;
let lastServer = null;
let clockTimer = null;
let serverPollTimer = null;
let mcpOk = null;
let suppressServerDownNotify = false;

const SERVER_POLL_MS = 8000;

const SETUP_CHECK_LABELS = {
  deps: "Зависимости",
  certs: "Сертификаты",
  server: "Сервер",
  mcp: "MCP"
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
  "control-launcher": "Открыть",
  "server-start-bg": "В фоне",
  "server-stop": "Остановить сервер",
  "server-start-attached": "Пока Control открыт",
  "install-deps": "Установить",
  "setup-certs": "Сертификаты",
  "setup-desktop-shortcuts": "Ярлыки Desktop"
};

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
    return { state: "on", label: "Запущен" };
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

function renderSetupChecklist() {
  const root = document.getElementById("setup-checklist");
  if (!root) return;

  const state = getSetupCheckState();
  const hints = {
    deps: "Шаг 1 → Зависимости",
    certs: "Шаг 1 → Сертификаты HTTPS",
    server: "Шаг 2 → Старт",
    mcp: "Шаг 3 → MCP к агенту"
  };

  root.innerHTML = `
    <div class="setup-checklist-head">Первый запуск</div>
    <div class="setup-checklist-grid">
      ${Object.keys(SETUP_CHECK_LABELS)
        .map((id) => {
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
        })
        .join("")}
    </div>
  `;
}

function renderEnvironmentTools(environment) {
  const root = document.getElementById("env-tools");
  if (!root) return;

  if (!environment) {
    root.innerHTML = "";
    return;
  }

  const wanted = ["node", "python", "mkcert"];
  const deps = (environment.dependencies || []).filter((dep) => wanted.includes(dep.id));

  root.innerHTML = `
    <div class="env-tools-head">Окружение</div>
    <div class="env-tools-list">
      ${deps
        .map((dep) => {
          const ok = dep.status === "ok";
          const hint = ok ? dep.value || "есть" : ENV_TOOL_HINTS[dep.id] || "Установите";
          return `
            <div class="env-tool-row" data-status="${dep.status}">
              <span class="env-tool-name">${dep.label}</span>
              <span class="env-tool-value">${ok ? dep.value || "есть" : "нет"}</span>
              <span class="env-tool-hint">${hint}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderEnvironment(environment) {
  envGrid.innerHTML = "";
  renderEnvironmentTools(environment);
  renderSetupChecklist();
  if (!environment) return;

  const chips = [
    ["Хост", environment.host?.computerName || environment.host?.hostname || "—"],
    ["Платформа", environment.host?.platformLabel || "—"],
    ["LAN", environment.host?.lanIp || "—"],
    ["Проект", environment.app?.version ? `v${environment.app.version}` : "—"]
  ];

  for (const dep of (environment.dependencies || []).filter((dep) => ["npm", "git", "https"].includes(dep.id))) {
    chips.push([dep.label, dep.value || "—", dep.status]);
  }

  for (const [label, value, status] of chips) {
    const chip = document.createElement("div");
    chip.className = "env-chip";
    if (status) chip.dataset.status = status;
    chip.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
    envGrid.appendChild(chip);
  }
}

function syncServerUi(server) {
  const isRunning = Boolean(server?.running);
  applyServerStatusChip(document.getElementById("server-status-inline"), server);

  document.querySelectorAll(".browser-link").forEach((button) => {
    button.disabled = !isRunning;
  });

  if (!runningActionId) {
    document
      .querySelectorAll('[data-action="server-start-bg"], [data-action="server-start-attached"]')
      .forEach((button) => {
        button.disabled = isRunning;
      });
    document.querySelectorAll('[data-action="server-stop"]').forEach((button) => {
      button.disabled = !isRunning;
    });
  }

  const editorBtn = document.getElementById("open-editor-btn");
  if (editorBtn) {
    editorBtn.disabled = !isRunning;
    editorBtn.title = isRunning ? "Открыть Editor в браузере" : "Сервер не запущен";
  }
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

function bindOpenEditorButton() {
  const button = document.getElementById("open-editor-btn");
  if (!button || button.dataset.bound) return;
  button.dataset.bound = "1";
  button.addEventListener("click", () => {
    const ports = getPorts();
    window.agentControl.openExternal(`https://localhost:${ports.editorHttps}`);
  });
}

function actionButton(actionId, tone = "default", extraClass = "", disabled = false, labelOverride = "") {
  const label = labelOverride || ACTION_LABELS[actionId] || "Запустить";
  const disabledAttr = disabled ? " disabled" : "";
  return `<button type="button" class="run-btn ${extraClass}" data-tone="${tone}" data-action="${actionId}"${disabledAttr}>${label}</button>`;
}

const SETUP_SHORT_TITLES = {
  "install-deps": "Зависимости",
  "setup-certs": "Сертификаты HTTPS",
  "setup-desktop-shortcuts": "Ярлыки Desktop"
};

const SERVER_BTN_TITLES = {
  "server-start-bg": "Старт в фоне",
  "server-start-attached": "Старт",
  "server-stop": "Стоп"
};

const AGENT_START_PROMPT = "Выбери хранилище <Название хранилища> и загрузи контекст";

const SERVER_BTN_HINTS = {
  "server-start-bg": "Останется после закрытия",
  "server-start-attached": "Пока окно открыто",
  "server-stop": "Остановить сервер"
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

function serverButton(actionId, tone, disabled = false) {
  const disabledAttr = disabled ? " disabled" : "";
  const title = SERVER_BTN_TITLES[actionId] || "Запуск";
  const hint = SERVER_BTN_HINTS[actionId] || "";
  const icon = tone === "stop" ? SERVER_STOP_ICON : SERVER_PLAY_ICON;
  const iconClass = tone === "stop" ? "server-deck-icon--stop" : "server-deck-icon--play";
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

  const controlBlock = `
    <div class="server-controls">
      <div class="server-deck" role="group" aria-label="Управление сервером">
        ${serverButton("server-start-bg", "start-bg", isRunning)}
        ${serverButton("server-start-attached", "start", isRunning)}
        ${serverButton("server-stop", "stop", !isRunning)}
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

function renderGuideStepAgentPrompt() {
  const prompt = AGENT_START_PROMPT.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">4</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>Что написать агенту</h3>
          <p>Первое сообщение в новом чате после подключения MCP</p>
        </div>
        <ol class="guide-list">
          <li>Начните <strong>новый чат</strong> в Cursor или Claude Desktop</li>
          <li>Отправьте агенту текст ниже — он выберет workspace и загрузит контекст</li>
          <li>Замените <code>&lt;Название хранилища&gt;</code> на имя вашего workspace</li>
          <li>Дальше спросите про доступные инструменты — агент подскажет, с чего начать</li>
        </ol>
        <div class="agent-prompt-box">
          <div class="cmd-row">
            <pre class="agent-prompt-text" id="agent-start-prompt">${prompt}</pre>
            <button type="button" class="ghost-btn cmd-btn" data-copy-target="agent-start-prompt">Копировать</button>
          </div>
          <p class="mcp-config-note">Не знаете название? Напишите «покажи список хранилищ» — агент вызовет <code>list_workspaces</code>.</p>
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
  const serverNote =
    app.needsServer && !lastServer?.running ? `<p class="launch-note">нужен сервер</p>` : "";

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
            ${serverNote}
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

  return launchTile(
    control,
    `${actionButton(control.launcherActionId, "primary", "compact-btn", true)}
     ${actionButton(control.distActionId, "default", "compact-btn")}`
  );
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

function renderLayout() {
  actionsRoot.innerHTML = "";
  actionsRoot.appendChild(renderAppsSection());
  actionsRoot.appendChild(renderGuideSection());
  bindActionHandlers();
  syncMcpConfigPreview();
  applyServerStatusChip(document.getElementById("server-status-inline"), lastServer || bootstrap?.server);
  syncServerUi(lastServer || bootstrap?.server);
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
  if (!actionId || runningActionId) return;
  if (actionId === "server-stop") suppressServerDownNotify = true;
  runningActionId = actionId;
  setButtonsDisabled(true);
  try {
    await window.agentControl.runAction(actionId);
    const status = await window.agentControl.refreshStatus();
    await handleServerStatusUpdate(status.server, { skipNotify: actionId === "server-stop" });
    if (actionId === "install-deps" || actionId === "setup-certs") {
      const data = await window.agentControl.refreshBootstrap();
      if (data.setupFlags) bootstrap.setupFlags = data.setupFlags;
      if (data.environment) {
        bootstrap.environment = data.environment;
        renderEnvironment(data.environment);
      }
    }
    renderLayout();
  } finally {
    runningActionId = null;
    setButtonsDisabled(false);
  }
}

const ACTION_CARD_TITLES = {
  "install-deps": "Зависимости",
  "setup-certs": "Сертификаты HTTPS",
  "setup-desktop-shortcuts": "Ярлыки Desktop"
};

const ACTION_CARD_BUSY = {
  "server-start-bg": "Запуск…",
  "server-start-attached": "Запуск…",
  "server-stop": "Остановка…",
  "install-deps": "Установка…",
  "setup-certs": "Настройка…",
  "setup-desktop-shortcuts": "Создание…"
};

function setButtonsDisabled(disabled) {
  actionsRoot.querySelectorAll(".run-btn").forEach((button) => {
    const actionId = button.dataset.action;
    const defaultLabel = ACTION_LABELS[actionId] || "Запустить";
    button.disabled = disabled;
    button.textContent = disabled && actionId === runningActionId ? "…" : defaultLabel;
  });

  actionsRoot.querySelectorAll(".action-card").forEach((button) => {
    const actionId = button.dataset.action;
    button.disabled = disabled;
    const title = button.querySelector("strong");
    if (!title) return;
    const defaultTitle = ACTION_CARD_TITLES[actionId] || title.textContent;
    title.textContent =
      disabled && actionId === runningActionId
        ? ACTION_CARD_BUSY[actionId] || "…"
        : defaultTitle;
  });

  actionsRoot.querySelectorAll(".setup-btn").forEach((button) => {
    const actionId = button.dataset.action;
    const isRunning = disabled && actionId === runningActionId;
    button.disabled = disabled;
    button.classList.toggle("is-running", isRunning);
    const title = button.querySelector(".setup-btn-title");
    if (!title) return;
    const defaultTitle = SETUP_SHORT_TITLES[actionId] || ACTION_CARD_TITLES[actionId] || title.textContent;
    title.textContent = isRunning ? ACTION_CARD_BUSY[actionId] || "…" : defaultTitle;
  });

  actionsRoot.querySelectorAll(".server-deck-btn").forEach((button) => {
    const actionId = button.dataset.action;
    const isActive = disabled && actionId === runningActionId;
    if (disabled) button.disabled = true;
    button.classList.toggle("is-running", isActive);
    const title = button.querySelector(".server-deck-title");
    if (!title) return;
    const defaultTitle = SERVER_BTN_TITLES[actionId] || title.textContent;
    title.textContent = isActive ? ACTION_CARD_BUSY[actionId] || "…" : defaultTitle;
  });
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
  renderLayout();
  renderAppFooter();
  startFlipClock();
  startServerPoll();
  bindOpenEditorButton();

  window.agentControl.onLog(({ text, stream }) => appendLog(text, stream));
  window.agentControl.onActionState(({ running }) => {
    if (!running) {
      runningActionId = null;
      setButtonsDisabled(false);
    }
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
    if (data.setupFlags) bootstrap.setupFlags = data.setupFlags;
    if (data.mcpConnect) bootstrap.mcpConnect = data.mcpConnect;
    await handleServerStatusUpdate(data.server, { skipNotify: true });
    renderLayout();
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
