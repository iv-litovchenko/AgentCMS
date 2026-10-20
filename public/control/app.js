const POLL_MS = 8000;

let lastStatus = null;
let pollTimer = null;
let maintenanceBusy = false;

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function formatProbedAt(ts) {
  const value = Number(ts);
  if (!Number.isFinite(value) || value <= 0) return "";
  try {
    return new Date(value).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return "";
  }
}

function renderCard(svc) {
  const canOpen = svc.state === "on" && Boolean(svc.openUrl);
  const tag = canOpen ? "a" : "article";
  const href = canOpen ? ` href="${escapeAttr(svc.openUrl)}" target="_blank" rel="noopener"` : "";
  const linkClass = canOpen ? " svc-rack-card--link" : "";

  return `
    <${tag}
      class="svc-rack-card${linkClass}"
      data-service-id="${escapeAttr(svc.id)}"
      data-accent="${escapeAttr(svc.accent)}"
      data-state="${escapeAttr(svc.state)}"
      title="${escapeAttr(svc.title)}${canOpen ? " · открыть" : ""}"
      ${href}
    >
      <div class="svc-rack-head">
        <img class="svc-rack-icon" src="assets/${escapeAttr(svc.icon)}" alt="" width="28" height="28" />
        <div class="svc-rack-head-text">
          <strong class="svc-rack-name">${escapeAttr(svc.shortName)}</strong>
          <code class="svc-rack-port">:${escapeAttr(svc.port)}</code>
        </div>
        ${canOpen ? `<span class="svc-rack-go" aria-hidden="true">↗</span>` : ""}
      </div>
      <p class="svc-rack-sub">${escapeAttr(svc.protocol)}${svc.detail ? ` · ${escapeAttr(svc.detail)}` : ""}</p>
      <footer class="svc-rack-foot">
        <span class="svc-rack-led" aria-hidden="true"></span>
        <span class="svc-rack-status">${escapeAttr(svc.label)}</span>
      </footer>
    </${tag}>
  `;
}

function renderBar(services) {
  return services
    .map((svc) => {
      const on = svc.state === "on" ? "1" : "0";
      return `<span class="svc-rack-seg" data-accent="${escapeAttr(svc.accent)}" data-on="${on}" title="${escapeAttr(svc.shortName)}"></span>`;
    })
    .join("");
}

function renderMonitor(status) {
  const root = document.getElementById("services-monitor");
  if (!root) return;

  const services = status?.services || [];
  const online = status?.summary?.online ?? 0;
  const total = status?.summary?.total ?? services.length;
  const probed = formatProbedAt(status?.probedAt);
  const meta = [`${online}/${total} online`];
  if (probed) meta.push(probed);
  meta.push("авто 8 с");

  root.innerHTML = `
    <div class="svc-rack">
      <div class="svc-rack-bar" role="img" aria-label="${online} из ${total} сервисов в сети">${renderBar(services)}</div>
      <p class="svc-rack-meta">${meta.join(" · ")}</p>
      <div class="svc-rack-grid">${services.map(renderCard).join("")}</div>
      <details class="svc-rack-note">
        <summary>Это Web Control на порту Editor</summary>
        <p>${escapeAttr(status?.note || "Ops-пульт в браузере. Desktop Control (.app) — только на Mac рядом с репозиторием.")}</p>
      </details>
    </div>
  `;
}

function renderQuickLinks(status) {
  const root = document.getElementById("quick-links");
  if (!root) return;

  const urls = status?.urls || {};
  const ports = status?.ports || {};
  const items = [
    { label: "Editor", url: urls.editor || "/", port: ports.editorHttps },
    { label: "Chat", url: urls.voice || null, port: ports.voiceHttps },
    { label: "Commander", url: urls.commanderHttps || urls.commanderHttp || "/commander/", port: ports.commanderHttp },
    { label: "MCP ping", url: urls.mcpPing || "/api/agent/mcp-ping", port: ports.editorHttps },
    { label: "MCP HTTP", url: urls.mcpHttp || null, port: ports.mcpHttp },
    { label: "Platform health", url: "/api/platform/health", port: ports.editorHttps }
  ].filter((item) => item.url);

  root.innerHTML = items
    .map(
      (item) => `
      <a class="quick-link" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">
        <span>${escapeAttr(item.label)}</span>
        <code>:${escapeAttr(item.port ?? "—")}</code>
      </a>
    `
    )
    .join("");
}

function applySummaryChip(status) {
  const chip = document.getElementById("summary-chip");
  if (!chip) return;
  const online = status?.summary?.online ?? 0;
  const total = status?.summary?.total ?? 0;
  const allOn = total > 0 && online === total;
  const noneOn = online === 0;
  chip.dataset.state = allOn ? "on" : noneOn ? "off" : "on";
  const value = chip.querySelector(".status-value");
  if (value) {
    value.textContent = allOn ? "Все online" : noneOn ? "Нет сервисов" : `${online}/${total} online`;
  }
}

function maintenanceSummaryText(enabled, appLock) {
  const base = enabled ? "сейчас включён · 503 stub" : "сейчас выключен";
  if (appLock?.enabled && !appLock?.sessionActive) {
    return `${base} · переключатель после входа (app-lock в Editor)`;
  }
  return base;
}

function applyMaintenanceUi(enabled, appLock) {
  const toggle = document.getElementById("maintenance-toggle");
  const card = document.getElementById("maintenance-card");
  const summary = document.getElementById("maintenance-summary");
  const canToggle = appLock?.canToggleMaintenance !== false;
  if (toggle && !maintenanceBusy) {
    toggle.checked = Boolean(enabled);
    toggle.disabled = !canToggle;
  }
  if (card) card.dataset.state = enabled ? "on" : "off";
  if (summary) summary.textContent = maintenanceSummaryText(Boolean(enabled), appLock);
}

function applyFooter(status) {
  const footer = document.getElementById("app-footer");
  if (!footer) return;
  const version = String(status?.version || "").trim();
  footer.textContent = version ? `Agent CMS Control · Web · v${version}` : "Agent CMS Control · Web";
}

function renderAll(status) {
  lastStatus = status;
  renderMonitor(status);
  renderQuickLinks(status);
  applySummaryChip(status);
  applyMaintenanceUi(Boolean(status?.maintenance), status?.appLock);
  applyFooter(status);
}

async function fetchStatus() {
  const response = await fetch("/api/ops/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function refreshStatus(options = {}) {
  const button = document.getElementById("refresh-btn");
  if (options.manual && button) {
    button.disabled = true;
    button.textContent = "…";
  }
  try {
    const status = await fetchStatus();
    renderAll(status);
  } catch (error) {
    const chip = document.getElementById("summary-chip");
    if (chip) {
      chip.dataset.state = "off";
      const value = chip.querySelector(".status-value");
      if (value) value.textContent = "Ошибка";
    }
    console.error("ops status failed", error);
  } finally {
    if (options.manual && button) {
      button.disabled = false;
      button.textContent = "Обновить";
    }
  }
}

async function setMaintenance(enabled) {
  const response = await fetch("/api/ops/maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ enabled: Boolean(enabled) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function bindUi() {
  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    void refreshStatus({ manual: true });
  });

  const toggle = document.getElementById("maintenance-toggle");
  toggle?.addEventListener("change", async () => {
    const next = Boolean(toggle.checked);
    const prev = !next;
    maintenanceBusy = true;
    toggle.disabled = true;
    try {
      const result = await setMaintenance(next);
      applyMaintenanceUi(Boolean(result.enabled), lastStatus?.appLock);
      if (lastStatus) lastStatus.maintenance = Boolean(result.enabled);
    } catch (error) {
      toggle.checked = prev;
      applyMaintenanceUi(prev, lastStatus?.appLock);
      console.error("maintenance toggle failed", error);
    } finally {
      maintenanceBusy = false;
      toggle.disabled = lastStatus?.appLock?.canToggleMaintenance === false;
    }
  });
}

function startPoll() {
  if (pollTimer) window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => void refreshStatus(), POLL_MS);
}

bindUi();
void refreshStatus().then(startPoll);
