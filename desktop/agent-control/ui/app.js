const SPLASH_MS = 1200;
const SPLASH_FADE_MS = 550;

const logOutput = document.getElementById("log-output");
const actionsRoot = document.getElementById("actions-root");
const envGrid = document.getElementById("env-grid");
const serverStatus = document.getElementById("server-status");
let bootstrap = null;
let runningActionId = null;
let lastServer = null;

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

function renderServerStatus(server) {
  lastServer = server;
  const dot = serverStatus.querySelector(".status-dot");
  const text = serverStatus.querySelector(".status-text");

  if (!server) {
    dot.dataset.state = "unknown";
    text.textContent = "Нет данных";
    return;
  }

  if (server.running) {
    dot.dataset.state = "ok";
    text.textContent = "Сервер работает";
    return;
  }

  dot.dataset.state = "warn";
  text.textContent = "Сервер остановлен";
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

function serverModeButton(actionId, title, hint, tone, disabled) {
  const disabledAttr = disabled ? " disabled" : "";
  return `
    <button type="button" class="server-mode" data-tone="${tone}" data-action="${actionId}"${disabledAttr}>
      <strong>${title}</strong>
      <span>${hint}</span>
    </button>
  `;
}

function renderServerSection() {
  const server = lastServer || bootstrap?.server;
  const isRunning = Boolean(server?.running);
  const section = document.createElement("section");
  section.className = "action-section panel server-panel";

  const ports = bootstrap?.serverPorts || {
    editorHttps: 3443,
    editorHttp: 3000,
    voiceHttps: 3488,
    voiceHttp: 3088
  };
  const cmsUrl = `https://localhost:${ports.editorHttps}`;
  const voiceUrl = `https://localhost:${ports.voiceHttps}`;
  const linkDisabled = isRunning ? "" : " disabled";

  const modeText = server?.modeLabel || (isRunning ? "работает" : "остановлен");

  section.innerHTML = `
    <div class="server-head">
      <h2>Сервер</h2>
      <span class="server-state ${isRunning ? "is-on" : "is-off"}">${modeText}</span>
    </div>
    <div class="server-modes" role="group" aria-label="Запуск сервера">
      ${serverModeButton(
        "server-start-bg",
        "В фоне",
        "Сервер останется после закрытия Agent Control",
        "primary",
        isRunning
      )}
      ${serverModeButton(
        "server-start-attached",
        "Пока Control открыт",
        "Сервер остановится, когда закроете это окно",
        "default",
        isRunning
      )}
    </div>
    <div class="server-stop-row">
      ${actionButton("server-stop", "danger", "server-stop-btn", !isRunning)}
    </div>
    <div class="server-links">
      <span class="server-links-label">Открыть в браузере:</span>
      <button type="button" class="link-btn link-btn--cms" data-url="${cmsUrl}"${linkDisabled}>Editor :3443</button>
      <button type="button" class="link-btn link-btn--voice" data-url="${voiceUrl}"${linkDisabled}>Voice :3488</button>
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
  section.className = "launchpad";

  section.innerHTML = `
    <div class="launchpad-grid">
      ${products.map(renderAppCard).join("")}
      ${renderControlCard(control)}
    </div>
  `;

  return section;
}

function renderSetupSection() {
  const ids = bootstrap?.setupActionIds || [];
  const actions = (bootstrap?.actions || []).filter((entry) => ids.includes(entry.id));
  const section = document.createElement("section");
  section.className = "action-section panel";

  section.innerHTML = `
    <div class="section-title section-title--compact">
      <h2>Установка</h2>
    </div>
    <div class="setup-row">
      ${actions
        .map(
          (action) => `
        <div class="setup-item">
          <span class="setup-label">${action.title}</span>
          ${actionButton(action.id, action.tone || "default", "compact-btn")}
        </div>
      `
        )
        .join("")}
    </div>
  `;

  return section;
}

function renderLayout() {
  actionsRoot.innerHTML = "";
  actionsRoot.appendChild(renderSetupSection());
  actionsRoot.appendChild(renderServerSection());
  actionsRoot.appendChild(renderAppsSection());
  bindActionHandlers();
}

function bindActionHandlers() {
  actionsRoot.querySelectorAll(".run-btn, .server-mode").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.action));
  });

  actionsRoot.querySelectorAll(".link-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.url;
      if (url) window.agentControl.openExternal(url);
    });
  });
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

const SERVER_MODE_TITLES = {
  "server-start-bg": "В фоне",
  "server-start-attached": "Пока Control открыт"
};

function setButtonsDisabled(disabled) {
  actionsRoot.querySelectorAll(".run-btn").forEach((button) => {
    const actionId = button.dataset.action;
    const defaultLabel = ACTION_LABELS[actionId] || "Запустить";
    button.disabled = disabled;
    button.textContent = disabled && actionId === runningActionId ? "…" : defaultLabel;
  });

  actionsRoot.querySelectorAll(".server-mode").forEach((button) => {
    const actionId = button.dataset.action;
    button.disabled = disabled;
    const title = button.querySelector("strong");
    if (!title) return;
    title.textContent =
      disabled && actionId === runningActionId ? "Запуск…" : SERVER_MODE_TITLES[actionId] || title.textContent;
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
    if (data.environment) renderEnvironment(data.environment);
    renderServerStatus(data.server);
    lastServer = data.server;
    renderLayout();
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
