/** Ссылка для открытия Agent CMS Voice на iPhone (HTTPS :3488). */

import { buildVoiceShellPath } from "./voice-chpu.js";

export const VOICE_TLS_PORT = 3488;

function isPrivateLanHost(host) {
  const value = String(host || "").trim();
  if (/^192\.168\./.test(value)) return true;
  if (/^10\./.test(value)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(value)) return true;
  return false;
}

export async function fetchLanIp() {
  try {
    const response = await fetch("/api/agent/system-environment", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const lanIp = String(data?.host?.lanIp || "").trim();
    return lanIp || null;
  } catch {
    return null;
  }
}

export function resolveMobileHost(lanIp, fallbackHostname = window.location.hostname) {
  const fromApi = String(lanIp || "").trim();
  if (fromApi && isPrivateLanHost(fromApi)) return fromApi;
  const current = String(fallbackHostname || "").trim();
  if (isPrivateLanHost(current)) return current;
  if (fromApi) return fromApi;
  return current || "127.0.0.1";
}

export function buildMobileVoiceUrl({
  agentId = "",
  lanIp = null,
  hostname = window.location.hostname,
  port = VOICE_TLS_PORT
} = {}) {
  const host = resolveMobileHost(lanIp, hostname);
  const path = buildVoiceShellPath(String(agentId || "").trim());
  return `https://${host}:${port}${path}`;
}

export async function resolveMobileVoiceUrl(agentId = "") {
  const lanIp = await fetchLanIp();
  const url = buildMobileVoiceUrl({ agentId, lanIp });
  let hostUsed = "";
  try {
    hostUsed = new URL(url).hostname;
  } catch {
    hostUsed = resolveMobileHost(lanIp);
  }
  return {
    url,
    lanIp,
    hostUsed,
    port: VOICE_TLS_PORT,
    agentId: String(agentId || "").trim(),
    usesLoopback: hostUsed === "127.0.0.1" || hostUsed === "localhost"
  };
}

async function copyText(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function initShellMobileLink({
  button,
  dialog,
  urlInput,
  noteEl,
  copyBtn,
  closeBtn,
  getAgentId = () => ""
}) {
  if (!button || !dialog) return;

  async function refreshDialogContent() {
    const info = await resolveMobileVoiceUrl(getAgentId());
    if (urlInput) {
      urlInput.value = info.url;
      urlInput.dataset.url = info.url;
    }
    if (noteEl) {
      const lines = [
        "Mac и iPhone — одна Wi‑Fi. Порт Voice всегда :3488.",
        info.lanIp
          ? `IP Mac сейчас: ${info.lanIp} — может измениться при смене сети.`
          : "Не удалось определить IP Mac — проверьте, что сервер запущен.",
        info.usesLoopback
          ? "127.0.0.1 с телефона не откроется — нужен IP вида 192.168.x.x."
          : info.agentId
            ? `Откроется агент «${info.agentId}».`
            : "Откроется выбор хранилища (агента)."
      ];
      noteEl.textContent = lines.join(" ");
    }
    return info;
  }

  button.addEventListener("click", () => {
    void refreshDialogContent().then(() => {
      if (typeof dialog.showModal === "function") dialog.showModal();
    });
  });

  copyBtn?.addEventListener("click", () => {
    const value = urlInput?.value || urlInput?.dataset.url || "";
    void copyText(value).then((ok) => {
      if (!copyBtn) return;
      const prev = copyBtn.textContent;
      copyBtn.textContent = ok ? "Скопировано" : "Не удалось";
      window.setTimeout(() => {
        copyBtn.textContent = prev;
      }, 1800);
    });
  });

  closeBtn?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
