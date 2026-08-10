(function initSemanticIndexPanel() {
  const statsNode = document.getElementById("menu-semantic-index-stats");
  const statusNode = document.getElementById("menu-semantic-index-status");
  const rebuildBtn = document.getElementById("menu-semantic-index-rebuild-btn");
  if (!statsNode || !statusNode || !rebuildBtn) return;

  const ACTIVE_AGENT_STORAGE_KEY = "agentcms.activeAgent.v1";

  function getActiveAgentId() {
    const urlAgent = new URLSearchParams(window.location.search).get("agent");
    if (urlAgent) return urlAgent;
    try {
      return localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY) || "main";
    } catch {
      return "main";
    }
  }

  function buildApiUrl(path, params = {}) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("agent", getActiveAgentId());
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  function formatStats(data) {
    if (!data?.ready) return "нет индекса";
    return `${data.fileCount || 0} файлов · ${data.chunkCount || 0} фрагм.`;
  }

  function formatStatus(data) {
    if (!data?.ready) return data?.hint || "Индекс не построен.";
    const built = data.builtAt ? new Date(data.builtAt).toLocaleString("ru-RU") : "—";
    return `Модель: ${data.model || "hash-tfidf-v1"} · offline · обновлён ${built}`;
  }

  async function refreshStatus() {
    try {
      const response = await fetch(buildApiUrl("/api/search/semantic/status"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      statsNode.textContent = formatStats(data);
      statsNode.classList.toggle("is-empty", !data.ready);
      statsNode.classList.remove("is-error");
      statusNode.textContent = formatStatus(data);
    } catch (error) {
      statsNode.textContent = "ошибка";
      statsNode.classList.add("is-error");
      statusNode.textContent = String(error.message || error);
    }
  }

  rebuildBtn.addEventListener("click", async () => {
    rebuildBtn.disabled = true;
    rebuildBtn.classList.add("is-loading");
    statusNode.textContent = "Индексация…";
    try {
      const response = await fetch(buildApiUrl("/api/search/semantic/reindex"), { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      statusNode.textContent = `Готово: ${data.fileCount} файлов, ${data.chunkCount} фрагментов.`;
      await refreshStatus();
    } catch (error) {
      statusNode.textContent = String(error.message || error);
    } finally {
      rebuildBtn.disabled = false;
      rebuildBtn.classList.remove("is-loading");
    }
  });

  refreshStatus();
})();
