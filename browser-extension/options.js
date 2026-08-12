const STORAGE = chrome.storage.local;
const cmsBaseUrlInput = document.getElementById("cmsBaseUrl");
const agentIdInput = document.getElementById("agentId");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const previewNode = document.getElementById("shell-url-preview");
const statusNode = document.getElementById("status");

const DEFAULT_BASE_URL = "http://localhost:3000";

function buildShellPreview(base, agentId) {
  const url = new URL("/shell", base.replace(/\/$/, ""));
  const agent = String(agentId || "").trim();
  if (agent) url.searchParams.set("agent", agent);
  return url.toString();
}

function updatePreview() {
  const base = String(cmsBaseUrlInput.value || DEFAULT_BASE_URL).replace(/\/$/, "");
  const agentId = String(agentIdInput.value || "").trim();
  if (previewNode) previewNode.textContent = buildShellPreview(base, agentId);
}

async function loadOptions() {
  const stored = await STORAGE.get(["cmsBaseUrl", "agentId"]);
  cmsBaseUrlInput.value = stored.cmsBaseUrl || DEFAULT_BASE_URL;
  agentIdInput.value = stored.agentId || "";
  updatePreview();
}

saveBtn?.addEventListener("click", async () => {
  const cmsBaseUrl = String(cmsBaseUrlInput.value || DEFAULT_BASE_URL).replace(/\/$/, "");
  const agentId = String(agentIdInput.value || "").trim();
  await STORAGE.set({ cmsBaseUrl, agentId, _migratedFromSync: true });
  statusNode.style.color = "#166534";
  statusNode.textContent = "Сохранено";
  updatePreview();
  window.setTimeout(() => {
    statusNode.textContent = "";
  }, 2500);
});

resetBtn?.addEventListener("click", async () => {
  cmsBaseUrlInput.value = DEFAULT_BASE_URL;
  agentIdInput.value = "";
  await STORAGE.set({ cmsBaseUrl: DEFAULT_BASE_URL, agentId: "", _migratedFromSync: true });
  statusNode.style.color = "#166534";
  statusNode.textContent = "Сброшено на http://localhost:3000/shell";
  updatePreview();
});

cmsBaseUrlInput?.addEventListener("input", updatePreview);
agentIdInput?.addEventListener("input", updatePreview);

void loadOptions();
