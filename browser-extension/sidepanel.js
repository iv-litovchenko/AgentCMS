const STORAGE = chrome.storage.local;

const frame = document.getElementById("shell-frame");
const retryBtn = document.getElementById("retry-btn");
const optionsLink = document.getElementById("options-link");
const urlLabel = document.getElementById("shell-url-label");

const DEFAULT_BASE_URL = "http://localhost:3000";
let loadedOnce = false;

function buildShellUrl(base, agentId) {
  const url = new URL("/shell", base);
  const agent = String(agentId || "").trim();
  if (agent) url.searchParams.set("agent", agent);
  return url.toString();
}

async function migrateFromSyncStorage() {
  const local = await STORAGE.get(["cmsBaseUrl", "agentId", "_migratedFromSync"]);
  if (local._migratedFromSync) return local;

  const synced = await chrome.storage.sync.get(["cmsBaseUrl", "agentId"]);
  const next = {
    cmsBaseUrl: local.cmsBaseUrl || synced.cmsBaseUrl || DEFAULT_BASE_URL,
    agentId: local.agentId ?? synced.agentId ?? "",
    _migratedFromSync: true
  };
  await STORAGE.set(next);
  return next;
}

async function loadShellFrame(force = false) {
  const stored = await migrateFromSyncStorage();
  const base = String(stored.cmsBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const shellUrl = buildShellUrl(base, stored.agentId);

  if (urlLabel) {
    urlLabel.textContent = shellUrl.replace(/^https?:\/\//, "");
    urlLabel.title = shellUrl;
  }

  const currentSrc = frame.getAttribute("src") || "";
  if (!force && loadedOnce && currentSrc === shellUrl) return;

  loadedOnce = true;
  frame.src = shellUrl;
}

retryBtn?.addEventListener("click", () => {
  void loadShellFrame(true);
});

optionsLink?.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage?.();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.cmsBaseUrl || changes.agentId) void loadShellFrame(true);
});

void loadShellFrame();
