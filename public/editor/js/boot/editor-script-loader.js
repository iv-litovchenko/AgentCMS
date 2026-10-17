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

  function loadStylesheet(href) {
    const url = String(href || "").trim();
    if (!url) return Promise.reject(new Error("empty stylesheet url"));
    const cacheKey = `css:${url}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`link[data-agentcms-lazy="${CSS.escape(url)}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.dataset.agentcmsLazy = url;
      link.addEventListener(
        "load",
        () => {
          link.dataset.loaded = "1";
          resolve();
        },
        { once: true }
      );
      link.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      document.head.appendChild(link);
    });

    cache.set(cacheKey, promise);
    return promise;
  }

  async function loadMermaid() {
    await loadScript("/_resources/vendor/mermaid.min.js");
    if (typeof global.mermaid?.initialize !== "function") {
      throw new Error("mermaid not available after load");
    }
  }

  async function loadToastUiEditor() {
    await loadStylesheet("/_resources/vendor/toastui-editor.css");
    await loadScript("/_resources/vendor/toastui-editor-all.min.js");
    const EditorClass = global.toastui?.Editor || global.Editor;
    if (typeof EditorClass !== "function") {
      throw new Error("toastui Editor not available after load");
    }
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
    loadStylesheet,
    loadMermaid,
    loadToastUiEditor,
    loadAgentRmmLiveBrain
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
