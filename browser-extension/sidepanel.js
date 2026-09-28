(function initCompanionSidePanel() {
  "use strict";

  const frame = document.getElementById("shell-frame");
  const retryBtn = document.getElementById("retry-btn");
  const openTabBtn = document.getElementById("open-tab-btn");
  const optionsLink = document.getElementById("options-link");
  const fileHubBtn = document.getElementById("file-hub-btn");
  const urlLabel = document.getElementById("shell-url-label");

  let lastVoiceUrl = "";

  function ensureCompanionUrls() {
    if (globalThis.CompanionUrls) return globalThis.CompanionUrls;
    globalThis.CompanionUrls = {
      DEFAULT_CMS_BASE_URL: "https://localhost:3443",
      DEFAULT_VOICE_BASE_URL: "https://localhost:3488",
      buildExtensionShellUrl(voiceBase, agentId) {
        const base = String(voiceBase || "https://localhost:3488").replace(/\/$/, "");
        const agent = String(agentId || "").trim();
        if (!agent) return `${base}/?companion=1`;
        return `${base}/${encodeURIComponent(agent)}/extension/?companion=1`;
      },
      buildVoiceShellTabUrl(voiceBase, agentId) {
        const base = String(voiceBase || "https://localhost:3488").replace(/\/$/, "");
        const agent = String(agentId || "").trim();
        if (!agent) return `${base}/`;
        return `${base}/${encodeURIComponent(agent)}/`;
      }
    };
    return globalThis.CompanionUrls;
  }

  const { DEFAULT_CMS_BASE_URL, DEFAULT_VOICE_BASE_URL, buildExtensionShellUrl, buildVoiceShellTabUrl } =
    ensureCompanionUrls();

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

  async function resolveShellUrl() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_GET_SHELL_URL" });
        if (response?.shellUrl) return response.shellUrl;
        if (response?.error) throw new Error(response.error);
      } catch {
        // fall through
      }
    }

    const stored = await readSettings();
    const agentId = String(stored.agentId || "").trim();
    return buildExtensionShellUrl(DEFAULT_VOICE_BASE_URL, agentId);
  }

  function stripReloadNonce(url) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete("_asc_reload");
      return parsed.toString();
    } catch {
      return String(url || "");
    }
  }

  function withReloadNonce(url) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("_asc_reload", String(Date.now()));
      return parsed.toString();
    } catch {
      return String(url || "");
    }
  }

  async function loadShellFrame(force = false) {
    if (!frame) return;

    const shellUrl = await resolveShellUrl();
    lastVoiceUrl = shellUrl;

    if (urlLabel) {
      urlLabel.textContent = shellUrl.replace(/^https?:\/\//, "");
      urlLabel.title = shellUrl;
    }

    const currentSrc = stripReloadNonce(frame.getAttribute("src") || "");
    if (force) {
      frame.src = withReloadNonce(shellUrl);
      return;
    }
    if (currentSrc === shellUrl) return;

    frame.src = shellUrl;
  }

  function releaseRetryBtnBusy() {
    if (!retryBtn) return;
    retryBtn.disabled = false;
    retryBtn.classList.remove("is-busy");
  }

  function announceSurfaceHost() {
    try {
      frame?.contentWindow?.postMessage(
        { type: "agent-cms-voice:surface-host", host: "chrome-side-panel" },
        "*"
      );
    } catch {
      // ignore
    }
  }

  async function resolveVoiceTabUrl() {
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_GET_SHELL_URL" });
        if (response?.tabUrl) return response.tabUrl;
      } catch {
        // fall through
      }
    }

    const stored = await readSettings();
    const agentId = String(stored.agentId || "").trim();
    return buildVoiceShellTabUrl(DEFAULT_VOICE_BASE_URL, agentId);
  }

  async function openVoiceTab() {
    const url = await resolveVoiceTabUrl();
    if (globalThis.CompanionStorage?.hasRuntimeMessaging?.()) {
      try {
        const response = await sendRuntimeMessage({ type: "COMPANION_OPEN_VOICE_TAB" });
        if (response?.ok !== false) return;
      } catch {
        // fall through
      }
    }
    try {
      await chrome.tabs.create({ url, active: true });
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  retryBtn?.addEventListener("click", () => {
    if (retryBtn.disabled) return;
    retryBtn.disabled = true;
    retryBtn.classList.add("is-busy");
    void loadShellFrame(true).catch(() => {
      releaseRetryBtnBusy();
    });
  });

  openTabBtn?.addEventListener("click", () => {
    void openVoiceTab();
  });

  optionsLink?.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage?.();
  });

  fileHubBtn?.addEventListener("click", () => {
    postToVoiceFrame({ type: "agent-cms-voice:file-hub", action: "toggle" });
  });

  window.addEventListener("message", (event) => {
    if (event.source !== frame?.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "agent-cms-voice:file-hub-state") return;
    const open = Boolean(data.open);
    fileHubBtn?.classList.toggle("is-active", open);
    fileHubBtn?.setAttribute("aria-pressed", open ? "true" : "false");
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
    await sendRuntimeMessage({
      type: "COMPANION_PAGE_PICKER_SET",
      active: Boolean(active),
      tabId: ctx.tabId,
      windowId: ctx.windowId
    });
  }

  async function relayPageSnapshotRequest(requestId) {
    await registerPanelTab();
    const ctx = await resolvePickerTabContext();
    try {
      const response = await sendRuntimeMessage({
        type: "COMPANION_PAGE_SNAPSHOT_REQUEST",
        requestId,
        tabId: ctx.tabId,
        windowId: ctx.windowId
      });
      return response && typeof response === "object" ? response : { ok: false };
    } catch (error) {
      return { ok: false, error: error.message || String(error) };
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== frame?.contentWindow) return;
    if (event.data?.type === "agent-cms-voice:page-snapshot-request") {
      const requestId = String(event.data.requestId || "").trim();
      if (!requestId) return;
      void relayPageSnapshotRequest(requestId).then((response) => {
        postToVoiceFrame({
          type: "agent-cms-voice:page-snapshot-response",
          requestId,
          ok: Boolean(response?.ok && response?.snapshot),
          snapshot: response?.snapshot || null,
          error: response?.error || ""
        });
      });
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
    if (message?.type === "COMPANION_PAGE_PICKER_STATE") {
      postToVoiceFrame({ type: "agent-cms-voice:page-picker-state", active: Boolean(message.active) });
      return;
    }
    if (message?.type === "COMPANION_COMPOSE_INSERT_TO_SHELL") {
      const text = String(message.text || "").trim();
      if (!text) return;
      postToVoiceFrame({
        type: "agent-cms-voice:compose-insert",
        text,
        join: message.join || "newline"
      });
    }
  });

  frame?.addEventListener("load", () => {
    announceSurfaceHost();
    releaseRetryBtnBusy();
  });

  void registerPanelTab();
  void loadShellFrame();
})();
