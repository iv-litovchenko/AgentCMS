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

  function bindMaintenancePage(options = {}) {
    const retryBtn = document.getElementById(options.retryButtonId || "maintenance-retry-btn");
    if (!retryBtn || retryBtn.dataset.bound) return;
    retryBtn.dataset.bound = "1";

    retryBtn.addEventListener("click", async () => {
      retryBtn.disabled = true;
      try {
        const active = await fetchMaintenanceMode();
        if (active) return;
        if (typeof options.onRecovered === "function") {
          options.onRecovered();
          return;
        }
        global.location.replace("/");
      } finally {
        retryBtn.disabled = false;
      }
    });
  }

  global.PlatformStatus = {
    coerceMaintenanceMode,
    isMaintenanceApiPayload,
    fetchMaintenanceMode,
    isMaintenanceApiResponse,
    redirectToMaintenancePage,
    bindMaintenancePage
  };
})(window);
