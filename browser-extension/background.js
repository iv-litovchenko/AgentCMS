importScripts("companion-urls-global.js");

const { DEFAULT_CMS_BASE_URL, CMS_PROBE_CANDIDATES, buildShellFrameUrl, isCmsReachable } =
  globalThis.CompanionUrls;

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

function buildPanelFrameUrl(voiceUrl) {
  const host = chrome.runtime.getURL("panel-host.html");
  return `${host}?url=${encodeURIComponent(voiceUrl)}`;
}

async function getShellFramePayload() {
  let { cmsBaseUrl, agentId, _migratedFromSync } = await getSettings();
  if (!_migratedFromSync) {
    await storageLocal().set({ cmsBaseUrl, agentId, _migratedFromSync: true });
  }
  const shellUrl = buildShellFrameUrl(cmsBaseUrl, agentId);
  return {
    shellUrl,
    panelUrl: buildPanelFrameUrl(shellUrl),
    cmsBaseUrl,
    agentId
  };
}

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
      chrome.sidePanel
        .open({ tabId: sender.tab.id })
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    } else {
      sendResponse({ ok: false, error: "No active tab" });
    }
    return true;
  }

  if (message?.type === "COMPANION_OPEN_VOICE_TAB") {
    getShellFramePayload()
      .then(({ shellUrl }) => chrome.tabs.create({ url: shellUrl, active: true }))
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_SEND_TO_SHELL") {
    sendToShell(message.body, message.agentId)
      .then((result) => {
        if (sender.tab?.id) {
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
});
