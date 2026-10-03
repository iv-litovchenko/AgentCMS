importScripts(
  "companion-urls-global.js",
  "clipboard-history.js",
  "companion-pomodoro-global.js",
  "companion-pomodoro-remote.js",
  "companion-pomodoro-sw.js"
);

const {
  DEFAULT_CMS_BASE_URL,
  DEFAULT_VOICE_BASE_URL,
  CMS_PROBE_CANDIDATES,
  buildExtensionShellUrl,
  buildVoiceShellTabUrl,
  voiceBaseFromCmsHost,
  resolveVoiceBaseUrl,
  normalizeVoiceBaseForBrowser,
  isCmsReachable,
  decodeReadableUrl,
  readDecodeUrlsSetting
} = globalThis.CompanionUrls;

/** Последний Voice origin (для isVoiceServiceUrl при кастомных портах). */
let lastResolvedVoiceOrigin = "";

const {
  listClipboardHistory,
  addClipboardHistoryEntry,
  clearClipboardHistory,
  removeClipboardHistoryEntry
} = globalThis.CompanionClipboardHistory;

function storageLocal() {
  const api = globalThis.chrome?.storage ?? globalThis.browser?.storage;
  if (!api?.local) {
    throw new Error("chrome.storage.local is unavailable in the service worker");
  }
  return api.local;
}

async function getSettings() {
  const stored = await storageLocal().get([
    "cmsBaseUrl",
    "agentId",
    "_migratedFromSync",
    "decodeUrls",
    "decodeUrlsInCompanion",
    "decodeUrlsOnCopy",
    "clipboardHistoryEnabled"
  ]);
  const cmsBaseUrl = String(stored.cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const agentId = String(stored.agentId || "").trim();
  return {
    cmsBaseUrl,
    agentId,
    _migratedFromSync: Boolean(stored._migratedFromSync),
    decodeUrls: readDecodeUrlsSetting(stored),
    clipboardHistoryEnabled: Boolean(stored.clipboardHistoryEnabled)
  };
}

function applyReadableUrlFields(snapshot, enabled) {
  if (!enabled || !snapshot || typeof decodeReadableUrl !== "function") return snapshot;
  for (const key of ["url", "canonicalUrl", "pathname"]) {
    if (snapshot[key]) snapshot[key] = decodeReadableUrl(snapshot[key]);
  }
  return snapshot;
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

async function resolveVoiceBaseForCompanion(cmsBaseUrl) {
  const cms = String(cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const voiceBase = normalizeVoiceBaseForBrowser(await resolveVoiceBaseUrl(cms));
  try {
    lastResolvedVoiceOrigin = new URL(voiceBase).origin;
  } catch {
    lastResolvedVoiceOrigin = "";
  }
  return voiceBase;
}

async function getShellFramePayload() {
  const { cmsBaseUrl, agentId, _migratedFromSync } = await getSettings();
  if (!_migratedFromSync) {
    await storageLocal().set({ cmsBaseUrl, agentId, _migratedFromSync: true });
  }
  const voiceBase = await resolveVoiceBaseForCompanion(cmsBaseUrl);
  const shellUrl = buildExtensionShellUrl(voiceBase, agentId);
  const tabUrl = buildVoiceShellTabUrl(voiceBase, agentId);
  return { shellUrl, tabUrl, panelUrl: shellUrl, cmsBaseUrl, agentId, voiceBase };
}

function normalizeCmsOpenUrl(cmsBaseUrl) {
  return `${String(cmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, "")}/`;
}

async function openAgentCmsInBrowser(senderTab) {
  const { cmsBaseUrl } = await getSettings();
  const url = normalizeCmsOpenUrl(cmsBaseUrl);
  const tabId = Number(senderTab?.id);
  const tabUrl = String(senderTab?.url || "");
  if (Number.isFinite(tabId) && tabId > 0 && tabUrl && !tabUrl.startsWith("chrome://")) {
    try {
      const cmsOrigin = new URL(url).origin;
      const pageOrigin = new URL(tabUrl).origin;
      if (cmsOrigin === pageOrigin) {
        await chrome.tabs.update(tabId, { url, active: true });
        return { ok: true, sameTab: true, tabId };
      }
    } catch {
      // fall through to new tab
    }
  }
  const tab = await chrome.tabs.create({ url, active: true });
  return { ok: true, tabId: tab.id };
}

/** @type {Map<number, number>} */
const pickerTabByWindow = new Map();

/** @type {Set<number>} */
const sidePanelOpenWindows = new Set();

function markSidePanelOpen(windowId) {
  const id = Number(windowId);
  if (Number.isFinite(id) && id > 0) sidePanelOpenWindows.add(id);
}

function markSidePanelClosed(windowId) {
  const id = Number(windowId);
  if (Number.isFinite(id) && id > 0) sidePanelOpenWindows.delete(id);
}

function isSidePanelOpen(windowId) {
  const id = Number(windowId);
  return Number.isFinite(id) && id > 0 && sidePanelOpenWindows.has(id);
}

async function toggleCompanionSidePanel(tabId, windowId) {
  const tab = Number(tabId);
  const win = Number(windowId);
  if (!Number.isFinite(tab) || tab <= 0 || !Number.isFinite(win) || win <= 0) {
    throw new Error("No active tab");
  }
  rememberPickerTab(tab, win);

  if (isSidePanelOpen(win) && typeof chrome.sidePanel?.close === "function") {
    await chrome.sidePanel.close({ windowId: win });
    markSidePanelClosed(win);
    return { ok: true, open: false, tabId: tab };
  }

  await chrome.sidePanel.open({ tabId: tab });
  markSidePanelOpen(win);
  return { ok: true, open: true, tabId: tab };
}

function isPickerTargetUrl(url) {
  const value = String(url || "").trim();
  if (!value) return false;
  if (value.startsWith("chrome://") || value.startsWith("chrome-extension://")) return false;
  return /^https?:/i.test(value);
}

function isVoiceServiceUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    if (lastResolvedVoiceOrigin && parsed.origin === lastResolvedVoiceOrigin) return true;
    const path = String(parsed.pathname || "");
    if (/\/extension\/?$/i.test(path) || /[?&]companion=1/.test(String(parsed.search || ""))) {
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        const host = parsed.hostname;
        if (host === "localhost" || host === "127.0.0.1") return true;
      }
    }
    const port = parsed.port;
    return port === "3488" || port === "3088";
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

const PAGE_PICKER_SCRIPT_FILES = ["page-picker-extract.js", "page-snapshot.js", "page-picker.js"];

async function ensurePagePickerScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "COMPANION_PAGE_PICKER_PING" });
    return;
  } catch {
    // inject below
  }
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: PAGE_PICKER_SCRIPT_FILES
  });
}

const FILE_HUB_PAGE_SCRIPT = "companion-file-hub-page.js";
const FILE_HUB_ATTACH_MAX_BYTES = 25 * 1024 * 1024;

async function ensureFileHubPageScript(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "COMPANION_FILE_HUB_PING" });
    if (ping?.ok) return;
  } catch {
    // inject below
  }
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    files: [FILE_HUB_PAGE_SCRIPT]
  });
}

async function relayFileHubAttachToTab({ tabId = 0, windowId = 0, filename, mime, buffer } = {}) {
  const bytes = buffer?.byteLength ?? buffer?.length ?? 0;
  if (!buffer || !bytes) throw new Error("Пустой файл");
  if (bytes > FILE_HUB_ATTACH_MAX_BYTES) {
    throw new Error(`Файл слишком большой (макс. ${Math.round(FILE_HUB_ATTACH_MAX_BYTES / (1024 * 1024))} МБ)`);
  }

  const targetTabId = await resolvePickerTargetTabId({ tabId, windowId });
  if (!targetTabId) {
    throw new Error("Нет вкладки сайта — откройте mail.ru и окно с письмом");
  }

  await ensureFileHubPageScript(targetTabId);
  const response = await chrome.tabs.sendMessage(targetTabId, {
    type: "COMPANION_FILE_HUB_INJECT_FILE",
    filename: String(filename || "file"),
    mime: String(mime || "application/octet-stream"),
    buffer
  });
  if (!response?.ok) {
    const hint = response?.hint ? ` ${response.hint}` : "";
    throw new Error(String(response?.error || "Не удалось прикрепить файл") + hint);
  }
  return { ok: true, tabId: targetTabId };
}

async function broadcastPagePickerSet(tabId, active) {
  const nextActive = Boolean(active);
  const activateInFrame = (frameActive) => {
    if (window.AgentCompanionPagePicker?.setActive) {
      window.AgentCompanionPagePicker.setActive(frameActive);
      return true;
    }
    return false;
  };

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: activateInFrame,
      args: [nextActive]
    });
    return;
  } catch {
    // inject then retry once
  }

  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: PAGE_PICKER_SCRIPT_FILES
  });
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: activateInFrame,
    args: [nextActive]
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
  const { decodeUrls } = await getSettings();
  applyReadableUrlFields(snapshot, decodeUrls);
  return { ok: true, snapshot };
}

async function relayPagePickerSet(active, { tabId = 0, windowId = 0, senderTabId = 0 } = {}) {
  let targetTabId = Number(senderTabId) || 0;
  if (targetTabId) {
    try {
      const tab = await chrome.tabs.get(targetTabId);
      if (!isAllowedSnapshotTab(tab)) targetTabId = 0;
    } catch {
      targetTabId = 0;
    }
  }
  if (!targetTabId) {
    targetTabId = await resolvePickerTargetTabId({ tabId, windowId });
  }
  if (!targetTabId) {
    throw new Error("Нет вкладки сайта — откройте страницу и нажмите ⌖ снова");
  }
  if (active) {
    await ensurePagePickerScript(targetTabId);
  }
  await broadcastPagePickerSet(targetTabId, active);
  await chrome.tabs.sendMessage(targetTabId, {
    type: "COMPANION_PAGE_PICKER_SET",
    active: Boolean(active)
  }).catch(() => {});
}

async function deliverComposeInsertToVoice(payload) {
  try {
    await chrome.runtime.sendMessage(payload);
    return true;
  } catch {
    // side panel iframe host may be absent after top-level navigation
  }

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const url = String(tab.url || "");
    if (!url.includes("companion=1") || !isVoiceServiceUrl(url)) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, payload);
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function notifyCompanionVoiceTabs(payload) {
  const tabs = await chrome.tabs.query({});
  let delivered = false;
  for (const tab of tabs) {
    const url = String(tab.url || "");
    if (!url.includes("companion=1") || !isVoiceServiceUrl(url)) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "COMPANION_VOICE_RELAY", payload });
      delivered = true;
    } catch {
      // ignore
    }
  }
  return delivered;
}

async function relayComposeInsert({ text, join = "newline", tabId = 0, windowId = 0 } = {}) {
  const body = String(text || "").trim();
  if (!body) throw new Error("Empty compose text");

  if (tabId) {
    rememberPickerTab(tabId, windowId);
    await chrome.sidePanel.open({ tabId }).catch(() => {});
  }

  const payload = { type: "COMPANION_COMPOSE_INSERT_TO_SHELL", text: body, join: join || "newline" };
  let ok = await deliverComposeInsertToVoice(payload);
  if (!ok) {
    await new Promise((resolve) => setTimeout(resolve, 320));
    ok = await deliverComposeInsertToVoice(payload);
  }
  if (!ok) throw new Error("Voice в Side Panel недоступен — откройте панель Companion");

  return { ok: true };
}

const CAPTURE_JPEG_QUALITIES = [80, 62, 44];
const CAPTURE_UPLOAD_MAX_CHARS = 900_000;

function isCaptureTooLarge(error) {
  return /too large/i.test(String(error?.message || error));
}

async function blobToJpegDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

async function shrinkJpegDataUrl(dataUrl, quality, maxEdge) {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return dataUrl;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const out = await canvas.convertToBlob({ type: "image/jpeg", quality });
  return blobToJpegDataUrl(out);
}

async function maybeShrinkCapture(dataUrl) {
  let current = String(dataUrl || "");
  if (current.length <= CAPTURE_UPLOAD_MAX_CHARS) return current;
  if (typeof OffscreenCanvas !== "function" || typeof createImageBitmap !== "function") {
    return current;
  }

  let quality = 0.72;
  let maxEdge = 1600;
  for (let i = 0; i < 3 && current.length > CAPTURE_UPLOAD_MAX_CHARS; i += 1) {
    current = await shrinkJpegDataUrl(current, quality, maxEdge);
    quality = Math.max(0.4, quality - 0.14);
    maxEdge = Math.max(1024, Math.round(maxEdge * 0.82));
  }
  return current;
}

async function captureTabImage(tab) {
  const windowId = Number(tab?.windowId);
  if (!Number.isFinite(windowId) || windowId <= 0) {
    throw new Error("Нет окна для скриншота видимой области");
  }
  if (tab?.id && tab.active === false) {
    await chrome.tabs.update(tab.id, { active: true });
  }

  let lastError = null;
  for (const quality of CAPTURE_JPEG_QUALITIES) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
        format: "jpeg",
        quality
      });
      return await maybeShrinkCapture(dataUrl);
    } catch (error) {
      lastError = error;
      if (!isCaptureTooLarge(error)) throw error;
    }
  }

  throw new Error(String(lastError?.message || lastError || "Скриншот слишком большой"));
}

async function captureTabScreenshot({ tabId = 0, windowId = 0, senderTabId = 0 } = {}) {
  let targetTabId = Number(senderTabId) || Number(tabId) || 0;
  if (targetTabId) {
    try {
      const tab = await chrome.tabs.get(targetTabId);
      if (!isAllowedSnapshotTab(tab)) targetTabId = 0;
      else {
        const dataUrl = await captureTabImage(tab);
        return { tab, dataUrl };
      }
    } catch (error) {
      const message = String(error?.message || error);
      if (isCaptureTooLarge(error)) throw error;
      if (/permission|Cannot access|<all_urls>|activeTab/i.test(message)) {
        throw new Error(
          "Нет доступа к вкладке для скриншота. Перезагрузите расширение на chrome://extensions и подтвердите доступ ко всем сайтам."
        );
      }
      targetTabId = 0;
    }
  }

  targetTabId = await resolvePickerTargetTabId({ tabId, windowId });
  if (!targetTabId) throw new Error("Нет вкладки для скриншота");

  const tab = await chrome.tabs.get(targetTabId);
  try {
    const dataUrl = await captureTabImage(tab);
    return { tab, dataUrl };
  } catch (error) {
    const message = String(error?.message || error);
    if (/permission|Cannot access|<all_urls>|activeTab/i.test(message)) {
      throw new Error(
        "Нет доступа к вкладке для скриншота. Перезагрузите расширение на chrome://extensions и подтвердите доступ ко всем сайтам."
      );
    }
    throw error;
  }
}

async function writeImageDataUrlToClipboardInTab(tabId, dataUrl) {
  if (!tabId) throw new Error("Нет вкладки для копирования");

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (pngDataUrl) => {
      try {
        const blob = await (await fetch(String(pngDataUrl || ""))).blob();
        if (!blob?.size) throw new Error("Пустой скриншот");
        const imageBlob =
          blob.type === "image/png" ? blob : new Blob([await blob.arrayBuffer()], { type: "image/png" });

        if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": imageBlob })]);
          return { ok: true };
        }

        await new Promise((resolve, reject) => {
          const onCopy = (event) => {
            event.preventDefault();
            try {
              event.clipboardData.items.add(imageBlob, "image/png");
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          document.addEventListener("copy", onCopy, { once: true, capture: true });
          const copied = document.execCommand("copy");
          if (!copied) {
            document.removeEventListener("copy", onCopy, { capture: true });
            reject(new Error("Буфер обмена недоступен"));
          }
        });
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || String(error) };
      }
    },
    args: [String(dataUrl || "")]
  });

  const result = results?.[0]?.result;
  if (result?.ok) return;
  throw new Error(result?.error || "Не удалось скопировать");
}

async function uploadTabScreenshot({ dataUrl, tabUrl = "" } = {}) {
  const { agentId } = await getSettings();
  const baseUrl = await resolveCmsBase();
  const url = new URL("/api/shell/screen/speech-snapshot", baseUrl);
  if (agentId) url.searchParams.set("agent", agentId);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, kind: "manual", width: 0, height: 0 })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || `HTTP ${response.status}`);
  }

  const path = String(data.path || "").trim();
  const pageUrl = String(tabUrl || "").trim();
  const lines = ["[Снимок вкладки]"];
  if (pageUrl) lines.push(pageUrl);
  if (path) lines.push(`Файл: ${path}`);
  lines.push("---", "Что на этом скриншоте?");
  return lines.join("\n");
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
  const cmsBaseUrl = String(stored.cmsBaseUrl || DEFAULT_CMS_BASE_URL);
  void resolveVoiceBaseForCompanion(cmsBaseUrl);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "COMPANION_OPEN_PANEL") {
    if (sender.tab?.id) {
      rememberPickerTab(sender.tab.id, sender.tab.windowId);
      chrome.sidePanel
        .open({ tabId: sender.tab.id })
        .then(() => {
          markSidePanelOpen(sender.tab.windowId);
          sendResponse({ ok: true, tabId: sender.tab.id, open: true });
        })
        .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    } else {
      sendResponse({ ok: false, error: "No active tab" });
    }
    return true;
  }

  if (message?.type === "COMPANION_TOGGLE_PANEL") {
    if (!sender.tab?.id) {
      sendResponse({ ok: false, error: "No active tab" });
      return true;
    }
    toggleCompanionSidePanel(sender.tab.id, sender.tab.windowId)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_OPEN_VOICE_TAB") {
    getShellFramePayload()
      .then(({ tabUrl }) => chrome.tabs.create({ url: tabUrl, active: true }))
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_OPEN_CMS_TAB") {
    openAgentCmsInBrowser(sender.tab)
      .then((result) => sendResponse(result))
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
      .then(async () => {
        const cms = String(settings.cmsBaseUrl || (await getSettings()).cmsBaseUrl || DEFAULT_CMS_BASE_URL);
        await resolveVoiceBaseForCompanion(cms);
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_REGISTER_PANEL") {
    const windowId = Number(message.windowId);
    const tabId = Number(message.tabId);
    if (Number.isFinite(windowId) && windowId > 0 && Number.isFinite(tabId) && tabId > 0) {
      rememberPickerTab(tabId, windowId);
      markSidePanelOpen(windowId);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "COMPANION_UNREGISTER_PANEL") {
    const windowId = Number(message.windowId ?? sender.tab?.windowId);
    markSidePanelClosed(windowId);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "COMPANION_COMPOSE_INSERT") {
    relayComposeInsert({
      text: message.text,
      join: message.join,
      tabId: sender.tab?.id,
      windowId: sender.tab?.windowId
    })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_FILE_HUB_ATTACH_TO_TAB") {
    relayFileHubAttachToTab({
      tabId: message.tabId,
      windowId: message.windowId,
      filename: message.filename,
      mime: message.mime,
      buffer: message.buffer
    })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_CAPTURE_TAB_SCREENSHOT") {
    captureTabScreenshot({
      tabId: message.tabId,
      windowId: message.windowId,
      senderTabId: sender.tab?.id
    })
      .then(({ tab, dataUrl }) => sendResponse({ ok: true, dataUrl, tabUrl: tab?.url || "" }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_UPLOAD_TAB_SCREENSHOT") {
    uploadTabScreenshot({ dataUrl: message.dataUrl, tabUrl: message.tabUrl || "" })
      .then((text) => sendResponse({ ok: true, text }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_CLIPBOARD_WRITE_IMAGE") {
    const tabId = Number(sender.tab?.id || message.tabId || 0);
    writeImageDataUrlToClipboardInTab(tabId, message.dataUrl)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_CLIPBOARD_HISTORY_LIST") {
    listClipboardHistory(storageLocal())
      .then((items) => sendResponse({ ok: true, items }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error), items: [] }));
    return true;
  }

  if (message?.type === "COMPANION_CLIPBOARD_HISTORY_ADD") {
    addClipboardHistoryEntry(message.entry || {}, storageLocal())
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_CLIPBOARD_HISTORY_CLEAR") {
    clearClipboardHistory(storageLocal())
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_CLIPBOARD_HISTORY_REMOVE") {
    removeClipboardHistoryEntry(String(message.id || ""), storageLocal())
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message?.type === "COMPANION_PAGE_PICKER_STATE") {
    const active = Boolean(message.active);
    void notifyCompanionVoiceTabs({ type: "agent-cms-voice:page-picker-state", active });
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.tabs
        .sendMessage(tabId, { type: "COMPANION_PAGE_PICKER_STATE", active })
        .catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "COMPANION_PAGE_PICKER_SET") {
    relayPagePickerSet(Boolean(message.active), {
      tabId: message.tabId,
      windowId: message.windowId,
      senderTabId: message.useSenderTab ? sender.tab?.id : 0
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

  const pomodoro = globalThis.CompanionPomodoroService;
  if (message?.type === "COMPANION_POMODORO_GET_STATE") {
    if (!pomodoro) {
      sendResponse({ ok: false });
      return true;
    }
    pomodoro
      .reconcileFromSources()
      .then(() => sendResponse({ ok: true, state: pomodoro.getCachedState() }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === "COMPANION_POMODORO_START") {
    if (!pomodoro) {
      sendResponse({ ok: false });
      return true;
    }
    pomodoro
      .startWork()
      .then(() => sendResponse({ ok: true, state: pomodoro.getCachedState() }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
  if (message?.type === "COMPANION_POMODORO_STOP") {
    if (!pomodoro) {
      sendResponse({ ok: false });
      return true;
    }
    pomodoro
      .stopSession()
      .then(() => sendResponse({ ok: true, state: pomodoro.getCachedState() }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
  if (message?.type === "COMPANION_POMODORO_BREAK_DONE") {
    if (!pomodoro) {
      sendResponse({ ok: false });
      return true;
    }
    pomodoro
      .breakDone()
      .then(() => sendResponse({ ok: true, state: pomodoro.getCachedState() }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
});

if (globalThis.CompanionPomodoroService) {
  globalThis.CompanionPomodoroService.setConfigProvider(async () => {
    const settings = await getSettings();
    return {
      cmsBaseUrl: settings.cmsBaseUrl,
      agentId: settings.agentId || "main"
    };
  });
  void globalThis.CompanionPomodoroService.init();
}
