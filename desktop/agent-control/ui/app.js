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

async function refreshAppLockLoginHint() {
  const hint = document.getElementById("app-lock-login-hint");
  if (!hint || !needsAppLockLogin()) return;
  try {
    const response = await fetch("/api/app-lock/status", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.configured || !data.login) return;
    hint.textContent = `Ожидаемый логин: ${data.login}.`;
    hint.hidden = false;
    const loginInput = document.querySelector("#app-lock-form input[name='login']");
    if (loginInput && !String(loginInput.value || "").trim()) {
      loginInput.value = data.login;
    }
  } catch {
    /* ignore */
  }
}

function syncAppLockScreen() {
  const screen = document.getElementById("app-lock-screen");
  if (!screen) return;
  const canLogin = Boolean(window.agentControl?.appLockLogin);
  const show = canLogin && needsAppLockLogin();
  screen.hidden = !show;
  document.body.classList.toggle("app-lock-active", show);
  syncAppLockLogoutButton();
  syncEnvFileEditorAccess();
  syncWorkspaceMountsAccess();
  if (show) {
    void refreshAppLockLoginHint();
    window.requestAnimationFrame(() => {
      const loginInput = screen.querySelector('input[name="login"]');
      if (loginInput) loginInput.focus();
    });
  }
}

function syncEnvFileEditorAccess() {
  const editor = document.getElementById("env-file-editor");
  const example = document.getElementById("env-file-example");
  const saveBtn = document.getElementById("env-file-save");
  const reloadBtn = document.getElementById("env-file-reload");
  const hint = document.getElementById("env-file-lock-hint");
  const canUse = Boolean(window.agentControl?.getEnvFile);
  const locked = canUse && needsAppLockLogin();
  if (editor) editor.disabled = !canUse || locked;
  if (example) example.disabled = false;
  if (saveBtn) saveBtn.disabled = !canUse || locked;
  if (reloadBtn) reloadBtn.disabled = !canUse;
  if (hint) hint.hidden = !locked;
}

async function loadEnvFileEditor() {
  const editor = document.getElementById("env-file-editor");
  const example = document.getElementById("env-file-example");
  const meta = document.getElementById("env-file-meta");
  const status = document.getElementById("env-file-status");
  if (!editor || !window.agentControl?.getEnvFile) return;
  syncEnvFileEditorAccess();
  if (status) status.textContent = "Загрузка…";
  try {
    const data = await window.agentControl.getEnvFile();
    if (!data.ok) {
      if (status) status.textContent = data.error || "Не удалось прочитать .env";
      return;
    }

    if (example) {
      example.value = data.exampleContent ?? "";
    }

    const locked = Boolean(data.locked) || needsAppLockLogin();
    if (locked) {
      editor.value = "";
      if (meta) {
        meta.textContent = data.projectRoot
          ? `.env · ${data.projectRoot} (скрыт до входа)`
          : ".env (скрыт до входа)";
      }
      if (status) status.textContent = "Войдите, чтобы редактировать .env";
      return;
    }

    editor.value = data.content ?? "";
    if (meta) {
      const pathLabel = data.filePath || ".env";
      const exampleLabel = data.examplePath
        ? String(data.examplePath).split(/[/\\]/).pop()
        : ".env.example";
      const parts = [];
      if (data.projectRoot) parts.push(data.projectRoot);
      parts.push(data.exists ? pathLabel : `${pathLabel} (создастся при сохранении)`);
      if (data.exampleExists && data.examplePath) parts.push(exampleLabel);
      meta.textContent = parts.join(" · ");
    }
    if (status) {
      status.textContent = data.message || (data.exists ? "Загружено" : "Файла .env пока нет");
    }
  } catch (error) {
    if (status) status.textContent = String(error.message || error);
  }
}

let workspaceMountsDraft = [];

const WORKSPACE_MOUNT_MAC_TEMPLATES = {
  desktop: {
    id: "mac-desktop",
    label: "Mac · Рабочий стол",
    hostPath: "~/Desktop"
  },
  downloads: {
    id: "mac-downloads",
    label: "Mac · Загрузки",
    hostPath: "~/Downloads"
  }
};

function effectiveWorkspaceMountContainerPath(mount) {
  if (mount?.builtIn) {
    return String(mount.containerPath || "/app/workspaces").trim() || "/app/workspaces";
  }
  return String(mount?.hostPath || "").trim();
}

function addWorkspaceMountEntry(entry) {
  const hostPath = entry.hostPath || "";
  workspaceMountsDraft.push({
    id: entry.id || `mount-${Date.now()}`,
    label: entry.label || "Доп. папка",
    hostPath,
    containerPath: entry.builtIn ? entry.containerPath || "/app/workspaces" : hostPath,
    builtIn: Boolean(entry.builtIn)
  });
  renderWorkspaceMountsList();
}

function renderWorkspaceMountHostPathLabel(builtIn, containerHintText) {
  const title = builtIn
    ? "Дефолтный корень: ./workspaces или AGENT_CMS_WORKSPACES_DIR в .env (docker-compose.mac.yml / linux.yml). Сюда не пишется в workspace-mounts.yml."
    : "Абсолютный путь на Mac (/Users/…/Desktop) или ~/Desktop — при сохранении раскроется в полный путь. Docker Desktop → File sharing.";
  const iconClass = builtIn ? " workspace-mount-field-icon--builtin" : "";
  const containerLabel = builtIn
    ? `→ <code>${escapeAttr(containerHintText)}</code>`
    : `· в контейнере 1:1 <code class="workspace-mount-label-container-live">${escapeAttr(containerHintText)}</code>`;
  return `
    <span class="workspace-mount-field-label">
      <span class="workspace-mount-field-icon workspace-mount-field-icon--folder${iconClass}" role="img" aria-label="Папка на хосте" title="${escapeAttr(title)}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path fill="currentColor" d="M10 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7.5L12 4h-2Z"/>
        </svg>
      </span>
      <span class="workspace-mount-field-title">Путь на хосте</span>
      <span class="workspace-mount-label-container">${containerLabel}</span>
    </span>`;
}

function addWorkspaceMountFromTemplate(templateKey) {
  const template = WORKSPACE_MOUNT_MAC_TEMPLATES[templateKey];
  if (!template) return;
  const hostNorm = String(template.hostPath || "").trim();
  const already = workspaceMountsDraft.some(
    (m) => !m.builtIn && String(m.hostPath || "").trim() === hostNorm
  );
  if (already) return;
  addWorkspaceMountEntry({ ...template });
}

function syncWorkspaceMountsSectionVisibility() {
  const section = document.querySelector('[data-section="workspace-mounts"]');
  if (!section) return;
  const docker = bootstrap?.deployment?.mode === "docker";
  const hasApi = Boolean(window.agentControl?.getWorkspaceMounts);
  section.hidden = !docker || !hasApi;
}

function syncWorkspaceMountsAccess() {
  syncWorkspaceMountsSectionVisibility();
  const saveBtn = document.getElementById("workspace-mounts-save");
  const addBtn = document.getElementById("workspace-mounts-add");
  const reloadBtn = document.getElementById("workspace-mounts-reload");
  const hint = document.getElementById("workspace-mounts-lock-hint");
  const locked = needsAppLockLogin();
  if (saveBtn) saveBtn.disabled = locked;
  if (addBtn) addBtn.disabled = locked;
  if (reloadBtn) reloadBtn.disabled = false;
  if (hint) hint.hidden = !locked;
  document.querySelectorAll(".workspace-mounts-template").forEach((btn) => {
    btn.disabled = locked;
  });
  const list = document.getElementById("workspace-mounts-list");
  list?.querySelectorAll("input, select, button[data-remove-mount]").forEach((el) => {
    if (el.closest("[data-built-in='1']")) return;
    el.disabled = locked;
  });
}

function renderWorkspaceMountsList() {
  const list = document.getElementById("workspace-mounts-list");
  if (!list) return;
  list.innerHTML = workspaceMountsDraft
    .map((mount, index) => {
      const builtIn = Boolean(mount.builtIn);
      const host = escapeAttr(mount.hostPath || "");
      const label = escapeAttr(mount.label || mount.id || "");
      const containerHint = builtIn
        ? effectiveWorkspaceMountContainerPath(mount)
        : String(mount.hostPath || "").trim() || "как на хосте";
      return `
        <div class="workspace-mount-row${builtIn ? " workspace-mount-row--builtin" : ""}" data-index="${index}" ${
          builtIn ? 'data-built-in="1"' : ""
        }>
          <label class="workspace-mount-field workspace-mount-field--host">
            ${renderWorkspaceMountHostPathLabel(builtIn, containerHint)}
            <input type="text" name="hostPath" value="${host}" spellcheck="false" autocomplete="off" ${
              builtIn ? "disabled" : ""
            } placeholder="/Users/you/Desktop или ~/Downloads" />
          </label>
          <label class="workspace-mount-field">
            <span>Метка</span>
            <input type="text" name="label" value="${label}" ${builtIn ? "disabled" : ""} />
          </label>
          ${
            builtIn
              ? `<span class="workspace-mount-badge">default</span>`
              : `<button type="button" class="ghost-btn workspace-mount-remove" data-remove-mount="${index}">Удалить</button>`
          }
        </div>`;
    })
    .join("");

  list.querySelectorAll(".workspace-mount-row:not([data-built-in='1']) input").forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest(".workspace-mount-row");
      const idx = Number(row?.dataset.index);
      if (!Number.isFinite(idx) || !workspaceMountsDraft[idx]) return;
      const name = input.name;
      workspaceMountsDraft[idx][name] = input.value;
      if (name === "hostPath" && !workspaceMountsDraft[idx].builtIn) {
        workspaceMountsDraft[idx].containerPath = input.value;
        const hintCode = row?.querySelector(".workspace-mount-label-container-live");
        if (hintCode) {
          hintCode.textContent = input.value.trim() || "как на хосте";
        }
      }
    });
  });
  list.querySelectorAll("[data-remove-mount]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (needsAppLockLogin()) return;
      const idx = Number(btn.dataset.removeMount);
      workspaceMountsDraft.splice(idx, 1);
      renderWorkspaceMountsList();
      syncWorkspaceMountsAccess();
    });
  });
  syncWorkspaceMountsAccess();
}

async function loadWorkspaceMountsEditor() {
  const meta = document.getElementById("workspace-mounts-meta");
  const status = document.getElementById("workspace-mounts-status");
  syncWorkspaceMountsSectionVisibility();
  if (!window.agentControl?.getWorkspaceMounts) return;
  if (status) status.textContent = "Загрузка…";
  try {
    const data = await window.agentControl.getWorkspaceMounts();
    if (!data.ok) throw new Error(data.error || "read_failed");
    workspaceMountsDraft = (data.mounts || []).map((m) => ({ ...m }));
    renderWorkspaceMountsList();
    if (meta) {
      const parts = [];
      if (data.hostProject) parts.push(data.hostProject);
      if (data.jsonPath) parts.push(String(data.jsonPath).split(/[/\\]/).slice(-2).join("/"));
      if (data.composeBasename) {
        parts.push(data.composeExists ? data.composeBasename : `${data.composeBasename} (создастся при сохранении)`);
      }
      meta.textContent = parts.join(" · ");
    }
    if (status) status.textContent = "После сохранения — «Рестарт» stack или docker compose up -d.";
  } catch (error) {
    if (status) status.textContent = String(error.message || error);
  }
}

function bindWorkspaceMountsEditor() {
  const saveBtn = document.getElementById("workspace-mounts-save");
  const reloadBtn = document.getElementById("workspace-mounts-reload");
  const addBtn = document.getElementById("workspace-mounts-add");
  const status = document.getElementById("workspace-mounts-status");
  if (!saveBtn || saveBtn.dataset.bound) return;
  if (!window.agentControl?.getWorkspaceMounts || !window.agentControl?.saveWorkspaceMounts) {
    syncWorkspaceMountsSectionVisibility();
    return;
  }
  saveBtn.dataset.bound = "1";
  reloadBtn?.addEventListener("click", () => loadWorkspaceMountsEditor());
  addBtn?.addEventListener("click", () => {
    if (needsAppLockLogin()) return;
    addWorkspaceMountEntry({
      id: `mount-${Date.now()}`,
      label: "Доп. папка",
      hostPath: "",
      containerPath: ""
    });
  });
  document.querySelectorAll(".workspace-mounts-template").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (needsAppLockLogin()) return;
      addWorkspaceMountFromTemplate(btn.dataset.mountTemplate);
    });
  });
  saveBtn.addEventListener("click", async () => {
    if (needsAppLockLogin()) return;
    saveBtn.disabled = true;
    if (status) status.textContent = "Сохранение…";
    try {
      const mounts = workspaceMountsDraft.map((mount) => {
        const { id, label, hostPath, builtIn } = mount;
        const row = {
          id: String(id || "").trim() || undefined,
          label: String(label || "").trim(),
          hostPath: String(hostPath || "").trim(),
          containerPath: effectiveWorkspaceMountContainerPath(mount)
        };
        if (builtIn) row.builtIn = true;
        return row;
      });
      const result = await window.agentControl.saveWorkspaceMounts({ mounts });
      if (!result.ok) throw new Error(result.error || "save_failed");
      if (status) status.textContent = result.message || "Сохранено";
      appendLog(`\n■ Папки хранилищ сохранены\n${result.message || ""}\n`);
      await loadWorkspaceMountsEditor();
    } catch (error) {
      if (status) status.textContent = String(error.message || error);
      appendLog(`Ошибка workspace mounts: ${error.message}\n`, "stderr");
    } finally {
      syncWorkspaceMountsAccess();
    }
  });
}

function bindEnvFileEditor() {
  const saveBtn = document.getElementById("env-file-save");
  const reloadBtn = document.getElementById("env-file-reload");
  const editor = document.getElementById("env-file-editor");
  const status = document.getElementById("env-file-status");
  if (!saveBtn || !reloadBtn || !editor || saveBtn.dataset.bound) return;
  if (!window.agentControl?.getEnvFile || !window.agentControl?.saveEnvFile) {
    document.querySelector('[data-section="env-file"]')?.setAttribute("hidden", "");
    return;
  }
  saveBtn.dataset.bound = "1";

  reloadBtn.addEventListener("click", () => loadEnvFileEditor());
  saveBtn.addEventListener("click", async () => {
    if (needsAppLockLogin()) return;
    saveBtn.disabled = true;
    if (status) status.textContent = "Сохранение…";
    try {
      const result = await window.agentControl.saveEnvFile(editor.value);
      if (!result.ok) throw new Error(result.error || "save_failed");
      if (status) status.textContent = result.message || "Сохранено";
      appendLog(`\n■ .env сохранён\n${result.message || ""}\n`);
      await loadEnvFileEditor();
    } catch (error) {
      if (status) status.textContent = String(error.message || error);
      appendLog(`Ошибка .env: ${error.message}\n`, "stderr");
    } finally {
      syncEnvFileEditorAccess();
    }
  });
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
      await loadEnvFileEditor();
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

const SINGLE_DOOR_PUBLIC_PATHS = {
  editor: "/",
  voice: "/app-chat",
  commander: "/app-commander",
  control: "/app-control",
  mcp: "/app-mcp"
};

const SERVICE_MONITOR_DEFS = [
  {
    id: "editor",
    title: "Agent CMS Editor",
    shortName: "Editor",
    accent: "cms",
    icon: "cms.svg",
    portKey: "editorHttp",
    portKeyLegacyHttps: "editorHttps",
    portLabel: "HTTP"
  },
  {
    id: "voice",
    title: "Agent CMS Voice-Chat",
    shortName: "Chat (Flow window)",
    accent: "voice",
    icon: "voice.svg",
    portKey: "voiceHttp",
    portKeyLegacyHttps: "voiceHttps",
    portLabel: "HTTP"
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
    shortName: "Control (Launcher)",
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
    portLabel: "API"
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
const ENV_PREVIEW_ROW_COUNT = 5;

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
  "cms-electron-build": "Electron",
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
  "cms-electron-build": "~3–5 мин"
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
    if (server.mode === "docker") return { state: "on", label: "Контейнер CMS" };
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

function isDockerDeployment() {
  if (bootstrap?.deployment?.mode === "docker") return true;
  const server = lastServer || bootstrap?.server;
  if (server?.deploymentProbe === "docker-http" || server?.mode === "docker") return true;
  if (usesSingleHttpDoor(server) && String(server?.modeLabel || "").includes("контейнер")) {
    return true;
  }
  return false;
}

function isServerUpdateEnabled() {
  return bootstrap?.deployment?.updateEnabled === true;
}

function getServerBtnTitle(actionId) {
  if (!isDockerDeployment()) return SERVER_BTN_TITLES[actionId] || "Запуск";
  const dockerTitles = {
    "server-start-bg": "Compose up",
    "server-start-attached": "Compose up",
    "server-stop": "Stop cms",
    "server-restart": "Restart cms",
    "server-update": "Pull + build"
  };
  return dockerTitles[actionId] || SERVER_BTN_TITLES[actionId] || "Запуск";
}

function getServerBtnHint(actionId, hintOverride) {
  if (hintOverride != null) return hintOverride;
  if (isDockerDeployment()) {
    const up = (bootstrap?.deployment?.upServices || ["cms", "mcp"]).join(", ");
    const dockerHints = {
      "server-start-bg": `docker compose up -d ${up} · контейнеры cms, mcp`,
      "server-stop": "docker compose stop cms · Control и Caddy не трогаем",
      "server-restart": `docker compose restart ${up}`,
      "server-update": "git pull на хосте → compose up -d --build"
    };
    return dockerHints[actionId] ?? SERVER_BTN_HINTS[actionId] ?? "";
  }
  return SERVER_BTN_HINTS[actionId] ?? "";
}

function getClientLinkHost() {
  if (!isWebLauncher()) return "localhost";
  return window.location.hostname || "localhost";
}

function preferHttpServiceLinks() {
  if (isWebLauncher() && window.location.protocol === "http:") return true;
  return usesSingleHttpDoor(lastServer || bootstrap?.server);
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

function shouldUseCanonicalHttpDoor() {
  const server = lastServer || bootstrap?.server;
  return usesSingleHttpDoor(server) || isDockerDeployment();
}

function getPublicDoorBase() {
  const server = lastServer || bootstrap?.server;
  if (shouldUseCanonicalHttpDoor()) {
    const door = getClientDoorHttpOrigin();
    if (door) return rewriteUrlHostForClient(door.replace(/\/+$/, ""));
  }

  if (isWebLauncher()) {
    return `${window.location.protocol}//${window.location.host}`.replace(/\/+$/, "");
  }

  const fromBootstrap = String(bootstrap?.mcpConnect?.cmsBaseUrl || "").trim().replace(/\/+$/, "");
  if (fromBootstrap) {
    if (usesSingleHttpDoor(server) && fromBootstrap.startsWith("https:") && preferHttpServiceLinks()) {
      try {
        const parsed = new URL(fromBootstrap);
        return `http://${parsed.host}`.replace(/\/+$/, "");
      } catch {
        /* fall through */
      }
    }
    return fromBootstrap;
  }
  return "";
}

function buildPublicAppUrl(publicPath) {
  const base = getPublicDoorBase();
  if (!base) return "";
  const segment = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  return `${base}${segment}`;
}

function usesSingleHttpDoor(server) {
  if (server?.singleHttpDoor === true) return true;
  const ports = getPorts();
  if (ports.singleHttpDoor === true) return true;
  if (bootstrap?.deployment?.mode === "docker") return true;
  return false;
}

function parseDoorOriginParts(originOrUrl) {
  const raw = String(originOrUrl || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw.includes("://") ? raw : `http://${raw}`);
    const port =
      parsed.port ||
      (parsed.protocol === "https:" ? "443" : parsed.protocol === "http:" ? "80" : "");
    return {
      host: parsed.hostname,
      port: port === "80" || port === "443" ? String(port) : port,
      origin: parsed.origin.replace(/\/+$/, "")
    };
  } catch {
    return null;
  }
}

function getSingleDoorHostPort(ports) {
  const fromClient = getClientDoorHostPort(ports);
  if (fromClient) return fromClient;
  const port = ports.editorHttp ?? ports.editorHttps ?? 3000;
  return { host: getClientLinkHost(), port };
}

/** Host:port публичной «одной двери» — из вкладки, AGENT_CMS_PUBLIC_URL или probe urls. */
function getClientDoorHostPort(ports) {
  if (isWebLauncher()) {
    const locPort =
      window.location.port ||
      (window.location.protocol === "https:" ? "443" : window.location.protocol === "http:" ? "80" : "");
    return {
      host: window.location.hostname,
      port: locPort
    };
  }

  const server = lastServer || bootstrap?.server;
  const urlCandidates = [
    server?.urls?.controlHttp,
    server?.urls?.cms,
    bootstrap?.mcpConnect?.cmsBaseUrl
  ];
  for (const candidate of urlCandidates) {
    const parts = parseDoorOriginParts(candidate);
    if (parts) {
      return {
        host: getClientLinkHost() === "localhost" ? parts.host : getClientLinkHost(),
        port: parts.port === "80" || parts.port === "443" ? parts.port : parts.port || "3000"
      };
    }
  }

  const port = ports?.editorHttp ?? ports?.editorHttps ?? 3000;
  return { host: getClientLinkHost(), port };
}

function getClientDoorHttpOrigin() {
  const server = lastServer || bootstrap?.server;
  if (isWebLauncher() && shouldUseCanonicalHttpDoor()) {
    const fromBootstrap = String(bootstrap?.mcpConnect?.cmsBaseUrl || "").trim().replace(/\/+$/, "");
    if (fromBootstrap) {
      let base = fromBootstrap.startsWith("https:") ? fromBootstrap.replace(/^https:/, "http:") : fromBootstrap;
      try {
        const parsed = new URL(base.includes("://") ? base : `http://${base}`);
        const ports = getPorts();
        const doorPort = String(ports.editorHttp ?? 3000);
        if (!parsed.port || parsed.port === "3443" || parsed.port === String(ports.editorHttps ?? 3443)) {
          parsed.protocol = "http:";
          parsed.port = doorPort;
        }
        return parsed.origin.replace(/\/+$/, "");
      } catch {
        /* fall through */
      }
    }
    const ports = getPorts();
    const doorPort = String(ports.editorHttp ?? 3000);
    const host = window.location.hostname || "127.0.0.1";
    const locPort =
      window.location.port ||
      (window.location.protocol === "https:" ? "443" : window.location.protocol === "http:" ? "80" : "");
    if (window.location.protocol === "http:" && locPort === doorPort) {
      return window.location.origin.replace(/\/+$/, "");
    }
    return `http://${host}:${doorPort}`.replace(/\/+$/, "");
  }

  if (isWebLauncher()) {
    return window.location.origin.replace(/\/+$/, "");
  }

  const pathKeys = {
    editor: "cms",
    voice: "voice",
    commander: "commanderHttp",
    control: "controlHttp",
    mcp: "mcpHttp"
  };
  for (const key of Object.keys(pathKeys)) {
    const probeUrl = server?.urls?.[pathKeys[key]];
    const parts = parseDoorOriginParts(probeUrl);
    if (parts?.origin) {
      return parts.origin.startsWith("https:")
        ? parts.origin.replace(/^https:/, "http:")
        : parts.origin;
    }
  }

  const ports = getPorts();
  const port = ports.editorHttp ?? ports.editorHttps ?? 3000;
  return buildServiceUrl("http", port, "/").replace(/\/+$/, "");
}

function singleDoorProbeUrl(def, server) {
  const urls = server?.urls || {};
  const key =
    def.id === "editor"
      ? "cms"
      : def.id === "voice"
        ? "voice"
        : def.id === "commander"
          ? "commanderHttp"
          : def.id === "control"
            ? "controlHttp"
            : def.id === "mcp"
              ? "mcpHttp"
              : "";
  const raw = key ? urls[key] : "";
  return raw ? rewriteUrlHostForClient(String(raw).trim()) : "";
}

function getServiceMonitorBadge(def, server, ports) {
  if (usesSingleHttpDoor(server)) {
    const path = SINGLE_DOOR_PUBLIC_PATHS[def.id] || "/";
    return path === "/" ? "/" : path;
  }
  const key = def.portKeyLegacyHttps && !preferHttpServiceLinks() ? def.portKeyLegacyHttps : def.portKey;
  const port = ports[key] ?? ports[def.portKey];
  return port != null ? `:${port}` : "—";
}

function getServiceMonitorUrlPair(def, server, ports) {
  const singleDoor = usesSingleHttpDoor(server);
  const path = SINGLE_DOOR_PUBLIC_PATHS[def.id] ?? "/";

  if (def.id === "mcp") {
    const ping = getTestUrl("mcp");
    return {
      openUrl: ping,
      httpUrl: ping,
      httpsUrl: "",
      httpLabel: "MCP ping",
      httpsLabel: "",
      mcpPing: true
    };
  }

  if (singleDoor) {
    const probed = singleDoorProbeUrl(def, server);
    const httpBase = getClientDoorHttpOrigin();
    let httpUrl = probed && !probed.startsWith("https:")
      ? probed
      : joinCmsBaseAndPath(httpBase, path);
    if (httpUrl.startsWith("https:")) {
      httpUrl = httpUrl.replace(/^https:/, "http:");
    }
    let httpsUrl = "";
    if (probed && probed.startsWith("https://")) {
      httpsUrl = probed;
    } else {
      const pub = String(bootstrap?.mcpConnect?.cmsBaseUrl || "").trim().replace(/\/+$/, "");
      if (pub.startsWith("https://")) {
        httpsUrl = joinCmsBaseAndPath(pub, path);
      }
    }
    const openUrl = preferHttpServiceLinks() || !httpsUrl ? httpUrl : httpsUrl;
    return {
      openUrl,
      httpUrl,
      httpsUrl,
      httpLabel: `${def.shortName} HTTP`,
      httpsLabel: `${def.shortName} HTTPS`
    };
  }

  return legacyServiceMonitorUrlPair(def, server, ports);
}

function legacyServiceMonitorUrlPair(def, server, ports) {
  const urls = server?.urls || {};
  const httpFirst = preferHttpServiceLinks();

  const finish = (openUrl, httpUrl, httpsUrl, extras = {}) => ({
    openUrl: openUrl || "",
    httpUrl: httpUrl || openUrl || "",
    httpsUrl: httpsUrl || "",
    httpLabel: extras.httpLabel || `${def.shortName} HTTP`,
    httpsLabel: extras.httpsLabel || `${def.shortName} HTTPS`,
    mcpPing: Boolean(extras.mcpPing)
  });

  if (def.id === "editor") {
    const httpUrl = ports.editorHttp ? buildServiceUrl("http", ports.editorHttp, "/") : "";
    let httpsUrl = ports.editorHttps ? buildServiceUrl("https", ports.editorHttps, "/") : "";
    if (urls.cms) httpsUrl = rewriteUrlHostForClient(urls.cms);
    const openUrl = httpFirst && httpUrl ? httpUrl : httpsUrl || httpUrl;
    return finish(openUrl, httpUrl, httpsUrl);
  }
  if (def.id === "voice") {
    const door = buildPublicAppUrl("/app-chat/");
    const httpUrl =
      door ||
      (ports.voiceHttp && server?.voice ? buildServiceUrl("http", ports.voiceHttp, "/") : "");
    let httpsUrl = urls.voice ? rewriteUrlHostForClient(urls.voice) : "";
    if (!httpsUrl && ports.voiceHttps) httpsUrl = buildServiceUrl("https", ports.voiceHttps, "/");
    const openUrl = door || (httpFirst && httpUrl ? httpUrl : httpsUrl || httpUrl);
    return finish(openUrl, httpUrl || openUrl, httpsUrl || openUrl);
  }
  if (def.id === "commander") {
    const door = buildPublicAppUrl("/app-commander/");
    let httpUrl = urls.commanderHttp ? rewriteUrlHostForClient(urls.commanderHttp) : "";
    if (!httpUrl && ports.commanderHttp) httpUrl = buildServiceUrl("http", ports.commanderHttp, "/");
    let httpsUrl = urls.commanderHttps ? rewriteUrlHostForClient(urls.commanderHttps) : "";
    if (!httpsUrl && server?.cms && ports.editorHttps) {
      httpsUrl =
        buildPublicAppUrl("/app-commander/") ||
        buildServiceUrl("https", ports.editorHttps, "/app-commander/");
    }
    const openUrl = door || (httpFirst && httpUrl ? httpUrl : httpsUrl || httpUrl);
    return finish(openUrl, httpUrl || door || openUrl, httpsUrl || door || openUrl);
  }
  if (def.id === "control") {
    const door =
      buildPublicAppUrl("/app-control/") ||
      (isWebLauncher() ? `${window.location.origin}/app-control/` : "");
    let httpUrl = urls.controlHttp ? rewriteUrlHostForClient(urls.controlHttp) : "";
    if (!httpUrl && server?.controlHttp && ports.controlHttp) {
      httpUrl = buildServiceUrl("http", ports.controlHttp, "/");
    }
    let httpsUrl = urls.controlEditor ? rewriteUrlHostForClient(urls.controlEditor) : "";
    if (!httpsUrl && server?.cms && ports.editorHttps) {
      httpsUrl = buildServiceUrl("https", ports.editorHttps, "/control/");
    }
    const openUrl = door || (httpFirst && httpUrl ? httpUrl : httpsUrl || httpUrl);
    return finish(openUrl, httpUrl || door || openUrl, httpsUrl || door || openUrl);
  }
  if (def.id === "mcp") {
    const ping = getTestUrl("mcp");
    const httpUrl =
      buildPublicAppUrl("/app-mcp") ||
      (server?.mcpHttp && ports.mcpHttp ? buildServiceUrl("http", ports.mcpHttp, "/health") : ping);
    return finish(ping, httpUrl, "", { httpLabel: "MCP ping", mcpPing: true });
  }
  return finish("", "", "");
}

function getServiceMonitorOpenUrl(def, server, ports) {
  return getServiceMonitorUrlPair(def, server, ports).openUrl;
}

function isOnControlAppPath() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/app-control" || path.startsWith("/app-control/");
}

/** ↗ только для UI в браузере; MCP — Ping; Control не дублирует текущую вкладку. */
function serviceMonitorShowsOpenAffordance(def, row, openUrl) {
  if (row.state !== "on" || !openUrl) return false;
  if (def.id === "mcp") return false;
  if (def.id === "control" && isOnControlAppPath()) return false;
  return true;
}

function openServiceMonitorUrl(url) {
  const target = String(url || "").trim();
  if (!target) return;
  if (window.agentControl?.openExternal) {
    void window.agentControl.openExternal(target);
  } else {
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

function renderServiceMonitorCopyPair(urls, canCopy) {
  const disabled = canCopy ? "" : " disabled";
  if (urls.mcpPing) {
    return `
      <div class="svc-rack-copy browser-link-copy-pair" data-svc-copy-stop>
        <button type="button" class="ghost-btn browser-link-copy svc-rack-copy-btn" data-copy-url="${escapeAttr(urls.httpUrl)}" data-copy-label="${escapeAttr(urls.httpLabel)}" title="Копировать ping URL"${disabled}>Ping</button>
      </div>`;
  }
  const httpsDisabled = !urls.httpsUrl || !canCopy ? " disabled" : "";
  const httpsTitle = urls.httpsUrl ? "Копировать HTTPS" : "HTTPS недоступен";
  return `
    <div class="svc-rack-copy browser-link-copy-pair" data-svc-copy-stop>
      <button type="button" class="ghost-btn browser-link-copy svc-rack-copy-btn" data-copy-url="${escapeAttr(urls.httpUrl)}" data-copy-label="${escapeAttr(urls.httpLabel)}" title="Копировать HTTP"${disabled}>HTTP</button>
      <button type="button" class="ghost-btn browser-link-copy svc-rack-copy-btn" data-copy-url="${escapeAttr(urls.httpsUrl)}" data-copy-label="${escapeAttr(urls.httpsLabel)}" title="${escapeAttr(httpsTitle)}"${httpsDisabled}>HTTPS</button>
    </div>`;
}

function getServiceMonitorRowState(def, server, ports) {
  const singleDoor = usesSingleHttpDoor(server);
  const port = ports[def.portKey];
  const portText = port != null ? String(port) : "—";
  const hostPort = getSingleDoorHostPort(ports);
  const doorDetail = `${hostPort.host}:${hostPort.port}`;

  if (singleDoor) {
    if (def.id === "mcp") {
      const httpUp = Boolean(server?.mcpHttp);
      const pingOk = mcpOk === true;
      const pingFail = mcpOk === false;
      const detailArgs = { pingOk, httpUp, portText, singleDoor: true, hostPort };
      if (server?.cms && mcpOk === null) {
        return {
          state: "pending",
          label: "Проверка…",
          detail: formatMcpMonitorDetail({ pingOk: null, httpUp, portText, singleDoor: true, hostPort }),
          protocol: def.portLabel
        };
      }
      if (pingOk || (httpUp && server?.cms)) {
        return { state: "on", label: "В сети", detail: formatMcpMonitorDetail(detailArgs), protocol: def.portLabel };
      }
      if (server?.cms && pingFail) {
        return {
          state: "off",
          label: "Не отвечает",
          detail: formatMcpMonitorDetail({ pingOk: false, httpUp, portText, singleDoor: true, hostPort }),
          protocol: def.portLabel
        };
      }
      return { state: "off", label: "Не запущен", detail: "CMS offline", protocol: def.portLabel };
    }

    const viaCms =
      def.id === "editor"
        ? Boolean(server?.cms)
        : def.id === "voice"
          ? Boolean(server?.voice)
          : def.id === "commander"
            ? Boolean(server?.commander)
            : def.id === "control"
              ? Boolean(server?.controlHttp)
              : false;

    if (viaCms) {
      return {
        state: "on",
        label: "В сети",
        detail: doorDetail,
        protocol: preferHttpServiceLinks() ? "HTTP" : def.portLabel
      };
    }
    return { state: "off", label: "Не запущен", detail: "CMS offline", protocol: def.portLabel };
  }

  if (def.id === "control") {
    const dedicated = Boolean(server?.controlHttp);
    if (dedicated) {
      return {
        state: "on",
        label: "В сети",
        detail: "HTTP localhost",
        protocol: def.portLabel
      };
    }
    if (server?.cms) {
      return {
        state: "on",
        label: "Через Editor",
        detail: `/control/ · :${ports.editorHttps ?? portText}`,
        protocol: def.portLabel
      };
    }
    return { state: "off", label: "Не запущен", detail: "порт свободен", protocol: def.portLabel };
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
        protocol: def.portLabel
      };
    }
    if (pingOk || httpUp) {
      return {
        state: "on",
        label: "В сети",
        detail: formatMcpMonitorDetail({ pingOk, httpUp, portText }),
        protocol: def.portLabel
      };
    }
    if (server?.cms && pingFail) {
      return {
        state: "off",
        label: "Не отвечает",
        detail: formatMcpMonitorDetail({ pingOk: false, httpUp, portText }),
        protocol: def.portLabel
      };
    }
    return { state: "off", label: "Не запущен", detail: "нужен запущенный сервер", protocol: def.portLabel };
  }

  const flag = def.id === "editor" ? "cms" : def.id === "voice" ? "voice" : "commander";
  const listening = Boolean(server?.[flag]);
  if (listening) {
    return { state: "on", label: "В сети", detail: "localhost", protocol: def.portLabel };
  }
  if (def.id === "commander" && server?.cms) {
    return {
      state: "on",
      label: "Через Editor",
      detail: `/app-commander/ · :${ports.editorHttps ?? portText}`,
      protocol: def.portLabel
    };
  }
  return { state: "off", label: "Не запущен", detail: "порт свободен", protocol: def.portLabel };
}

function formatMcpMonitorDetail({ pingOk, httpUp, portText, singleDoor, hostPort }) {
  const parts = [];
  if (pingOk === true) parts.push("ping OK");
  else if (pingOk === false) parts.push("ping нет");
  else if (pingOk === null) parts.push("ping …");
  if (singleDoor) {
    parts.push(SINGLE_DOOR_PUBLIC_PATHS.mcp);
    if (hostPort) parts.push(`${hostPort.host}:${hostPort.port}`);
    parts.push("Bearer");
    return parts.join(" · ");
  }
  if (httpUp) parts.push(`HTTP :${portText}`);
  return parts.join(" · ") || `HTTP :${portText}`;
}

function renderServiceMonitorRackCard(def, server, ports) {
  const row = getServiceMonitorRowState(def, server, ports);
  const urls = getServiceMonitorUrlPair(def, server, ports);
  const openUrl = urls.openUrl;
  const showOpen = serviceMonitorShowsOpenAffordance(def, row, openUrl);
  const canCopy = row.state === "on" && Boolean(urls.httpUrl || urls.httpsUrl);
  const badge = getServiceMonitorBadge(def, server, ports);
  const subline = row.detail ? `${row.protocol} · ${row.detail}` : row.protocol;
  const openBtn = showOpen
    ? `<button type="button" class="svc-rack-go" data-svc-open="${escapeAttr(openUrl)}" title="Открыть в новой вкладке" aria-label="Открыть ${escapeAttr(def.shortName)}">↗</button>`
    : "";

  return `
    <article
      class="svc-rack-card${showOpen ? " svc-rack-card--link" : ""}"
      data-service-id="${def.id}"
      data-accent="${def.accent}"
      data-state="${row.state}"
      title="${escapeAttr(def.title)}"
    >
      <div class="svc-rack-head">
        <img class="svc-rack-icon" src="assets/${def.icon}" alt="" width="28" height="28" />
        <div class="svc-rack-head-text">
          <strong class="svc-rack-name">${def.shortName}</strong>
          <code class="svc-rack-port">${escapeAttr(badge)}</code>
        </div>
        ${openBtn}
      </div>
      <p class="svc-rack-sub">${subline}</p>
      ${renderServiceMonitorCopyPair(urls, canCopy)}
      <footer class="svc-rack-foot">
        <span class="svc-rack-led" aria-hidden="true"></span>
        <span class="svc-rack-status">${row.label}</span>
      </footer>
    </article>
  `;
}

function renderServicesMonitor() {
  const root = document.getElementById("services-monitor");
  if (!root) return;

  const server = lastServer || bootstrap?.server;
  const ports = getPorts();

  root.innerHTML = `
    <div class="svc-rack">
      <div class="svc-rack-grid">${SERVICE_MONITOR_DEFS.map((def) => renderServiceMonitorRackCard(def, server, ports)).join("")}</div>
      <details class="svc-rack-note">
        <summary>Одна дверь (app-*)</summary>
        <p>Снаружи один host:port (<code>AGENT_CMS_PUBLIC_URL</code>). UI: <code>/</code>, <code>/app-chat</code>, <code>/app-commander</code>, <code>/app-control</code>; агенты: <code>/app-mcp</code> + Bearer. Electron .app на Mac (опционально): <code>npm run cms:electron-build</code> на хосте. Legacy: <code>AGENT_CMS_EXPOSE_INTERNAL_PORTS=1</code>.</p>
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
    const copyBtn = event.target.closest("[data-copy-url]");
    if (copyBtn && root.contains(copyBtn)) {
      event.preventDefault();
      event.stopPropagation();
      if (copyBtn.disabled) return;
      copyText(copyBtn.dataset.copyUrl || "", { label: copyBtn.dataset.copyLabel || "" });
      return;
    }
    if (event.target.closest("[data-svc-copy-stop]")) return;

    const openBtn = event.target.closest("[data-svc-open]");
    if (openBtn && root.contains(openBtn)) {
      event.preventDefault();
      event.stopPropagation();
      openServiceMonitorUrl(openBtn.dataset.svcOpen);
    }
  });
}

function renderSetupDiskStatItems() {
  const diskState = getDiskStatState();
  return Object.keys(DISK_STAT_LABELS).map((id) => {
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
}

function renderSetupChecklist() {
  const root = document.getElementById("setup-checklist");
  if (!root) return;

  const docker = isDockerDeployment();
  const diskBlock = `
    <div class="setup-checklist-grid setup-checklist-grid--disk">
      ${renderSetupDiskStatItems().join("")}
    </div>`;

  if (docker) {
    root.hidden = false;
    root.innerHTML = diskBlock;
    return;
  }
  root.hidden = false;

  const state = getSetupCheckState();
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

  root.innerHTML = `
    <div class="setup-checklist-grid setup-checklist-grid--checks">
      ${checkItems.join("")}
    </div>
    ${diskBlock}
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

function buildEnvironmentHeaderRows(environment) {
  if (!environment) return [];

  const rows = [];
  const dep = bootstrap?.deployment || {};
  const server = lastServer || bootstrap?.server;

  if (isDockerDeployment()) {
    const project = String(dep.composeProject || "agent-cms").trim();
    const services = (dep.upServices || ["cms", "mcp"]).join(", ");
    const composeFile =
      String(dep.hostComposeFile || "").trim() ||
      String(dep.composeFile || "")
        .trim()
        .replace(/^.*\//, "");
    const stackHint = server?.running
      ? String(server.modeLabel || "online").trim()
      : "offline";

    rows.push(
      renderEnvRow({
        mark: server?.running ? "✓" : "○",
        label: "Docker",
        detail: composeFile || "compose",
        value: `${project} · ${services} · ${stackHint}`,
        status: server?.running ? "ok" : "warn",
        hover: `Docker Compose · ${project} · ${services} · ${stackHint}`
      })
    );
  }

  const platformId = resolveActivePlatformId(environment);
  const hostOsName = hostPlatformDisplayName(platformId);
  const runtimeOs = environment.host?.platformLabel || "—";
  const kernel = environment.host?.release ? `kernel ${environment.host.release}` : "";

  rows.push(
    renderEnvRow({
      mark: "·",
      label: isDockerDeployment() ? "ОС хоста" : "ОС",
      value: hostOsName !== "—" ? hostOsName : runtimeOs,
      detail: isDockerDeployment()
        ? [runtimeOs, kernel].filter(Boolean).join(" · ")
        : kernel || "",
      status: "neutral",
      hover: isDockerDeployment()
        ? `Платформа хоста: ${hostOsName} · runtime Control: ${runtimeOs}${kernel ? ` · ${kernel}` : ""}`
        : `${runtimeOs}${kernel ? ` · ${kernel}` : ""}`
    })
  );

  return rows;
}

function renderEnvironmentRows(environment) {
  if (!envRows) return;

  if (!environment) {
    envRows.innerHTML = "";
    return;
  }

  const headerHtml = buildEnvironmentHeaderRows(environment).join("");
  const bodyRows = buildFullEnvironmentRows(environment);

  let html = headerHtml;
  if (envExpandAll) {
    html += bodyRows.join("");
    html += `<button type="button" class="env-expand-trigger" data-env-expand="0">Свернуть список технологий</button>`;
  } else {
    html += bodyRows.slice(0, ENV_PREVIEW_ROW_COUNT).join("");
    if (bodyRows.length > ENV_PREVIEW_ROW_COUNT) {
      html += `<button type="button" class="env-expand-trigger" data-env-expand="1">Ещё ${bodyRows.length - ENV_PREVIEW_ROW_COUNT} технологий…</button>`;
    } else if (bodyRows.length === 0) {
      html += `<button type="button" class="env-expand-trigger" data-env-expand="1">Показать полный список технологий</button>`;
    }
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
  return { primary, secondary, hostname, platformLabel };
}

function dockerHostChipIconSvg() {
  return `
    <svg class="platform-host-chip-icon-svg platform-host-chip-icon-svg--docker" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <path fill="#2496ED" d="M28 15.5h-2.1v-2.1h-2.1v2.1h-2.1v-2.1h-2.1v2.1h-2.1v-2.1h-2.1v2.1h-2.1v-2.1H11v2.1H8.9v-2.1H6.8v2.1H4.7V18c0 5.2 4.2 9.4 9.4 9.4h3.2c5.7 0 10.3-4.6 10.3-10.3V15.5H28z"/>
      <path fill="#1D7CE8" d="M5.2 14.2c.5 2.8 2.1 5.2 4.4 6.8 2.3 1.6 5.1 2.3 7.9 2.1 2.8-.2 5.4-1.2 7.4-2.9-3.7-.2-6.8-1.6-9.1-4.2-2.3-2.6-3.4-5.8-3.3-9.1-2.2.9-4 2.5-5.1 4.6-.6 1.1-.9 2.3-.8 3.5l-.4-.8z"/>
    </svg>`;
}

function hostPlatformDisplayName(platformId) {
  const card = PLATFORM_CARDS.find((entry) => entry.id === platformId);
  return card?.name || platformId || "—";
}

function renderPlatformDockerChip(environment) {
  const host = environment?.host || {};
  const hostLines = buildPlatformHostChipLines(host);
  const dep = bootstrap?.deployment || {};
  const server = lastServer || bootstrap?.server;
  const project = String(dep.composeProject || "agent-cms").trim();
  const services = (dep.upServices || ["cms", "mcp"]).join(", ");
  const composeFile =
    String(dep.hostComposeFile || "").trim() ||
    String(dep.composeFile || "")
      .trim()
      .replace(/^.*\//, "");
  const container =
    String(dep.containerShort || dep.containerHostname || hostLines.hostname || "").trim() ||
    "—";
  const stackHint = server?.running
    ? String(server.modeLabel || "stack online").trim()
    : "stack offline";
  const title = [
    "Docker Compose",
    `project ${project}`,
    `services ${services}`,
    composeFile ? composeFile : "",
    `container ${container}`
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <div class="platform-host-chip platform-host-chip--docker" title="${escapeAttr(title)}">
      <div class="platform-host-chip-icon platform-host-chip-icon--docker">${dockerHostChipIconSvg()}</div>
      <div class="platform-host-chip-text">
        <span class="platform-host-chip-label">Docker</span>
        <strong>${escapePlatformText(`${project} · ${services}`)}</strong>
        <code>${escapePlatformText(composeFile || "compose")}</code>
        <span class="platform-host-chip-meta platform-host-chip-meta--docker">${escapePlatformText(stackHint)}</span>
      </div>
    </div>`;
}

function renderPlatformOsChip(environment) {
  const host = environment?.host || {};
  const hostLines = buildPlatformHostChipLines(host);
  const platformId = resolveActivePlatformId(environment);
  const hostName = hostPlatformDisplayName(platformId);
  const dep = bootstrap?.deployment || {};
  const composeFile = String(dep.hostComposeFile || "").trim();
  const container =
    String(dep.containerShort || dep.containerHostname || hostLines.hostname || "").trim() ||
    hostLines.primary;
  const runtimeOs = hostLines.platformLabel || "—";
  const icon = platformId
    ? `<img class="platform-host-chip-os-img" src="assets/${PLATFORM_ICON_FILES[platformId] || PLATFORM_ICON_FILES.linux}" alt="" width="32" height="32" decoding="async" />`
    : "";

  if (isDockerDeployment()) {
    const title = [
      "Платформа хоста (AGENT_CMS_DEPLOY_PLATFORM / compose)",
      hostName,
      composeFile,
      `Control runtime: ${runtimeOs}`,
      `container ${container}`
    ]
      .filter(Boolean)
      .join(" · ");

    return `
      <div class="platform-host-chip platform-host-chip--os" title="${escapeAttr(title)}">
        <div class="platform-host-chip-icon platform-host-chip-icon--os">${icon}</div>
        <div class="platform-host-chip-text">
          <span class="platform-host-chip-label">ОС хоста</span>
          <strong>${escapePlatformText(hostName)}</strong>
          <code>${escapePlatformText(composeFile || runtimeOs)}</code>
          <span class="platform-host-chip-meta platform-host-chip-meta--muted">${escapePlatformText(`Control · ${runtimeOs}`)}</span>
        </div>
      </div>`;
  }

  return `
    <div class="platform-host-chip platform-host-chip--os" title="Определено на сервере">
      <div class="platform-host-chip-icon platform-host-chip-icon--os">${icon}</div>
      <div class="platform-host-chip-text">
        <span class="platform-host-chip-label">Хост</span>
        <strong>${escapePlatformText(hostLines.primary)}</strong>
        <code>${escapePlatformText(hostLines.secondary)}</code>
      </div>
    </div>`;
}

function renderPlatformHostChip(environment) {
  if (isDockerDeployment()) {
    return `
      <div class="platform-host-chips">
        ${renderPlatformDockerChip(environment)}
        ${renderPlatformOsChip(environment)}
      </div>`;
  }
  return renderPlatformOsChip(environment);
}

function resolveActivePlatformId(environment) {
  const fromDeploy = String(bootstrap?.deployment?.hostPlatform || "").trim().toLowerCase();
  if (fromDeploy === "mac") return "mac";
  if (fromDeploy === "linux") return "linux";
  if (fromDeploy === "windows") return "windows";

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

function platformCoverSubline() {
  if (isDockerDeployment()) {
    const dep = bootstrap?.deployment || {};
    const file = String(dep.hostComposeFile || dep.composeFile || "").trim();
    const platform = String(dep.hostPlatform || "").trim();
    if (file && platform) {
      return `Docker: активная платформа «${platform}» из ${file} (AGENT_CMS_DEPLOY_PLATFORM или compose).`;
    }
    return "Docker: платформа хоста из compose, не Linux внутри контейнера.";
  }
  return "Один Launcher — разные способы запуска под ОС хоста";
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
  const modeLine = isDockerDeployment()
    ? `${launcherModeLabel()} · Docker compose`
    : launcherModeLabel();

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
          <p class="platform-cover-sub">${escapePlatformText(platformCoverSubline())}</p>
        </div>
        ${renderPlatformHostChip(environment)}
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
  const dockerMeta = document.querySelector(".platform-host-chip-meta--docker");
  if (dockerMeta && isDockerDeployment()) {
    const stackHint = server?.running
      ? String(server.modeLabel || "stack online").trim()
      : "stack offline";
    dockerMeta.textContent = stackHint;
  }

  document.querySelectorAll(".browser-link, .browser-link-copy").forEach((button) => {
    button.disabled = !isRunning;
  });

  const serverActionBusy =
    runningActions.has("server-autostart-enable") ||
    runningActions.has("server-autostart-disable") ||
    runningActions.has("server-start-bg") ||
    runningActions.has("server-start-attached") ||
    runningActions.has("server-stop") ||
    runningActions.has("server-restart") ||
    runningActions.has("server-update");
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
  document.querySelectorAll('[data-action="server-update"]').forEach((button) => {
    button.disabled =
      !isServerUpdateEnabled() || opsLocked || serverActionBusy || runningActions.has("server-update");
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
  if (bootstrap?.environment && isDockerDeployment()) {
    renderPlatformCover(bootstrap.environment);
  }
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
  const title = canOpen ? url : "Сначала поднимите CMS (Docker compose или «Старт» в Control)";
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

function actionButton(
  actionId,
  tone = "default",
  extraClass = "",
  disabled = false,
  labelOverride = "",
  titleOverride = ""
) {
  const label = labelOverride || formatActionButtonContent(actionId);
  const disabledAttr = disabled ? " disabled" : "";
  const durationClass = BUILD_DURATION_HINTS[actionId] ? " has-duration" : "";
  let titleAttr = "";
  if (titleOverride) {
    titleAttr = ` title="${escapeAttr(titleOverride)}"`;
  } else if (BUILD_DURATION_HINTS[actionId]) {
    titleAttr = ` title="Примерное время сборки: ${BUILD_DURATION_HINTS[actionId]}. Прогресс — в журнале внизу."`;
  }
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
  "server-restart": "Рестарт",
  "server-update": "Обновить"
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
  "server-restart": "Тот же режим запуска",
  "server-update": "git pull и пересборка (Docker) или только pull"
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

const SERVER_UPDATE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
    <path d="M12 7v6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
    <path d="M9.5 10.5 12 13l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M8.5 16.5h7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
  </svg>
`;

function serverButton(actionId, tone, disabled = false, hintOverride) {
  const disabledAttr = disabled ? " disabled" : "";
  const title = getServerBtnTitle(actionId);
  const hint = getServerBtnHint(actionId, hintOverride);
  const icon =
    tone === "stop"
      ? SERVER_STOP_ICON
      : tone === "restart"
        ? SERVER_RESTART_ICON
        : tone === "update"
          ? SERVER_UPDATE_ICON
          : SERVER_PLAY_ICON;
  const iconClass =
    tone === "stop"
      ? "server-deck-icon--stop"
      : tone === "restart"
        ? "server-deck-icon--restart"
        : tone === "update"
          ? "server-deck-icon--update"
          : "server-deck-icon--play";
  const badge =
    tone === "start-bg" && isDockerDeployment()
      ? `<span class="server-deck-badge">docker</span>`
      : tone === "start-bg"
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

function isSetupActionDisabled(actionId) {
  if (actionId === "setup-desktop-shortcuts" && !isDesktopShortcutsSupported()) return true;
  if (actionId === "install-deps" || actionId === "setup-certs") {
    return isDockerDeployment() || isWebLauncher();
  }
  return false;
}

function setupButton(actionId, title, hint, disabled = false, disabledTitle = "") {
  const disabledAttr = disabled ? " disabled" : "";
  const titleAttr = disabled
    ? ` title="${escapeAttr(disabledTitle || "Недоступно в этом режиме")}"`
    : "";
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
      singleHttpDoor: true,
      editorHttps: 3000,
      editorHttp: 3000,
      voiceHttps: 3000,
      voiceHttp: 3000,
      commanderHttp: 3000,
      controlHttp: 3000,
      mcpHttp: 3000
    }
  );
}

function joinCmsBaseAndPath(base, testPath) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(testPath || "/");
  const pathPart = p.startsWith("/") ? p : `/${p}`;
  if (pathPart === "/") return `${b}/`;
  return `${b}${pathPart}`;
}

function getEffectiveCmsBaseUrl() {
  const server = lastServer || bootstrap?.server;
  const ports = getPorts();
  const singleDoor = usesSingleHttpDoor(server);

  if (shouldUseCanonicalHttpDoor()) {
    const door =
      getClientDoorHttpOrigin() ||
      getPublicDoorBase() ||
      String(bootstrap?.mcpConnect?.cmsBaseUrl || "").trim().replace(/\/+$/, "");
    if (door) {
      let base = door.replace(/\/+$/, "");
      if (base.startsWith("https:")) base = base.replace(/^https:/, "http:");
      return rewriteUrlHostForClient(base);
    }
  }

  if (isWebLauncher()) {
    return window.location.origin.replace(/\/+$/, "");
  }

  const doorBase = getPublicDoorBase();
  if (doorBase) return rewriteUrlHostForClient(doorBase.replace(/\/+$/, ""));

  const fromProbe = String(server?.urls?.cms || server?.urls?.controlHttp || "").trim();
  if (server?.cms && fromProbe) {
    let base = fromProbe.replace(/\/+$/, "");
    if (singleDoor && base.startsWith("https:")) {
      base = base.replace(/^https:/, "http:");
    }
    return rewriteUrlHostForClient(base);
  }

  if (singleDoor || preferHttpServiceLinks()) {
    const port = ports.editorHttp ?? ports.editorHttps ?? 3000;
    return buildServiceUrl("http", port, "/").replace(/\/+$/, "");
  }

  const mcpUrl = String(bootstrap?.mcpConnect?.cmsBaseUrl || "").trim();
  if (mcpUrl) return rewriteUrlHostForClient(mcpUrl.replace(/\/+$/, ""));

  return buildServiceUrl("https", ports.editorHttps, "/").replace(/\/+$/, "");
}

function usesHttpMcpConnect() {
  const mode = String(bootstrap?.mcpConnect?.mcpConnectMode || "").trim();
  if (mode === "http") return true;
  if (mode === "stdio") return false;
  return isDockerDeployment() || usesSingleHttpDoor(lastServer || bootstrap?.server);
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

function getMcpHttpConnectUrl() {
  const computed = joinCmsBaseAndPath(getEffectiveCmsBaseUrl(), "/app-mcp").replace(/\/+$/, "");
  if (shouldUseCanonicalHttpDoor()) return computed;

  const fromBootstrap = String(bootstrap?.mcpConnect?.mcpHttpUrl || "").trim();
  if (!fromBootstrap) return computed;

  if (usesSingleHttpDoor(lastServer || bootstrap?.server)) {
    try {
      const parsed = new URL(fromBootstrap);
      const ports = getPorts();
      const doorPort = String(ports.editorHttp ?? 3000);
      if (parsed.port === "3443" || parsed.port === String(ports.editorHttps ?? 3443)) {
        return computed;
      }
    } catch {
      return computed;
    }
  }
  return fromBootstrap;
}

function buildMcpConfigObject({ includeToken = false } = {}) {
  const mcp = bootstrap?.mcpConnect || {};
  const url = getMcpHttpConnectUrl();
  const token = includeToken
    ? String(mcp.mcpToken || bootstrap?.mcpToken || "YOUR_MCP_TOKEN")
    : "<AGENT_CMS_MCP_TOKEN>";
  return {
    mcpServers: {
      "agent-cms": {
        url,
        headers: {
          Authorization: `Bearer ${token}`
        }
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
  return joinCmsBaseAndPath(base, testPath);
}

function getCurlCommand(kind) {
  const url = getTestUrl(kind);
  const flags = url.startsWith("https:") ? "-sk" : "-s";
  return `curl ${flags} ${url}`;
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

  const dockerSetupSkip = isDockerDeployment() || isWebLauncher();
  const cards = actions
    .map((action) => {
      const shortcutsOnly =
        action.id === "setup-desktop-shortcuts" && !isDesktopShortcutsSupported();
      const dockerNativeOnly =
        dockerSetupSkip && (action.id === "install-deps" || action.id === "setup-certs");
      let hint = action.description || "";
      if (shortcutsOnly) {
        hint = "Только macOS и Windows — на Linux/VPS не нужно.";
      } else if (dockerNativeOnly) {
        hint =
          action.id === "install-deps"
            ? "В Docker не нужно: зависимости уже в образе. Канон — браузер на :3000 (VPS — Caddy 443)."
            : "В Docker не нужно: dev-сертификаты для legacy npm start. Mac/VPS — HTTP или Caddy HTTPS.";
      }
      const blocked = shortcutsOnly || dockerNativeOnly;
      const blockedTitle = dockerNativeOnly
        ? "В Docker / web Control не нужно — зависимости в образе, HTTPS через Caddy или HTTP :3000"
        : shortcutsOnly
          ? "Только macOS и Windows"
          : "";
      return setupButton(
        action.id,
        SETUP_SHORT_TITLES[action.id] || action.title,
        hint,
        blocked,
        blockedTitle
      );
    })
    .join("");

  return `
    <article class="guide-step">
      <div class="guide-step-marker" aria-hidden="true">1</div>
      <div class="guide-step-body">
        <div class="guide-step-head">
          <h3>Установка</h3>
          <p>${
            isDockerDeployment()
              ? "Docker: шаги ниже для legacy npm start на Mac — в compose уже не актуальны."
              : "Один раз: зависимости проекта и HTTPS-сертификаты для localhost"
          }</p>
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
  const singleDoor = usesSingleHttpDoor(server) || isDockerDeployment();
  const lanIp = mobile.lanIp || bootstrap?.environment?.host?.lanIp || "";
  const voiceUrl =
    mobile.voiceUrl ||
    (singleDoor
      ? buildPublicAppUrl("/app-chat/") || joinCmsBaseAndPath(getEffectiveCmsBaseUrl(), "/app-chat/")
      : lanIp
        ? `https://${lanIp}:${ports.voiceHttps}/`
        : "");
  const mkcertUrl =
    singleDoor
      ? ""
      : mobile.mkcertCaUrl ||
        (lanIp ? `http://${lanIp}:${ports.voiceHttp}/dev/mkcert-root-ca.pem` : "");

  if (isDockerDeployment()) {
    const doorBase = getClientDoorHttpOrigin() || getEffectiveCmsBaseUrl();
    const sample =
      voiceUrl ||
      joinCmsBaseAndPath(doorBase, "/app-chat/") ||
      "http://192.168.x.x:3000/app-chat/";
    return `
    <div class="mobile-voice-block" id="mobile-voice-block">
      <p class="mobile-voice-note">${VOICE_UI_LABEL} на телефоне: подставьте <strong>IP Mac в Wi‑Fi</strong> (не localhost, не 172.x контейнера). Порт как в <code>AGENT_CMS_PUBLIC_URL</code>, путь <code>/app-chat/</code>.</p>
      <div class="mobile-voice-url-row">
        <code class="mobile-voice-url" id="mobile-voice-url">${escapeAttr(sample)}</code>
        <button type="button" class="ghost-btn cmd-btn" data-copy-target="mobile-voice-url"${voiceUrl ? "" : " disabled"}>Копировать</button>
      </div>
      ${!isRunning ? `<p class="mobile-voice-warn">Сначала поднимите CMS.</p>` : ""}
    </div>
  `;
  }

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
      ${!isRunning ? `<p class="mobile-voice-warn">Сначала поднимите CMS.</p>` : ""}
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
  const chatPublic = buildPublicAppUrl("/app-chat/") || buildServiceUrl("http", ports.editorHttp, "/app-chat/");
  const cmdPublic = buildPublicAppUrl("/app-commander/") || buildServiceUrl("http", ports.editorHttp, "/app-commander/");
  const voiceHttps = chatPublic;
  const voiceHttp = chatPublic;
  const commanderHttp = cmdPublic;
  const commanderHttps = cmdPublic;
  const commanderOpenUrl = isRunning ? cmdPublic : cmdPublic;
  const linkDisabled = isRunning ? "" : " disabled";
  const showBrowserLinks = !isDockerDeployment() && !usesSingleHttpDoor(server);
  const browserLinks = !showBrowserLinks
    ? ""
    : `
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
            <code>/app-chat</code>
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
            <code>/app-commander</code>
          </span>
        </button>
        <div class="browser-link-copy-pair">
          <button type="button" class="ghost-btn browser-link-copy" data-copy-url="${escapeAttr(commanderHttp)}" data-copy-label="Commander URL" title="Копировать /app-commander"${linkDisabled}>URL</button>
        </div>
      </div>
    </div>
  `;

  const maintenanceDisabled = maintenanceModeBusy;
  const maintenanceChecked = maintenanceModeEnabled ? " checked" : "";
  const autoStart = server?.autoStart;
  const autostartSupported =
    autoStart?.supported !== false && !isWebLauncher() && !isDockerDeployment();
  const autostartOn = Boolean(autoStart?.enabled);
  const autostartActionId = autostartOn ? "server-autostart-disable" : "server-autostart-enable";
  const autostartTone = autostartOn ? "autostart-on" : "autostart";
  const autostartButton = autostartSupported
    ? serverButton(autostartActionId, autostartTone, false)
    : "";
  const startBgHint = isDockerDeployment()
    ? null
    : isWebLauncher()
      ? "Фоновый start-direct (npm start)"
      : SERVER_BTN_HINTS["server-start-bg"];
  const startAttachedHint = isDockerDeployment()
    ? null
    : isWebLauncher()
      ? "Тот же запуск, пока вкладка открыта"
      : SERVER_BTN_HINTS["server-start-attached"];
  const deckButtons = [
    autostartButton,
    serverButton("server-start-bg", "start-bg", isRunning || opsLocked, startBgHint),
    isDockerDeployment()
      ? ""
      : serverButton("server-start-attached", "start", isRunning || opsLocked, startAttachedHint),
    serverButton("server-stop", "stop", !isRunning || opsLocked),
    isControlActionAvailable("server-restart")
      ? serverButton("server-restart", "restart", !isRunning || opsLocked)
      : "",
    isControlActionAvailable("server-update")
      ? serverButton(
          "server-update",
          "update",
          opsLocked || !isServerUpdateEnabled(),
          isServerUpdateEnabled() ? null : "Пока отключено"
        )
      : ""
  ].filter(Boolean);
  const deckCount = deckButtons.length;
  const deckSizeClass =
    deckCount > 4 && deckCount <= 6 ? ` server-deck--${deckCount}` : deckCount > 6 ? " server-deck--6" : "";
  const serverDeckAria = isDockerDeployment()
    ? "Docker compose: cms и mcp"
    : "Управление сервером";
  const dockerDeployNote = isDockerDeployment()
    ? `<p class="server-docker-note">${escapePlatformText(bootstrap?.deployment?.electronNote || "")}</p>`
    : "";

  const controlBlock = `
    <div class="server-controls">
      ${dockerDeployNote}
      <div class="server-deck${deckSizeClass}" role="group" aria-label="${escapeAttr(serverDeckAria)}">
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
            ${isDockerDeployment() ? "Контейнер CMS (compose)" : "Сервер"}
            <span id="server-status-inline"></span>
          </h3>
          <p>${
            isDockerDeployment()
              ? "Кнопки — docker compose для cms/mcp на этом хосте. Не npm start: Node уже внутри образов. Control-контейнер и (на VPS) Caddy этими кнопками не останавливаются."
              : `Запустите CMS и ${VOICE_UI_LABEL} — без сервера не работают Editor, ${VOICE_UI_LABEL}, Commander и расширение Chrome`
          }</p>
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
          <p>Канон: HTTP MCP на <code>/app-mcp</code> + Bearer <code>AGENT_CMS_MCP_TOKEN</code> (Cursor / Claude Desktop).</p>
        </div>
        <ol class="guide-list">
          <li>Запустите <strong>сервер</strong> (шаг 2)</li>
          <li><strong>Cursor:</strong> Settings → MCP или <code>.cursor/mcp.json</code></li>
          <li><strong>Claude Desktop:</strong> <code>claude_desktop_config.json</code></li>
          <li>Вставьте JSON ниже: <code>url</code> → <code>/app-mcp</code> + <code>Authorization: Bearer …</code></li>
          <li>Удалённый хост — второй коннектор (ниже); полноценное редактирование — позже</li>
          <li>Перезапустите MCP-клиент</li>
        </ol>
        <div class="mcp-instances-control panel-inset" id="mcp-instances-control-root">
          <p class="mcp-config-note">
            Канон: только <strong>HTTP MCP</strong> (<code>/app-mcp</code>). Коннекторы — локальная машина и удалённый сервер; реестр
            <code>instances.json</code> — позже (идеи Q6 сохранены в TODO).
          </p>
          <h4>Коннекторы MCP</h4>
          <p class="mcp-config-note" id="mcp-instances-control-file"></p>
          <div id="mcp-instances-control-list"></div>
          <div class="guide-actions mcp-connectors-actions">
            <button type="button" class="ghost-btn" id="mcp-instances-control-add" disabled title="Скоро">+ Удалённый</button>
            <button type="button" class="ghost-btn" id="mcp-instances-control-reload" disabled title="Скоро">Обновить</button>
            <button type="button" class="ghost-btn" id="mcp-instances-control-save" disabled title="Скоро">Сохранить</button>
          </div>
          <p class="mcp-config-note" id="mcp-instances-control-status" role="status">Просмотр. Редактирование коннекторов временно отключено.</p>
        </div>
        <div class="mcp-config-box">
          <div class="cmd-row">
            <pre class="mcp-config-json" id="mcp-config-json" aria-label="Пример MCP-конфига"></pre>
            <button type="button" class="ghost-btn cmd-btn" data-copy-mcp-config title="Скопировать HTTP MCP (/app-mcp)">Копировать</button>
          </div>
          <p class="mcp-config-note">
            Копировать — URL <code>/app-mcp</code> и плейсхолдер токена; подставьте <code>AGENT_CMS_MCP_TOKEN</code> из .env.
          </p>
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

  node.textContent = JSON.stringify(buildMcpConfigObject({ includeToken: false }), null, 2);
  if (document.getElementById("mcp-instances-control-list")) {
    renderMcpInstancesControlRows();
  }
}

let mcpInstancesControlState = { instances: [] };

function getDefaultMcpInstancesPreview() {
  return [
    {
      id: "local",
      kind: "local",
      label: "local",
      url: "",
      token: "",
      deviceId: "",
      hubUrl: "",
      auto: true
    },
    {
      id: "server",
      kind: "remote",
      label: "VPS",
      url: "https://",
      token: "AGENT_CMS_MCP_TOKEN",
      deviceId: "server",
      hubUrl: ""
    }
  ];
}

function normalizeMcpInstanceForLegacyDisplay(inst) {
  if (!inst || typeof inst !== "object") return inst;
  const row = { ...inst };
  if (!row.token && row.hasToken) row.token = "AGENT_CMS_MCP_TOKEN";
  delete row.hasToken;
  return row;
}

function displayMcpInstanceToken(inst) {
  const token = String(inst?.token || "").trim();
  if (token) return token;
  if (inst?.kind === "remote" || inst?.id === "server") return "AGENT_CMS_MCP_TOKEN";
  return "";
}

function renderMcpConnectorField(label, value, mono = false) {
  const cls = mono ? " mcp-connector-input--mono" : "";
  return `
    <label class="mcp-connector-field">
      <span class="mcp-connector-field-label">${escapeAttr(label)}</span>
      <input class="mcp-connector-input${cls}" type="text" value="${escapeAttr(value)}" disabled />
    </label>`;
}

function renderMcpInstanceRowLegacy(inst, index) {
  const kind = inst.kind || "local";
  const isPinnedLocal = kind === "local" && inst.id === "local";
  const urlValue =
    String(inst.url || "").trim() || (kind === "remote" ? "https://" : "");
  const hubValue = String(inst.hubUrl || "").trim();
  const hubPlaceholder = "https://hub / http://localhost:3001";
  const deviceIdValue =
    kind === "tunnel" ? String(inst.deviceId || inst.id || "").trim() : String(inst.deviceId || "").trim();

  return `
    <fieldset class="mcp-instance-row" data-index="${index}">
      <legend>${escapeAttr(inst.label || inst.id)}</legend>
      <label>id <input name="id" value="${escapeAttr(inst.id || "")}" disabled autocomplete="off" /></label>
      <label>label <input name="label" value="${escapeAttr(inst.label || inst.id || "")}" disabled autocomplete="off" /></label>
      <label class="mcp-instance-kind">kind
        <select name="kind" disabled>
          <option value="local" ${kind === "local" ? "selected" : ""}>local</option>
          <option value="remote" ${kind === "remote" ? "selected" : ""}>remote</option>
          <option value="tunnel" ${kind === "tunnel" ? "selected" : ""}>tunnel</option>
        </select>
      </label>
      <label class="mcp-instance-wide">
        url <span class="mcp-instance-hint">(remote CMS)</span>
        <input name="url" value="${escapeAttr(urlValue)}" disabled autocomplete="off" spellcheck="false" />
      </label>
      <label class="mcp-instance-wide">
        token
        <input name="token" value="${escapeAttr(displayMcpInstanceToken(inst))}" disabled autocomplete="off" spellcheck="false" />
      </label>
      <label>
        deviceId <span class="mcp-instance-hint">(tunnel)</span>
        <input name="deviceId" value="${escapeAttr(deviceIdValue)}" disabled autocomplete="off" spellcheck="false" />
      </label>
      <label class="mcp-instance-wide">
        hubUrl <span class="mcp-instance-hint">(tunnel)</span>
        <input
          name="hubUrl"
          value="${escapeAttr(hubValue)}"
          placeholder="${escapeAttr(hubPlaceholder)}"
          disabled
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      ${
        isPinnedLocal
          ? ""
          : `<button type="button" class="ghost-btn mcp-instance-remove mcp-instance-wide" disabled>Удалить</button>`
      }
    </fieldset>`;
}

function renderMcpInstancesControlRows() {
  const list = document.getElementById("mcp-instances-control-list");
  if (!list) return;

  const localUrl = getMcpHttpConnectUrl().replace(/\/+$/, "");
  const remoteUrl = "https://ваш-домен/app-mcp";
  const rawInstances = (mcpInstancesControlState.instances || []).length
    ? mcpInstancesControlState.instances
    : getDefaultMcpInstancesPreview();
  const instances = rawInstances.map((inst) => normalizeMcpInstanceForLegacyDisplay(inst));
  const legacyRows = instances.map((inst, index) => renderMcpInstanceRowLegacy(inst, index)).join("");

  list.innerHTML = `
    <div class="mcp-instances-control-stack">
      <div class="mcp-connectors-grid">
        <article class="mcp-connector-card" data-connector="local">
          <header class="mcp-connector-head">
            <span class="mcp-connector-badge">local</span>
            <h5>Локальная машина</h5>
          </header>
          <p class="mcp-connector-lead">Docker / Mac · тот же хост, что Editor и Control</p>
          <div class="mcp-connector-fields">
            ${renderMcpConnectorField("MCP URL", localUrl, true)}
            ${renderMcpConnectorField("Токен", "<AGENT_CMS_MCP_TOKEN>", true)}
            ${renderMcpConnectorField("Источник (справочно)", "local — данные в ./workspaces")}
          </div>
        </article>
        <article class="mcp-connector-card" data-connector="remote">
          <header class="mcp-connector-head">
            <span class="mcp-connector-badge mcp-connector-badge--remote">server</span>
            <h5>Удалённый сервер</h5>
          </header>
          <p class="mcp-connector-lead">VPS · HTTPS + Bearer (как в JSON ниже)</p>
          <div class="mcp-connector-fields">
            ${renderMcpConnectorField("MCP URL", remoteUrl, true)}
            ${renderMcpConnectorField("Токен", "<AGENT_CMS_MCP_TOKEN>", true)}
            ${renderMcpConnectorField("Источник (справочно)", "server — хранилище на VPS")}
          </div>
        </article>
      </div>
      <section class="mcp-instances-legacy" aria-labelledby="mcp-instances-legacy-heading">
        <header class="mcp-instances-legacy-head">
          <h5 id="mcp-instances-legacy-heading">Реестр instances.json</h5>
          <span class="mcp-instances-legacy-badge">скоро</span>
        </header>
        <p class="mcp-instances-legacy-lead">Превью полей из Editor / sidecar; редактирование временно отключено.</p>
        <div class="mcp-instances-list">${legacyRows}</div>
      </section>
    </div>
  `;
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
  renderMcpInstancesControlRows();

  if (!window.agentControl?.getMcpInstances) {
    if (fileNode) fileNode.textContent = "Файл instances.json — подключим при редактировании коннекторов.";
    return;
  }

  if (status) status.textContent = "Загрузка реестра…";
  const data = await window.agentControl.getMcpInstances();
  if (!data.ok) {
    if (status) status.textContent = "Просмотр. Редактирование коннекторов временно отключено.";
    if (fileNode) fileNode.textContent = data.error || "instances.json недоступен";
    return;
  }
  if (Array.isArray(data.instances) && data.instances.length) {
    mcpInstancesControlState = {
      instances: data.instances.map((inst) => normalizeMcpInstanceForLegacyDisplay(inst))
    };
    renderMcpInstancesControlRows();
  }
  if (fileNode) fileNode.textContent = data.filePath ? `Файл: ${data.filePath}` : "";
  if (status) status.textContent = "Просмотр. Редактирование коннекторов временно отключено.";
}

async function bindMcpInstancesControl() {
  const root = document.getElementById("mcp-instances-control-root");
  if (!root || root.dataset.bound === "1") {
    if (root) await loadMcpInstancesControl();
    return;
  }
  root.dataset.bound = "1";
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
  const title = canOpen ? url : "Сначала поднимите CMS (Docker compose или «Старт» в Control)";
  return `<button type="button" class="run-btn compact-btn" data-control-open-btn="1" data-tone="primary" data-open-url="${escapeAttr(url || "")}" ${canOpen ? "" : "disabled"} title="${escapeAttr(title)}">Открыть</button>`;
}

function renderControlCard(control) {
  if (!control) return "";

  const electronBuildDisabled = isWebLauncher() && isDockerDeployment();
  const buildTitle = electronBuildDisabled
    ? "Сборка .app только на Mac в Terminal: npm run cms:electron-build (Node на хосте, не в Docker)"
    : undefined;

  return launchTile(
    control,
    `${renderControlOpenUrl()}
     ${actionButton(
       control.distActionId,
       "default",
       "compact-btn",
       electronBuildDisabled,
       electronBuildDisabled ? "Electron" : "",
       buildTitle
     )}`
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
  if (isWebLauncher() || isDockerDeployment()) {
    return null;
  }
  const products = bootstrap?.appProducts || [];
  const commander = bootstrap?.commanderSelf;
  const control = bootstrap?.controlSelf;
  const section = document.createElement("section");
  section.className = "launchpad panel section-block";
  section.dataset.section = "apps";

  section.innerHTML = `
    ${renderSectionCap(
      "Electron · Mac (опционально)",
      "Сервер — Docker + браузер (app-*). Здесь — .app-клиенты: «Открыть» / пересобрать по одному; на Control — «Electron» = npm run cms:electron-build (все четыре .app на хосте)."
    )}
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
  const appsSection = renderAppsSection();
  if (appsSection) actionsRoot.appendChild(appsSection);
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
      bootstrap.appLock = {
        ...(bootstrap.appLock || {}),
        enabled: true,
        sessionActive: true,
        canToggleMaintenance: true
      };
      syncAppLockScreen();
      if (window.agentControl.getBootstrap) {
        let merged = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
          }
          merged = await window.agentControl.getBootstrap();
          bootstrap = merged;
          if (!needsAppLockLogin()) break;
        }
        if (needsAppLockLogin()) {
          bootstrap.appLock = {
            ...(bootstrap.appLock || {}),
            sessionActive: false,
            canToggleMaintenance: false
          };
          syncAppLockScreen();
          throw new Error(
            "Пароль принят, но сессия не сохранилась. Открывайте Control по тому же адресу (http/https), без смешения IP и домена; отключите блокировку cookies для этого сайта."
          );
        }
      }
      appendLog("Вход выполнен.\n");
      syncAppLockScreen();
      await renderLayout();
      await loadEnvFileEditor();
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
      copyText(JSON.stringify(buildMcpConfigObject(), null, 2));
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
  if (isSetupActionDisabled(actionId)) return;
  if (actionId === "server-stop" || actionId === "server-restart" || actionId === "server-update") {
    suppressServerDownNotify = true;
  }
  runningActions.add(actionId);
  updateRunningButtons();
  try {
    const result = await window.agentControl.runAction(actionId);
    if (result?.error) appendLog(`${result.error}\n`, "stderr");

    if (result?.serverDisconnectExpected) {
      if ((actionId === "server-restart" || (actionId === "server-update" && result?.rebuildStarted)) && isWebLauncher()) {
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
        (actionId === "server-stop" || actionId === "server-restart" || actionId === "server-update") &&
        /failed to fetch|networkerror|load failed/i.test(String(error.message || error))
      ) {
        if (actionId === "server-restart" || actionId === "server-update") waitForControlServerReload();
        return;
      }
      throw error;
    }
    await handleServerStatusUpdate(status.server, {
      skipNotify:
        actionId === "server-stop" || actionId === "server-restart" || actionId === "server-update"
    });
    if (actionId === "install-deps" || actionId === "setup-certs") {
      const data = await window.agentControl.refreshBootstrap();
      if (data.setupFlags) bootstrap.setupFlags = data.setupFlags;
      window.__controlBootstrap = bootstrap;
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
  "cms-electron-build": "Electron…",
  "server-autostart-enable": "Автостарт…",
  "server-autostart-disable": "Выключение…",
  "server-start-bg": "Запуск…",
  "server-start-attached": "Запуск…",
  "server-stop": "Остановка…",
  "server-restart": "Перезапуск…",
  "server-update": "Обновление…",
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
    const blocked = isSetupActionDisabled(actionId);
    button.disabled = isRunning || blocked;
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
    if (title) title.textContent = getServerBtnTitle(actionId) || title.textContent;
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
  window.__controlBootstrap = bootstrap;
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
  bindEnvFileEditor();
  await loadEnvFileEditor();
  bindWorkspaceMountsEditor();
  await loadWorkspaceMountsEditor();

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
    if (data.deployment) bootstrap.deployment = data.deployment;
    syncAppLockScreen();
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
