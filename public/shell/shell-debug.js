const MAX_ENTRIES = 500;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function describeElement(el) {
  if (!el || el.nodeType !== 1) return String(el);
  const parts = [el.tagName.toLowerCase()];
  if (el.id) parts.push(`#${el.id}`);
  const cls = [...(el.classList || [])].slice(0, 4).join(".");
  if (cls) parts.push(`.${cls}`);
  for (const attr of ["href", "src", "name", "type", "value", "data-path", "data-node-path"]) {
    const value = el.getAttribute?.(attr);
    if (value) parts.push(`${attr}=${value.slice(0, 80)}`);
  }
  const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 72);
  if (text) parts.push(`«${text}»`);
  return parts.join(" ");
}

export function createShellDebugLog({ storageKey = "agentcms.shell.debugLog.v1" } = {}) {
  let enabled = false;
  let panelOpen = false;
  let panel = null;
  let logBody = null;
  let toggleBtn = null;
  let clickListener = null;
  let proactiveTimer = null;
  const entries = [];

  function renderEntry(entry) {
    if (!logBody) return;
    const row = document.createElement("div");
    row.className = "shell-debug-entry";
    row.dataset.category = entry.category;

    const meta = document.createElement("div");
    meta.className = "shell-debug-entry-meta";
    meta.textContent = `${formatTime(entry.ts)} · ${entry.category}`;

    const msg = document.createElement("div");
    msg.className = "shell-debug-entry-msg";
    msg.textContent = entry.message;

    row.append(meta, msg);

    if (entry.detail != null && entry.detail !== "") {
      const detail = document.createElement("pre");
      detail.className = "shell-debug-entry-detail";
      detail.textContent =
        typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail, null, 2);
      row.append(detail);
    }

    logBody.appendChild(row);
  }

  function log(category, message, detail) {
    const entry = {
      ts: Date.now(),
      category: String(category || "shell"),
      message: String(message || ""),
      detail: detail ?? null
    };
    entries.push(entry);
    while (entries.length > MAX_ENTRIES) entries.shift();
    if (!enabled || !logBody) return;
    renderEntry(entry);
    logBody.scrollTop = logBody.scrollHeight;
  }

  function bindClickProbe(on) {
    if (clickListener) {
      document.removeEventListener("click", clickListener, true);
      clickListener = null;
    }
    if (!on) return;
    clickListener = (event) => {
      const target = event.target;
      if (target?.closest?.(".shell-debug-panel, #shell-debug-btn")) return;
      log("click", describeElement(target), { x: event.clientX, y: event.clientY });
    };
    document.addEventListener("click", clickListener, true);
  }

  function setEnabled(on, { persist = true } = {}) {
    enabled = Boolean(on);
    panelOpen = enabled;
    if (persist) {
      try {
        localStorage.setItem(storageKey, enabled ? "1" : "0");
      } catch {
        // ignore
      }
    }
    document.body.classList.toggle("shell-debug-active", enabled);
    panel?.classList.toggle("hidden", !panelOpen);
    panel?.setAttribute("aria-hidden", panelOpen ? "false" : "true");
    toggleBtn?.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggleBtn?.classList.toggle("is-active", enabled);
    bindClickProbe(enabled);
    if (enabled && logBody) {
      logBody.innerHTML = "";
      for (const entry of entries) renderEntry(entry);
      logBody.scrollTop = logBody.scrollHeight;
      log("debug", "Журнал включён");
    }
  }

  function toggle() {
    setEnabled(!enabled);
  }

  function clear() {
    entries.length = 0;
    if (logBody) logBody.innerHTML = "";
    log("debug", "Журнал очищен");
  }

  function mount({ btn, panel: panelNode, clearBtn, closeBtn } = {}) {
    toggleBtn = btn || null;
    panel = panelNode || document.getElementById("shell-debug-panel");
    logBody = panel?.querySelector("#shell-debug-log") || document.getElementById("shell-debug-log");

    try {
      enabled = localStorage.getItem(storageKey) === "1";
    } catch {
      enabled = false;
    }

    toggleBtn?.addEventListener("click", toggle);
    clearBtn?.addEventListener("click", clear);
    closeBtn?.addEventListener("click", () => setEnabled(false));

    if (enabled) setEnabled(true, { persist: false });
  }

  function watchProactive(shellProactive, intervalMs = 15000) {
    if (proactiveTimer) window.clearInterval(proactiveTimer);
    proactiveTimer = window.setInterval(() => {
      if (!enabled || !shellProactive?.getBlockReason) return;
      const reason = shellProactive.getBlockReason();
      log("proactive", reason === "ready" ? "Готов к срабатыванию" : `Заблокировано: ${reason}`);
    }, intervalMs);
  }

  return {
    log,
    mount,
    setEnabled,
    toggle,
    clear,
    isEnabled: () => enabled,
    watchProactive
  };
}
