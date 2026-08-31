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
  let pingTimer = null;
  let voiceReady = false;
  let lastVoiceUrl = "";
  let loadAttempt = 0;
  const MAX_LOAD_ATTEMPTS = 4;

  function appendCacheBust(url) {
    const value = String(url || "").trim();
    if (!value) return value;
    const sep = value.includes("?") ? "&" : "?";
    return `${value}${sep}_companion=${Date.now()}`;
  }

  function clearPingTimer() {
    if (pingTimer) window.clearInterval(pingTimer);
    pingTimer = null;
  }

  function startVoicePing() {
    clearPingTimer();
    pingTimer = window.setInterval(() => {
      if (voiceReady) {
        clearPingTimer();
        return;
      }
      postToVoiceFrame({ type: "agent-shell-companion:ping" });
    }, 1500);
  }

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
      DEFAULT_VOICE_BASE_URL: "https://localhost:3488",
      buildExtensionShellUrl(voiceBase, agentId) {
        const base = String(voiceBase || "https://localhost:3488").replace(/\/$/, "");
        const agent = String(agentId || "").trim();
        if (!agent) return `${base}/?embed=1&companion=1`;
        return `${base}/${encodeURIComponent(agent)}/extension/`;
      }
    };
    return globalThis.CompanionUrls;
  }

  const { DEFAULT_CMS_BASE_URL, DEFAULT_VOICE_BASE_URL, buildExtensionShellUrl } = ensureCompanionUrls();

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

  async function resolveShellTargets() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_GET_SHELL_URL" });
        if (response?.shellUrl) {
          return {
            shellUrl: response.shellUrl,
            voiceReachable: response.voiceReachable !== false
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
    const shellUrl = buildExtensionShellUrl(DEFAULT_VOICE_BASE_URL, agentId);
    return { shellUrl, voiceReachable: true };
  }

  function clearLoadTimer() {
    if (loadTimer) window.clearTimeout(loadTimer);
    loadTimer = null;
  }

  function scheduleLoadWatchdog(shellUrl, voiceReachable) {
    clearLoadTimer();
    loadTimer = window.setTimeout(() => {
      if (voiceReady) return;
      if (loadAttempt < MAX_LOAD_ATTEMPTS) {
        setStatus(`Повторное подключение (${loadAttempt + 1}/${MAX_LOAD_ATTEMPTS})…`, "warn");
        void loadShellFrame(true, { retry: true });
        return;
      }
      if (!voiceReachable) {
        setStatus(
          `Voice не отвечает (${shellUrl.replace(/^https?:\/\//, "")}). Запустите npm run start:https и нажмите «Обновить».`,
          "error"
        );
        return;
      }
      setStatus(
        "Не загрузилось? Нажмите «Открыть Voice» → примите сертификат → «Обновить».",
        "warn"
      );
    }, 4000);
  }

  async function loadShellFrame(force = false, { retry = false } = {}) {
    if (!frame) {
      setStatus("iframe #shell-frame не найден", "error");
      return;
    }

    if (!retry) {
      loadAttempt = 0;
    } else {
      loadAttempt += 1;
    }

    voiceReady = false;
    clearPingTimer();
    if (!retry) {
      setStatus("Подключение к Agent CMS Voice…");
    }

    try {
      const { shellUrl, voiceReachable } = await resolveShellTargets();
      lastVoiceUrl = shellUrl;

      if (urlLabel) {
        urlLabel.textContent = shellUrl.replace(/^https?:\/\//, "");
        urlLabel.title = shellUrl;
      }

      if (!voiceReachable && !retry) {
        setStatus(
          `Voice недоступен (${shellUrl.replace(/^https?:\/\//, "")}). Запустите npm run start:https`,
          "error"
        );
      }

      loadedOnce = true;
      frame.src = appendCacheBust(shellUrl);
      scheduleLoadWatchdog(shellUrl, voiceReachable);
      startVoicePing();
      if (voiceReachable && !retry) setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось загрузить Shell", "error");
    }
  }

  async function openVoiceTab() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        await sendRuntimeMessage({ type: "COMPANION_OPEN_VOICE_TAB" });
        setStatus("Voice открыт во вкладке — примите сертификат, если Chrome спросит", "warn");
        return;
      } catch {
        // fall through
      }
    }
    const url = lastVoiceUrl || buildExtensionShellUrl(DEFAULT_VOICE_BASE_URL, "");
    chrome.tabs?.create?.({ url, active: true });
    setStatus("Voice открыт во вкладке — примите сертификат, если Chrome спросит", "warn");
  }

  frame?.addEventListener("load", () => {
    if (voiceReady) clearLoadTimer();
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

  function postToVoiceFrame(payload) {
    if (!frame?.contentWindow || !payload || typeof payload !== "object") return;
    frame.contentWindow.postMessage(payload, "*");
  }

  async function resolvePickerTabContext() {
    const win =
      (await chrome.windows?.getLastFocused?.({ populate: false }).catch(() => null)) ||
      (await chrome.windows?.getCurrent?.().catch(() => null));
    const windowId = Number(win?.id);
    let tabId = 0;

    if (Number.isFinite(windowId) && windowId > 0) {
      const tabs = await chrome.tabs?.query?.({ active: true, windowId }).catch(() => []);
      const tab = tabs?.find((item) => {
        const url = String(item?.url || "");
        return url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://");
      });
      tabId = Number(tab?.id) || 0;
    }

    if (!tabId) {
      const [fallbackTab] = (await chrome.tabs?.query?.({ active: true, lastFocusedWindow: true }).catch(() => [])) || [];
      tabId = Number(fallbackTab?.id) || 0;
    }

    return {
      tabId,
      windowId: Number.isFinite(windowId) && windowId > 0 ? windowId : 0
    };
  }

  async function registerPanelTab() {
    const ctx = await resolvePickerTabContext();
    if (!ctx.tabId || !ctx.windowId) return;
    try {
      await sendRuntimeMessage({
        type: "COMPANION_REGISTER_PANEL",
        tabId: ctx.tabId,
        windowId: ctx.windowId
      });
    } catch {
      // ignore
    }
  }

  async function relayPagePickerSet(active) {
    const ctx = await resolvePickerTabContext();
    try {
      const response = await sendRuntimeMessage({
        type: "COMPANION_PAGE_PICKER_SET",
        active: Boolean(active),
        tabId: ctx.tabId,
        windowId: ctx.windowId
      });
      if (response?.ok === false) {
        throw new Error(response.error || "picker failed");
      }
      if (active) {
        setStatus("Кликните по блоку на вкладке сайта · Esc — выключить", "warn");
      } else if (voiceReady) {
        setStatus("");
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Page picker: откройте вкладку сайта и обновите её (F5)",
        "warn"
      );
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== frame?.contentWindow) return;

    if (event.data?.type === "agent-shell-companion:voice-loaded") {
      voiceReady = true;
      loadAttempt = 0;
      clearLoadTimer();
      clearPingTimer();
      setStatus("");
      return;
    }
    if (event.data?.type === "agent-cms-voice:page-picker-set") {
      void relayPagePickerSet(Boolean(event.data.active));
      return;
    }
    if (event.data?.type !== "agent-cms-voice:agent-selected") return;
    const agentId = String(event.data.agentId || "").trim();
    if (!agentId) return;
    void writeSettings({ agentId, _migratedFromSync: true }).then(() => loadShellFrame(true));
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "COMPANION_VOICE_TAB_READY") {
      if (!voiceReady) {
        setStatus("Voice открыт во вкладке — подключаем Side Panel…", "warn");
        void loadShellFrame(true);
      }
      return;
    }
    if (message?.type === "COMPANION_PAGE_PICKER_STATE") {
      postToVoiceFrame({ type: "agent-cms-voice:page-picker-state", active: Boolean(message.active) });
      return;
    }
    if (message?.type === "COMPANION_COMPOSE_INSERT") {
      const text = String(message.text || "").trim();
      if (!text) return;
      postToVoiceFrame({
        type: "agent-cms-voice:compose-insert",
        text,
        join: message.join || "newline"
      });
    }
  });

  void registerPanelTab();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void registerPanelTab();
    if (!voiceReady) void loadShellFrame(true);
  });
  void loadShellFrame();
})();
