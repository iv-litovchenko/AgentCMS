importScripts("companion-urls-global.js");

const {
  DEFAULT_CMS_BASE_URL,
  DEFAULT_VOICE_BASE_URL,
  CMS_PROBE_CANDIDATES,
  buildExtensionShellUrl,
  buildVoiceShellTabUrl,
  voiceBaseFromCmsHost,
  normalizeVoiceBaseForBrowser,
  isCmsReachable
} = globalThis.CompanionUrls;

function storageLocal() {
  const api = globalThis.chrome?.storage ?? globalThis.browser?.storage;
  if (!api?.local) {
    throw new Error("chrome.storage.local is unavailable in the service worker");
  }
  return api.local;
}

async function getSettings() {
  const stored = await storageLocal().get(["cmsBaseUrl", "agentId", "_migratedFromSync"]);
  const cmsBaseUrl = String(stored.cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const agentId = String(stored.agentId || "").trim();
  return { cmsBaseUrl, agentId, _migratedFromSync: Boolean(stored._migratedFromSync) };
}

function uniqueUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const value = String(raw || "").replace(/\/$/, "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

async function collectCmsCandidates(preferredBase) {
  const { cmsBaseUrl } = await getSettings();
  const preferred = String(preferredBase || cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const candidates = [preferred, cmsBaseUrl, ...CMS_PROBE_CANDIDATES];

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        const url = new URL(tab.url || "");
        if (!/^https?:$/.test(url.protocol)) continue;
        if (url.port === "3000" || url.port === "3443" || url.pathname.startsWith("/shell")) {
          candidates.push(`${url.protocol}//${url.host}`);
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  if (preferred.includes("localhost")) {
    candidates.push(preferred.replace("localhost", "127.0.0.1"));
  }

  return uniqueUrls(candidates);
}

async function resolveCmsBase(preferredBase) {
  const { cmsBaseUrl } = await getSettings();
  const preferred = String(preferredBase || cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");

  if (await isCmsReachable(preferred)) {
    return preferred;
  }

  const candidates = await collectCmsCandidates(preferred);
  for (const base of candidates) {
    if (base === preferred) continue;
    if (await isCmsReachable(base)) return base;
  }

  return preferred;
}

async function getShellFramePayload() {
  const { cmsBaseUrl, agentId, _migratedFromSync } = await getSettings();
  if (!_migratedFromSync) {
    await storageLocal().set({ cmsBaseUrl, agentId, _migratedFromSync: true });
  }
  const voiceBase = normalizeVoiceBaseForBrowser(
    voiceBaseFromCmsHost(cmsBaseUrl) || DEFAULT_VOICE_BASE_URL
  );
  const shellUrl = buildExtensionShellUrl(voiceBase, agentId);
  const tabUrl = buildVoiceShellTabUrl(voiceBase, agentId);
  return { shellUrl, tabUrl, panelUrl: shellUrl, cmsBaseUrl, agentId };
}

/** @type {Map<number, number>} */
const pickerTabByWindow = new Map();

function isPickerTargetUrl(url) {
  const value = String(url || "").trim();
  if (!value) return false;
  if (value.startsWith("chrome://") || value.startsWith("chrome-extension://")) return false;
  return /^https?:/i.test(value);
}

function isVoiceServiceUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    return parsed.port === "3488";
  } catch {
    return false;
  }
}

function isAllowedSnapshotTab(tab) {
  return Boolean(tab?.id && isPickerTargetUrl(tab.url) && !isVoiceServiceUrl(tab.url));
}

function isPreferredPickerTab(tab) {
  return isAllowedSnapshotTab(tab);
}

function rememberPickerTab(tabId, windowId) {
  const id = Number(tabId);
  const winId = Number(windowId);
  if (!Number.isFinite(id) || id <= 0) return;
  if (!Number.isFinite(winId) || winId <= 0) return;
  pickerTabByWindow.set(winId, id);
}

async function resolvePickerTargetTabId({ tabId = 0, windowId = 0 } = {}) {
  const explicitWindowId = Number(windowId);
  const hasWindow = Number.isFinite(explicitWindowId) && explicitWindowId > 0;

  if (hasWindow) {
    const remembered = pickerTabByWindow.get(explicitWindowId);
    if (remembered) {
      try {
        const tab = await chrome.tabs.get(remembered);
        if (isPreferredPickerTab(tab)) return tab.id;
      } catch {
        pickerTabByWindow.delete(explicitWindowId);
      }
    }

    try {
      const tabs = await chrome.tabs.query({ windowId: explicitWindowId });
      const activePreferred = tabs.find((item) => item.active && isPreferredPickerTab(item));
      if (activePreferred?.id) return activePreferred.id;
      const anyPreferred = tabs.find((item) => isPreferredPickerTab(item));
      if (anyPreferred?.id) return anyPreferred.id;
    } catch {
      // ignore
    }
  }

  const explicitTabId = Number(tabId);
  if (Number.isFinite(explicitTabId) && explicitTabId > 0) {
    try {
      const tab = await chrome.tabs.get(explicitTabId);
      if (isPreferredPickerTab(tab)) return tab.id;
      if (isAllowedSnapshotTab(tab)) return tab.id;
    } catch {
      // ignore invalid tab
    }
  }

  try {
    const [focusedTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (isPreferredPickerTab(focusedTab)) return focusedTab.id;
    if (isAllowedSnapshotTab(focusedTab)) return focusedTab.id;
  } catch {
    // ignore
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const preferred = tabs.find((item) => isPreferredPickerTab(item));
    if (preferred?.id) return preferred.id;
    const fallback = tabs.find((item) => isAllowedSnapshotTab(item));
    if (fallback?.id) return fallback.id;
  } catch {
    // ignore
  }

  return null;
}

async function ensurePagePickerScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "COMPANION_PAGE_PICKER_PING" });
    return;
  } catch {
    // inject below
  }
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    files: ["page-picker-extract.js", "page-snapshot.js", "page-picker.js"]
  });
}

async function collectTabPageSnapshot(tabId) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: () => {
      function readMeta(name) {
        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return String(el?.getAttribute("content") || "").trim();
      }
      function readFaviconHref() {
        const icon = document.querySelector(
          'link[rel="icon"][href], link[rel="shortcut icon"][href], link[rel="apple-touch-icon"][href]'
        );
        if (!icon) return "";
        try {
          return new URL(icon.getAttribute("href") || "", location.href).href;
        } catch {
          return "";
        }
      }
      function readCanonicalHref() {
        const link = document.querySelector('link[rel="canonical"][href]');
        if (!link) return "";
        try {
          return new URL(link.getAttribute("href") || "", location.href).href;
        } catch {
          return "";
        }
      }

      let url = location.href;
      let hostname = "";
      let pathname = "";
      try {
        const parsed = new URL(url);
        url = parsed.href;
        hostname = parsed.hostname;
        pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        // ignore
      }

      const title = String(document.title || "").trim();
      const description =
        readMeta("og:description") || readMeta("description") || readMeta("twitter:description");
      const siteName = readMeta("og:site_name") || hostname;
      const imageUrl = readMeta("og:image") || readMeta("twitter:image");
      const isCms = Boolean(
        document.getElementById("discuss-aside") ||
          document.getElementById("app-root") ||
          location.port === "3443" ||
          location.port === "3000"
      );

      return {
        url,
        hostname,
        pathname,
        title: title || hostname || url,
        description,
        siteName,
        faviconUrl: readFaviconHref(),
        canonicalUrl: readCanonicalHref() || url,
        imageUrl,
        source: isCms ? "agent-cms" : "host-document"
      };
    }
  });
  return injection?.result || null;
}

async function relayPageSnapshotRequest({ tabId = 0, windowId = 0 } = {}) {
  const targetTabId = await resolvePickerTargetTabId({ tabId, windowId });
  if (!targetTabId) {
    throw new Error("Нет вкладки сайта — откройте Agent CMS или сайт во вкладке браузера");
  }
  try {
    const tab = await chrome.tabs.get(targetTabId);
    if (isVoiceServiceUrl(tab.url)) {
      throw new Error("Откройте Agent CMS или сайт во вкладке — не страницу Voice");
    }
  } catch (error) {
    if (String(error?.message || "").includes("Voice")) throw error;
  }
  const snapshot = await collectTabPageSnapshot(targetTabId);
  if (!snapshot) throw new Error("Не удалось собрать meta со страницы вкладки");
  return { ok: true, snapshot };
}

async function relayPagePickerSet(active, { tabId = 0, windowId = 0 } = {}) {
  const targetTabId = await resolvePickerTargetTabId({ tabId, windowId });
  if (!targetTabId) {
    throw new Error("Нет вкладки сайта — откройте страницу и нажмите ⌖ снова");
  }
  if (active) {
    await ensurePagePickerScript(targetTabId);
  }
  await chrome.tabs.sendMessage(targetTabId, {
    type: "COMPANION_PAGE_PICKER_SET",
    active: Boolean(active)
  });
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  rememberPickerTab(tabId, windowId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab?.active && tab.windowId) {
    rememberPickerTab(tabId, tab.windowId);
  }
});

async function sendToShell(body, agentIdOverride) {
  const { agentId } = await getSettings();
  const baseUrl = await resolveCmsBase();
  const text = String(body || "").trim();
  if (!text) throw new Error("Empty message");

  const url = new URL("/api/shell/message", baseUrl);
  const agent = String(agentIdOverride || agentId || "").trim();
  if (agent) url.searchParams.set("agent", agent);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: text, author: "companion" })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || `HTTP ${response.status}`);
  }
  return data;
}

chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  const stored = await storageLocal().get(["cmsBaseUrl", "_migratedFromSync"]);
  if (!stored.cmsBaseUrl || !stored._migratedFromSync) {
    await storageLocal().set({
      cmsBaseUrl: stored.cmsBaseUrl || DEFAULT_CMS_BASE_URL,
      agentId: stored.agentId || "",
      _migratedFromSync: true
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "COMPANION_OPEN_PANEL") {
    if (sender.tab?.id) {
      rememberPickerTab(sender.tab.id, sender.tab.windowId);
      chrome.sidePanel
        .open({ tabId: sender.tab.id })
        .then(() => sendResponse({ ok: true, tabId: sender.tab.id }))
        .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    } else {
      sendResponse({ ok: false, error: "No active tab" });
    }
    return true;
  }

  if (message?.type === "COMPANION_OPEN_VOICE_TAB") {
    getShellFramePayload()
      .then(({ tabUrl }) => chrome.tabs.create({ url: tabUrl, active: true }))
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_SEND_TO_SHELL") {
    sendToShell(message.body, message.agentId)
      .then((result) => {
        if (sender.tab?.id) {
          rememberPickerTab(sender.tab.id, sender.tab.windowId);
          chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
        }
        sendResponse({ ok: true, result });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
    return true;
  }

  if (message?.type === "COMPANION_GET_SETTINGS") {
    getSettings().then(sendResponse);
    return true;
  }

  if (message?.type === "COMPANION_GET_SHELL_URL") {
    getShellFramePayload()
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_SAVE_SETTINGS") {
    const settings = message.settings && typeof message.settings === "object" ? message.settings : {};
    storageLocal()
      .set(settings)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_REGISTER_PANEL") {
    const windowId = Number(message.windowId);
    const tabId = Number(message.tabId);
    if (Number.isFinite(windowId) && windowId > 0 && Number.isFinite(tabId) && tabId > 0) {
      rememberPickerTab(tabId, windowId);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "COMPANION_PAGE_PICKER_SET") {
    relayPagePickerSet(Boolean(message.active), {
      tabId: message.tabId,
      windowId: message.windowId
    })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_PAGE_SNAPSHOT_REQUEST") {
    relayPageSnapshotRequest({
      tabId: message.tabId,
      windowId: message.windowId
    })
      .then((result) => sendResponse({ ok: Boolean(result?.snapshot), snapshot: result?.snapshot || null }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
});
