/**
 * Lazy script loader for heavy editor modules (refactor 14).
 */
(function initEditorScriptLoader(global) {
  const cache = new Map();

  function loadScript(src) {
    const url = String(src || "").trim();
    if (!url) return Promise.reject(new Error("empty script url"));
    if (cache.has(url)) return cache.get(url);

    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-agentcms-lazy="${CSS.escape(url)}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.agentcmsLazy = url;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "1";
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      document.head.appendChild(script);
    });

    cache.set(url, promise);
    return promise;
  }

  async function loadAgentRmmLiveBrain() {
    await loadScript("/_resources/vendor/d3.min.js?v=1");
    await loadScript("/editor/js/panels/agent-rmm-live-brain.js?v=4");
    if (typeof global.AgentRmmLiveBrain === "undefined") {
      throw new Error("AgentRmmLiveBrain not available after load");
    }
  }

  global.AgentCmsScriptLoader = {
    loadScript,
    loadAgentRmmLiveBrain
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
