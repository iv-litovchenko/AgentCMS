const STORAGE = chrome.storage.local;
const DEFAULT_BASE_URL = "http://localhost:3000";

async function getSettings() {
  const stored = await STORAGE.get(["cmsBaseUrl", "agentId"]);
  return {
    cmsBaseUrl: String(stored.cmsBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, ""),
    agentId: String(stored.agentId || "").trim()
  };
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
  const preferred = String(preferredBase || cmsBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const candidates = [preferred, cmsBaseUrl, DEFAULT_BASE_URL, "http://127.0.0.1:3000"];

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        const url = new URL(tab.url || "");
        if (!/^https?:$/.test(url.protocol)) continue;
        if (url.port === "3000" || url.pathname.startsWith("/shell")) {
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

async function probeCmsBase(base) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(new URL("/api/agents", base).toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveCmsBase(preferredBase) {
  const { cmsBaseUrl } = await getSettings();
  const preferred = String(preferredBase || cmsBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");

  if (await probeCmsBase(preferred)) {
    return preferred;
  }

  const candidates = await collectCmsCandidates(preferred);
  for (const base of candidates) {
    if (base === preferred) continue;
    if (await probeCmsBase(base)) return base;
  }

  return preferred;
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
  const stored = await STORAGE.get(["cmsBaseUrl"]);
  if (!stored.cmsBaseUrl) {
    await STORAGE.set({ cmsBaseUrl: DEFAULT_BASE_URL, agentId: "" });
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
});
