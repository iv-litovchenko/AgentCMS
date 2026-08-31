(function initCompanionSidePanel() {
  "use strict";

  const frame = document.getElementById("shell-frame");
  const retryBtn = document.getElementById("retry-btn");
  const openTabBtn = document.getElementById("open-tab-btn");
  const optionsLink = document.getElementById("options-link");
  const urlLabel = document.getElementById("shell-url-label");
  const statusNode = document.getElementById("sidepanel-status");

  let loadedOnce = false;
  let loadTimer = null;
  let lastVoiceUrl = "";
  let lastPanelUrl = "";

  function setStatus(text, kind) {
    if (!statusNode) return;
    statusNode.textContent = String(text || "");
    statusNode.dataset.kind = kind || "";
    statusNode.classList.toggle("hidden", !text);
  }

  function ensureCompanionUrls() {
    if (globalThis.CompanionUrls) return globalThis.CompanionUrls;
    globalThis.CompanionUrls = {
      DEFAULT_CMS_BASE_URL: "https://localhost:3443",
      buildShellFrameUrl(cmsBase, agentId) {
        const base = "https://localhost:3488";
        const agent = String(agentId || "").trim();
        if (!agent) return `${base}/?embed=1&companion=1`;
        return `${base}/${encodeURIComponent(agent)}/extension/`;
      }
    };
    return globalThis.CompanionUrls;
  }

  const { DEFAULT_CMS_BASE_URL, buildShellFrameUrl } = ensureCompanionUrls();

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome?.runtime?.sendMessage) {
          reject(new Error("runtime.sendMessage unavailable"));
          return;
        }
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || "runtime error"));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function readSettings() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_GET_SETTINGS" });
        if (response && typeof response === "object" && !response.error) return response;
      } catch {
        // fall through
      }
    }
    if (globalThis.CompanionStorage?.local) {
      return CompanionStorage.local().get(["cmsBaseUrl", "agentId", "_migratedFromSync"]);
    }
    return { cmsBaseUrl: DEFAULT_CMS_BASE_URL, agentId: "" };
  }

  async function writeSettings(settings) {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_SAVE_SETTINGS", settings });
        if (response?.ok === false) throw new Error(response.error || "save failed");
        return;
      } catch {
        // fall through
      }
    }
    if (globalThis.CompanionStorage?.local) {
      await CompanionStorage.local().set(settings);
    }
  }

  function buildPanelWrapperUrl(voiceUrl) {
    if (chrome?.runtime?.getURL) {
      return `${chrome.runtime.getURL("panel-host.html")}?url=${encodeURIComponent(voiceUrl)}`;
    }
    return voiceUrl;
  }

  async function resolveShellTargets() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_GET_SHELL_URL" });
        if (response?.panelUrl && response?.shellUrl) {
          return { shellUrl: response.shellUrl, panelUrl: response.panelUrl };
        }
        if (response?.shellUrl) {
          return {
            shellUrl: response.shellUrl,
            panelUrl: buildPanelWrapperUrl(response.shellUrl)
          };
        }
        if (response?.error) throw new Error(response.error);
      } catch {
        // fall through to local defaults
      }
    }

    const stored = await readSettings();
    const cmsBase = String(stored.cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
    const agentId = String(stored.agentId || "").trim();
    const shellUrl = buildShellFrameUrl(cmsBase, agentId);
    return { shellUrl, panelUrl: buildPanelWrapperUrl(shellUrl) };
  }

  function scheduleLoadHint() {
    if (loadTimer) window.clearTimeout(loadTimer);
    loadTimer = window.setTimeout(() => {
      setStatus(
        "Панель пустая? Нажмите «Вкладка» — Chrome часто блокирует localhost в iframe. Сначала откройте Voice во вкладке и примите сертификат.",
        "warn"
      );
    }, 4000);
  }

  async function loadShellFrame(force = false) {
    if (!frame) {
      setStatus("iframe #shell-frame не найден", "error");
      return;
    }

    setStatus("Подключение к Agent CMS Voice…");

    try {
      const { shellUrl, panelUrl } = await resolveShellTargets();
      lastVoiceUrl = shellUrl;
      lastPanelUrl = panelUrl;

      if (urlLabel) {
        urlLabel.textContent = shellUrl.replace(/^https?:\/\//, "");
        urlLabel.title = shellUrl;
      }

      const currentSrc = frame.getAttribute("src") || "";
      if (!force && loadedOnce && currentSrc === panelUrl) {
        setStatus("");
        return;
      }

      loadedOnce = true;
      frame.src = panelUrl;
      scheduleLoadHint();
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось загрузить Shell", "error");
    }
  }

  async function openVoiceTab() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        await sendRuntimeMessage({ type: "COMPANION_OPEN_VOICE_TAB" });
        return;
      } catch {
        // fall through
      }
    }
    const url = lastVoiceUrl || buildShellFrameUrl(DEFAULT_CMS_BASE_URL, "");
    chrome.tabs?.create?.({ url, active: true });
  }

  frame?.addEventListener("load", () => {
    if (loadTimer) window.clearTimeout(loadTimer);
    setStatus("");
  });

  retryBtn?.addEventListener("click", () => {
    void loadShellFrame(true);
  });

  openTabBtn?.addEventListener("click", () => {
    void openVoiceTab();
  });

  optionsLink?.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage?.();
  });

  if (globalThis.CompanionStorage?.onChanged) {
    try {
      CompanionStorage.onChanged().addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.cmsBaseUrl || changes.agentId) void loadShellFrame(true);
      });
    } catch {
      // ignore
    }
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "agent-shell-companion:voice-loaded") {
      if (loadTimer) window.clearTimeout(loadTimer);
      setStatus("");
      return;
    }
    if (event.data?.type !== "agent-cms-voice:agent-selected") return;
    const agentId = String(event.data.agentId || "").trim();
    if (!agentId) return;
    void writeSettings({ agentId, _migratedFromSync: true }).then(() => loadShellFrame(true));
  });

  void loadShellFrame();
})();
