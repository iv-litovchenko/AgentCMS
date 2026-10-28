(function initLanguageToolPanel() {
  const summaryStatsNode = document.getElementById("menu-languagetool-stats");
  const statusNode = document.getElementById("menu-languagetool-status");
  const runBtn = document.getElementById("menu-languagetool-run-btn");
  if (!summaryStatsNode || !statusNode || !runBtn) {
    return;
  }

  function isLandingHomeView() {
    return Boolean(document.getElementById("app-root")?.classList.contains("app-landing-view"));
  }

  function canRefreshLanguageToolStatus() {
    return !isLandingHomeView() && typeof buildApiUrl === "function";
  }

  async function refreshStatus() {
    if (!canRefreshLanguageToolStatus()) {
      summaryStatsNode.textContent = "—";
      summaryStatsNode.classList.add("is-empty");
      summaryStatsNode.classList.remove("is-error");
      statusNode.textContent = isLandingHomeView()
        ? "Доступно после входа в workspace"
        : "Выберите workspace";
      return;
    }
    try {
      const response = await fetch(buildApiUrl("/api/workspace-index/monitor"));
      const monitor = await response.json();
      if (!response.ok) throw new Error(monitor.error || response.statusText);

      const pageCount = Number(monitor?.storage?.recordCount) || 0;
      const parts = [];
      if (pageCount > 0) parts.push(`${pageCount} страниц`);
      parts.push("заглушка");
      summaryStatsNode.textContent = parts.join(" · ");
      summaryStatsNode.classList.toggle("is-empty", !pageCount);
      summaryStatsNode.classList.remove("is-error");

      if (!monitor?.storage?.ready) {
        statusNode.textContent = "Сначала соберите индекс полей — по нему считаем объём текста для проверки.";
        return;
      }

      statusNode.textContent =
        `Готово к проверке ~${pageCount} страниц. Сервер проверки пока не подключён — кнопка появится позже.`;
    } catch (error) {
      summaryStatsNode.textContent = "ошибка";
      summaryStatsNode.classList.add("is-error");
      statusNode.textContent = String(error.message || error);
    }
  }

  window.addEventListener("header-index-popover-open", () => {
    void refreshStatus();
  });

  window.LanguageToolPanel = { refreshStatus };
})();
