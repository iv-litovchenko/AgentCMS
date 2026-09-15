const SPLASH_MS = 1200;
const SPLASH_FADE_MS = 550;

const logOutput = document.getElementById("log-output");
const actionsRoot = document.getElementById("actions-root");
const envGrid = document.getElementById("env-grid");
const serverStatus = document.getElementById("server-status");
let bootstrap = null;
let runningActionId = null;
let lastServer = null;
let uptimeTimer = null;

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
  "setup-certs": "Сертификаты"
};

function appendLog(text, stream = "stdout") {
  const span = document.createElement("span");
  if (stream === "stderr") span.className = "stderr";
  span.textContent = text;
  logOutput.appendChild(span);
  logOutput.scrollTop = logOutput.scrollHeight;
}

function formatUptime(totalSec) {
  if (totalSec == null || totalSec < 0) return "";
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatStartedAt(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getLiveUptimeSec(server) {
  if (!server?.running || server.uptimeSec == null) return null;
  const probedAt = server.probedAt || Date.now();
  return server.uptimeSec + Math.floor((Date.now() - probedAt) / 1000);
}

function getServerTimeLabel(server) {
  const uptimeSec = getLiveUptimeSec(server);
  if (uptimeSec == null) return "";
  const startedAt = server.startedAt || Date.now() - uptimeSec * 1000;
  return `с ${formatStartedAt(startedAt)} · ${formatUptime(uptimeSec)}`;
}

function syncUptimeTimer(server) {
  if (uptimeTimer) {
    window.clearInterval(uptimeTimer);
    uptimeTimer = null;
  }
  if (!server?.running) return;

  uptimeTimer = window.setInterval(() => {
    if (!lastServer?.running) {
      syncUptimeTimer(null);
      return;
    }
    renderServerStatus(lastServer);
    updateServerUptimeNodes();
  }, 1000);
}

function updateServerUptimeNodes() {
  const label = getServerTimeLabel(lastServer);
  const heroUptime = document.getElementById("status-uptime");
  if (heroUptime) {
    heroUptime.textContent = label;
    heroUptime.hidden = !label;
  }
  document.querySelectorAll("[data-server-uptime]").forEach((node) => {
    node.textContent = label;
    node.hidden = !label;
  });
}

function renderServerStatus(server) {
  lastServer = server;
  const dot = serverStatus.querySelector(".status-dot");
  const text = serverStatus.querySelector(".status-text");
  const uptime = document.getElementById("status-uptime");

  if (!server) {
    dot.dataset.state = "unknown";
    text.textContent = "Нет данных";
    if (uptime) {
      uptime.textContent = "";
      uptime.hidden = true;
    }
    syncUptimeTimer(null);
    return;
  }

  if (server.running) {
    dot.dataset.state = "ok";
    text.textContent = "Сервер работает";
    const label = getServerTimeLabel(server);
    if (uptime) {
      uptime.textContent = label;
      uptime.hidden = !label;
    }
    syncUptimeTimer(server);
    return;
  }

  dot.dataset.state = "warn";
  text.textContent = "Сервер остановлен";
  if (uptime) {
    uptime.textContent = "";
    uptime.hidden = true;
  }
  syncUptimeTimer(null);
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

function renderEnvironment(environment) {
  envGrid.innerHTML = "";
  if (!environment) return;

  const chips = [
    ["Хост", environment.host?.computerName || environment.host?.hostname || "—"],
    ["Платформа", environment.host?.platformLabel || "—"],
    ["LAN", environment.host?.lanIp || "—"],
    ["Проект", environment.app?.version ? `v${environment.app.version}` : "—"]
  ];

  for (const dep of (environment.dependencies || []).slice(0, 6)) {
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

function actionButton(actionId, tone = "default", extraClass = "", disabled = false, labelOverride = "") {
  const label = labelOverride || ACTION_LABELS[actionId] || "Запустить";
  const disabledAttr = disabled ? " disabled" : "";
  return `<button type="button" class="run-btn ${extraClass}" data-tone="${tone}" data-action="${actionId}"${disabledAttr}>${label}</button>`;
}

const SETUP_SHORT_TITLES = {
  "install-deps": "Зависимости",
  "setup-certs": "Сертификаты HTTPS"
};

const SERVER_BTN_TITLES = {
  "server-start-bg": "Старт в фоне",
  "server-start-attached": "Старт",
  "server-stop": "Стоп"
};

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

function getServerTestCommand() {
  const ports = getPorts();
  const testPath = bootstrap?.serverTest?.path || "/api/agent/mcp-ping";
  const url = `https://localhost:${ports.editorHttps}${testPath}`;
  return `curl -sk ${url}`;
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
  const modeText = server?.modeLabel || (isRunning ? "работает" : "остановлен");
  const testCommand = getServerTestCommand();
  const testHint = bootstrap?.serverTest?.hint || "Ответ JSON — сервер CMS отвечает";

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
            <span class="server-state ${isRunning ? "is-on" : "is-off"}">${modeText}</span>
            <span class="server-uptime" data-server-uptime${isRunning ? "" : " hidden"}>${isRunning ? getServerTimeLabel(server) : ""}</span>
          </h3>
          <p>Запустите CMS и Voice — без сервера не работают Editor, Voice и расширение Chrome</p>
        </div>
        ${controlBlock}
        <div class="cmd-box">
          <div class="cmd-box-head">
            <span class="control-zone-label">Проверка в терминале</span>
            <span class="cmd-box-hint">${testHint}</span>
          </div>
          <div class="cmd-row">
            <code class="cmd-text" id="server-test-cmd">${testCommand}</code>
            <button type="button" class="ghost-btn cmd-btn" data-copy-cmd="${escapeAttr(testCommand)}">Копировать</button>
            <button type="button" class="ghost-btn cmd-btn cmd-btn--primary" id="server-test-run">Проверить</button>
          </div>
          <pre class="cmd-result" id="server-test-result" hidden></pre>
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
      <div class="guide-step-marker" aria-hidden="true">3</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>Chrome Companion</h3>
          <p>Расширение Google Chrome: Side Panel с Agent Shell на любой странице в интернете</p>
        </div>
        <ol class="guide-list">
          <li>Убедитесь, что <strong>сервер запущен</strong> (шаг 2)</li>
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
    ${renderSectionCap("Настройка", "Три шага: установка → сервер → расширение Chrome")}
    <div class="section-body">
      <div class="guide-steps">
        ${renderGuideStepSetup()}
        ${renderGuideStepServer()}
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
    `${actionButton(control.launcherActionId, "primary", "compact-btn")}
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
  updateServerUptimeNodes();
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

async function runServerTest() {
  const button = document.getElementById("server-test-run");
  const resultNode = document.getElementById("server-test-result");
  if (!button || !resultNode) return;

  button.disabled = true;
  button.textContent = "…";
  resultNode.hidden = false;
  resultNode.textContent = "Проверка…";
  resultNode.dataset.state = "pending";

  try {
    const result = await window.agentControl.testServer();
    resultNode.textContent = result.output || "Нет ответа";
    resultNode.dataset.state = result.ok ? "ok" : "error";
    if (!result.ok) {
      appendLog(`Сервер не ответил. Команда: ${result.command}\n`, "stderr");
    }
  } catch (error) {
    resultNode.textContent = error.message;
    resultNode.dataset.state = "error";
    appendLog(`Ошибка проверки: ${error.message}\n`, "stderr");
  } finally {
    button.disabled = false;
    button.textContent = "Проверить";
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

  const testButton = document.getElementById("server-test-run");
  if (testButton) {
    testButton.addEventListener("click", () => runServerTest());
  }
}

async function runAction(actionId) {
  if (!actionId || runningActionId) return;
  runningActionId = actionId;
  setButtonsDisabled(true);
  try {
    await window.agentControl.runAction(actionId);
    const status = await window.agentControl.refreshStatus();
    renderServerStatus(status.server);
    renderLayout();
  } finally {
    runningActionId = null;
    setButtonsDisabled(false);
  }
}

const ACTION_CARD_TITLES = {
  "install-deps": "Зависимости",
  "setup-certs": "Сертификаты HTTPS"
};

const ACTION_CARD_BUSY = {
  "server-start-bg": "Запуск…",
  "server-start-attached": "Запуск…",
  "server-stop": "Остановка…",
  "install-deps": "Установка…",
  "setup-certs": "Настройка…"
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
  renderServerStatus(bootstrap.server);
  renderLayout();
  renderAppFooter();

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
    renderServerStatus(data.server);
    lastServer = data.server;
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
