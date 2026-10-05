(function initLanguageToolPanel() {
  const summaryStatsNode = document.getElementById("menu-languagetool-stats");
  const statusNode = document.getElementById("menu-languagetool-status");
  const runBtn = document.getElementById("menu-languagetool-run-btn");
  if (!summaryStatsNode || !statusNode || !runBtn) {
    return;
  }

  async function refreshStatus() {
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

  refreshStatus();
})();
