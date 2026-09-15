const CATEGORIES = [
  { id: "setup", label: "Установка", hint: "Первый запуск и окружение" },
  { id: "server", label: "Сервер", hint: "CMS + Voice в браузере" },
  { id: "apps", label: "Приложения", hint: "Desktop .app" }
];

const logOutput = document.getElementById("log-output");
const actionsRoot = document.getElementById("actions-root");
const envGrid = document.getElementById("env-grid");
const serverStatus = document.getElementById("server-status");
let bootstrap = null;
let runningActionId = null;

function appendLog(text, stream = "stdout") {
  const span = document.createElement("span");
  if (stream === "stderr") span.className = "stderr";
  span.textContent = text;
  logOutput.appendChild(span);
  logOutput.scrollTop = logOutput.scrollHeight;
}

function renderServerStatus(server) {
  const dot = serverStatus.querySelector(".status-dot");
  const text = serverStatus.querySelector(".status-text");

  if (!server) {
    dot.dataset.state = "unknown";
    text.textContent = "Нет данных";
    return;
  }

  if (server.running) {
    dot.dataset.state = "ok";
    const parts = [];
    if (server.urls?.cms) parts.push("CMS");
    if (server.urls?.voice) parts.push("Voice");
    text.textContent = `Сервер работает · ${parts.join(" + ")}`;
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

function renderActions(actions) {
  actionsRoot.innerHTML = "";

  for (const category of CATEGORIES) {
    const section = document.createElement("section");
    section.className = "action-section";

    const title = document.createElement("div");
    title.className = "section-title";
    title.innerHTML = `<h2>${category.label}</h2><p>${category.hint}</p>`;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "action-grid";

    for (const action of actions.filter((entry) => entry.category === category.id)) {
      const card = document.createElement("article");
      card.className = "action-card";
      card.innerHTML = `
        <h3>${action.title}</h3>
        <p>${action.description}</p>
        <footer>
          <button type="button" class="run-btn" data-tone="${action.tone || "default"}" data-action="${action.id}">
            Запустить
          </button>
        </footer>
      `;
      grid.appendChild(card);
    }

    section.appendChild(grid);
    actionsRoot.appendChild(section);
  }

  actionsRoot.querySelectorAll(".run-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const actionId = button.dataset.action;
      if (runningActionId) return;
      runningActionId = actionId;
      setButtonsDisabled(true);
      try {
        await window.agentControl.runAction(actionId);
        const status = await window.agentControl.refreshStatus();
        renderServerStatus(status.server);
      } finally {
        runningActionId = null;
        setButtonsDisabled(false);
      }
    });
  });
}

function setButtonsDisabled(disabled) {
  actionsRoot.querySelectorAll(".run-btn").forEach((button) => {
    button.disabled = disabled;
    if (disabled && button.dataset.action === runningActionId) {
      button.textContent = "Выполняется…";
    } else {
      button.textContent = "Запустить";
    }
  });
}

async function init() {
  bootstrap = await window.agentControl.getBootstrap();
  renderEnvironment(bootstrap.environment);
  renderServerStatus(bootstrap.server);
  renderActions(bootstrap.actions || []);

  window.agentControl.onLog(({ text, stream }) => appendLog(text, stream));
  window.agentControl.onActionState(({ running }) => {
    if (!running) {
      runningActionId = null;
      setButtonsDisabled(false);
    }
  });
}

document.getElementById("refresh-status").addEventListener("click", async () => {
  const status = await window.agentControl.refreshStatus();
  renderServerStatus(status.server);
});

document.getElementById("clear-log").addEventListener("click", () => {
  logOutput.textContent = "";
});

init().catch((error) => {
  appendLog(`Ошибка загрузки: ${error.message}\n`, "stderr");
});
