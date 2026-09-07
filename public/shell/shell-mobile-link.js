/** Ссылка для открытия Agent CMS Voice на iPhone (HTTPS :3488). */

import { buildVoiceShellPath } from "./voice-chpu.js";
import { renderMobileQr } from "./shell-qr.js";

export const VOICE_TLS_PORT = 3488;
export const VOICE_HTTP_PORT = 3088;

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

export function buildMkcertCaHttpUrl({
  lanIp = null,
  hostname = window.location.hostname,
  port = VOICE_HTTP_PORT
} = {}) {
  const host = resolveMobileHost(lanIp, hostname);
  return `http://${host}:${port}/dev/mkcert-root-ca.pem`;
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

async function shareUrl(url, { dialog } = {}) {
  const value = String(url || "").trim();
  if (!value || typeof navigator.share !== "function") return { ok: false, cancelled: false };
  const hadDialog = Boolean(dialog?.open);
  if (hadDialog && typeof dialog.close === "function") {
    dialog.close();
  }
  try {
    await navigator.share({
      title: "Agent CMS Voice",
      url: value
    });
    return { ok: true, cancelled: false };
  } catch (error) {
    if (error?.name === "AbortError") {
      if (hadDialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
      return { ok: false, cancelled: true };
    }
    if (hadDialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
    return { ok: false, cancelled: false };
  }
}

function flashButtonLabel(button, label, restoreLabel) {
  if (!button) return;
  const prev = restoreLabel ?? button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = prev;
  }, 1800);
}

export function initShellMobileLink({
  button,
  buttons,
  dialog,
  urlInput,
  noteEl,
  certBlock,
  certUrlInput,
  certCopyBtn,
  qrWrap,
  qrImage,
  qrHint,
  copyBtn,
  shareBtn,
  closeBtn,
  getAgentId = () => ""
}) {
  const triggers = [...(buttons || []), button].filter(Boolean);
  if (!triggers.length || !dialog) return;

  if (shareBtn && typeof navigator.share !== "function") {
    shareBtn.hidden = true;
  }

  async function refreshDialogContent() {
    const info = await resolveMobileVoiceUrl(getAgentId());
    const caUrl = buildMkcertCaHttpUrl({ lanIp: info.lanIp });
    if (urlInput) {
      urlInput.value = info.url;
      urlInput.dataset.url = info.url;
    }
    if (certUrlInput) {
      certUrlInput.value = caUrl;
      certUrlInput.dataset.url = caUrl;
    }
    if (certBlock) {
      certBlock.hidden = info.usesLoopback;
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
      if (!info.usesLoopback) {
        lines.push(
          "Safari на iPhone: один раз установите mkcert CA (блок ниже) — тогда HTTPS без предупреждений."
        );
      }
      noteEl.textContent = lines.join(" ");
    }
    if (qrWrap) {
      qrWrap.hidden = false;
      if (qrHint) {
        qrHint.textContent = "Наведите камеру iPhone → откроется в Safari";
      }
    }
    if (qrImage && qrWrap) {
      const ok = await renderMobileQr(qrImage, info.url);
      if (!ok && qrHint) {
        qrHint.textContent = "QR не загрузился — используйте «Копировать» или «Поделиться»";
      }
    }
    return info;
  }

  function openMobileDialog() {
    void refreshDialogContent().then(() => {
      if (typeof dialog.showModal === "function") dialog.showModal();
    });
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", openMobileDialog);
  });

  copyBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const value = urlInput?.value || urlInput?.dataset.url || "";
    const prev = copyBtn.textContent;
    void copyText(value).then((ok) => {
      flashButtonLabel(copyBtn, ok ? "Скопировано" : "Не удалось", prev);
    });
  });

  certCopyBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const value = certUrlInput?.value || certUrlInput?.dataset.url || "";
    const prev = certCopyBtn.textContent;
    void copyText(value).then((ok) => {
      flashButtonLabel(certCopyBtn, ok ? "Скопировано" : "Не удалось", prev);
    });
  });

  shareBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const value = urlInput?.value || urlInput?.dataset.url || "";
    const prev = shareBtn.textContent;
    void shareUrl(value, { dialog }).then(({ ok, cancelled }) => {
      if (cancelled) return;
      if (ok) return;
      void copyText(value).then((copied) => {
        if (dialog.open) {
          flashButtonLabel(shareBtn, copied ? "Скопировано" : "Не удалось", prev);
        }
      });
    });
  });

  closeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    dialog.close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
