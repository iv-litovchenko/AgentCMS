(function initPlatformStatus(global) {
  function coerceMaintenanceMode(raw) {
    return (
      raw === true ||
      String(raw ?? "").trim().toLowerCase() === "true" ||
      String(raw ?? "").trim() === "1"
    );
  }

  function isMaintenanceApiPayload(data) {
    if (!data || typeof data !== "object") return false;
    if (data.error === "maintenance") return true;
    return String(data.details || "").trim().toLowerCase() === "maintenance";
  }

  async function fetchMaintenanceMode() {
    try {
      const response = await fetch("/api/platform/settings-global", { cache: "no-store" });
      if (!response.ok) return false;
      const data = await response.json();
      return coerceMaintenanceMode(data?.settings?.["maintenance-mode"]);
    } catch {
      return false;
    }
  }

  async function isMaintenanceApiResponse(response) {
    if (!response || response.status !== 503) return false;
    try {
      const data = await response.clone().json();
      return isMaintenanceApiPayload(data);
    } catch {
      return false;
    }
  }

  function redirectToMaintenancePage() {
    const path = String(global.location?.pathname || "");
    if (path === "/maintenance" || path === "/maintenance.html") return;
    global.location.replace("/maintenance");
  }

  function upsertMaintenanceModeLine(content, enabled) {
    const nextValue = enabled ? "true" : "false";
    let text = String(content || "");
    const lineRe = /^(\s*maintenance-mode\s*:\s*).*(?:\r?\n|$)/m;
    if (lineRe.test(text)) {
      return text.replace(lineRe, `maintenance-mode: ${nextValue}\n`);
    }
    if (/^\s*awn_settings:\s*$/m.test(text)) {
      return text.replace(/^\s*awn_settings:\s*$/m, `awn_settings:\n  maintenance-mode: ${nextValue}`);
    }
    const header = text.trim() ? `${text.replace(/\s*$/, "")}\n\n` : "";
    return `${header}awn_settings:\n  maintenance-mode: ${nextValue}\n`;
  }

  async function saveMaintenanceMode(enabled) {
    const readResponse = await fetch("/api/platform/settings-global", { cache: "no-store" });
    if (!readResponse.ok) {
      throw new Error(`Не удалось прочитать настройки (HTTP ${readResponse.status})`);
    }
    const payload = await readResponse.json();
    const nextContent = upsertMaintenanceModeLine(payload?.content || "", enabled);
    const writeResponse = await fetch("/api/platform/settings-global", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: nextContent })
    });
    if (!writeResponse.ok) {
      const errorData = await writeResponse.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${writeResponse.status}`);
    }
    return writeResponse.json();
  }

  function bindMaintenancePage(options = {}) {
    const retryBtn = document.getElementById(options.retryButtonId || "maintenance-retry-btn");
    const adminPanel = document.getElementById(options.adminPanelId || "maintenance-admin-panel");
    const adminToggle = document.getElementById(options.adminToggleId || "maintenance-admin-toggle");
    const adminSaveBtn = document.getElementById(options.adminSaveId || "maintenance-admin-save");
    const adminStatus = document.getElementById(options.adminStatusId || "maintenance-admin-status");

    async function refreshAdminState() {
      if (!adminToggle) return;
      try {
        const active = await fetchMaintenanceMode();
        adminToggle.checked = !active;
        if (adminStatus) {
          adminStatus.textContent = active
            ? "Режим обслуживания включён."
            : "Режим обслуживания выключен — можно вернуться на главную.";
        }
      } catch (error) {
        if (adminStatus) adminStatus.textContent = `Не удалось проверить статус: ${error.message}`;
      }
    }

    retryBtn?.addEventListener("click", async () => {
      retryBtn.disabled = true;
      try {
        const active = await fetchMaintenanceMode();
        if (active) {
          if (adminStatus) adminStatus.textContent = "Платформа всё ещё на обслуживании.";
          return;
        }
        global.location.replace("/");
      } finally {
        retryBtn.disabled = false;
      }
    });

    adminSaveBtn?.addEventListener("click", async () => {
      if (!adminToggle) return;
      adminSaveBtn.disabled = true;
      if (adminStatus) adminStatus.textContent = "Сохраняю…";
      try {
        await saveMaintenanceMode(!adminToggle.checked);
        const active = await fetchMaintenanceMode();
        if (!active) {
          global.location.replace("/");
          return;
        }
        if (adminStatus) adminStatus.textContent = "Сохранено. Режим обслуживания всё ещё включён.";
      } catch (error) {
        if (adminStatus) adminStatus.textContent = `Ошибка: ${error.message}`;
      } finally {
        adminSaveBtn.disabled = false;
      }
    });

    adminPanel?.addEventListener("toggle", () => {
      if (adminPanel.open) void refreshAdminState();
    });

    void refreshAdminState();
  }

  global.PlatformStatus = {
    coerceMaintenanceMode,
    isMaintenanceApiPayload,
    fetchMaintenanceMode,
    isMaintenanceApiResponse,
    redirectToMaintenancePage,
    saveMaintenanceMode,
    bindMaintenancePage
  };
})(window);
