const {
  DEFAULT_CMS_BASE_URL,
  buildExtensionShellUrl,
  resolveVoiceBaseUrl,
  readDecodeUrlsSetting,
  formatCompanionPanelUrlLabel
} = globalThis.CompanionUrls;

const cmsBaseUrlInput = document.getElementById("cmsBaseUrl");
const agentIdInput = document.getElementById("agentId");
const decodeUrlsInput = document.getElementById("decodeUrls");
const clipboardHistoryEnabledInput = document.getElementById("clipboardHistoryEnabled");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const previewNode = document.getElementById("shell-url-preview");
const statusNode = document.getElementById("status");

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
  if (CompanionStorage.hasRuntimeMessaging()) {
    try {
      const response = await sendRuntimeMessage({ type: "COMPANION_GET_SETTINGS" });
      if (response && typeof response === "object") return response;
    } catch {
      // fall through
    }
  }
  return CompanionStorage.local().get([
    "cmsBaseUrl",
    "agentId",
    "decodeUrls",
    "decodeUrlsInCompanion",
    "decodeUrlsOnCopy",
    "clipboardHistoryEnabled"
  ]);
}

async function writeSettings(settings) {
  if (CompanionStorage.hasRuntimeMessaging()) {
    try {
      await sendRuntimeMessage({ type: "COMPANION_SAVE_SETTINGS", settings });
      return;
    } catch {
      // fall through
    }
  }
  await CompanionStorage.local().set(settings);
}

async function buildShellPreview(base, agentId) {
  const voiceBase = await resolveVoiceBaseUrl(base);
  return buildExtensionShellUrl(voiceBase, agentId);
}

async function updatePreview() {
  const base = String(cmsBaseUrlInput.value || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const agentId = String(agentIdInput.value || "").trim();
  if (previewNode) {
    previewNode.textContent = formatCompanionPanelUrlLabel(await buildShellPreview(base, agentId));
  }
}

async function loadOptions() {
  const stored = await readSettings();
  cmsBaseUrlInput.value = stored.cmsBaseUrl || DEFAULT_CMS_BASE_URL;
  agentIdInput.value = stored.agentId || "";
  if (decodeUrlsInput) {
    decodeUrlsInput.checked = readDecodeUrlsSetting(stored);
  }
  if (clipboardHistoryEnabledInput) {
    clipboardHistoryEnabledInput.checked = Boolean(stored.clipboardHistoryEnabled);
  }
  await updatePreview();
}

saveBtn?.addEventListener("click", async () => {
  const cmsBaseUrl = String(cmsBaseUrlInput.value || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const agentId = String(agentIdInput.value || "").trim();
  try {
    await writeSettings({
      cmsBaseUrl,
      agentId,
      _migratedFromSync: true,
      decodeUrls: Boolean(decodeUrlsInput?.checked),
      clipboardHistoryEnabled: Boolean(clipboardHistoryEnabledInput?.checked)
    });
    statusNode.style.color = "#166534";
    statusNode.textContent = "Сохранено";
    await updatePreview();
  } catch (error) {
    statusNode.style.color = "#b91c1c";
    statusNode.textContent = error instanceof Error ? error.message : "Ошибка сохранения";
  }
  window.setTimeout(() => {
    statusNode.textContent = "";
  }, 2500);
});

resetBtn?.addEventListener("click", async () => {
  cmsBaseUrlInput.value = DEFAULT_CMS_BASE_URL;
  agentIdInput.value = "";
  if (decodeUrlsInput) decodeUrlsInput.checked = true;
  if (clipboardHistoryEnabledInput) clipboardHistoryEnabledInput.checked = false;
  try {
    await writeSettings({
      cmsBaseUrl: DEFAULT_CMS_BASE_URL,
      agentId: "",
      _migratedFromSync: true,
      decodeUrls: true,
      clipboardHistoryEnabled: false
    });
    statusNode.style.color = "#166534";
    statusNode.textContent = `Сброшено на ${DEFAULT_CMS_BASE_URL}`;
    await updatePreview();
  } catch (error) {
    statusNode.style.color = "#b91c1c";
    statusNode.textContent = error instanceof Error ? error.message : "Ошибка сброса";
  }
});

cmsBaseUrlInput?.addEventListener("input", () => {
  void updatePreview();
});
agentIdInput?.addEventListener("input", () => {
  void updatePreview();
});

void loadOptions();
